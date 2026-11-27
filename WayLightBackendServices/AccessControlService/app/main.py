from contextlib import asynccontextmanager
import os
from pathlib import Path
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from starlette.exceptions import HTTPException
from app.api.routes import router
from app.api.chats import router as chats_router
from app.api.stories import router as stories_router
from app.repositories.database import initialize

@asynccontextmanager
async def lifespan(app: FastAPI):
    initialize()
    yield

app = FastAPI(title='WayLight Access Control Service', lifespan=lifespan, docs_url=None, redoc_url=None)
app.include_router(router)
app.include_router(chats_router)
app.include_router(stories_router)

class FrontendFiles(StaticFiles):
    async def get_response(self, path, scope):
        try:
            response = await super().get_response(path, scope)
            if response.status_code != 404 or path.startswith('api/'):
                return response
        except HTTPException as exc:
            if exc.status_code != 404 or path.startswith('api/'):
                raise
        return await super().get_response('index.html', scope)

frontend_dist = os.getenv('FRONTEND_DIST')
if frontend_dist and Path(frontend_dist).is_dir():
    app.mount('/', FrontendFiles(directory=frontend_dist, html=True), name='frontend')
