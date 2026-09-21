import csv
import io
import json
from datetime import datetime
from typing import Dict, Any, List

class ReportService:
    @staticmethod
    def generate_csv_report(parcels: List[Dict[str, Any]]) -> str:
        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow([
            "Parcel ID", "Address", "Zone", "Existing Area (sqm)",
            "AI Area (sqm)", "Difference (sqm)", "Confidence",
            "Suitability Score", "Valuation (USD)", "Status"
        ])
        for p in parcels:
            val = p.get("valuation_usd", 0)
            if isinstance(val, (int, float)):
                val_str = f"${val:,.2f}"
            else:
                val_str = str(val) if val else "$0.00"
            conf = p.get('confidence_score', 0)
            conf_str = f"{int(conf * 100)}%" if isinstance(conf, (int, float)) and conf <= 1 else f"{conf}%"
            writer.writerow([
                p.get("parcel_id", ""),
                p.get("address", ""),
                p.get("zone", ""),
                p.get("existing_area_sqm", 0),
                p.get("ai_area_sqm", 0),
                p.get("difference_sqm", 0),
                conf_str,
                p.get("suitability_score", ""),
                val_str,
                p.get("status", "")
            ])
        return output.getvalue()

    @staticmethod
    def generate_geojson_report(parcels: List[Dict[str, Any]]) -> str:
        features = []
        for p in parcels:
            features.append({
                "type": "Feature",
                "id": p.get("id"),
                "properties": {
                    "parcel_id": p.get("parcel_id"),
                    "title": p.get("title"),
                    "address": p.get("address"),
                    "zone": p.get("zone"),
                    "status": p.get("status"),
                    "confidence_score": p.get("confidence_score"),
                    "existing_area_sqm": p.get("existing_area_sqm"),
                    "ai_area_sqm": p.get("ai_area_sqm"),
                    "difference_sqm": p.get("difference_sqm"),
                    "valuation_usd": p.get("valuation_usd")
                },
                "geometry": p.get("geometry")
            })
        return json.dumps({"type": "FeatureCollection", "features": features}, indent=2)

    @staticmethod
    def generate_conflict_summary(conflicts: List[Dict[str, Any]]) -> Dict[str, Any]:
        return {
            "generated_at": datetime.now().isoformat(),
            "report_title": "UrbanCadastral Boundary Conflict & Discrepancy Audit",
            "total_conflicts": len(conflicts),
            "high_severity": len([c for c in conflicts if c.get("severity") == "High"]),
            "medium_severity": len([c for c in conflicts if c.get("severity") == "Medium"]),
            "low_severity": len([c for c in conflicts if c.get("severity") == "Low"]),
            "items": conflicts
        }
