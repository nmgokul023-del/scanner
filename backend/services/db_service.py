import os
import json
import sqlite3
import uuid
import hashlib
import secrets
from datetime import datetime
from typing import List, Dict, Any, Optional, Tuple

DB_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data")
DB_PATH = os.path.join(DB_DIR, "urbancadastral.db")

def hash_password(password: str, salt: Optional[str] = None) -> Tuple[str, str]:
    if not salt:
        salt = secrets.token_hex(16)
    pwd_hash = hashlib.pbkdf2_hmac(
        'sha256',
        password.encode('utf-8'),
        salt.encode('utf-8'),
        100000
    ).hex()
    return pwd_hash, salt

def verify_password(password: str, stored_hash: str, salt: str) -> bool:
    pwd_hash, _ = hash_password(password, salt)
    return secrets.compare_digest(pwd_hash, stored_hash)

def get_db_connection() -> sqlite3.Connection:
    os.makedirs(DB_DIR, exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    os.makedirs(DB_DIR, exist_ok=True)
    with get_db_connection() as conn:
        cursor = conn.cursor()
        
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS drone_datasets (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                original_filename TEXT NOT NULL,
                storage_filename TEXT NOT NULL,
                storage_path TEXT NOT NULL,
                file_size_bytes INTEGER NOT NULL,
                file_size_str TEXT NOT NULL,
                file_format TEXT NOT NULL,
                data_type TEXT NOT NULL,
                crs TEXT,
                resolution TEXT,
                gsd_cm REAL,
                coverage_sqkm REAL,
                coverage_str TEXT,
                width_px INTEGER,
                height_px INTEGER,
                bands INTEGER,
                bounds_json TEXT,
                metadata_json TEXT,
                preview_path TEXT,
                upload_status TEXT NOT NULL,
                source_type TEXT DEFAULT 'drone_upload',
                source_organization TEXT,
                source_url TEXT,
                acquisition_date TEXT,
                date_accessed TEXT,
                vector_geojson TEXT,
                service_url TEXT,
                affine_transform_json TEXT,
                processing_status TEXT DEFAULT 'unprocessed',
                layer_type TEXT,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            )
        """)

        cursor.execute("""
            CREATE TABLE IF NOT EXISTS processing_jobs (
                id TEXT PRIMARY KEY,
                dataset_id TEXT NOT NULL,
                status TEXT NOT NULL,
                current_stage TEXT NOT NULL,
                progress_pct INTEGER NOT NULL DEFAULT 0,
                eta_seconds INTEGER NOT NULL DEFAULT 0,
                options_json TEXT,
                logs_json TEXT,
                results_json TEXT,
                output_files_json TEXT,
                error_message TEXT,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL,
                FOREIGN KEY (dataset_id) REFERENCES drone_datasets(id)
            )
        """)

        cursor.execute("""
            CREATE TABLE IF NOT EXISTS parcels (
                id TEXT PRIMARY KEY,
                parcel_id TEXT UNIQUE NOT NULL,
                title TEXT NOT NULL,
                address TEXT NOT NULL,
                zone TEXT NOT NULL,
                status TEXT NOT NULL,
                confidence_score REAL,
                existing_area_sqm REAL NOT NULL,
                ai_area_sqm REAL NOT NULL,
                difference_sqm REAL NOT NULL,
                suitability_score INTEGER NOT NULL,
                valuation_usd TEXT NOT NULL,
                dataset_id TEXT,
                geometry_json TEXT NOT NULL,
                existing_geometry_json TEXT,
                attributes_json TEXT,
                created_at TEXT NOT NULL
            )
        """)

        cursor.execute("""
            CREATE TABLE IF NOT EXISTS buildings (
                id TEXT PRIMARY KEY,
                parcel_id TEXT,
                dataset_id TEXT,
                footprint_area_sqm REAL NOT NULL,
                height_meters REAL NOT NULL,
                relationship TEXT,
                intersection_area_sqm REAL,
                geometry_json TEXT NOT NULL
            )
        """)

        cursor.execute("""
            CREATE TABLE IF NOT EXISTS roads (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                road_type TEXT NOT NULL,
                width_meters REAL NOT NULL,
                dataset_id TEXT,
                geometry_json TEXT NOT NULL
            )
        """)

        cursor.execute("""
            CREATE TABLE IF NOT EXISTS land_use (
                id TEXT PRIMARY KEY,
                dataset_id TEXT,
                category TEXT NOT NULL,
                area_sqm REAL NOT NULL,
                geometry_json TEXT NOT NULL,
                created_at TEXT NOT NULL
            )
        """)

        cursor.execute("""
            CREATE TABLE IF NOT EXISTS conflicts (
                id TEXT PRIMARY KEY,
                parcel_id TEXT NOT NULL,
                conflict_type TEXT NOT NULL,
                difference_sqm REAL NOT NULL,
                severity TEXT NOT NULL,
                status TEXT NOT NULL,
                description TEXT,
                dataset_id TEXT,
                geometry_json TEXT NOT NULL
            )
        """)

        cursor.execute("""
            CREATE TABLE IF NOT EXISTS audit_logs (
                id TEXT PRIMARY KEY,
                timestamp TEXT NOT NULL,
                user TEXT NOT NULL,
                action TEXT NOT NULL,
                parcel_id TEXT,
                previous_state TEXT,
                new_state TEXT,
                details TEXT
            )
        """)

        cursor.execute("""
            CREATE TABLE IF NOT EXISTS ground_truth_tasks (
                id TEXT PRIMARY KEY,
                parcel_id TEXT NOT NULL,
                task_id TEXT UNIQUE NOT NULL,
                reason TEXT NOT NULL,
                surveyor TEXT NOT NULL,
                status TEXT NOT NULL,
                gnss_accuracy_cm REAL NOT NULL,
                cors_reference TEXT NOT NULL,
                coordinates_json TEXT NOT NULL,
                evidence_notes TEXT,
                evidence_files_json TEXT NOT NULL,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            )
        """)

        cursor.execute("""
            CREATE TABLE IF NOT EXISTS ground_truth_evidence (
                id TEXT PRIMARY KEY,
                task_id TEXT NOT NULL,
                original_filename TEXT NOT NULL,
                storage_filename TEXT NOT NULL,
                storage_path TEXT NOT NULL,
                file_size_bytes INTEGER NOT NULL,
                file_size_str TEXT NOT NULL,
                file_type TEXT NOT NULL,
                uploaded_at TEXT NOT NULL,
                file_url TEXT NOT NULL
            )
        """)

        cursor.execute("""
            CREATE TABLE IF NOT EXISTS change_detections (
                id TEXT PRIMARY KEY,
                parcel_id TEXT NOT NULL,
                feature_type TEXT NOT NULL,
                date_a TEXT NOT NULL,
                date_b TEXT NOT NULL,
                change_description TEXT NOT NULL,
                geometry_json TEXT NOT NULL
            )
        """)

        cursor.execute("""
            CREATE TABLE IF NOT EXISTS users (
                id TEXT PRIMARY KEY,
                email TEXT UNIQUE NOT NULL,
                password_hash TEXT NOT NULL,
                salt TEXT NOT NULL,
                name TEXT NOT NULL,
                role TEXT NOT NULL,
                is_active INTEGER NOT NULL DEFAULT 1,
                avatar TEXT,
                created_at TEXT NOT NULL
            )
        """)
        
        # Migration: ensure is_active column exists in users
        cursor.execute("PRAGMA table_info(users)")
        user_cols = [r["name"] for r in cursor.fetchall()]
        if "is_active" not in user_cols:
            cursor.execute("ALTER TABLE users ADD COLUMN is_active INTEGER NOT NULL DEFAULT 1")

        # Migration: ensure relationship and intersection_area_sqm exist in buildings
        cursor.execute("PRAGMA table_info(buildings)")
        bld_cols = [r["name"] for r in cursor.fetchall()]
        if "relationship" not in bld_cols:
            cursor.execute("ALTER TABLE buildings ADD COLUMN relationship TEXT")
        if "intersection_area_sqm" not in bld_cols:
            cursor.execute("ALTER TABLE buildings ADD COLUMN intersection_area_sqm REAL")

        # Migration: ensure confidence_score in parcels can be NULL (drop NOT NULL if present)
        cursor.execute("PRAGMA table_info(parcels)")
        parcels_info = {r["name"]: dict(r) for r in cursor.fetchall()}
        if parcels_info.get("confidence_score") and parcels_info["confidence_score"].get("notnull") == 1:
            try:
                cursor.execute("""
                    CREATE TABLE parcels_migrated (
                        id TEXT PRIMARY KEY,
                        parcel_id TEXT UNIQUE NOT NULL,
                        title TEXT NOT NULL,
                        address TEXT NOT NULL,
                        zone TEXT NOT NULL,
                        status TEXT NOT NULL,
                        confidence_score REAL,
                        existing_area_sqm REAL NOT NULL,
                        ai_area_sqm REAL NOT NULL,
                        difference_sqm REAL NOT NULL,
                        suitability_score INTEGER NOT NULL,
                        valuation_usd TEXT NOT NULL,
                        dataset_id TEXT,
                        geometry_json TEXT NOT NULL,
                        existing_geometry_json TEXT,
                        attributes_json TEXT,
                        created_at TEXT NOT NULL
                    )
                """)
                cursor.execute("INSERT OR IGNORE INTO parcels_migrated SELECT * FROM parcels")
                cursor.execute("DROP TABLE parcels")
                cursor.execute("ALTER TABLE parcels_migrated RENAME TO parcels")
            except Exception as mig_e:
                print(f"Parcels migration notice: {mig_e}")

        # Migration: ensure dataset_id column exists in ground_truth_tasks
        cursor.execute("PRAGMA table_info(ground_truth_tasks)")
        gt_cols = [r["name"] for r in cursor.fetchall()]
        if "dataset_id" not in gt_cols:
            cursor.execute("ALTER TABLE ground_truth_tasks ADD COLUMN dataset_id TEXT")

        # Migration: ensure drone_datasets columns for Government / Open GIS and GeoTIFF
        cursor.execute("PRAGMA table_info(drone_datasets)")
        ds_cols = [r["name"] for r in cursor.fetchall()]
        new_ds_cols = {
            "source_type": "TEXT DEFAULT 'drone_upload'",
            "source_organization": "TEXT",
            "source_url": "TEXT",
            "acquisition_date": "TEXT",
            "date_accessed": "TEXT",
            "vector_geojson": "TEXT",
            "service_url": "TEXT",
            "affine_transform_json": "TEXT",
            "processing_status": "TEXT DEFAULT 'unprocessed'",
            "layer_type": "TEXT"
        }
        for col_name, col_def in new_ds_cols.items():
            if col_name not in ds_cols:
                cursor.execute(f"ALTER TABLE drone_datasets ADD COLUMN {col_name} {col_def}")

        conn.commit()

        # Pure Real Mode: Do NOT seed mock parcels, buildings, roads, or conflicts.
        # Database only contains real uploaded datasets and user actions.
        seed_users_if_needed(conn)

def seed_users_if_needed(conn: sqlite3.Connection):
    try:
        cursor = conn.cursor()
        cursor.execute("SELECT COUNT(*) FROM users")
        if cursor.fetchone()[0] == 0:
            pwd_hash, salt = hash_password("cadastre2026")
            now = datetime.utcnow().isoformat()
            cursor.execute("""
                INSERT INTO users (id, email, password_hash, salt, name, role, is_active, avatar, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                "usr-surveyor-01",
                "agent@urbancadastral.ai",
                pwd_hash,
                salt,
                "R. Ramanathan",
                "Chief Cadastral Surveyor & AI Analyst",
                1,
                "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150",
                now
            ))
            conn.commit()
    except Exception as e:
        print(f"Error seeding users: {e}")

class DatabaseService:
    @staticmethod
    def get_datasets(source_type: Optional[str] = None) -> List[Dict[str, Any]]:
        with get_db_connection() as conn:
            cursor = conn.cursor()
            if source_type:
                cursor.execute("SELECT * FROM drone_datasets WHERE source_type = ? ORDER BY created_at DESC", (source_type,))
            else:
                cursor.execute("SELECT * FROM drone_datasets ORDER BY created_at DESC")
            rows = cursor.fetchall()
            result = []
            for r in rows:
                item = dict(r)
                if item.get("bounds_json"):
                    try:
                        item["bounds"] = json.loads(item["bounds_json"])
                    except Exception:
                        item["bounds"] = None
                if item.get("metadata_json"):
                    try:
                        item["metadata"] = json.loads(item["metadata_json"])
                    except Exception:
                        item["metadata"] = {}
                if item.get("affine_transform_json"):
                    try:
                        item["affine_transform"] = json.loads(item["affine_transform_json"])
                    except Exception:
                        item["affine_transform"] = None
                result.append(item)
            return result

    @staticmethod
    def get_dataset(dataset_id: str) -> Optional[Dict[str, Any]]:
        with get_db_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM drone_datasets WHERE id = ?", (dataset_id,))
            row = cursor.fetchone()
            if not row:
                return None
            item = dict(row)
            if item.get("bounds_json"):
                try:
                    item["bounds"] = json.loads(item["bounds_json"])
                except Exception:
                    item["bounds"] = None
            if item.get("metadata_json"):
                try:
                    item["metadata"] = json.loads(item["metadata_json"])
                except Exception:
                    item["metadata"] = {}
            if item.get("affine_transform_json"):
                try:
                    item["affine_transform"] = json.loads(item["affine_transform_json"])
                except Exception:
                    item["affine_transform"] = None
            return item

    @staticmethod
    def create_dataset(data: Dict[str, Any]) -> Dict[str, Any]:
        with get_db_connection() as conn:
            cursor = conn.cursor()
            now = datetime.now().isoformat()
            dataset_id = data.get("id") or f"ds-{uuid.uuid4().hex[:8]}"
            cursor.execute("""
                INSERT INTO drone_datasets (
                    id, name, original_filename, storage_filename, storage_path,
                    file_size_bytes, file_size_str, file_format, data_type,
                    crs, resolution, gsd_cm, coverage_sqkm, coverage_str,
                    width_px, height_px, bands, bounds_json, metadata_json,
                    preview_path, upload_status, source_type, source_organization,
                    source_url, acquisition_date, date_accessed, vector_geojson,
                    service_url, affine_transform_json, processing_status, layer_type,
                    created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                dataset_id,
                data.get("name", data.get("original_filename", "Dataset")),
                data.get("original_filename", "unnamed.tif"),
                data.get("storage_filename", "unnamed.tif"),
                data.get("storage_path", ""),
                data.get("file_size_bytes", 0),
                data.get("file_size_str", "0 MB"),
                data.get("file_format", "Image"),
                data.get("data_type", "Drone Orthomosaic"),
                data.get("crs") or "Unreferenced Image",
                data.get("resolution") or "Not Available",
                data.get("gsd_cm"),
                data.get("coverage_sqkm"),
                data.get("coverage_str") or "Not Available",
                data.get("width_px", 0),
                data.get("height_px", 0),
                data.get("bands", 3),
                json.dumps(data.get("bounds")) if data.get("bounds") is not None else None,
                json.dumps(data.get("metadata", {})),
                data.get("preview_path", None),
                data.get("upload_status", "uploaded"),
                data.get("source_type", "drone_upload"),
                data.get("source_organization"),
                data.get("source_url"),
                data.get("acquisition_date"),
                data.get("date_accessed"),
                data.get("vector_geojson"),
                data.get("service_url"),
                json.dumps(data.get("affine_transform")) if data.get("affine_transform") is not None else None,
                data.get("processing_status", "unprocessed"),
                data.get("layer_type"),
                now,
                now
            ))
            conn.commit()
            return DatabaseService.get_dataset(dataset_id)

    @staticmethod
    def get_dataset_layers(dataset_id: str) -> Dict[str, Any]:
        dataset = DatabaseService.get_dataset(dataset_id)
        if not dataset:
            return {"success": False, "error": "Dataset not found", "layers": []}
        
        layers = []
        source_type = dataset.get("source_type", "drone_upload")
        layer_type = dataset.get("layer_type") or ("vector" if dataset.get("vector_geojson") else "raster")
        
        if layer_type == "vector" or dataset.get("vector_geojson"):
            geojson_data = None
            if dataset.get("vector_geojson"):
                try:
                    geojson_data = json.loads(dataset["vector_geojson"])
                except Exception:
                    geojson_data = None
            
            feature_count = len(geojson_data.get("features", [])) if geojson_data and "features" in geojson_data else 0
            layers.append({
                "id": f"{dataset_id}-vector",
                "name": dataset.get("name", "Vector Layer"),
                "type": "vector",
                "source_type": source_type,
                "source_organization": dataset.get("source_organization", "Reference GIS"),
                "crs": dataset.get("crs", "EPSG:4326"),
                "bounds": dataset.get("bounds"),
                "geojson": geojson_data,
                "feature_count": feature_count,
                "is_active": True,
                "visible": True,
                "opacity": 1.0
            })
        elif dataset.get("service_url"):
            layers.append({
                "id": f"{dataset_id}-service",
                "name": dataset.get("name", "OGC Service"),
                "type": "wms" if "wms" in dataset.get("file_format", "").lower() else "wfs",
                "source_type": source_type,
                "source_organization": dataset.get("source_organization"),
                "service_url": dataset.get("service_url"),
                "crs": dataset.get("crs", "EPSG:4326"),
                "bounds": dataset.get("bounds"),
                "is_active": True,
                "visible": True,
                "opacity": 0.8
            })
        else:
            layers.append({
                "id": f"{dataset_id}-raster",
                "name": dataset.get("name", "Raster Imagery"),
                "type": "raster",
                "source_type": source_type,
                "crs": dataset.get("crs", "Unreferenced Image"),
                "bounds": dataset.get("bounds"),
                "preview_url": f"/api/drone-imagery/{dataset_id}/preview" if dataset.get("preview_path") else None,
                "resolution": dataset.get("resolution"),
                "gsd_cm": dataset.get("gsd_cm"),
                "is_active": True,
                "visible": True,
                "opacity": 0.85
            })
            
        return {
            "success": True,
            "dataset_id": dataset_id,
            "dataset_name": dataset.get("name"),
            "source_type": source_type,
            "crs": dataset.get("crs"),
            "bounds": dataset.get("bounds"),
            "layers": layers
        }

    @staticmethod
    def update_dataset(dataset_id: str, updates: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        with get_db_connection() as conn:
            cursor = conn.cursor()
            now = datetime.now().isoformat()
            fields = []
            values = []
            for k, v in updates.items():
                if k in ("bounds", "metadata", "affine_transform"):
                    fields.append(f"{k}_json = ?")
                    values.append(json.dumps(v))
                else:
                    fields.append(f"{k} = ?")
                    values.append(v)
            fields.append("updated_at = ?")
            values.append(now)
            values.append(dataset_id)
            query = f"UPDATE drone_datasets SET {', '.join(fields)} WHERE id = ?"
            cursor.execute(query, values)
            conn.commit()
            return DatabaseService.get_dataset(dataset_id)

    @staticmethod
    def delete_dataset(dataset_id: str) -> bool:
        with get_db_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("DELETE FROM processing_jobs WHERE dataset_id = ?", (dataset_id,))
            cursor.execute("DELETE FROM drone_datasets WHERE id = ?", (dataset_id,))
            conn.commit()
            return cursor.rowcount > 0

    @staticmethod
    def create_job(dataset_id: str, options: Dict[str, Any]) -> Dict[str, Any]:
        with get_db_connection() as conn:
            cursor = conn.cursor()
            job_id = f"job-{uuid.uuid4().hex[:8]}"
            now = datetime.now().isoformat()
            cursor.execute("""
                INSERT INTO processing_jobs (
                    id, dataset_id, status, current_stage, progress_pct, eta_seconds,
                    options_json, logs_json, results_json, output_files_json, error_message,
                    created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                job_id, dataset_id, "running", "UPLOAD", 5, 45,
                json.dumps(options),
                json.dumps([{"timestamp": now, "message": "Processing job initialized."}]),
                json.dumps({}),
                json.dumps([]),
                None,
                now,
                now
            ))
            conn.commit()
            return DatabaseService.get_job(job_id)

    @staticmethod
    def get_job(job_id: str) -> Optional[Dict[str, Any]]:
        with get_db_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM processing_jobs WHERE id = ?", (job_id,))
            row = cursor.fetchone()
            if not row:
                return None
            item = dict(row)
            if item.get("options_json"):
                item["options"] = json.loads(item["options_json"])
            if item.get("logs_json"):
                item["logs"] = json.loads(item["logs_json"])
            if item.get("results_json"):
                item["results"] = json.loads(item["results_json"])
            if item.get("output_files_json"):
                item["output_files"] = json.loads(item["output_files_json"])
            return item

    @staticmethod
    def get_active_job_for_dataset(dataset_id: str) -> Optional[Dict[str, Any]]:
        with get_db_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                "SELECT * FROM processing_jobs WHERE dataset_id = ? ORDER BY created_at DESC LIMIT 1",
                (dataset_id,)
            )
            row = cursor.fetchone()
            if not row:
                return None
            item = dict(row)
            if item.get("options_json"):
                item["options"] = json.loads(item["options_json"])
            if item.get("logs_json"):
                item["logs"] = json.loads(item["logs_json"])
            if item.get("results_json"):
                item["results"] = json.loads(item["results_json"])
            if item.get("output_files_json"):
                item["output_files"] = json.loads(item["output_files_json"])
            return item

    @staticmethod
    def update_job(job_id: str, updates: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        with get_db_connection() as conn:
            cursor = conn.cursor()
            now = datetime.now().isoformat()
            fields = []
            values = []
            for k, v in updates.items():
                if k in ("options", "logs", "results", "output_files"):
                    fields.append(f"{k}_json = ?")
                    values.append(json.dumps(v))
                else:
                    fields.append(f"{k} = ?")
                    values.append(v)
            fields.append("updated_at = ?")
            values.append(now)
            values.append(job_id)
            query = f"UPDATE processing_jobs SET {', '.join(fields)} WHERE id = ?"
            cursor.execute(query, values)
            conn.commit()
            return DatabaseService.get_job(job_id)

    @staticmethod
    def get_parcels(search=None, zone=None, status=None, dataset_id: Optional[str] = None, mode: str = "real") -> List[Dict[str, Any]]:
        with get_db_connection() as conn:
            cursor = conn.cursor()
            query = "SELECT * FROM parcels WHERE 1=1"
            params = []
            if dataset_id:
                query += " AND dataset_id = ?"
                params.append(dataset_id)
            elif mode == "real":
                query += " AND dataset_id IS NOT NULL AND dataset_id != ''"
            elif mode == "demo":
                query += " AND (dataset_id IS NULL OR dataset_id = '')"

            if search:
                s = f"%{search.lower()}%"
                query += " AND (LOWER(parcel_id) LIKE ? OR LOWER(address) LIKE ? OR LOWER(title) LIKE ?)"
                params.extend([s, s, s])
            if zone:
                query += " AND zone = ?"
                params.append(zone)
            if status:
                query += " AND status = ?"
                params.append(status)
            query += " ORDER BY parcel_id ASC"
            cursor.execute(query, params)
            rows = cursor.fetchall()
            parcels = []
            for r in rows:
                p = dict(r)
                p["geometry"] = json.loads(p["geometry_json"])
                if p.get("existing_geometry_json"):
                    p["existing_geometry"] = json.loads(p["existing_geometry_json"])
                parcels.append(p)
            return parcels

    @staticmethod
    def get_parcel_by_id(pid: str) -> Optional[Dict[str, Any]]:
        with get_db_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM parcels WHERE id = ? OR parcel_id = ?", (pid, pid))
            row = cursor.fetchone()
            if not row:
                return None
            p = dict(row)
            p["geometry"] = json.loads(p["geometry_json"])
            if p.get("existing_geometry_json"):
                p["existing_geometry"] = json.loads(p["existing_geometry_json"])
            return p

    @staticmethod
    def update_parcel(parcel_id: str, updates: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        existing = DatabaseService.get_parcel_by_id(parcel_id)
        if not existing:
            return None
        with get_db_connection() as conn:
            cursor = conn.cursor()
            fields = []
            values = []
            for k, v in updates.items():
                if k == "geometry":
                    fields.append("geometry_json = ?")
                    values.append(json.dumps(v))
                elif k == "existing_geometry":
                    fields.append("existing_geometry_json = ?")
                    values.append(json.dumps(v))
                elif k in ("title", "address", "zone", "status", "confidence_score", "existing_area_sqm", "ai_area_sqm", "difference_sqm", "suitability_score", "valuation_usd", "dataset_id"):
                    fields.append(f"{k} = ?")
                    values.append(v)
            if fields:
                values.append(existing["id"])
                query = f"UPDATE parcels SET {', '.join(fields)} WHERE id = ?"
                cursor.execute(query, values)
                conn.commit()
        return DatabaseService.get_parcel_by_id(parcel_id)

    @staticmethod
    def create_parcel(parcel_data: Dict[str, Any]) -> Dict[str, Any]:
        p_id = parcel_data.get("id") or f"p-{uuid.uuid4().hex[:6]}"
        pid = parcel_data.get("parcel_id") or f"88{uuid.uuid4().hex[:2].upper()}-A"
        geom = parcel_data.get("geometry", {})
        existing_geom = parcel_data.get("existing_geometry")
        now = datetime.now().isoformat()
        
        # Calculate real area if not provided
        area_sqm = parcel_data.get("ai_area_sqm") or parcel_data.get("existing_area_sqm")
        if not area_sqm and geom:
            from backend.services.topology_service import TopologyValidationService
            area_sqm = TopologyValidationService.calculate_polygon_area_sqm(geom)
        area_sqm = round(area_sqm or 1000.0, 2)

        conf_score = parcel_data.get("confidence_score")
        if conf_score is not None:
            try:
                conf_score = float(conf_score)
            except (ValueError, TypeError):
                conf_score = None

        with get_db_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT OR REPLACE INTO parcels (
                    id, parcel_id, title, address, zone, status, confidence_score,
                    existing_area_sqm, ai_area_sqm, difference_sqm, suitability_score,
                    valuation_usd, dataset_id, geometry_json, existing_geometry_json,
                    attributes_json, created_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                p_id,
                pid,
                parcel_data.get("title", f"Parcel #{pid} • Sector 4B"),
                parcel_data.get("address", f"Survey Sector 4B, Plot {pid}"),
                parcel_data.get("zone", "M-2"),
                parcel_data.get("status", "AI-generated (Probable)"),
                conf_score,
                float(parcel_data.get("existing_area_sqm", area_sqm)),
                float(area_sqm),
                float(parcel_data.get("difference_sqm", 0.0)),
                int(parcel_data.get("suitability_score", 90)),
                str(parcel_data.get("valuation_usd", f"${round(area_sqm * 1800 / 1000000, 1)}M")),
                parcel_data.get("dataset_id") or "surveyor-digitized",
                json.dumps(geom),
                json.dumps(existing_geom) if existing_geom else None,
                json.dumps(parcel_data.get("attributes", {})),
                now
            ))
            conn.commit()
        return DatabaseService.get_parcel_by_id(p_id)

    @staticmethod
    def delete_parcel(parcel_id: str) -> bool:
        with get_db_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("DELETE FROM parcels WHERE id = ? OR parcel_id = ?", (parcel_id, parcel_id))
            conn.commit()
            return cursor.rowcount > 0

    @staticmethod
    def get_buildings(dataset_id: Optional[str] = None, mode: str = "real") -> List[Dict[str, Any]]:
        with get_db_connection() as conn:
            cursor = conn.cursor()
            query = "SELECT * FROM buildings WHERE 1=1"
            params = []
            if dataset_id:
                query += " AND dataset_id = ?"
                params.append(dataset_id)
            elif mode == "real":
                query += " AND dataset_id IS NOT NULL AND dataset_id != ''"
            elif mode == "demo":
                query += " AND (dataset_id IS NULL OR dataset_id = '')"
            cursor.execute(query, params)
            rows = cursor.fetchall()
            buildings = []
            for r in rows:
                b = dict(r)
                b["geometry"] = json.loads(b["geometry_json"]) if b.get("geometry_json") else {}
                buildings.append(b)
            return buildings

    @staticmethod
    def get_roads(dataset_id: Optional[str] = None, mode: str = "real") -> List[Dict[str, Any]]:
        with get_db_connection() as conn:
            cursor = conn.cursor()
            query = "SELECT * FROM roads WHERE 1=1"
            params = []
            if dataset_id:
                query += " AND dataset_id = ?"
                params.append(dataset_id)
            elif mode == "real":
                query += " AND dataset_id IS NOT NULL AND dataset_id != ''"
            elif mode == "demo":
                query += " AND (dataset_id IS NULL OR dataset_id = '')"
            cursor.execute(query, params)
            rows = cursor.fetchall()
            roads = []
            for r in rows:
                rd = dict(r)
                rd["geometry"] = json.loads(rd["geometry_json"]) if rd.get("geometry_json") else {}
                roads.append(rd)
            return roads

    @staticmethod
    def get_conflicts(status: Optional[str] = None, dataset_id: Optional[str] = None, mode: str = "real") -> List[Dict[str, Any]]:
        with get_db_connection() as conn:
            cursor = conn.cursor()
            query = "SELECT * FROM conflicts WHERE 1=1"
            params = []
            if status:
                query += " AND status = ?"
                params.append(status)
            if dataset_id:
                query += " AND dataset_id = ?"
                params.append(dataset_id)
            elif mode == "real":
                query += " AND dataset_id IS NOT NULL AND dataset_id != ''"
            elif mode == "demo":
                query += " AND (dataset_id IS NULL OR dataset_id = '')"
            cursor.execute(query, params)
            rows = cursor.fetchall()
            conflicts = []
            for r in rows:
                c = dict(r)
                c["geometry"] = json.loads(c["geometry_json"]) if c.get("geometry_json") else {}
                conflicts.append(c)
            return conflicts

    @staticmethod
    def get_conflict(conflict_id: str) -> Optional[Dict[str, Any]]:
        with get_db_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM conflicts WHERE id = ? OR parcel_id = ?", (conflict_id, conflict_id))
            row = cursor.fetchone()
            if not row:
                return None
            c = dict(row)
            c["geometry"] = json.loads(c["geometry_json"]) if c.get("geometry_json") else {}
            return c

    @staticmethod
    def update_conflict(conflict_id: str, updates: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        conflict = DatabaseService.get_conflict(conflict_id)
        if not conflict:
            return None
        with get_db_connection() as conn:
            cursor = conn.cursor()
            fields = []
            values = []
            for k, v in updates.items():
                if k == "geometry":
                    fields.append("geometry_json = ?")
                    values.append(json.dumps(v))
                elif k in ("status", "severity", "conflict_type", "difference_sqm", "description"):
                    fields.append(f"{k} = ?")
                    values.append(v)
            if fields:
                values.append(conflict["id"])
                query = f"UPDATE conflicts SET {', '.join(fields)} WHERE id = ?"
                cursor.execute(query, values)
                conn.commit()
        return DatabaseService.get_conflict(conflict_id)

    @staticmethod
    def save_conflict(conflict_data: Dict[str, Any]) -> Dict[str, Any]:
        c_id = conflict_data.get("id") or f"cnf-{uuid.uuid4().hex[:6]}"
        with get_db_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT OR REPLACE INTO conflicts (
                    id, parcel_id, conflict_type, difference_sqm, severity, status, description, dataset_id, geometry_json
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                c_id,
                conflict_data.get("parcel_id", "Unknown"),
                conflict_data.get("conflict_type", "Boundary Overlap"),
                float(conflict_data.get("difference_sqm", 0.0)),
                conflict_data.get("severity", "High"),
                conflict_data.get("status", "Active"),
                conflict_data.get("description", "Topology discrepancy detected"),
                conflict_data.get("dataset_id"),
                json.dumps(conflict_data.get("geometry", {}))
            ))
            conn.commit()
        return DatabaseService.get_conflict(c_id)

    @staticmethod
    def clear_and_replace_conflicts(conflicts: List[Dict[str, Any]]):
        with get_db_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("DELETE FROM conflicts")
            for c in conflicts:
                c_id = c.get("id") or f"cnf-{uuid.uuid4().hex[:6]}"
                cursor.execute("""
                    INSERT INTO conflicts (
                        id, parcel_id, conflict_type, difference_sqm, severity, status, description, dataset_id, geometry_json
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    c_id,
                    c.get("parcel_id", "Unknown"),
                    c.get("conflict_type", "Boundary Overlap"),
                    float(c.get("difference_sqm", 0.0)),
                    c.get("severity", "High"),
                    c.get("status", "Active"),
                    c.get("description", "Topology discrepancy detected"),
                    c.get("dataset_id"),
                    json.dumps(c.get("geometry", {}))
                ))
            conn.commit()

    @staticmethod
    def get_audit_logs() -> List[Dict[str, Any]]:
        with get_db_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM audit_logs ORDER BY timestamp DESC")
            rows = cursor.fetchall()
            return [dict(r) for r in rows]

    @staticmethod
    def add_audit_log(user: str, action: str, parcel_id: str, previous_state: str, new_state: str, details: str) -> Dict[str, Any]:
        log_id = f"aud-{uuid.uuid4().hex[:6]}"
        now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        with get_db_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT INTO audit_logs (id, timestamp, user, action, parcel_id, previous_state, new_state, details)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """, (log_id, now, user, action, parcel_id, previous_state, new_state, details))
            conn.commit()
        return {
            "id": log_id,
            "timestamp": now,
            "user": user,
            "action": action,
            "parcel_id": parcel_id,
            "previous_state": previous_state,
            "new_state": new_state,
            "details": details
        }

    @staticmethod
    def get_changes() -> List[Dict[str, Any]]:
        with get_db_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM change_detections")
            rows = cursor.fetchall()
            changes = []
            for r in rows:
                chg = dict(r)
                chg["geometry"] = json.loads(chg["geometry_json"]) if chg.get("geometry_json") else {}
                changes.append(chg)
            return changes

    @staticmethod
    def get_verification_tasks() -> List[Dict[str, Any]]:
        with get_db_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                SELECT * FROM parcels
                WHERE status IN ('Requires Verification', 'Conflict Detected', 'Flagged Discrepancy')
                ORDER BY parcel_id ASC
            """)
            rows = cursor.fetchall()
            tasks = []
            for r in rows:
                p = dict(r)
                p["geometry"] = json.loads(p["geometry_json"])
                if p.get("existing_geometry_json"):
                    p["existing_geometry"] = json.loads(p["existing_geometry_json"])
                tasks.append(p)
            return tasks

    @staticmethod
    def save_land_use(dataset_id: str, land_use_features: list):
        with get_db_connection() as conn:
            cursor = conn.cursor()
            now = datetime.now().isoformat()
            for lu in land_use_features:
                lu_id = lu.get("id") or f"lu-{uuid.uuid4().hex[:6]}"
                cursor.execute("""
                    INSERT OR REPLACE INTO land_use (id, dataset_id, category, area_sqm, geometry_json, created_at)
                    VALUES (?, ?, ?, ?, ?, ?)
                """, (
                    lu_id,
                    dataset_id,
                    lu.get("category", "Vegetation"),
                    float(lu.get("area_sqm") or 0.0),
                    json.dumps(lu.get("geometry", {})),
                    now
                ))
            conn.commit()

    @staticmethod
    def get_land_use(dataset_id: Optional[str] = None, mode: str = "real") -> List[Dict[str, Any]]:
        with get_db_connection() as conn:
            cursor = conn.cursor()
            query = "SELECT * FROM land_use WHERE 1=1"
            params = []
            if dataset_id:
                query += " AND dataset_id = ?"
                params.append(dataset_id)
            elif mode == "real":
                query += " AND dataset_id IS NOT NULL AND dataset_id != ''"
            elif mode == "demo":
                query += " AND (dataset_id IS NULL OR dataset_id = '')"
            cursor.execute(query, params)
            rows = cursor.fetchall()
            result = []
            for r in rows:
                item = dict(r)
                if item.get("geometry_json"):
                    item["geometry"] = json.loads(item["geometry_json"])
                result.append(item)
            return result

    @staticmethod
    def add_extracted_features(dataset_id: str, parcels: list, buildings: list, roads: list, conflicts: list, land_use: Optional[list] = None):
        with get_db_connection() as conn:
            cursor = conn.cursor()
            now = datetime.now().isoformat()
            
            for p in parcels:
                conf_score = p.get("confidence_score")
                if conf_score is not None:
                    try:
                        conf_score = float(conf_score)
                    except (ValueError, TypeError):
                        conf_score = None

                cursor.execute("""
                    INSERT OR REPLACE INTO parcels (
                        id, parcel_id, title, address, zone, status, confidence_score,
                        existing_area_sqm, ai_area_sqm, difference_sqm, suitability_score,
                        valuation_usd, dataset_id, geometry_json, existing_geometry_json,
                        attributes_json, created_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    p.get("id", f"p-{uuid.uuid4().hex[:6]}"),
                    p["parcel_id"],
                    p.get("title", f"Parcel {p['parcel_id']}"),
                    p.get("address", "Sector Survey Extent"),
                    p.get("zone", "Unclassified Zone"),
                    p.get("status", "AI-Generated Preliminary Parcel Boundary"),
                    conf_score,
                    p.get("existing_area_sqm"),
                    p.get("ai_area_sqm"),
                    p.get("difference_sqm", 0.0),
                    p.get("suitability_score"),
                    p.get("valuation_usd", "Not Available"),
                    dataset_id,
                    json.dumps(p["geometry"]),
                    json.dumps(p.get("existing_geometry")) if p.get("existing_geometry") else None,
                    json.dumps(p),
                    now
                ))

            for b in buildings:
                cursor.execute("""
                    INSERT INTO buildings (id, parcel_id, dataset_id, footprint_area_sqm, height_meters, relationship, intersection_area_sqm, geometry_json)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    b.get("id", f"bld-{uuid.uuid4().hex[:6]}"),
                    b.get("parcel_id"),
                    dataset_id,
                    b.get("footprint_area_sqm"),
                    b.get("height_meters"),
                    b.get("relationship", "none"),
                    b.get("intersection_area_sqm", 0.0),
                    json.dumps(b["geometry"])
                ))

            for r in roads:
                cursor.execute("""
                    INSERT INTO roads (id, name, road_type, width_meters, dataset_id, geometry_json)
                    VALUES (?, ?, ?, ?, ?, ?)
                """, (
                    r.get("id", f"rd-{uuid.uuid4().hex[:6]}"),
                    r.get("name", "Extracted Road Corridor"),
                    r.get("road_type", "Drone Extracted Road"),
                    r.get("width_meters"),
                    dataset_id,
                    json.dumps(r["geometry"])
                ))

            for c in conflicts:
                cursor.execute("""
                    INSERT INTO conflicts (id, parcel_id, conflict_type, difference_sqm, severity, status, description, dataset_id, geometry_json)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    c.get("id", f"cnf-{uuid.uuid4().hex[:6]}"),
                    c["parcel_id"],
                    c.get("conflict_type", "Boundary Discrepancy"),
                    c.get("difference_sqm", 15.0),
                    c.get("severity", "High"),
                    c.get("status", "Active"),
                    c.get("description", "Discrepancy between registered deed and drone ORI boundary"),
                    dataset_id,
                    json.dumps(c["geometry"])
                ))

            conn.commit()

        if land_use:
            DatabaseService.save_land_use(dataset_id, land_use)

    @staticmethod
    def get_dashboard_statistics(mode: str = "real") -> Dict[str, Any]:
        with get_db_connection() as conn:
            cursor = conn.cursor()
            cond = " WHERE dataset_id IS NOT NULL AND dataset_id != ''" if mode == "real" else (" WHERE (dataset_id IS NULL OR dataset_id = '')" if mode == "demo" else "")
            and_cond = " AND dataset_id IS NOT NULL AND dataset_id != ''" if mode == "real" else (" AND (dataset_id IS NULL OR dataset_id = '')" if mode == "demo" else "")

            cursor.execute(f"SELECT COUNT(*) FROM parcels{cond}")
            total_parcels = cursor.fetchone()[0]
            
            cursor.execute(f"SELECT COUNT(*) FROM parcels WHERE confidence_score >= 0.90{and_cond}")
            high_conf = cursor.fetchone()[0]

            cursor.execute(f"SELECT COUNT(*) FROM parcels WHERE (status IN ('Verified', 'Ground-Truth Calibrated', 'Ground Truth Verified', 'Human Verified') OR status LIKE '%Verified%'){and_cond}")
            gt_verified = cursor.fetchone()[0]

            cursor.execute(f"SELECT COUNT(*) FROM parcels WHERE status IN ('Requires Verification', 'Conflict Detected', 'Flagged Discrepancy'){and_cond}")
            requires_review = cursor.fetchone()[0]

            cursor.execute(f"SELECT COUNT(*) FROM conflicts WHERE status != 'Resolved'{and_cond}")
            boundary_conflicts = cursor.fetchone()[0]

            cursor.execute(f"SELECT COUNT(*) FROM parcels WHERE status != 'Pending'{and_cond}")
            ai_extracted = cursor.fetchone()[0]

            return {
                "total_parcels": total_parcels,
                "ai_extracted": ai_extracted,
                "requires_review": requires_review,
                "boundary_conflicts": boundary_conflicts,
                "high_confidence": high_conf,
                "gt_verified": gt_verified,
                "mode": mode
            }

    @staticmethod
    def get_ground_truth_tasks(mode: str = "real") -> List[Dict[str, Any]]:
        with get_db_connection() as conn:
            cursor = conn.cursor()
            query = "SELECT * FROM ground_truth_tasks WHERE 1=1"
            if mode == "real":
                query += " AND dataset_id IS NOT NULL AND dataset_id != ''"
            elif mode == "demo":
                query += " AND (dataset_id IS NULL OR dataset_id = '')"
            query += " ORDER BY created_at DESC"
            cursor.execute(query)
            tasks = []
            for row in cursor.fetchall():
                t = dict(row)
                t["coordinates"] = json.loads(t["coordinates_json"]) if t.get("coordinates_json") else None
                t["evidence_files"] = json.loads(t["evidence_files_json"]) if t.get("evidence_files_json") else []
                cursor.execute(
                    "SELECT * FROM ground_truth_evidence WHERE task_id = ? OR task_id = ? ORDER BY uploaded_at ASC",
                    (t["task_id"], t["id"])
                )
                t["evidence_records"] = [dict(r) for r in cursor.fetchall()]
                tasks.append(t)
            return tasks

    @staticmethod
    def get_ground_truth_task(task_id: str) -> Optional[Dict[str, Any]]:
        with get_db_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM ground_truth_tasks WHERE task_id = ? OR id = ?", (task_id, task_id))
            row = cursor.fetchone()
            if not row:
                return None
            t = dict(row)
            t["coordinates"] = json.loads(t["coordinates_json"]) if t.get("coordinates_json") else None
            t["evidence_files"] = json.loads(t["evidence_files_json"]) if t.get("evidence_files_json") else []
            cursor.execute(
                "SELECT * FROM ground_truth_evidence WHERE task_id = ? OR task_id = ? ORDER BY uploaded_at ASC",
                (t["task_id"], t["id"])
            )
            t["evidence_records"] = [dict(r) for r in cursor.fetchall()]
            return t

    @staticmethod
    def create_ground_truth_task(data: Dict[str, Any]) -> Dict[str, Any]:
        with get_db_connection() as conn:
            cursor = conn.cursor()
            task_id = data.get("task_id") or f"GT-TASK-2026-{uuid.uuid4().hex[:3].upper()}"
            record_id = data.get("id") or f"gt-{uuid.uuid4().hex[:4]}"
            now = datetime.now().isoformat()
            coords = data.get("coordinates")
            files = data.get("evidence_files", [])

            cursor.execute("""
                INSERT INTO ground_truth_tasks (
                    id, parcel_id, task_id, reason, surveyor, status,
                    gnss_accuracy_cm, cors_reference, coordinates_json,
                    evidence_notes, evidence_files_json, created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                record_id,
                data.get("parcel_id", "Unknown"),
                task_id,
                data.get("reason", "Field ground truth survey"),
                data.get("surveyor", "R. Ramanathan (Chief Cadastral Surveyor)"),
                data.get("status", "Assigned"),
                data.get("gnss_accuracy_cm", 1.5),
                data.get("cors_reference", "TN-CORS-KA-04"),
                json.dumps(coords),
                data.get("evidence_notes", ""),
                json.dumps(files),
                now, now
            ))
            conn.commit()
            return DatabaseService.get_ground_truth_task(task_id)

    @staticmethod
    def update_ground_truth_task(task_id: str, updates: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        current = DatabaseService.get_ground_truth_task(task_id)
        if not current:
            return None
        with get_db_connection() as conn:
            cursor = conn.cursor()
            now = datetime.now().isoformat()
            status = updates.get("status", current["status"])
            notes = updates.get("evidence_notes", current.get("evidence_notes", ""))
            files = updates.get("evidence_files", current.get("evidence_files", []))
            surveyor = updates.get("surveyor", current.get("surveyor", ""))
            reason = updates.get("reason", current.get("reason", ""))

            cursor.execute("""
                UPDATE ground_truth_tasks
                SET status = ?, evidence_notes = ?, evidence_files_json = ?, surveyor = ?, reason = ?, updated_at = ?
                WHERE task_id = ? OR id = ?
            """, (status, notes, json.dumps(files), surveyor, reason, now, task_id, task_id))
            conn.commit()
        return DatabaseService.get_ground_truth_task(task_id)

    @staticmethod
    def add_ground_truth_evidence(task_id: str, evidence_data: Dict[str, Any]) -> Dict[str, Any]:
        task = DatabaseService.get_ground_truth_task(task_id)
        with get_db_connection() as conn:
            cursor = conn.cursor()
            ev_id = evidence_data.get("id") or f"gte-{uuid.uuid4().hex[:8]}"
            uploaded_at = evidence_data.get("uploaded_at") or datetime.now().isoformat()
            actual_task_id = task["task_id"] if task else task_id
            
            cursor.execute("""
                INSERT INTO ground_truth_evidence (
                    id, task_id, original_filename, storage_filename, storage_path,
                    file_size_bytes, file_size_str, file_type, uploaded_at, file_url
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                ev_id,
                actual_task_id,
                evidence_data["original_filename"],
                evidence_data["storage_filename"],
                evidence_data["storage_path"],
                evidence_data["file_size_bytes"],
                evidence_data["file_size_str"],
                evidence_data.get("file_type", "Survey Evidence"),
                uploaded_at,
                evidence_data.get("file_url", f"/api/ground-truth/evidence/{ev_id}/download")
            ))
            
            # Also append to task's evidence_files if not already there
            if task:
                curr_files = list(task.get("evidence_files", []))
                if evidence_data["original_filename"] not in curr_files:
                    curr_files.append(evidence_data["original_filename"])
                
                # If task was Open or Assigned, transition to In Progress automatically
                new_status = task["status"]
                if new_status in ["Open", "Assigned"]:
                    new_status = "In Progress"

                cursor.execute("""
                    UPDATE ground_truth_tasks
                    SET evidence_files_json = ?, status = ?, updated_at = ?
                    WHERE task_id = ? OR id = ?
                """, (json.dumps(curr_files), new_status, uploaded_at, task["task_id"], task["id"]))

            conn.commit()

            evidence_data["id"] = ev_id
            evidence_data["task_id"] = actual_task_id
            evidence_data["uploaded_at"] = uploaded_at
            evidence_data["file_url"] = f"/api/ground-truth/evidence/{ev_id}/download"
            return evidence_data

    @staticmethod
    def get_ground_truth_evidence(task_id: str) -> List[Dict[str, Any]]:
        with get_db_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                "SELECT * FROM ground_truth_evidence WHERE task_id = ? ORDER BY uploaded_at ASC",
                (task_id,)
            )
            return [dict(r) for r in cursor.fetchall()]

    @staticmethod
    def get_evidence_by_id(evidence_id: str) -> Optional[Dict[str, Any]]:
        with get_db_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM ground_truth_evidence WHERE id = ?", (evidence_id,))
            row = cursor.fetchone()
            return dict(row) if row else None

    @staticmethod
    def authenticate_user(email: str, password: Optional[str]) -> Optional[Dict[str, Any]]:
        if not email or not password:
            return None
        with get_db_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM users WHERE LOWER(email) = LOWER(?)", (email.strip(),))
            row = cursor.fetchone()
            if not row:
                return None
            user = dict(row)
            # Inactive accounts cannot authenticate
            if user.get("is_active", 1) == 0:
                return None
            if verify_password(password, user["password_hash"], user["salt"]):
                return {
                    "id": user["id"],
                    "email": user["email"],
                    "name": user["name"],
                    "role": user["role"],
                    "is_active": bool(user.get("is_active", 1)),
                    "avatar": user.get("avatar")
                }
            return None

    @staticmethod
    def get_user_by_email(email: str) -> Optional[Dict[str, Any]]:
        if not email:
            return None
        with get_db_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT id, email, name, role, is_active, avatar, created_at FROM users WHERE LOWER(email) = LOWER(?)", (email.strip(),))
            row = cursor.fetchone()
            return dict(row) if row else None

    @staticmethod
    def create_user(email: str, password: str, name: str, role: str = "Cadastral Surveyor", is_active: int = 1, avatar: Optional[str] = None) -> Dict[str, Any]:
        email = email.strip().lower()
        pwd_hash, salt = hash_password(password)
        user_id = f"usr-{uuid.uuid4().hex[:8]}"
        now = datetime.utcnow().isoformat()
        with get_db_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT INTO users (id, email, password_hash, salt, name, role, is_active, avatar, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (user_id, email, pwd_hash, salt, name, role, is_active, avatar, now))
            conn.commit()
            return {
                "id": user_id,
                "email": email,
                "name": name,
                "role": role,
                "is_active": is_active,
                "avatar": avatar,
                "created_at": now
            }

    @staticmethod
    def list_users() -> List[Dict[str, Any]]:
        with get_db_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT id, email, name, role, is_active, avatar, created_at FROM users ORDER BY created_at ASC")
            return [dict(r) for r in cursor.fetchall()]

    @staticmethod
    def update_user_password(email: str, new_password: str) -> bool:
        pwd_hash, salt = hash_password(new_password)
        with get_db_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("UPDATE users SET password_hash = ?, salt = ? WHERE LOWER(email) = LOWER(?)", (pwd_hash, salt, email.strip()))
            conn.commit()
            return cursor.rowcount > 0

    @staticmethod
    def set_user_active_status(email: str, is_active: int) -> bool:
        with get_db_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("UPDATE users SET is_active = ? WHERE LOWER(email) = LOWER(?)", (is_active, email.strip()))
            conn.commit()
            return cursor.rowcount > 0

init_db()

db_service = DatabaseService
