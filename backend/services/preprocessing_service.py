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

    @staticmethod
    def normalize_radiometry(image_np):
        """Applies CLAHE (Contrast Limited Adaptive Histogram Equalization) for photogrammetric normalization."""
        import cv2
        if len(image_np.shape) == 3:
            lab = cv2.cvtColor(image_np, cv2.COLOR_RGB2LAB)
            l, a, b = cv2.split(lab)
            clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
            cl = clahe.apply(l)
            limg = cv2.merge((cl, a, b))
            return cv2.cvtColor(limg, cv2.COLOR_LAB2RGB)
        elif len(image_np.shape) == 2:
            clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
            return clahe.apply(image_np)
        return image_np

    @staticmethod
    def tile_image(image_path: str, tile_size: int = 512, overlap: int = 64):
        """
        Partitions large drone orthomosaics into overlapping tiles for inference.
        Returns tile descriptors with pixel bounding boxes [(x, y, w, h), ...].
        """
        tiles = []
        try:
            with Image.open(image_path) as img:
                w, h = img.size
                step = tile_size - overlap
                for y in range(0, h, step):
                    for x in range(0, w, step):
                        actual_w = min(tile_size, w - x)
                        actual_h = min(tile_size, h - y)
                        tiles.append({
                            "x": x,
                            "y": y,
                            "width": actual_w,
                            "height": actual_h,
                            "bbox": [x, y, x + actual_w, y + actual_h]
                        })
        except Exception as e:
            print(f"Error tiling image {image_path}: {e}")
        return tiles
