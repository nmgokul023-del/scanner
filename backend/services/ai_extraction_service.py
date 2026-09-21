import uuid
from typing import Dict, Any, List
from backend.services.ai_model_interface import AIModel

class AIExtractionService:
    @staticmethod
    def extract_cadastral_features(dataset_id: str, bounds: list, options: dict) -> Dict[str, Any]:
        ai_model = AIModel.get_instance()
        
        min_lat = bounds[0][0] if bounds else 12.9740
        min_lon = bounds[0][1] if bounds else 77.6340
        max_lat = bounds[1][0] if bounds else 12.9840
        max_lon = bounds[1][1] if bounds else 77.6460
        
        lat_step = (max_lat - min_lat) / 4.0
        lon_step = (max_lon - min_lon) / 4.0
        
        parcels = []
        buildings = []
        roads = []
        conflicts = []
        
        # Generate cadastral parcels partitioned across the extent
        counter = 1
        for i in range(3):
            for j in range(3):
                p_min_lat = round(min_lat + i * lat_step, 6)
                p_max_lat = round(min_lat + (i + 0.95) * lat_step, 6)
                p_min_lon = round(min_lon + j * lon_step, 6)
                p_max_lon = round(min_lon + (j + 0.95) * lon_step, 6)
                
                pid = f"88{counter:02d}-A"
                counter += 1
                
                parcel_geom = {
                    "type": "Polygon",
                    "coordinates": [[
                        [p_min_lon, p_min_lat],
                        [p_max_lon, p_min_lat],
                        [p_max_lon, p_max_lat],
                        [p_min_lon, p_max_lat],
                        [p_min_lon, p_min_lat]
                    ]]
                }
                
                # Registered geometry with slight discrepancy for conflict simulation
                is_conflict = (i == 1 and j == 1)
                existing_geom = None
                if is_conflict:
                    existing_geom = {
                        "type": "Polygon",
                        "coordinates": [[
                            [p_min_lon, p_min_lat],
                            [p_max_lon + 0.0004, p_min_lat],
                            [p_max_lon + 0.0004, p_max_lat],
                            [p_min_lon, p_max_lat],
                            [p_min_lon, p_min_lat]
                        ]]
                    }
                    conflicts.append({
                        "id": f"cnf-{uuid.uuid4().hex[:6]}",
                        "parcel_id": pid,
                        "conflict_type": "Possible Boundary Discrepancy",
                        "difference_sqm": 128.5,
                        "severity": "High",
                        "status": "Active",
                        "description": "East fence line deviates 1.4m from deed survey geometry",
                        "geometry": parcel_geom
                    })
                
                parcels.append({
                    "id": f"p-{uuid.uuid4().hex[:6]}",
                    "parcel_id": pid,
                    "title": f"Parcel #{pid} • Sector 4B",
                    "address": f"Survey Sector 4B, Plot {counter}",
                    "zone": "M-2",
                    "status": "Flagged Discrepancy" if is_conflict else "AI Extracted",
                    "confidence_score": 0.74 if is_conflict else 0.96,
                    "existing_area_sqm": 1280.0 if not is_conflict else 1150.0,
                    "ai_area_sqm": 1280.0,
                    "difference_sqm": 130.0 if is_conflict else 0.0,
                    "suitability_score": 94,
                    "valuation_usd": "$2.4M",
                    "geometry": parcel_geom,
                    "existing_geometry": existing_geom
                })
                
                # Building inside parcel
                b_min_lat = round(p_min_lat + 0.2 * lat_step, 6)
                b_max_lat = round(p_max_lat - 0.2 * lat_step, 6)
                b_min_lon = round(p_min_lon + 0.2 * lon_step, 6)
                b_max_lon = round(p_max_lon - 0.2 * lon_step, 6)
                
                buildings.append({
                    "id": f"bld-{uuid.uuid4().hex[:6]}",
                    "parcel_id": pid,
                    "footprint_area_sqm": 420.0,
                    "height_meters": 14.2,
                    "geometry": {
                        "type": "Polygon",
                        "coordinates": [[
                            [b_min_lon, b_min_lat],
                            [b_max_lon, b_min_lat],
                            [b_max_lon, b_max_lat],
                            [b_min_lon, b_max_lat],
                            [b_min_lon, b_min_lat]
                        ]]
                    }
                })

        # Road axis
        roads.append({
            "id": f"rd-{uuid.uuid4().hex[:6]}",
            "name": "Outer Sector Arterial Avenue",
            "road_type": "Primary Arterial",
            "width_meters": 18.0,
            "geometry": {
                "type": "LineString",
                "coordinates": [
                    [min_lon, (min_lat + max_lat) / 2.0],
                    [max_lon, (min_lat + max_lat) / 2.0]
                ]
            }
        })

        return {
            "is_development_mode": ai_model.is_development_mode,
            "model_name": ai_model.model_name,
            "parcels": parcels,
            "buildings": buildings,
            "roads": roads,
            "conflicts": conflicts,
            "stats": {
                "parcels_detected": len(parcels),
                "buildings_extracted": len(buildings),
                "road_segments": len(roads),
                "boundary_conflicts": len(conflicts),
                "high_confidence_features": len([p for p in parcels if p.get("confidence_score", 0) >= 0.85]),
                "gt_verified": 0
            }
        }
