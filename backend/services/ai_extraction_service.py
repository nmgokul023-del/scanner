import os
import cv2
import uuid
import math
import numpy as np
from typing import Dict, Any, List, Optional
from shapely.geometry import shape, mapping, Polygon
from backend.services.ai_model_interface import SegmentationModel, CLASS_DEFINITIONS
from backend.services.parcel_extraction import ParcelExtractionService
from backend.services.db_service import DatabaseService

class AIExtractionService:
    @staticmethod
    def _pixel_to_geo(x: float, y: float, w_px: int, h_px: int, bounds: List[List[float]]) -> List[float]:
        """Maps pixel (x, y) to real-world [longitude, latitude]."""
        min_lat, min_lon = bounds[0]
        max_lat, max_lon = bounds[1]
        
        # x corresponds to longitude (horizontal), y to latitude (inverted vertically)
        lon = min_lon + (x / max(1, w_px)) * (max_lon - min_lon)
        lat = max_lat - (y / max(1, h_px)) * (max_lat - min_lat)
        return [round(lon, 6), round(lat, 6)]

    @staticmethod
    def _contours_to_polygons(mask: np.ndarray, bounds: List[List[float]], min_area_px: int = 100) -> List[List[List[float]]]:
        """Extracts vectorized polygon rings from a binary raster mask."""
        h, w = mask.shape[:2]
        contours, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        polygons = []
        for cnt in contours:
            if cv2.contourArea(cnt) < min_area_px:
                continue
            # Simplify contour slightly for clean GIS vector representation
            epsilon = 0.015 * cv2.arcLength(cnt, True)
            approx = cv2.approxPolyDP(cnt, epsilon, True)
            if len(approx) < 3:
                continue
            
            geo_ring = []
            for pt in approx:
                px, py = pt[0]
                geo_ring.append(AIExtractionService._pixel_to_geo(px, py, w, h, bounds))
            # Ensure closed ring
            if geo_ring and geo_ring[0] != geo_ring[-1]:
                geo_ring.append(geo_ring[0])
            if len(geo_ring) >= 4:
                polygons.append(geo_ring)
        return polygons

    @staticmethod
    def extract_cadastral_features(dataset_id: str, bounds: Optional[list] = None, options: Optional[dict] = None, image_path: Optional[str] = None) -> Dict[str, Any]:
        ai_model = SegmentationModel.get_instance()
        
        # 1. Check AI model weights availability - DO NOT SIMULATE IF MISSING
        if not ai_model.has_weights():
            return {
                "status": "AI MODEL NOT AVAILABLE",
                "message": "Trained segmentation model weights are required for real AI extraction.",
                "model_status": "AI MODEL NOT INSTALLED",
                "model_name": "No Model Loaded",
                "is_trained_ai": False,
                "parcels": [],
                "buildings": [],
                "roads": [],
                "land_use": [],
                "building_links": [],
                "conflicts": [],
                "stats": {
                    "parcels_detected": 0,
                    "buildings_extracted": 0,
                    "road_segments": 0,
                    "land_use_polygons": 0,
                    "linked_buildings": 0,
                    "boundary_conflicts": 0,
                    "model_status": "AI MODEL NOT INSTALLED"
                }
            }
        
        # 2. Fetch real image raster from server storage
        dataset = DatabaseService.get_dataset(dataset_id)
        image_np = None
        is_georeferenced = False
        extent_bounds = bounds if bounds else (dataset.get("bounds") if dataset else None)
        
        actual_path = image_path or (dataset.get("storage_path") if dataset else None)
        if not actual_path or not os.path.exists(actual_path):
            return {
                "status": "ERROR",
                "error": "Unable to read raster. File not found on disk.",
                "model_status": ai_model.get_model_status(),
                "parcels": [], "buildings": [], "roads": [], "land_use": [],
                "building_links": [], "conflicts": [], "stats": {}
            }

        try:
            image_np = cv2.imread(actual_path)
            if image_np is None:
                raise ValueError("cv2.imread failed to decode image raster.")
            is_georeferenced = bool(dataset and dataset.get("is_georeferenced") and extent_bounds)
        except Exception as e:
            return {
                "status": "ERROR",
                "error": f"Unable to read raster: {str(e)}",
                "model_status": ai_model.get_model_status(),
                "parcels": [], "buildings": [], "roads": [], "land_use": [],
                "building_links": [], "conflicts": [], "stats": {}
            }

        h_px, w_px = image_np.shape[:2]
        center_lat = (extent_bounds[0][0] + extent_bounds[1][0]) / 2.0 if (is_georeferenced and extent_bounds) else 0.0

        # If unreferenced, create synthetic bounding box in image pixel space
        if not extent_bounds:
            extent_bounds = [[0.0, 0.0], [float(h_px), float(w_px)]]

        # 3. Run Real AI Model Inference
        inference_res = ai_model.predict(image_np)
        if inference_res.get("status") == "AI MODEL NOT AVAILABLE":
            return inference_res

        masks = inference_res.get("masks", {})
        model_status = inference_res.get("model_status", "REAL AI PROCESSING")
        class_confs = inference_res.get("class_confidences", {})
        overall_conf = inference_res.get("confidence")

        # 4. Vectorize Building Contours from Real Segmentation Mask
        buildings = []
        bld_mask = masks.get("building")
        if bld_mask is not None:
            bld_polys = AIExtractionService._contours_to_polygons(bld_mask, extent_bounds, min_area_px=150)
            bld_idx = 1
            for ring in bld_polys:
                try:
                    poly_geom = Polygon(ring)
                    if not poly_geom.is_valid:
                        poly_geom = poly_geom.buffer(0)
                    
                    if is_georeferenced:
                        deg_area = poly_geom.area
                        area_sqm = ParcelExtractionService._deg_to_sqm(deg_area, center_lat)
                        if area_sqm < 15.0:
                            continue
                        area_val = area_sqm
                    else:
                        area_val = None
                    
                    b_id = f"BLD-{dataset_id[-4:] if len(dataset_id) >= 4 else '01'}-{bld_idx:03d}"
                    bld_idx += 1
                    buildings.append({
                        "id": b_id,
                        "parcel_id": "Unassigned",
                        "dataset_id": dataset_id,
                        "footprint_area_sqm": area_val,
                        "confidence_score": class_confs.get("building"),
                        "status": "Extracted",
                        "geometry": {
                            "type": "Polygon",
                            "coordinates": [ring]
                        }
                    })
                except Exception as e:
                    print(f"Error processing building polygon: {e}")

        # 5. Vectorize Road Corridors from Real Segmentation Mask
        roads = []
        road_mask = masks.get("road")
        if road_mask is not None:
            road_polys = AIExtractionService._contours_to_polygons(road_mask, extent_bounds, min_area_px=300)
            for idx, ring in enumerate(road_polys):
                roads.append({
                    "id": f"RD-{dataset_id[-4:] if len(dataset_id) >= 4 else '01'}-{idx+1:03d}",
                    "name": f"Road Corridor #{idx+1}",
                    "road_type": "Surface Road",
                    "width_meters": 10.0,
                    "confidence_score": class_confs.get("road"),
                    "dataset_id": dataset_id,
                    "geometry": {
                        "type": "Polygon",
                        "coordinates": [ring]
                    }
                })

        # 6. Vectorize Land Use (Vegetation, Water, Open Land)
        land_use_features = []
        for cat_key, cat_name in [("vegetation", "Vegetation"), ("water", "Water"), ("open_land", "Open Land")]:
            c_mask = masks.get(cat_key)
            if c_mask is not None:
                c_polys = AIExtractionService._contours_to_polygons(c_mask, extent_bounds, min_area_px=400)
                for idx, ring in enumerate(c_polys):
                    try:
                        poly_geom = Polygon(ring)
                        area_sqm = ParcelExtractionService._deg_to_sqm(poly_geom.area, center_lat) if is_georeferenced else None
                        land_use_features.append({
                            "id": f"LU-{cat_key[:3].upper()}-{idx+1:03d}",
                            "dataset_id": dataset_id,
                            "category": cat_name,
                            "area_sqm": area_sqm,
                            "geometry": {
                                "type": "Polygon",
                                "coordinates": [ring]
                            }
                        })
                    except Exception:
                        pass

        # 7. Synthesize Candidate Parcel Boundaries from Real Evidence
        parcels = ParcelExtractionService.extract_candidate_parcels(
            building_features=buildings,
            road_features=roads,
            bounds=extent_bounds if is_georeferenced else None,
            dataset_id=dataset_id,
            is_georeferenced=is_georeferenced
        )

        # 8. Spatial Linking: Building <-> Parcel
        buildings, building_links = ParcelExtractionService.link_buildings_to_parcels(
            buildings=buildings,
            parcels=parcels,
            center_lat=center_lat
        )

        # 9. Real Boundary Conflicts Detection
        conflicts = []
        if len(parcels) >= 2:
            from backend.services.topology_service import TopologyValidationService
            overlaps = TopologyValidationService.detect_overlapping_parcels(parcels)
            for ov in overlaps:
                conflicts.append({
                    "id": ov["id"],
                    "parcel_id": ov["parcel_id"],
                    "conflict_type": ov["conflict_type"],
                    "difference_sqm": ov["difference_sqm"],
                    "severity": ov["severity"],
                    "status": "Pending",
                    "description": ov["description"],
                    "geometry": ov["geometry"],
                    "dataset_id": dataset_id
                })

        return {
            "status": "Completed",
            "model_status": model_status,
            "model_name": ai_model.model_name,
            "method": "Neural Semantic Segmentation (ONNX / OpenCV DNN)",
            "parcels": parcels,
            "buildings": buildings,
            "roads": roads,
            "land_use": land_use_features,
            "building_links": building_links,
            "conflicts": conflicts,
            "confidence": overall_conf,
            "stats": {
                "parcels_detected": len(parcels),
                "buildings_extracted": len(buildings),
                "road_segments": len(roads),
                "land_use_polygons": len(land_use_features),
                "linked_buildings": len([b for b in buildings if b.get("parcel_id") != "Unassigned"]),
                "boundary_conflicts": len(conflicts),
                "model_status": model_status
            }
        }
