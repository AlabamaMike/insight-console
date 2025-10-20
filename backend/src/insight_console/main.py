from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .routers import deals, documents, analysis

app = FastAPI(
    title="Insight Console API",
    description="AI-powered PE deal analysis platform",
    version="0.1.0"
)

# CORS middleware for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(deals.router)
app.include_router(documents.router)
app.include_router(analysis.router)

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "service": "insight-console"}
