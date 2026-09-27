import os
import sys

# Ensure project root is in sys.path so 'backend' package is always resolvable
CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.dirname(CURRENT_DIR)
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

from fastapi import FastAPI, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
from backend.routes.api_router import router as api_router

app = FastAPI(
    title="UrbanCadastral AI API",
    description="AI-Based Automated Urban Parcel Mapping and Cadastral Feature Extraction System using Drone Imagery",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://127.0.0.1:5173",
        "http://localhost:5173",
        "http://127.0.0.1:8000",
        "http://localhost:8000",
        "*"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router, prefix="/api")

# Serve Frontend static assets if built
DIST_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "frontend", "dist")

# Downloadable built project zip endpoint
PROJECT_ROOT = os.path.dirname(CURRENT_DIR)
ZIP_FILE = os.path.join(PROJECT_ROOT, "UrbanCadastral_Build.zip")

@app.get("/download-zip")
@app.get("/api/download-zip")
def download_zip():
    if os.path.exists(ZIP_FILE):
        return FileResponse(
            ZIP_FILE,
            media_type="application/zip",
            filename="UrbanCadastral_Build.zip"
        )
    raise HTTPException(status_code=404, detail="Build zip file not found")

if os.path.exists(DIST_DIR):
    app.mount("/assets", StaticFiles(directory=os.path.join(DIST_DIR, "assets")), name="assets")

    @app.get("/{full_path:path}")
    def serve_frontend(full_path: str):
        file_path = os.path.join(DIST_DIR, full_path)
        if os.path.exists(file_path) and os.path.isfile(file_path):
            return FileResponse(file_path)
        return FileResponse(os.path.join(DIST_DIR, "index.html"))
else:
    @app.get("/")
    def root():
        return {
            "service": "UrbanCadastral AI Backend",
            "status": "online",
            "version": "1.0.0",
            "docs": "/docs"
        }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.main:app", host="127.0.0.1", port=8000, reload=True)
