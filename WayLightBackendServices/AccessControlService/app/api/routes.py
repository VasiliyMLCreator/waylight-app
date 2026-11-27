import secrets
import sqlite3
import time
import uuid
from urllib.parse import urlencode
import httpx
from fastapi import APIRouter, Depends, HTTPException, Request, Response
from app.api.schemas import Credentials, OAuthCallback, ProfileUpdate, Registration
from app.core.config import settings
from app.core.security import current_user, digest, hasher, issue_session, require_origin, verify_password
from app.repositories.database import connect
from app.services.profiles import public_user, yandex_profile

router = APIRouter(prefix='/api', dependencies=[Depends(require_origin)])
DUMMY_HASH = hasher.hash(secrets.token_urlsafe(32))

@router.post('/auth/register', status_code=201)
def register(data: Registration, response: Response):
    user_id = str(uuid.uuid4())
    try:
        with connect() as db:
            db.execute('INSERT INTO users (id,email,password_hash,name,created_at,role) VALUES (?,?,?,?,?,?)', (user_id, data.email, hasher.hash(data.password), data.name, int(time.time()), data.role))
            user = db.execute('SELECT * FROM users WHERE id=?', (user_id,)).fetchone()
    except sqlite3.IntegrityError:
        raise HTTPException(409, 'Аккаунт с такой почтой уже существует')
    issue_session(response, user_id)
    return public_user(user)

@router.post('/auth/login')
def login(data: Credentials, response: Response):
    with connect() as db:
        user = db.execute('SELECT * FROM users WHERE email=?', (data.email,)).fetchone()
    valid = verify_password(user['password_hash'] if user and user['password_hash'] else DUMMY_HASH, data.password)
    if not user or not user['password_hash'] or not valid:
        raise HTTPException(401, 'Неверная почта или пароль')
    issue_session(response, user['id'])
    return public_user(user)

@router.get('/auth/me')
def me(user=Depends(current_user)):
    return public_user(user)

@router.patch('/profile')
def update_profile(data: ProfileUpdate, user=Depends(current_user)):
    values = data.model_dump()
    values['birthday'] = values['birthday'].isoformat() if values['birthday'] else None
    with connect() as db:
        db.execute('UPDATE users SET name=:name, first_name=:first_name, last_name=:last_name, birthday=:birthday, phone=:phone, gender=:gender WHERE id=:id', {**values, 'id': user['id']})
        updated = db.execute('SELECT * FROM users WHERE id=?', (user['id'],)).fetchone()
    return public_user(updated)

@router.post('/auth/logout', status_code=204)
def logout(request: Request, response: Response):
    token = request.cookies.get('waylight_session', '')
    if token:
        with connect() as db: db.execute('DELETE FROM sessions WHERE token_hash=?', (digest(token),))
    response.delete_cookie('waylight_session', path='/', secure=settings.cookie_secure, httponly=True, samesite='lax')
    response.status_code = 204
    return response

@router.delete('/account', status_code=204)
def delete_account(response: Response, user=Depends(current_user)):
    with connect() as db: db.execute('DELETE FROM users WHERE id=?', (user['id'],))
    response.delete_cookie('waylight_session', path='/', secure=settings.cookie_secure, httponly=True, samesite='lax')
    response.status_code = 204
    return response

@router.post('/auth/yandex/start')
def yandex_start(response: Response):
    if not settings.yandex_client_id or not settings.yandex_client_secret:
        raise HTTPException(503, 'Вход через Яндекс ID ещё не настроен')
    state = secrets.token_urlsafe(32)
    now = int(time.time())
    with connect() as db:
        db.execute('DELETE FROM oauth_states WHERE expires_at <= ?', (now,))
        db.execute('INSERT INTO oauth_states VALUES (?, ?)', (digest(state), now + 600))
    response.set_cookie('waylight_oauth', state, max_age=600, httponly=True, secure=settings.cookie_secure, samesite='lax', path='/api/auth/yandex')
    return {'url': 'https://oauth.yandex.ru/authorize?' + urlencode({'response_type': 'code', 'client_id': settings.yandex_client_id, 'redirect_uri': settings.yandex_redirect_uri, 'state': state})}

@router.post('/auth/yandex/callback')
async def yandex_callback(data: OAuthCallback, request: Request, response: Response):
    cookie = request.cookies.get('waylight_oauth', '')
    if not cookie or not secrets.compare_digest(cookie, data.state): raise HTTPException(400, 'Проверка авторизации не пройдена')
    with connect() as db:
        state = db.execute('DELETE FROM oauth_states WHERE state_hash=? AND expires_at>?', (digest(data.state), int(time.time())))
        if state.rowcount != 1: raise HTTPException(400, 'Запрос авторизации истёк или уже использован')
    if not settings.yandex_client_id or not settings.yandex_client_secret: raise HTTPException(503, 'Вход через Яндекс ID ещё не настроен')
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            token_result = await client.post('https://oauth.yandex.ru/token', data={'grant_type':'authorization_code','code':data.code,'client_id':settings.yandex_client_id,'client_secret':settings.yandex_client_secret})
            token_result.raise_for_status()
            access_token = token_result.json()['access_token']
            profile_result = await client.get('https://login.yandex.ru/info', params={'format':'json'}, headers={'Authorization': f'OAuth {access_token}'})
            profile_result.raise_for_status()
            profile = profile_result.json()
    except (httpx.HTTPError, ValueError, KeyError):
        raise HTTPException(502, 'Не удалось получить данные Яндекс ID')
    if str(profile.get('client_id', '')) != settings.yandex_client_id or not profile.get('id'):
        raise HTTPException(401, 'Не удалось подтвердить данные Яндекс ID')
    ya_id = str(profile['id'])
    fields = yandex_profile(profile)
    email = fields['email'].strip().lower() if isinstance(fields['email'], str) and fields['email'].strip() else None
    fields['email'] = email
    with connect() as db:
        user = db.execute('SELECT * FROM users WHERE yandex_id=?', (ya_id,)).fetchone()
        if user:
            user_id = user['id']
            db.execute('UPDATE users SET avatar_url=? WHERE id=?', (fields['avatar_url'], user_id))
        else:
            if email and db.execute('SELECT id FROM users WHERE email=?', (email,)).fetchone():
                raise HTTPException(409, 'Аккаунт с этой почтой уже существует. Войдите с паролем.')
            user_id = str(uuid.uuid4())
            db.execute('INSERT INTO users (id,email,name,first_name,last_name,login,gender,birthday,phone,avatar_url,yandex_id,created_at) VALUES (:id,:email,:name,:first_name,:last_name,:login,:gender,:birthday,:phone,:avatar_url,:yandex_id,:created_at)', {**fields, 'id':user_id, 'yandex_id':ya_id, 'created_at':int(time.time())})
        user = db.execute('SELECT * FROM users WHERE id=?', (user_id,)).fetchone()
    response.delete_cookie('waylight_oauth', path='/api/auth/yandex', secure=settings.cookie_secure, httponly=True, samesite='lax')
    issue_session(response, user_id)
    return public_user(user)
