from typing import Dict, Any, List

class ConflictDetectionService:
    """
    Cadastral boundary comparison engine.
    Compares existing cadastral records against AI-extracted boundaries.
    Detects boundary mismatches, area discrepancies, road buffer encroachments,
    and flags for human verification.
    """

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
