import json
import re
from pathlib import Path

PROMPT = Path(__file__).resolve().parents[1].joinpath('data', 'luchik.md').read_text(encoding='utf-8').split('\n## 9. ', 1)[0]
INSTRUCTIONS = PROMPT + '\n\nКогда веб-поиск явно выбран пользователем, используй доступные открытые источники без фиксированного перечня сайтов. Не выдавай непроверенные утверждения за факты. Источники оформляй рядом с соответствующим утверждением как Markdown-ссылки с кратким настоящим названием статьи: [Название статьи](https://адрес). Не выдумывай названия и адреса; если название неизвестно, используй название сайта. Для HTML-схем используй монохромный дизайн ВайЛайт: чёрный фон, белый и серый текст, скруглённые карточки и плавные границы. Не используй исполняемый код, внешние ресурсы и персональные данные.\n' + '\n\nВ этой версии приложения поиск по внутренним историям и материалам, создание PDF и извлечение цитат недоступны. Для наглядной схемы можешь вывести безопасный статический блок waylight-diagram, если он уместен и достаточно подтверждённых данных; интерфейс отображает его изолированно. Для запрошенной биологической схемы можешь вызвать search_public_evidence, но только по одному из общих биологических направлений; интернет-поиск не используется для поиска похожих личных историй. Не утверждай, что они выполнены. При просьбе о них сообщи об ограничении и предложи текстовую помощь. В непосредственной опасности не выводи служебный JSON: вызови show_crisis_screen. Если функция недоступна, немедленно напиши человеку обратиться в местную экстренную службу и к человеку рядом.'
CRISIS_TEXT = 'Сейчас позвоните в местную экстренную службу. Если рядом есть человек, которому вы доверяете, попросите его остаться с вами или позвонить за вас. Если это безопасно, отойдите от источника опасности.'
CRISIS_TOOL = {'type': 'function', 'name': 'show_crisis_screen', 'description': 'Показать срочную помощь при непосредственной опасности.', 'parameters': {'type': 'object', 'properties': {'health_threat': {'type': 'boolean', 'enum': [True]}, 'activate_crisis_measures': {'type': 'boolean', 'enum': [True]}}, 'required': ['health_threat', 'activate_crisis_measures'], 'additionalProperties': False}, 'strict': True}


def explicit_immediate_crisis(text):
    text = text.casefold().replace('ё', 'е')
    patterns = [
        r'\b(?:прямо сейчас|уже)\b.{0,90}\b(?:покончу с собой|убью себя|причиню себе вред|принял[аи]? таблетки|выпил[аи]? таблетки)\b',
        r'\b(?:покончу с собой|убью себя|причиню себе вред)\b.{0,90}\b(?:сейчас|прямо сейчас|сегодня)\b',
        r'\b(?:я |мне )?(?:только что )?(?:принял[аи]?|выпил[аи]?)\b.{0,50}\b(?:передозировк\w*|яд|отрав\w*)\b',
    ]
    return any(re.search(pattern, text, re.DOTALL) for pattern in patterns)


def valid_crisis_call(item):
    if not isinstance(item, dict) or item.get('type') != 'function_call' or item.get('name') != 'show_crisis_screen':
        return False
    try:
        arguments = json.loads(item.get('arguments', ''))
    except (TypeError, ValueError):
        return False
    return isinstance(arguments, dict) and set(arguments) == {'health_threat', 'activate_crisis_measures'} and all(value is True for value in arguments.values())


PUBLIC_TOPICS = {
    'sleep': 'Общие физиологические механизмы сна и бодрствования',
    'stress_response': 'Общие физиологические механизмы реакции организма на стресс',
    'nervous_system': 'Общие функции автономной нервной системы',
    'endocrine_system': 'Общие функции эндокринной системы и регуляции гормонов',
}
PUBLIC_EVIDENCE_TOOL = {'type': 'function', 'name': 'search_public_evidence', 'description': 'Поиск общих научных источников только для явно запрошенной биологической схемы. Не передавай данные пользователя.', 'parameters': {'type': 'object', 'properties': {'topic': {'type': 'string', 'enum': list(PUBLIC_TOPICS)}}, 'required': ['topic'], 'additionalProperties': False}, 'strict': True}


def evidence_topic(item):
    if not isinstance(item, dict) or item.get('type') != 'function_call' or item.get('name') != 'search_public_evidence':
        return None
    try:
        arguments = json.loads(item.get('arguments', ''))
    except (TypeError, ValueError):
        return None
    if not isinstance(arguments, dict) or set(arguments) != {'topic'}:
        return None
    topic = arguments.get('topic')
    return topic if isinstance(topic, str) and topic in PUBLIC_TOPICS else None
