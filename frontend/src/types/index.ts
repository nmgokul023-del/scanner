export interface LandComposition {
  buildable_area_pct: number;
  green_space_pct: number;
  paved_roads_pct: number;
  water_retention_pct: number;
}

export interface EnvironmentalMetrics {
  soil_quality: string;
  flood_risk: string;
  solar_potential: number;
  air_quality: string;
}

export interface GrowthPredictionPoint {
  year: string;
  valuation_millions: number;
}

export interface Parcel {
  id: string;
  parcel_id: string;
  title: string;
  address: string;
  zone: string;
  zone_description: string;
  existing_area_sqm: number;
  ai_area_sqm: number;
  difference_sqm: number;
  confidence_score: number;
  status: 'Verified' | 'Requires Verification' | 'Conflict Detected' | 'High Confidence' | 'Rejected';
  current_status_tag: string;
  valuation_usd: number;
  valuation_change_pct: number;
  suitability_score: number;
  roi_potential: string;
  risk_level: string;
  description: string;
  quote: string;
  total_area_acres: number;
  geometry: {
    type: string;
    coordinates: number[][][] | any;
  };
  existing_geometry?: {
    type: string;
    coordinates: number[][][] | any;
  };
  land_composition: LandComposition;
  environmental: EnvironmentalMetrics;
  growth_predictions: GrowthPredictionPoint[];
  history_events: { date: string; event: string }[];
  documents: { name: string; type: string; size: string }[];
}

export interface Building {
  id: string;
  parcel_id: string;
  footprint_area_sqm: number;
  height_meters: number;
  confidence_score: number;
  status: string;
  geometry: {
    type: string;
    coordinates: number[][][];
  };
}

export interface Road {
  id: string;
  name: string;
  road_type: string;
  width_meters: number;
  confidence_score: number;
  geometry: {
    type: string;
    coordinates: number[][];
  };
}

export interface Pathway {
  id: string;
  pathway_type: string;
  width_meters: number;
  geometry: {
    type: string;
    coordinates: number[][];
  };
}

export interface Conflict {
  id: string;
  parcel_id: string;
  conflict_type: string;
  existing_area_sqm: number;
  ai_area_sqm: number;
  difference_sqm: number;
  affected_area_sqm: number;
  confidence_score: number;
  status: 'Pending' | 'Requires Survey Verification' | 'Resolved' | 'Dismissed';
  recommendation: string;
  severity: 'High' | 'Medium' | 'Low';
  notes?: string;
  geometry: {
    type: string;
    coordinates: number[][][];
  };
}

export interface GroundTruthEvidenceRecord {
  id: string;
  task_id: string;
  original_filename: string;
  storage_filename: string;
  storage_path: string;
  file_size_bytes: number;
  file_size_str: string;
  file_type: string;
  uploaded_at: string;
  file_url: string;
}

export interface GroundTruthTask {
  id: string;
  parcel_id: string;
  task_id: string;
  reason: string;
  surveyor: string;
  status: 'Open' | 'Assigned' | 'In Progress' | 'Verified' | 'Rejected';
  gnss_accuracy_cm: number;
  cors_reference: string;
  coordinates: [number, number];
  evidence_notes: string;
  evidence_files: string[];
  evidence_records?: GroundTruthEvidenceRecord[];
  created_at?: string;
  updated_at?: string;
}


export interface ChangeDetectionItem {
  id: string;
  parcel_id: string;
  feature_type: string;
  date_a: string;
  date_b: string;
  change_description: string;
  geometry: any;
}

export interface TopologyIssue {
  id: string;
  issue_type: string;
  severity: 'Error' | 'Warning' | 'Passed';
  parcel_ids: string[];
  description: string;
  coordinates: [number, number];
  resolved: boolean;
}

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  user: string;
  action: string;
  parcel_id: string;
  previous_state: string;
  new_state: string;
  details: string;
}

export interface Project {
  id: string;
  name: string;
  district: string;
  state: string;
  crs: string;
  flight_date: string;
  resolution_cm: number;
  total_parcels: number;
  ai_extracted: number;
  requires_review: number;
  boundary_conflicts: number;
  high_confidence: number;
  gt_verified: number;
}
