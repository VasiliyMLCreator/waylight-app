FROM node:22-alpine AS frontend
WORKDIR /frontend
COPY WayLight/package.json WayLight/package-lock.json ./
RUN npm ci
COPY WayLight/index.html ./
COPY WayLight/public ./public
COPY WayLight/src ./src
COPY WayLight/vite.config.js ./
RUN npm run build

FROM python:3.12-slim
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1 FRONTEND_DIST=/app/frontend DATABASE_PATH=/data/access.db SESSION_COOKIE_SECURE=true
WORKDIR /app
COPY WayLightBackendServices/AccessControlService/pyproject.toml ./
COPY WayLightBackendServices/AccessControlService/app ./app
RUN pip install --no-cache-dir . && useradd --create-home --uid 10001 waylight && mkdir /data && chown waylight /data
COPY --from=frontend /frontend/dist /app/frontend
USER waylight
EXPOSE 8000
CMD ["sh", "-c", "exec uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
