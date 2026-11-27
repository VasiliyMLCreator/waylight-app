import hashlib
import secrets
import time
from argon2 import PasswordHasher
from argon2.exceptions import VerifyMismatchError, VerificationError, InvalidHashError
from fastapi import HTTPException, Request, Response
from app.core.config import settings
from app.repositories.database import connect

hasher = PasswordHasher()
SESSION_SECONDS = 60 * 60 * 24 * 30

def digest(value):
    return hashlib.sha256(value.encode()).hexdigest()

def verify_password(stored, password):
    try:
        return bool(stored) and hasher.verify(stored, password)
    except (VerifyMismatchError, VerificationError, InvalidHashError):
        return False

def require_origin(request: Request):
    if request.method not in ('GET', 'HEAD', 'OPTIONS') and request.headers.get('origin') != settings.app_origin:
        raise HTTPException(403, 'Недопустимый источник запроса')

def issue_session(response: Response, user_id: str):
    token = secrets.token_urlsafe(32)
    now = int(time.time())
    with connect() as db:
        db.execute('DELETE FROM sessions WHERE expires_at <= ?', (now,))
        db.execute('INSERT INTO sessions VALUES (?, ?, ?)', (digest(token), user_id, now + SESSION_SECONDS))
    response.set_cookie('waylight_session', token, max_age=SESSION_SECONDS, httponly=True, secure=settings.cookie_secure, samesite='lax', path='/')

def current_user(request: Request):
    token = request.cookies.get('waylight_session', '')
    with connect() as db:
        user = db.execute('SELECT u.* FROM users u JOIN sessions s ON s.user_id=u.id WHERE s.token_hash=? AND s.expires_at>?', (digest(token), int(time.time()))).fetchone() if token else None
    if not user:
        raise HTTPException(401, 'Необходимо войти')
    return user
