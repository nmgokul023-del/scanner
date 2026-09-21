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

class DroneUploadService:
    @staticmethod
    async def save_uploaded_file(file: UploadFile, dataset_id: str) -> Dict[str, Any]:
        os.makedirs(UPLOAD_ROOT, exist_ok=True)
        dataset_dir = os.path.join(UPLOAD_ROOT, dataset_id)
        os.makedirs(dataset_dir, exist_ok=True)
        
        safe_name = sanitize_filename(file.filename or "uploaded_file.tif")
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
                        detail=f"File exceeds maximum allowed size of 5 GB (Received: {total_bytes} bytes)."
                    )
                await out_file.write(chunk)
                
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
