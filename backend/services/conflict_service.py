import math
import uuid
from typing import Dict, Any, List, Optional
from shapely.geometry import shape, mapping, Polygon, MultiPolygon

class ConflictDetectionService:
    """
    Cadastral boundary comparison & discrepancy engine.
    Compares existing cadastral records against AI-extracted boundaries:
    - Area discrepancies
    - Spatial boundary shifts (symmetric difference)
    - Boundary overlaps and rights-of-way encroachments
    """

    @staticmethod
    def _deg_to_sqm(deg2_area: float, ref_lat: float = 0.0) -> float:
        lat_m = 110852.0
        lon_m = 111320.0 * math.cos(math.radians(ref_lat))
        return round(deg2_area * lat_m * lon_m, 2)

    @staticmethod
    def detect_discrepancies(existing_area: float, ai_area: float, tolerance_sqm: float = 10.0) -> Dict[str, Any]:
        diff = ai_area - existing_area
        has_discrepancy = abs(diff) > tolerance_sqm
        pct = (diff / existing_area) * 100 if existing_area else 0

        severity = "Low"
        if abs(diff) > 100:
            severity = "High"
        elif abs(diff) > 50:
            severity = "Medium"

        return {
            "has_discrepancy": has_discrepancy,
            "difference_sqm": round(diff, 2),
            "percentage_change": round(pct, 2),
            "severity": severity,
            "recommendation": "Possible Boundary Discrepancy - Requires Survey Verification" if has_discrepancy else "Within Cadastral Tolerance"
        }

    @staticmethod
    def compare_parcel_geometries(existing_geom_data: Dict[str, Any], ai_geom_data: Dict[str, Any], tolerance_sqm: float = 5.0) -> Dict[str, Any]:
        """
        Spatial geometry comparison using Shapely symmetric difference.
        Determines exact boundary shift area and discrepancy polygon.
        """
        try:
            g_exist = shape(existing_geom_data)
            g_ai = shape(ai_geom_data)

            if not g_exist.is_valid:
                g_exist = g_exist.buffer(0)
            if not g_ai.is_valid:
                g_ai = g_ai.buffer(0)

            ref_lat = g_ai.centroid.y if not g_ai.is_empty else (g_exist.centroid.y if not g_exist.is_empty else 0.0)
            existing_sqm = ConflictDetectionService._deg_to_sqm(g_exist.area, ref_lat)
            ai_sqm = ConflictDetectionService._deg_to_sqm(g_ai.area, ref_lat)

            # Symmetric difference represents the non-overlapping spatial mismatch
            diff_geom = g_exist.symmetric_difference(g_ai)
            diff_sqm = ConflictDetectionService._deg_to_sqm(diff_geom.area, ref_lat)
            area_delta_sqm = round(ai_sqm - existing_sqm, 2)

            has_conflict = diff_sqm > tolerance_sqm
            severity = "Low"
            if diff_sqm > 80:
                severity = "High"
            elif diff_sqm > 30:
                severity = "Medium"

            return {
                "has_conflict": has_conflict,
                "existing_area_sqm": existing_sqm,
                "ai_area_sqm": ai_sqm,
                "difference_sqm": area_delta_sqm,
                "spatial_mismatch_sqm": diff_sqm,
                "severity": severity,
                "discrepancy_geometry": mapping(diff_geom) if has_conflict else None
            }
        except Exception as e:
            return {
                "has_conflict": False,
                "error": str(e)
            }
