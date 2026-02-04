from fastapi import Request
from redis.asyncio import Redis
from sqlalchemy.ext.asyncio import AsyncSession


async def get_db(request: Request) -> AsyncSession:
    async with request.app.state.db_session() as session:
        yield session


async def get_redis(request: Request) -> Redis:
    return request.app.state.redis


async def get_arq_pool(request: Request):
    return request.app.state.arq_pool
