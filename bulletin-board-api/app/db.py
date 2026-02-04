from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine


def create_engine(database_url: str, echo: bool = False):
    return create_async_engine(
        database_url,
        echo=echo,
        pool_size=20,
        max_overflow=10,
        pool_pre_ping=True,
    )


def create_session_factory(engine) -> async_sessionmaker[AsyncSession]:
    return async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
