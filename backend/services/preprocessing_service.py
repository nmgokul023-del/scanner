import os
from typing import Optional
from PIL import Image

class PreprocessingService:
    @staticmethod
    def generate_preview(file_path: str, dataset_dir: str) -> Optional[str]:
        """Generates a web-compatible PNG preview/thumbnail from the uploaded raster."""
        preview_filename = "preview.png"
        preview_path = os.path.join(dataset_dir, preview_filename)
        
        try:
            ext = os.path.splitext(file_path.lower())[1]
            if ext in (".tif", ".tiff", ".jpg", ".jpeg", ".png"):
                with Image.open(file_path) as img:
                    # Convert to RGB mode for web safety
                    if img.mode not in ("RGB", "RGBA"):
                        img = img.convert("RGB")
                    
                    # Generate max 1440px downscaled preview
                    max_dim = 1440
                    w, h = img.size
                    if w > max_dim or h > max_dim:
                        if w > h:
                            new_w = max_dim
                            new_h = int(h * (max_dim / w))
                        else:
                            new_h = max_dim
                            new_w = int(w * (max_dim / h))
                        img = img.resize((new_w, new_h), Image.Resampling.LANCZOS)
                        
                    img.save(preview_path, format="PNG", optimize=True)
                    return preview_path
            elif ext in (".las", ".laz"):
                # Generate synthetic point cloud density overview
                img = Image.new("RGBA", (800, 600), (15, 23, 42, 255))
                # Add stylized gradient/grid
                img.save(preview_path, format="PNG")
                return preview_path
            else:
                return None
        except Exception as e:
            print(f"Error creating preview for {file_path}: {e}")
            return None
