import re
from datetime import date

def public_user(user):
    return {key: user[key] for key in ('id', 'email', 'name', 'first_name', 'last_name', 'login', 'gender', 'birthday', 'phone', 'avatar_url', 'role')}

def yandex_profile(data):
    avatar = data.get('default_avatar_id')
    avatar_url = f'https://avatars.yandex.net/get-yapic/{avatar}/islands-200' if isinstance(avatar, str) and re.fullmatch(r'[A-Za-z0-9_-]{1,80}/[A-Za-z0-9_-]{1,80}', avatar) and not data.get('is_avatar_empty', False) else None
    phone = data.get('default_phone')
    birthday = data.get('birthday')
    try:
        birthday = date.fromisoformat(birthday).isoformat() if birthday else None
    except (TypeError, ValueError):
        birthday = None
    return {
        'email': data.get('default_email'), 'name': data.get('display_name') or data.get('real_name') or data.get('first_name') or data.get('login') or 'Пользователь',
        'first_name': data.get('first_name'), 'last_name': data.get('last_name'), 'login': data.get('login'),
        'gender': data.get('sex'), 'birthday': birthday, 'phone': phone.get('number') if isinstance(phone, dict) else None, 'avatar_url': avatar_url,
    }
