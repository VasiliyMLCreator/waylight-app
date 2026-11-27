from typing import Optional, Literal
from pydantic import BaseModel, Field, field_validator
from datetime import date
import re

class Credentials(BaseModel):
    email: str = Field(min_length=3, max_length=254)
    password: str = Field(min_length=1, max_length=256)
    @field_validator('email')
    @classmethod
    def valid_email(cls, value):
        value = value.strip().lower()
        if not re.fullmatch(r'[^\s@]+@[^\s@]+\.[^\s@]+', value):
            raise ValueError('Укажите корректную почту')
        return value

class Registration(Credentials):
    role: Literal['user', 'specialist'] = 'user'
    name: str = Field(min_length=1, max_length=100)
    @field_validator('name')
    @classmethod
    def valid_name(cls, value):
        if not value.strip(): raise ValueError('Укажите имя')
        return value.strip()
    @field_validator('password')
    @classmethod
    def valid_password(cls, value):
        if len(value) < 8: raise ValueError('Пароль должен содержать не менее 8 символов')
        return value

class ProfileUpdate(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    first_name: Optional[str] = Field(default=None, max_length=100)
    last_name: Optional[str] = Field(default=None, max_length=100)
    birthday: Optional[date] = None
    phone: Optional[str] = Field(default=None, max_length=30)
    gender: Optional[Literal['male', 'female']] = None
    @field_validator('name')
    @classmethod
    def valid_name(cls, value):
        if not value.strip(): raise ValueError('Укажите имя')
        return value.strip()

class OAuthCallback(BaseModel):
    code: str = Field(min_length=1, max_length=2048)
    state: str = Field(min_length=1, max_length=256)
