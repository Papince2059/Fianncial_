# ascend/backend/app/main.py
import logging
import time
from contextlib import asynccontextmanager
from pathlib import Path
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from app.settings import settings
from app.db.models import Base
from app.db.session import engine
from app.api.health import router as health_router
from app.api.laws import router as laws_router
from app.api.processes import router as processes_router
from app.api.analyses import router as analyses_router
from app.api.feedback import router as feedback_router
from app.api.dashboard import router as dashboard_router
from app.api.proposals import router as proposals_router

# Configure logging to console and file
log_dir = Path("logs")
log_dir.mkdir(parents=True, exist_ok=True)
log_file = log_dir / "ascend.log"

logging.basicConfig(
    level=getattr(logging, settings.log_level.upper(), logging.INFO),
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler(log_file, encoding="utf-8"),
    ],
)
logger = logging.getLogger("ascend")


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Initializing ASCEND backend...")
    # Initialize database extensions and tables
    try:
        async with engine.begin() as conn:
            await conn.execute(text("CREATE EXTENSION IF NOT EXISTS vector"))
            await conn.run_sync(Base.metadata.create_all)
        logger.info("Database schema verified and initialized.")
    except Exception as e:
        logger.error("Failed to initialize database schema: %s", e, exc_info=True)

    # Auto-seed real Dubai laws from the official DOCX if the DB is empty or sparse
    try:
        from sqlalchemy import select, func
        from app.db.models import Law
        from app.db.session import AsyncSessionLocal
        async with AsyncSessionLocal() as session:
            count = (await session.execute(select(func.count()).select_from(Law))).scalar_one()
        if count < 7:
            logger.info(f"Laws table has {count} entries — auto-seeding from official DOCX...")
            docx_candidates = [
                Path("/app/ASCEND_Dubai_Official_Laws_and_Articles_Reference.docx"),
                Path("/app/data/ASCEND_Dubai_Official_Laws_and_Articles_Reference.docx"),
                Path("data/ASCEND_Dubai_Official_Laws_and_Articles_Reference.docx"),
                Path("ASCEND_Dubai_Official_Laws_and_Articles_Reference.docx"),
            ]
            docx_path = next((p for p in docx_candidates if p.exists()), None)
            if docx_path:
                from app.ingestion.seed_laws_from_docx import seed
                await seed(docx_path)
                logger.info("✅ Laws auto-seeded successfully from DOCX.")
            else:
                logger.warning("DOCX not found for auto-seed. Copy it to /app/ and restart.")
        else:
            logger.info(f"Laws table has {count} real laws — no seeding needed.")
    except Exception as e:
        logger.error("Law auto-seed failed: %s", e, exc_info=True)

    yield
    logger.info("ASCEND backend shutting down.")


limiter = Limiter(key_func=get_remote_address)

app = FastAPI(title="ASCEND API", version="0.1.0", lifespan=lifespan)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins.split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def log_requests(request: Request, call_next):
    start_time = time.time()
    path = request.url.path
    method = request.method
    try:
        response = await call_next(request)
        duration_ms = (time.time() - start_time) * 1000
        logger.info(
            f"{method} {path} -> {response.status_code} ({duration_ms:.1f}ms)"
        )
        return response
    except Exception as exc:
        duration_ms = (time.time() - start_time) * 1000
        logger.error(
            f"ERROR handling {method} {path} ({duration_ms:.1f}ms): {exc}",
            exc_info=True,
        )
        raise exc


# Include routers for both direct paths and /api/v1 prefixes
for router in [health_router, laws_router, processes_router, analyses_router, feedback_router, dashboard_router, proposals_router]:
    app.include_router(router)
    app.include_router(router, prefix="/api/v1")

