from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any

class LandComposition(BaseModel):
    buildable_area_pct: float = 48.0
    green_space_pct: float = 22.0
    paved_roads_pct: float = 18.0
    water_retention_pct: float = 12.0

class EnvironmentalMetrics(BaseModel):
    soil_quality: str = "Grade A"
    flood_risk: str = "Minimal"
    solar_potential: float = 9.2
    air_quality: str = "Good"

class GrowthPredictionPoint(BaseModel):
    year: str
    valuation_millions: float

class Parcel(BaseModel):
    id: str
    parcel_id: str  # e.g., "TN-CAD-004-01872" or "Parcel #8824-A"
    title: str = "Tech District Lot"
    address: str = "1242 Innovation Way, Tech District"
    zone: str = "M-2"
    zone_description: str = "M-2 (Mixed Use)"
    existing_area_sqm: float
    ai_area_sqm: float
    difference_sqm: float
    confidence_score: float  # e.g. 0.94 (94%)
    status: str = "Requires Verification"  # "Verified", "Requires Verification", "Conflict Detected", "High Confidence", "Ground Truth"
    current_status_tag: str = "Development Ready"
    valuation_usd: float = 2400000.0  # $2.4M
    valuation_change_pct: float = 12.0
    suitability_score: int = 94
    roi_potential: str = "EXCELLENT"
    risk_level: str = "LOW"
    description: str = "Prime urban development lot located in the heart of the Tech District. High-density potential with approved AI-optimized zoning variances."
    quote: str = '"This parcel is 15% undervalued compared to similar Tech District developments." — AI Insights'
    total_area_acres: float = 1.24
    geometry: Dict[str, Any]
    existing_geometry: Optional[Dict[str, Any]] = None
    land_composition: LandComposition = Field(default_factory=LandComposition)
    environmental: EnvironmentalMetrics = Field(default_factory=EnvironmentalMetrics)
    growth_predictions: List[GrowthPredictionPoint] = Field(default_factory=lambda: [
        GrowthPredictionPoint(year="2020", valuation_millions=1.9),
        GrowthPredictionPoint(year="2021", valuation_millions=2.0),
        GrowthPredictionPoint(year="2022", valuation_millions=2.1),
        GrowthPredictionPoint(year="2023", valuation_millions=2.25),
        GrowthPredictionPoint(year="2024", valuation_millions=2.4),
    ])
    history_events: List[Dict[str, str]] = Field(default_factory=lambda: [
        {"date": "2026-08-15", "event": "AI Drone Orthomosaic 5cm re-flight completed"},
        {"date": "2026-05-10", "event": "Cadastral survey boundary alignment approved"},
        {"date": "2025-11-20", "event": "Zoning variance M-2 Mixed-Use reclassified"}
    ])
    documents: List[Dict[str, str]] = Field(default_factory=lambda: [
        {"name": "Drone_Orthomosaic_Tile_44.tif", "type": "GeoTIFF", "size": "42 MB"},
        {"name": "Cadastral_Title_Deed_TN-8824.pdf", "type": "PDF", "size": "2.4 MB"},
        {"name": "AI_Segmentation_Polygon.geojson", "type": "GeoJSON", "size": "18 KB"}
    ])

class Building(BaseModel):
    id: str
    parcel_id: str
    footprint_area_sqm: float
    height_meters: float
    confidence_score: float
    status: str = "Extracted"
    geometry: Dict[str, Any]

class Road(BaseModel):
    id: str
    name: str
    road_type: str  # "Primary Arterial", "Secondary Collector", "Local Access"
    width_meters: float
    confidence_score: float
    geometry: Dict[str, Any]

class Pathway(BaseModel):
    id: str
    pathway_type: str  # "Pedestrian Footpath", "Bicycle Trail", "Alleyway"
    width_meters: float
    geometry: Dict[str, Any]

class Conflict(BaseModel):
    id: str
    parcel_id: str
    conflict_type: str  # "Boundary mismatch", "Area mismatch", "Overlap", "Gap", "Building boundary issue", "Roads inconsistency"
    existing_area_sqm: float
    ai_area_sqm: float
    difference_sqm: float
    affected_area_sqm: float
    confidence_score: float
    status: str = "Pending"  # "Pending", "Requires Survey Verification", "Resolved", "Dismissed"
    recommendation: str = "Possible Boundary Discrepancy - Requires Survey Verification"
    severity: str = "High"  # "High", "Medium", "Low"
    geometry: Dict[str, Any]
    notes: Optional[str] = "AI boundary encroaches into road reservation offset by 1.8 meters."

class VerificationTask(BaseModel):
    id: str
    parcel_id: str
    surveyor: str
    action_type: str  # "Accept AI", "Correct Boundary", "Reject", "Send to Ground Truth"
    status: str = "Pending"  # "Pending", "Approved", "In Review", "Rejected"
    original_geometry: Dict[str, Any]
    modified_geometry: Optional[Dict[str, Any]] = None
    notes: str = ""
    created_at: str
    updated_at: str

class GroundTruthTask(BaseModel):
    id: str
    parcel_id: str
    task_id: str
    reason: str
    surveyor: str
    status: str = "Open"  # "Open", "Assigned", "Survey In Progress", "Verified", "Rejected"
    gnss_accuracy_cm: float = 2.5
    cors_reference: str = "TN-CORS-Station-04"
    coordinates: Optional[List[float]] = None
    evidence_notes: str = "RTK GNSS boundary survey tied to state datum"
    evidence_files: List[str] = []

class ChangeDetectionItem(BaseModel):
    id: str
    parcel_id: str
    feature_type: str  # "New Building", "Removed Building", "Boundary Change", "Road Change", "Land-use Change"
    date_a: str = "January 2026"
    date_b: str = "August 2026"
    change_description: str
    geometry: Dict[str, Any]

class TopologyIssue(BaseModel):
    id: str
    issue_type: str  # "Overlapping parcels", "Gaps", "Duplicate polygons", "Self intersections", "Boundary discontinuity"
    severity: str = "Error"  # "Error", "Warning", "Passed"
    parcel_ids: List[str]
    description: str
    coordinates: List[float]
    resolved: bool = False

class AuditLogEntry(BaseModel):
    id: str
    timestamp: str
    user: str
    action: str
    parcel_id: str
    previous_state: str
    new_state: str
    details: str

class AIExtractionJob(BaseModel):
    job_id: str
    status: str = "Pending"
    progress_pct: int = 0
    drone_layer: str
    ori_file: Optional[str] = None
    dsm_file: Optional[str] = None
    dtm_file: Optional[str] = None
    extracted_parcels: int = 0
    extracted_buildings: int = 0
    extracted_roads: int = 0
    extracted_pathways: int = 0
    land_use_features: Optional[str] = None

class Project(BaseModel):
    id: str
    name: str
    district: str
    state: str
    crs: str = "Unreferenced Image"
    flight_date: str
    resolution_cm: Optional[float] = None
    total_parcels: int = 0
    ai_extracted: int = 0
    requires_review: int = 0
    boundary_conflicts: int = 0
    high_confidence: int = 0
    gt_verified: int = 0
