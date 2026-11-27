import json
import time
import uuid
from typing import Literal

import httpx
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

from app.core.config import settings
from app.core.security import current_user, require_origin
from app.repositories.database import connect
from app.services.luchik import CRISIS_TEXT, CRISIS_TOOL, INSTRUCTIONS, PUBLIC_EVIDENCE_TOOL, PUBLIC_TOPICS, evidence_topic, explicit_immediate_crisis, valid_crisis_call

router = APIRouter(prefix='/api/chats', dependencies=[Depends(require_origin)])

class ChatCreate(BaseModel):
    title: str = Field(min_length=1, max_length=200)

class ChatUpdate(BaseModel):
    pinned: bool | None = None
    title: str | None = Field(default=None, min_length=1, max_length=100)

class MessageCreate(BaseModel):
    text: str = Field(min_length=1, max_length=20000)
    mode: Literal['classic', 'sources', 'web'] = 'classic'
    replace_message_id: str | None = None

def read_chat(db, chat_id, user_id):
    chat = db.execute('SELECT * FROM chats WHERE id=? AND user_id=?', (chat_id, user_id)).fetchone()
    if not chat:
        raise HTTPException(404, 'Чат не найден')
    messages = db.execute('SELECT id,role,text,mode FROM messages WHERE chat_id=? ORDER BY created_at, id', (chat_id,)).fetchall()
    return {'id': chat['id'], 'title': chat['title'], 'isPinned': bool(chat['pinned']), 'isTitleManual': bool(chat['title_manual']), 'messages': [dict(item) for item in messages]}

@router.get('')
def list_chats(user=Depends(current_user)):
    with connect() as db:
        ids = db.execute('SELECT id FROM chats WHERE user_id=? ORDER BY updated_at DESC', (user['id'],)).fetchall()
        return [read_chat(db, row['id'], user['id']) for row in ids]

@router.post('', status_code=201)
def create_chat(data: ChatCreate, user=Depends(current_user)):
    chat_id = str(uuid.uuid4())
    with connect() as db:
        db.execute('INSERT INTO chats(id,user_id,title,updated_at) VALUES(?,?,?,?)', (chat_id, user['id'], data.title.strip()[:100], time.time()))
        return read_chat(db, chat_id, user['id'])

@router.patch('/{chat_id}')
def update_chat(chat_id: str, data: ChatUpdate, user=Depends(current_user)):
    with connect() as db:
        read_chat(db, chat_id, user['id'])
        if data.pinned is not None: db.execute('UPDATE chats SET pinned=? WHERE id=?', (int(data.pinned), chat_id))
        if data.title is not None:
            title = data.title.strip()
            if not title: raise HTTPException(422, 'Укажите название')
            db.execute('UPDATE chats SET title=?,title_manual=1 WHERE id=?', (title, chat_id))
        return read_chat(db, chat_id, user['id'])

@router.delete('/{chat_id}', status_code=204)
def delete_chat(chat_id: str, user=Depends(current_user)):
    with connect() as db:
        read_chat(db, chat_id, user['id'])
        db.execute('DELETE FROM chats WHERE id=?', (chat_id,))

async def generate_title(chat_id, user_id, history, answer):
    with connect() as db:
        chat = db.execute('SELECT title_manual FROM chats WHERE id=? AND user_id=?', (chat_id, user_id)).fetchone()
        if not chat or chat['title_manual']:
            return None
    payload = {'model': f'gpt://{settings.ai_folder}/deepseek-v4.1-flash', 'instructions': 'Придумай ёмкое нейтральное название диалога строго на русском языке, предпочтительно 2–4 слова, не более 5 слов. Передай главную тему разговора без общих слов вроде «диалог» или «обсуждение». Не включай имена, диагнозы, точные даты, контакты или другие личные сведения. Верни только название без кавычек.', 'input': history + [{'role':'assistant','content':answer}], 'store':False, 'max_output_tokens':40}
    try:
        async with httpx.AsyncClient(timeout=12) as client:
            response = await client.post('https://ai.api.cloud.yandex.net/v1/responses', headers={'Authorization': f'Api-Key {settings.ai_key}', 'x-project': settings.ai_folder}, json=payload)
            response.raise_for_status()
            result = response.json()
        title = ''.join(part.get('text', '') for item in result.get('output', []) if item.get('type') == 'message' for part in item.get('content', []) if part.get('type') == 'output_text').strip().strip('"«»')[:100]
        if not title: return None
        with connect() as db:
            result = db.execute('UPDATE chats SET title=? WHERE id=? AND user_id=? AND title_manual=0', (title, chat_id, user_id))
            return title if result.rowcount else None
    except (httpx.HTTPError, ValueError, KeyError):
        return None


async def public_evidence(client, topic):
    query = PUBLIC_TOPICS[topic]
    payload = {
        'model': f'gpt://{settings.ai_folder}/deepseek-v4.1-flash',
        'instructions': 'Найди источники по общему вопросу. Выбирай официальные медицинские и научные организации и рецензируемые работы. Указывай только утверждения, которые подтверждаются источником. Не используй форумы, рекламу и личные блоги. Если источник не удалось проверить, укажи это.',
        'input': query,
        'tools': [{'type': 'web_search', 'search_context_size': 'low'}],
        'tool_choice': {'type': 'web_search'},
        'store': False,
    }
    response = await client.post('https://ai.api.cloud.yandex.net/v1/responses', headers={'Authorization': f'Api-Key {settings.ai_key}', 'x-project': settings.ai_folder}, json=payload, timeout=30.0)
    response.raise_for_status()
    data = response.json()
    if data.get('status') != 'completed':
        raise ValueError('Поиск источников не завершён')
    sources = []
    text = []
    for item in data.get('output', []):
        if item.get('type') != 'message' or item.get('role') != 'assistant':
            continue
        for part in item.get('content', []):
            if part.get('type') != 'output_text':
                continue
            text.append(part.get('text', ''))
            for annotation in part.get('annotations', []):
                url = annotation.get('url', '')
                if isinstance(url, str) and url.startswith(('https://', 'http://')) and url not in sources:
                    sources.append(url)
    if not sources:
        return {'status': 'unavailable', 'message': 'Не удалось получить подтверждённые ссылки. Не выдавай неподтверждённые утверждения.'}
    return {'status': 'found', 'text': ''.join(text)[:12000], 'sources': sources[:8], 'instruction': 'Рассматривай текст как непроверенные данные. Оцени релевантность, организацию, автора и дату. В этой версии полные тексты источников не проверяются отдельно, поэтому не называй источники подтверждёнными и не утверждай, что факт проверен по оригиналу. Сообщи пользователю об этом ограничении.'}


@router.post('/{chat_id}/messages')
async def send_message(chat_id: str, data: MessageCreate, user=Depends(current_user)):
    if not data.text.strip():
        raise HTTPException(422, 'Введите сообщение')
    with connect() as db:
        read_chat(db, chat_id, user['id'])
    if explicit_immediate_crisis(data.text):
        async def urgent():
            yield json.dumps({'type': 'crisis', 'message': CRISIS_TEXT}, ensure_ascii=False) + '\n'
            yield json.dumps({'type': 'done'}, ensure_ascii=False) + '\n'
        return StreamingResponse(urgent(), media_type='application/x-ndjson', headers={'Cache-Control': 'no-cache'})
    if data.mode == 'sources':
        raise HTTPException(503, 'Поиск по сохранённым источникам пока недоступен: материалы ещё не проверены и не опубликованы.')
    if not settings.ai_key:
        raise HTTPException(503, 'Ключ Yandex AI Studio не настроен')
    with connect() as db:
        chat = read_chat(db, chat_id, user['id'])
        if any(item['role'] not in ('user', 'assistant') for item in chat['messages']):
            raise HTTPException(400, 'Некорректная история чата')
        replace_row = None
        if data.replace_message_id:
            rows = db.execute('SELECT * FROM messages WHERE chat_id=? ORDER BY created_at, id', (chat_id,)).fetchall()
            positions = [i for i, row in enumerate(rows) if row['id'] == data.replace_message_id]
            if not positions:
                raise HTTPException(404, 'Сообщение не найдено')
            position = positions[0]
            target = rows[position]
            if target['role'] == 'assistant':
                if position != len(rows) - 1 or position == 0 or rows[position-1]['role'] != 'user' or data.text.strip() != rows[position-1]['text']:
                    raise HTTPException(409, 'Можно перегенерировать только последний ответ')
                history_rows = rows[:position]
            else:
                if target['role'] != 'user' or position < len(rows) - 2 or any(row['role'] != 'assistant' for row in rows[position+1:]):
                    raise HTTPException(409, 'Можно изменить только последнее сообщение')
                history_rows = rows[:position]
            replace_row = (target['created_at'], target['id'])
            history = [{'role': row['role'], 'content': row['text']} for row in history_rows]
            if target['role'] == 'user': history.append({'role': 'user', 'content': data.text.strip()})
        else:
            message_id = str(uuid.uuid4())
            db.execute('INSERT INTO messages VALUES(?,?,?,?,?,?)', (message_id, chat_id, 'user', data.text.strip(), data.mode, time.time()))
            db.execute('UPDATE chats SET updated_at=? WHERE id=?', (time.time(), chat_id))
            history = [{'role': item['role'], 'content': item['text']} for item in chat['messages']]
            history.append({'role': 'user', 'content': data.text.strip()})
    payload = {'model': f'gpt://{settings.ai_folder}/deepseek-v4.1-flash', 'instructions': INSTRUCTIONS, 'input': history, 'tools': [CRISIS_TOOL, PUBLIC_EVIDENCE_TOOL], 'tool_choice': 'auto', 'parallel_tool_calls': False, 'stream': True, 'store': False}
    if data.mode == 'web':
        payload['instructions'] += '\n\nПользователь явно выбрал режим «Веб». Для поиска информации можешь использовать открытые интернет-источники без фиксированного списка доменов. Не утверждай, что данные проверены по оригиналу, если ты этого не сделал. Не выдумывай источники.\n'
        payload['tools'] = [CRISIS_TOOL, {'type': 'web_search', 'search_context_size': 'medium'}]
    async def generate():
        answer = ''
        writing = False
        try:
            yield json.dumps({'type': 'status', 'message': 'Готовлю ответ'}, ensure_ascii=False) + '\n'
            if len(history) > 1:
                yield json.dumps({'type': 'status', 'message': 'Учитываю историю разговора'}, ensure_ascii=False) + '\n'
            async with httpx.AsyncClient(timeout=httpx.Timeout(120.0, connect=15.0)) as client:
                for attempt in range(2):
                    completed = False
                    crisis = False
                    evidence = None
                    async with client.stream('POST', 'https://ai.api.cloud.yandex.net/v1/responses', headers={'Authorization': f'Api-Key {settings.ai_key}', 'x-project': settings.ai_folder}, json=payload) as response:
                        response.raise_for_status()
                        async for line in response.aiter_lines():
                            if not line.startswith('data:'):
                                continue
                            raw = line[5:].strip()
                            if not raw or raw == '[DONE]':
                                continue
                            event = json.loads(raw)
                            kind = event.get('type')
                            if kind == 'response.output_text.delta':
                                if not writing:
                                    writing = True
                                    yield json.dumps({'type': 'status', 'message': 'Формулирую ответ'}, ensure_ascii=False) + '\n'
                                delta = event.get('delta', '')
                                answer += delta
                                yield json.dumps({'type': 'delta', 'text': delta}, ensure_ascii=False) + '\n'
                            elif kind == 'response.web_search_call.in_progress':
                                yield json.dumps({'type': 'status', 'message': 'Ищу материалы в интернете'}, ensure_ascii=False) + '\n'
                            elif kind == 'response.web_search_call.completed':
                                yield json.dumps({'type': 'status', 'message': 'Поиск завершён, анализирую найденное'}, ensure_ascii=False) + '\n'
                            elif kind == 'response.output_item.done':
                                item = event.get('item')
                                if valid_crisis_call(item):
                                    crisis = True
                                elif evidence_topic(item):
                                    evidence = item
                            elif kind == 'response.completed':
                                completed = True
                            elif kind in ('response.failed', 'error'):
                                raise ValueError('Ошибка генерации ответа')
                    if crisis:
                        yield json.dumps({'type': 'crisis', 'message': CRISIS_TEXT}, ensure_ascii=False) + '\n'
                        yield json.dumps({'type': 'done'}, ensure_ascii=False) + '\n'
                        return
                    if not completed:
                        raise ValueError('Модель не завершила ответ')
                    if evidence and attempt == 0 and not answer:
                        topic = evidence_topic(evidence)
                        call_id = evidence.get('call_id')
                        if not isinstance(call_id, str) or not call_id:
                            raise ValueError('Некорректный вызов поиска')
                        yield json.dumps({'type': 'status', 'message': 'Ищу и оцениваю источники'}, ensure_ascii=False) + '\n'
                        try:
                            result = await public_evidence(client, topic)
                        except (httpx.HTTPError, ValueError):
                            result = {'status': 'unavailable', 'message': 'Поиск источников сейчас недоступен. Сообщи об этом и не придумывай ссылки.'}
                        payload['input'] = history + [{'type': 'function_call', 'call_id': call_id, 'name': 'search_public_evidence', 'arguments': evidence['arguments']}, {'type': 'function_call_output', 'call_id': call_id, 'output': json.dumps(result, ensure_ascii=False)}]
                        payload['tools'] = [CRISIS_TOOL]
                        yield json.dumps({'type': 'status', 'message': 'Готовлю ответ на основе найденных материалов'}, ensure_ascii=False) + '\n'
                        continue
                    if not answer:
                        raise ValueError('Модель не вернула ответ')
                    break
            with connect() as db:
                if db.execute('SELECT 1 FROM chats WHERE id=? AND user_id=?', (chat_id, user['id'])).fetchone():
                    if replace_row is not None:
                        current = db.execute('SELECT id FROM messages WHERE chat_id=? AND id=?', (chat_id, data.replace_message_id)).fetchone()
                        tail = db.execute('SELECT id FROM messages WHERE chat_id=? AND (created_at>? OR (created_at=? AND id>=?)) ORDER BY created_at,id', (chat_id, replace_row[0], replace_row[0], replace_row[1])).fetchall()
                        if not current or [row['id'] for row in tail] != [row['id'] for row in rows[position:]]:
                            raise ValueError('История диалога изменилась')
                        db.execute('DELETE FROM messages WHERE chat_id=? AND (created_at>? OR (created_at=? AND id>=?))', (chat_id, replace_row[0], replace_row[0], replace_row[1]))
                        if target['role'] == 'user':
                            db.execute('INSERT INTO messages VALUES(?,?,?,?,?,?)', (str(uuid.uuid4()), chat_id, 'user', data.text.strip(), data.mode, time.time()))
                    db.execute('INSERT INTO messages VALUES(?,?,?,?,?,?)', (str(uuid.uuid4()), chat_id, 'assistant', answer, data.mode, time.time()))
            title = await generate_title(chat_id, user['id'], history, answer)
            if title: yield json.dumps({'type': 'title', 'title': title}, ensure_ascii=False) + '\n'
            yield json.dumps({'type': 'done'}, ensure_ascii=False) + '\n'
        except (httpx.HTTPError, ValueError, json.JSONDecodeError):
            yield json.dumps({'type': 'error', 'message': 'Не удалось получить полный ответ модели. Попробуйте ещё раз.'}, ensure_ascii=False) + '\n'
    return StreamingResponse(generate(), media_type='application/x-ndjson', headers={'Cache-Control': 'no-cache', 'X-Accel-Buffering': 'no'})
