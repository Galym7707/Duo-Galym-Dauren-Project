from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api import routes
from app.db import init_database


@asynccontextmanager
async def lifespan(_: FastAPI):
    init_database()
    routes.pipeline_scheduler.start()
    try:
        yield
    finally:
        routes.pipeline_scheduler.shutdown()


app = FastAPI(
    title="Saryna MRV API",
    version="0.1.0",
    summary="Methane and flaring workflow API for the contest MVP.",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(routes.router)


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}
