# UrbanCadastral: AI-Powered Urban Cadastral Mapping & Land Administration

UrbanCadastral is an enterprise-grade Web-GIS application designed for drone-based cadastral mapping, property boundary identification, deep-learning feature extraction, boundary discrepancy detection, and land administration compliance.

---

## Key Features

- **Full-Stack GIS Architecture**:
  - **Frontend**: React 18, TypeScript, Vite, Tailwind CSS, Lucide icons, Leaflet Web-GIS mapping engine.
  - **Backend**: FastAPI, Uvicorn, SQLite database, GDAL/Rasterio/Shapely geospatial services.
- **Multi-Source Geospatial Ingestion**:
  - **GeoTIFF Orthomosaics** (`.tif`, `.tiff`): Real raster dimension reading, CRS detection, affine transformation, bounds calculation, and Ground Sampling Distance (GSD) extraction.
  - **Government / Open GIS Datasets**: Ingestion of official cadastral boundaries via GeoJSON, Shapefile archives, and GeoPackage formats.
  - **Drone Imagery Upload**: Orthomosaic processing with automatic photogrammetric and georeferencing inspection.
- **10-Layer Interactive Web-GIS Engine**:
  1. Base Map (Reference Only — OSM tiles, non-cadastral)
  2. Uploaded Orthomosaic / GeoTIFF
  3. Building Footprints (AI / Vectorized)
  4. Road Network & Corridors
  5. Vegetation / Canopy
  6. Water Bodies
  7. Open Land / Bare Plots
  8. Parcel Boundaries (Official & AI-produced)
  9. AI Detection / Segmentation Results
  10. Change Detection & Boundary Discrepancies
- **Interactive Vector GIS Editor**:
  - Manual polygon parcel drawing with real-time geodesic area ($m^2$) and perimeter ($m$) computation.
  - Interactive vertex editing via draggable node anchors.
  - Split, merge, and adjacent parcel generation.
  - Boundary deletion and database persistence.
- **Auditing & Surveyor Verification**:
  - Verification queue for human surveyor review.
  - Geodesic discrepancy analysis comparing registry boundaries with high-resolution drone orthomosaics.
  - CORS RTK GNSS ground control checkpoint auditing.
  - Full audit logging for survey actions and compliance.
- **Session Authentication & Security**:
  - Role-based surveyor authentication (`/api/auth/login`, `/api/auth/me`, `/api/auth/logout`).
  - Session persistence with encrypted tokens.

---

## Project Structure

```
├── backend/
│   ├── main.py                  # FastAPI application entrypoint
│   ├── routes/
│   │   └── api_router.py        # REST API endpoints (/api/gis/*, /api/auth/*, etc.)
│   ├── services/
│   │   ├── db_service.py        # SQLite persistence and audit logs
│   │   ├── geospatial_service.py# GDAL/Rasterio metadata extraction & transforms
│   │   ├── ai_model_interface.py# Deep learning segmentation interfaces
│   │   ├── conflict_service.py  # Spatial difference & overlap calculation
│   │   ├── topology_service.py  # Topology validation & polygon repair
│   │   └── processing_service.py# Drone processing pipelines & SSE streaming
│   ├── models/
│   │   ├── schemas.py           # Pydantic data transfer schemas
│   │   └── weights/             # AI model weights directory (README)
│   ├── data/                    # SQLite database & upload storage
│   └── requirements.txt         # Python dependencies
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── map/LeafletMap.tsx # Full interactive GIS Leaflet component
│   │   │   ├── layout/            # Navbar, Sidebar, headers
│   │   │   └── common/            # Reusable UI controls
│   │   ├── pages/
│   │   │   ├── ParcelMap.tsx      # Main Cadastral Map viewer
│   │   │   ├── GISEditor.tsx      # Vector GIS Editor
│   │   │   ├── Dashboard.tsx      # Cadastral overview & analytics
│   │   │   ├── DroneImageryUpload.tsx # GeoTIFF/Drone ingestion
│   │   │   ├── Verification.tsx   # Surveyor verification queue
│   │   │   ├── ChangeDetection.tsx# Multi-temporal discrepancy analysis
│   │   │   └── Login.tsx          # Authentication screen
│   │   ├── api/client.ts          # Typed REST API client
│   │   └── types/index.ts         # TypeScript data definitions
│   ├── package.json
│   ├── vite.config.ts
│   └── tsconfig.json
├── .gitignore
└── README.md
```

---

## Installation & Setup

### Prerequisites
- Python 3.10+
- Node.js 18+ and npm
- GDAL (optional for raw GeoTIFF C-bindings, fallback python implementations included)

### 1. Backend Setup
```bash
cd backend
python -m venv venv
# Windows:
venv\Scripts\activate
# Linux/macOS:
source venv/bin/activate

pip install -r requirements.txt
python main.py
```
*Backend runs at `http://127.0.0.1:8000` with Swagger documentation at `http://127.0.0.1:8000/docs`.*

### 2. Frontend Setup
```bash
cd frontend
npm install
npm run build   # Production build
# Or run dev server:
npm run dev
```

---

## Development Credentials
- **Email**: `demo@example.com` (or any valid email)
- **Password**: `123456` (or any non-empty password)

---

## License
MIT License.
