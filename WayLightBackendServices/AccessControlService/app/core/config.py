import os
from pathlib import Path
from dotenv import load_dotenv

load_dotenv(Path(__file__).resolve().parents[2] / '.env')

class Settings:
    app_origin = os.getenv('APP_ORIGIN', 'http://127.0.0.1:5180').rstrip('/')
    yandex_client_id = os.getenv('YANDEX_CLIENT_ID', '').strip()
    yandex_client_secret = os.getenv('YANDEX_CLIENT_SECRET', '').strip()
    yandex_redirect_uri = os.getenv('YANDEX_REDIRECT_URI', 'http://127.0.0.1:5180/').strip()
    ai_key = os.getenv('YANDEX_AI_API_KEY', '').strip()
    ai_folder = os.getenv('YANDEX_AI_FOLDER_ID', 'b1gfeo7801rsf6bem9k3').strip()
    ai_index = os.getenv('YANDEX_AI_INDEX_ID', 'fvthfc9l6j7gulnlo8f8').strip()
    ai_prompt = os.getenv('YANDEX_AI_PROMPT_ID', 'fvt8a76670rent0le1ti').strip()
    cookie_secure = os.getenv('SESSION_COOKIE_SECURE', 'false').lower() == 'true'
    database_path = os.getenv('DATABASE_PATH', './data/access.db')

settings = Settings()
