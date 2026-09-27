import os
import cv2
import numpy as np
from typing import Dict, Any, List, Optional

WEIGHTS_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "models", "weights")

# Configurable Semantic Classes (Part 7)
CLASS_DEFINITIONS = {
    0: {"name": "Background", "color": "#000000", "is_feature": False},
    1: {"name": "Building", "color": "#3b82f6", "is_feature": True},
    2: {"name": "Road", "color": "#64748b", "is_feature": True},
    3: {"name": "Vegetation", "color": "#22c55e", "is_feature": True},
    4: {"name": "Water", "color": "#06b6d4", "is_feature": True},
    5: {"name": "Open Land", "color": "#eab308", "is_feature": True},
}

class AIModelInterface:
    """
    Abstract / Base Interface for Cadastral AI Segmentation Models.
    Allows swappable deep-learning architectures (U-Net, SegFormer, YOLO-Seg, DeepLabV3+).
    """
    def load_model(self, weights_path: str) -> bool:
        raise NotImplementedError

    def predict(self, image: np.ndarray) -> Dict[str, Any]:
        raise NotImplementedError

    def get_info(self) -> Dict[str, Any]:
        raise NotImplementedError


class SegmentationModel(AIModelInterface):
    """
    Production Deep Learning Segmentation Model Implementation.
    - Inspects backend/models/weights/ for trained neural weights (.onnx, .pt, .pth).
    - If weights are missing: strictly returns 'AI MODEL NOT AVAILABLE' with zero fake confidence or polygons.
    - If weights are loaded: runs actual neural inference on image pixels.
    """
    _instance = None

    def __init__(self):
        self.weights_path = None
        self.weights_loaded = False
        self.net = None
        self.model_framework = None
        self.model_name = "AI Segmentation Interface"
        self.check_and_load_weights()

    @classmethod
    def get_instance(cls):
        if cls._instance is None:
            cls._instance = cls()
        else:
            cls._instance.check_and_load_weights()
        return cls._instance

    def _discover_weights(self) -> Optional[str]:
        if not os.path.exists(WEIGHTS_DIR):
            os.makedirs(WEIGHTS_DIR, exist_ok=True)
            return None
        valid_exts = (".onnx", ".pt", ".pth", ".h5", ".bin", ".safetensors", ".engine")
        for f in os.listdir(WEIGHTS_DIR):
            if f.endswith(valid_exts):
                full_path = os.path.join(WEIGHTS_DIR, f)
                if os.path.getsize(full_path) > 0:
                    return full_path
        return None

    def check_and_load_weights(self) -> bool:
        discovered = self._discover_weights()
        if not discovered:
            self.weights_path = None
            self.weights_loaded = False
            self.net = None
            self.model_framework = None
            self.model_name = "No Model Loaded"
            return False
        
        if self.weights_loaded and self.weights_path == discovered and self.net is not None:
            return True
            
        return self.load_model(discovered)

    def has_weights(self) -> bool:
        self.check_and_load_weights()
        return self.weights_loaded and self.net is not None

    def load_model(self, weights_path: str) -> bool:
        if not weights_path or not os.path.exists(weights_path):
            self.weights_loaded = False
            self.net = None
            return False
        
        ext = os.path.splitext(weights_path)[1].lower()
        try:
            if ext == ".onnx":
                self.net = cv2.dnn.readNetFromONNX(weights_path)
                self.model_framework = "OpenCV DNN / ONNX U-Net"
                self.model_name = os.path.basename(weights_path)
                self.weights_path = weights_path
                self.weights_loaded = True
                return True
            elif ext in (".pt", ".pth"):
                try:
                    import torch
                    self.net = torch.jit.load(weights_path, map_location="cpu")
                    self.net.eval()
                    self.model_framework = "PyTorch TorchScript"
                    self.model_name = os.path.basename(weights_path)
                    self.weights_path = weights_path
                    self.weights_loaded = True
                    return True
                except Exception:
                    self.weights_loaded = False
                    self.net = None
                    return False
        except Exception:
            self.weights_loaded = False
            self.net = None
            return False
        return False

    def predict(self, image: np.ndarray) -> Dict[str, Any]:
        """
        Runs real neural inference on RGB drone image.
        If weights are not present: returns explicit 'AI MODEL NOT AVAILABLE' status.
        Does NOT generate simulated results or fake confidence.
        """
        self.check_and_load_weights()
        
        if not self.weights_loaded or self.net is None:
            return {
                "status": "AI MODEL NOT AVAILABLE",
                "message": "Trained segmentation model weights are required for real AI extraction.",
                "model_status": "AI MODEL NOT INSTALLED",
                "model_name": "No Model Loaded",
                "method": "None",
                "framework": "None",
                "detail": "Trained segmentation model weights are required for real AI extraction.",
                "weights_file": None,
                "masks": {},
                "confidence": None,
                "is_trained_ai": False
            }

        try:
            h, w = image.shape[:2]
            
            if len(image.shape) == 2:
                img_rgb = cv2.cvtColor(image, cv2.COLOR_GRAY2RGB)
            elif image.shape[2] == 4:
                img_rgb = cv2.cvtColor(image, cv2.COLOR_BGRA2RGB)
            else:
                img_rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
                
            blob = cv2.dnn.blobFromImage(
                img_rgb,
                scalefactor=1.0 / 255.0,
                size=(512, 512),
                mean=(0, 0, 0),
                swapRB=False,
                crop=False
            )
            
            self.net.setInput(blob)
            preds = self.net.forward()  # Expected shape: [1, 6, 512, 512]
            
            if preds is None or len(preds.shape) != 4 or preds.shape[1] < 6:
                raise ValueError("Model output format mismatch: expected [1, 6, 512, 512]")

            probs = preds[0]  # [6, 512, 512]
            class_map = np.argmax(probs, axis=0).astype(np.uint8)  # [512, 512]
            
            masks = {}
            confidences = {}
            class_keys = {
                1: "building",
                2: "road",
                3: "vegetation",
                4: "water",
                5: "open_land"
            }
            
            for cid, key in class_keys.items():
                binary_512 = (class_map == cid).astype(np.uint8) * 255
                binary_full = cv2.resize(binary_512, (w, h), interpolation=cv2.INTER_NEAREST)
                masks[key] = binary_full
                
                class_pixels = (class_map == cid)
                if np.any(class_pixels):
                    confidences[key] = round(float(np.mean(probs[cid][class_pixels])), 4)
                else:
                    confidences[key] = None

            fg_pixels = (class_map > 0)
            if np.any(fg_pixels):
                max_probs = np.max(probs, axis=0)
                overall_conf = round(float(np.mean(max_probs[fg_pixels])), 4)
            else:
                overall_conf = None

            return {
                "status": "Inference Completed",
                "model_status": "REAL AI PROCESSING",
                "model_name": self.model_name,
                "framework": self.model_framework,
                "weights_file": os.path.basename(self.weights_path) if self.weights_path else None,
                "masks": masks,
                "class_confidences": confidences,
                "confidence": overall_conf,
                "is_trained_ai": True
            }
        except Exception as e:
            return {
                "status": "AI FAILURE",
                "message": f"AI inference failed: {str(e)}",
                "model_status": "ERROR",
                "model_name": self.model_name,
                "method": "None",
                "framework": self.model_framework,
                "detail": str(e),
                "weights_file": os.path.basename(self.weights_path) if self.weights_path else None,
                "masks": {},
                "confidence": None,
                "is_trained_ai": False
            }

    def get_model_status(self) -> str:
        self.check_and_load_weights()
        return "READY" if self.weights_loaded else "AI MODEL NOT AVAILABLE"

    def has_weights(self) -> bool:
        self.check_and_load_weights()
        return self.weights_loaded

    @property
    def is_development_mode(self) -> bool:
        return not self.has_weights()

    def get_info(self) -> Dict[str, Any]:
        self.check_and_load_weights()
        return {
            "weights_loaded": self.weights_loaded,
            "weights_path": self.weights_path,
            "model_name": self.model_name,
            "status": self.get_model_status(),
            "framework": self.model_framework,
            "classes": CLASS_DEFINITIONS,
            "weights_directory": WEIGHTS_DIR
        }

AIModel = SegmentationModel
ai_model = SegmentationModel.get_instance()
