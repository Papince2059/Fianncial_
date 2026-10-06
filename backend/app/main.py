# ascend/backend/app/main.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from app.settings import settings
from app.api.health import router as health_router
from app.api.laws import router as laws_router
from app.api.processes import router as processes_router
from app.api.analyses import router as analyses_router
from app.api.feedback import router as feedback_router
from app.api.dashboard import router as dashboard_router

limiter = Limiter(key_func=get_remote_address)

app = FastAPI(title="ASCEND API", version="0.1.0")
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins.split(","),
    allow_methods=["*"],
    allow_headers=["*"],
)

for router in [health_router, laws_router, processes_router, analyses_router, feedback_router, dashboard_router]:
    app.include_router(router)
