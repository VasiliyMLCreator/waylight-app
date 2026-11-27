import sqlite3
import re
from pathlib import Path
from app.core.config import settings

class PostgresConnection:
    def __init__(self, url):
        import psycopg
        from psycopg.rows import dict_row
        self.connection = psycopg.connect(url, row_factory=dict_row)

    def execute(self, query, params=()):
        if isinstance(params, dict):
            query = re.sub(r':([a-zA-Z_][a-zA-Z_0-9]*)', r'%(\1)s', query)
        else:
            query = query.replace('?', '%s')
        return self.connection.execute(query, params)

    def __enter__(self):
        return self

    def __exit__(self, kind, value, traceback):
        try:
            if kind:
                self.connection.rollback()
            else:
                self.connection.commit()
        finally:
            self.connection.close()

def connect():
    if settings.database_url:
        return PostgresConnection(settings.database_url)
    db_path = Path(settings.database_path)
    db_path.parent.mkdir(parents=True, exist_ok=True)
    db = sqlite3.connect(db_path, timeout=10)
    db.row_factory = sqlite3.Row
    db.execute('PRAGMA foreign_keys = ON')
    return db

def initialize():
    with connect() as db:
        schema = '''
        CREATE TABLE IF NOT EXISTS users (
            id TEXT PRIMARY KEY, email TEXT COLLATE NOCASE UNIQUE, password_hash TEXT,
            name TEXT NOT NULL DEFAULT '', first_name TEXT, last_name TEXT, login TEXT,
            gender TEXT, birthday TEXT, phone TEXT, avatar_url TEXT,
            yandex_id TEXT UNIQUE, created_at INTEGER NOT NULL
        );
        CREATE TABLE IF NOT EXISTS sessions (
            token_hash TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            expires_at INTEGER NOT NULL
        );
        CREATE TABLE IF NOT EXISTS chats (
            id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            title TEXT NOT NULL, pinned INTEGER NOT NULL DEFAULT 0, updated_at REAL NOT NULL
        );
        CREATE TABLE IF NOT EXISTS messages (
            id TEXT PRIMARY KEY, chat_id TEXT NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
            role TEXT NOT NULL, text TEXT NOT NULL, mode TEXT NOT NULL DEFAULT 'classic', created_at REAL NOT NULL
        );
        CREATE INDEX IF NOT EXISTS messages_chat_idx ON messages(chat_id, created_at);
        CREATE TABLE IF NOT EXISTS stories (
            id TEXT PRIMARY KEY, author_id TEXT REFERENCES users(id) ON DELETE SET NULL,
            title TEXT NOT NULL, body TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'pending',
            file_id TEXT, index_status TEXT, moderator_id TEXT REFERENCES users(id) ON DELETE SET NULL,
            created_at REAL NOT NULL, updated_at REAL NOT NULL
        );
        CREATE TABLE IF NOT EXISTS oauth_states (
            state_hash TEXT PRIMARY KEY, expires_at INTEGER NOT NULL
        );
        '''
        if settings.database_url:
            schema = schema.replace('TEXT COLLATE NOCASE UNIQUE', 'TEXT UNIQUE').replace(' REAL ', ' DOUBLE PRECISION ')
            for statement in schema.split(';'):
                if statement.strip():
                    db.execute(statement)
            db.execute('CREATE UNIQUE INDEX IF NOT EXISTS users_email_ci_idx ON users (lower(email))')
            db.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'user'")
            db.execute('ALTER TABLE chats ADD COLUMN IF NOT EXISTS title_manual INTEGER NOT NULL DEFAULT 0')
            return
        db.executescript(schema)
        user_columns = {row['name'] for row in db.execute('PRAGMA table_info(users)')}
        if 'role' not in user_columns:
            db.execute("ALTER TABLE users ADD COLUMN role TEXT NOT NULL DEFAULT 'user'")
        chat_columns = {row['name'] for row in db.execute('PRAGMA table_info(chats)')}
        if 'title_manual' not in chat_columns:
            db.execute('ALTER TABLE chats ADD COLUMN title_manual INTEGER NOT NULL DEFAULT 0')
