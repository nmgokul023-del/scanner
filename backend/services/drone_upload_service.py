import os
import re
import uuid
import aiofiles
from fastapi import UploadFile, HTTPException
from typing import Dict, Any

UPLOAD_ROOT = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data", "uploads")
MAX_FILE_SIZE = 5 * 1024 * 1024 * 1024  # 5 GB limit

def sanitize_filename(filename: str) -> str:
    # Prevent directory traversal
    clean_name = os.path.basename(filename)
    clean_name = re.sub(r'[^a-zA-Z0-9_.-]', '_', clean_name)
    if not clean_name:
        clean_name = "uploaded_raster.tif"
    return clean_name

def format_file_size(size_bytes: int) -> str:
    if size_bytes >= 1024 * 1024 * 1024:
        return f"{size_bytes / (1024 * 1024 * 1024):.2f} GB"
    elif size_bytes >= 1024 * 1024:
        return f"{size_bytes / (1024 * 1024):.1f} MB"
    elif size_bytes >= 1024:
        return f"{size_bytes / 1024:.1f} KB"
    return f"{size_bytes} B"

ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".tif", ".tiff", ".las", ".laz", ".zip", ".geojson", ".json", ".gpkg"}

def validate_magic_bytes(file_path: str, ext: str):
    """Validates binary magic bytes to prevent renamed malicious or corrupted files."""
    try:
        with open(file_path, "rb") as f:
            header = f.read(16)
        if ext in (".jpg", ".jpeg"):
            if not header.startswith(b"\xff\xd8"):
                raise HTTPException(status_code=400, detail="Invalid JPEG image: header signature mismatch.")
        elif ext == ".png":
            if not header.startswith(b"\x89PNG\r\n\x1a\n"):
                raise HTTPException(status_code=400, detail="Invalid PNG image: header signature mismatch.")
        elif ext in (".tif", ".tiff"):
            if not (header.startswith(b"II*\x00") or header.startswith(b"MM\x00*")):
                raise HTTPException(status_code=400, detail="Invalid TIFF/GeoTIFF raster: header signature mismatch.")
        elif ext == ".gpkg":
            if not header.startswith(b"SQLite format 3\x00"):
                raise HTTPException(status_code=400, detail="Invalid GeoPackage file: header signature mismatch.")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed inspecting file header: {str(e)}")

class DroneUploadService:
    @staticmethod
    async def save_uploaded_file(file: UploadFile, dataset_id: str) -> Dict[str, Any]:
        os.makedirs(UPLOAD_ROOT, exist_ok=True)
        dataset_dir = os.path.join(UPLOAD_ROOT, dataset_id)
        os.makedirs(dataset_dir, exist_ok=True)
        
        safe_name = sanitize_filename(file.filename or "uploaded_file.tif")
        ext = os.path.splitext(safe_name.lower())[1]
        
        if ext not in ALLOWED_EXTENSIONS:
            raise HTTPException(
                status_code=400,
                detail=f"Unsupported file format '{ext}'. Allowed formats: JPG, JPEG, PNG, TIFF, GeoTIFF, LAS, LAZ, ZIP."
            )

        file_path = os.path.join(dataset_dir, safe_name)
        
        total_bytes = 0
        chunk_size = 1024 * 1024  # 1 MB chunks
        
        async with aiofiles.open(file_path, 'wb') as out_file:
            while True:
                chunk = await file.read(chunk_size)
                if not chunk:
                    break
                total_bytes += len(chunk)
                if total_bytes > MAX_FILE_SIZE:
                    try:
                        os.remove(file_path)
                    except OSError:
                        pass
                    raise HTTPException(
                        status_code=413,
                        detail=f"File exceeds maximum allowed size of 5 GB (Received: {format_file_size(total_bytes)})."
                    )
                await out_file.write(chunk)
                
        if total_bytes == 0:
            try:
                os.remove(file_path)
            except OSError:
                pass
            raise HTTPException(status_code=400, detail="Uploaded file is empty (0 bytes).")
            
        # Validate magic bytes
        validate_magic_bytes(file_path, ext)
        
        return {
            "dataset_id": dataset_id,
            "original_filename": file.filename or safe_name,
            "storage_filename": safe_name,
            "storage_path": file_path,
            "dataset_dir": dataset_dir,
            "file_size_bytes": total_bytes,
            "file_size_str": format_file_size(total_bytes)
        }

    @staticmethod
    def delete_dataset_files(dataset_id: str) -> bool:
        dataset_dir = os.path.join(UPLOAD_ROOT, dataset_id)
        if os.path.exists(dataset_dir):
            try:
                import shutil
                shutil.rmtree(dataset_dir)
                return True
            except Exception as e:
                print(f"Error removing {dataset_dir}: {e}")
                return False
        return False
