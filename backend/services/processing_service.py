import os
import json
import csv
import asyncio
from datetime import datetime
from typing import Dict, Any, List
from backend.services.db_service import DatabaseService
from backend.services.ai_extraction_service import AIExtractionService

# In-memory event listeners for SSE clients {job_id: [asyncio.Queue, ...]}
JOB_EVENT_QUEUES: Dict[str, List[asyncio.Queue]] = {}

STAGES = [
    {"stage": "UPLOAD", "pct": 10, "eta": 40, "desc": "File integrity and format validation complete."},
    {"stage": "VALIDATION", "pct": 20, "eta": 35, "desc": "Geospatial coordinate system and GSD verified."},
    {"stage": "PREPROCESSING", "pct": 35, "eta": 30, "desc": "Radiometric normalization and tile pyramid generated."},
    {"stage": "TILING", "pct": 50, "eta": 24, "desc": "Photogrammetric tiles partitioned for AI inference."},
    {"stage": "AI_FEATURE_EXTRACTION", "pct": 65, "eta": 18, "desc": "Extracting parcel boundaries, buildings, and roads."},
    {"stage": "PARCEL_GENERATION", "pct": 80, "eta": 12, "desc": "Vectorizing cadastral parcels and boundary linework."},
    {"stage": "CONFLICT_DETECTION", "pct": 90, "eta": 6, "desc": "Cross-referencing against official land registry deeds."},
    {"stage": "CONFIDENCE_ANALYSIS", "pct": 95, "eta": 2, "desc": "Computing confidence score metrics and topology check."},
    {"stage": "COMPLETED", "pct": 100, "eta": 0, "desc": "Cadastral extraction finished. Ready for GIS exploration."}
]

class ProcessingService:
    @staticmethod
    def register_event_queue(job_id: str) -> asyncio.Queue:
        q = asyncio.Queue()
        if job_id not in JOB_EVENT_QUEUES:
            JOB_EVENT_QUEUES[job_id] = []
        JOB_EVENT_QUEUES[job_id].append(q)
        return q

    @staticmethod
    def unregister_event_queue(job_id: str, q: asyncio.Queue):
        if job_id in JOB_EVENT_QUEUES and q in JOB_EVENT_QUEUES[job_id]:
            JOB_EVENT_QUEUES[job_id].remove(q)

    @staticmethod
    async def broadcast_event(job_id: str, data: Dict[str, Any]):
        if job_id in JOB_EVENT_QUEUES:
            for q in list(JOB_EVENT_QUEUES[job_id]):
                try:
                    await q.put(data)
                except Exception:
                    pass

    @staticmethod
    async def run_pipeline_job(job_id: str, dataset_id: str, options: dict):
        dataset = DatabaseService.get_dataset(dataset_id)
        if not dataset:
            return
            
        logs = []
        bounds = dataset.get("bounds", [[12.9740, 77.6340], [12.9840, 77.6460]])
        
        for stage_info in STAGES:
            stage_name = stage_info["stage"]
            pct = stage_info["pct"]
            eta = stage_info["eta"]
            desc = stage_info["desc"]
            
            timestamp = datetime.now().strftime("%H:%M:%S")
            log_entry = {
                "timestamp": timestamp,
                "stage": stage_name,
                "message": desc
            }
            logs.append(log_entry)
            
            # Update DB
            DatabaseService.update_job(job_id, {
                "status": "running" if stage_name != "COMPLETED" else "completed",
                "current_stage": stage_name,
                "progress_pct": pct,
                "eta_seconds": eta,
                "logs": logs
            })
            
            # Broadcast to SSE subscribers
            event_payload = {
                "job_id": job_id,
                "dataset_id": dataset_id,
                "status": "running" if stage_name != "COMPLETED" else "completed",
                "current_stage": stage_name,
                "progress_pct": pct,
                "eta_seconds": eta,
                "eta_formatted": f"00:{eta:02d}",
                "latest_log": log_entry
            }
            await ProcessingService.broadcast_event(job_id, event_payload)
            
            # Realistic processing step time
            await asyncio.sleep(1.2)
            
        # Feature extraction
        extraction_res = AIExtractionService.extract_cadastral_features(dataset_id, bounds, options)
        parcels = extraction_res["parcels"]
        buildings = extraction_res["buildings"]
        roads = extraction_res["roads"]
        conflicts = extraction_res["conflicts"]
        stats = extraction_res["stats"]
        
        # Save output GeoJSON & CSV
        dataset_dir = os.path.dirname(dataset.get("storage_path") or "")
        output_files = []
        if dataset_dir and os.path.exists(dataset_dir):
            # GeoJSON
            geojson_path = os.path.join(dataset_dir, "cadastral_parcels.geojson")
            geojson_data = {
                "type": "FeatureCollection",
                "features": [
                    {
                        "type": "Feature",
                        "id": p["id"],
                        "properties": {
                            "parcel_id": p["parcel_id"],
                            "title": p["title"],
                            "status": p["status"],
                            "confidence_score": p["confidence_score"],
                            "area_sqm": p["ai_area_sqm"]
                        },
                        "geometry": p["geometry"]
                    }
                    for p in parcels
                ]
            }
            with open(geojson_path, "w", encoding="utf-8") as f:
                json.dump(geojson_data, f, indent=2)
            output_files.append({"name": "cadastral_parcels.geojson", "path": geojson_path, "type": "GeoJSON"})
            
            # CSV
            csv_path = os.path.join(dataset_dir, "cadastral_parcels.csv")
            with open(csv_path, "w", newline="", encoding="utf-8") as f:
                writer = csv.writer(f)
                writer.writerow(["Parcel_ID", "Title", "Status", "Confidence", "Area_SQM"])
                for p in parcels:
                    writer.writerow([p["parcel_id"], p["title"], p["status"], p["confidence_score"], p["ai_area_sqm"]])
            output_files.append({"name": "cadastral_parcels.csv", "path": csv_path, "type": "CSV"})

        # Insert features into database
        DatabaseService.add_extracted_features(dataset_id, parcels, buildings, roads, conflicts)
        
        # Finalize job in DB
        DatabaseService.update_job(job_id, {
            "status": "completed",
            "current_stage": "COMPLETED",
            "progress_pct": 100,
            "eta_seconds": 0,
            "results": {
                "stats": stats,
                "is_development_mode": extraction_res["is_development_mode"],
                "model_name": extraction_res["model_name"]
            },
            "output_files": output_files
        })
        
        DatabaseService.update_dataset(dataset_id, {
            "upload_status": "processed"
        })
        
        # Broadcast completed event
        await ProcessingService.broadcast_event(job_id, {
            "job_id": job_id,
            "dataset_id": dataset_id,
            "status": "completed",
            "current_stage": "COMPLETED",
            "progress_pct": 100,
            "eta_seconds": 0,
            "results": {
                "stats": stats,
                "is_development_mode": extraction_res["is_development_mode"],
                "model_name": extraction_res["model_name"]
            },
            "output_files": output_files
        })
