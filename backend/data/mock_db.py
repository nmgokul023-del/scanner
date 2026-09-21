import json
from datetime import datetime
from typing import Dict, List, Any, Optional

# Center coordinates for Tech District: [Lat: 12.9785, Lng: 77.6405]
TECH_LAT = 12.9785
TECH_LNG = 77.6405

# In-memory storage with initial realistic cadastral datasets
MOCK_PROJECTS = [
    {
        "id": "proj-01",
        "name": "Tech District Phase II Drone Cadastre",
        "district": "Bangalore Urban / Indiranagar-Tech Hub",
        "state": "Karnataka",
        "crs": "EPSG:4326 / WGS 84 (UTM 43N)",
        "flight_date": "2026-08-15",
        "resolution_cm": 5.0,
        "total_parcels": 12486,
        "ai_extracted": 11932,
        "requires_review": 428,
        "boundary_conflicts": 126,
        "high_confidence": 10847,
        "gt_verified": 8624
    },
    {
        "id": "proj-02",
        "name": "Metropolitan Outer Ring Cadastral Resurvey",
        "district": "Chennai Metro",
        "state": "Tamil Nadu",
        "crs": "EPSG:4326 / WGS 84 (UTM 44N)",
        "flight_date": "2026-07-22",
        "resolution_cm": 4.5,
        "total_parcels": 8420,
        "ai_extracted": 8100,
        "requires_review": 230,
        "boundary_conflicts": 88,
        "high_confidence": 7450,
        "gt_verified": 6120
    }
]

# Flagship parcel 8824-A coordinates (Polygon)
POLY_8824_AI = [
    [77.6395, 12.9780],
    [77.6415, 12.9782],
    [77.6412, 12.9798],
    [77.6392, 12.9796],
    [77.6395, 12.9780]
]

POLY_8824_EXISTING = [
    [77.6396, 12.9781],
    [77.6413, 12.9782],
    [77.6411, 12.9795],
    [77.6393, 12.9794],
    [77.6396, 12.9781]
]

MOCK_PARCELS: List[Dict[str, Any]] = [
    {
        "id": "parcel-8824-a",
        "parcel_id": "TN-CAD-004-01872",
        "title": "Parcel #8824-A • ZONE M-2",
        "address": "1242 Innovation Way, Tech District",
        "zone": "M-2",
        "zone_description": "M-2 (Mixed Use)",
        "existing_area_sqm": 1000.0,
        "ai_area_sqm": 1080.0,
        "difference_sqm": 80.0,
        "confidence_score": 0.82,
        "status": "Requires Verification",
        "current_status_tag": "Development Ready",
        "valuation_usd": 2400000.0,
        "valuation_change_pct": 12.0,
        "suitability_score": 94,
        "roi_potential": "EXCELLENT",
        "risk_level": "LOW",
        "description": "Prime urban development lot located in the heart of the Tech District. High-density potential with approved AI-optimized zoning variances.",
        "quote": '"This parcel is 15% undervalued compared to similar Tech District developments." — AI Insights',
        "total_area_acres": 1.24,
        "geometry": {
            "type": "Polygon",
            "coordinates": [POLY_8824_AI]
        },
        "existing_geometry": {
            "type": "Polygon",
            "coordinates": [POLY_8824_EXISTING]
        },
        "land_composition": {
            "buildable_area_pct": 48.0,
            "green_space_pct": 22.0,
            "paved_roads_pct": 18.0,
            "water_retention_pct": 12.0
        },
        "environmental": {
            "soil_quality": "Grade A",
            "flood_risk": "Minimal",
            "solar_potential": 9.2,
            "air_quality": "Good"
        },
        "growth_predictions": [
            {"year": "2020", "valuation_millions": 1.9},
            {"year": "2021", "valuation_millions": 2.0},
            {"year": "2022", "valuation_millions": 2.1},
            {"year": "2023", "valuation_millions": 2.25},
            {"year": "2024", "valuation_millions": 2.4}
        ],
        "history_events": [
            {"date": "2026-08-15", "event": "AI Drone Orthomosaic 5cm re-flight completed"},
            {"date": "2026-05-10", "event": "Cadastral survey boundary alignment approved"},
            {"date": "2025-11-20", "event": "Zoning variance M-2 Mixed-Use reclassified"}
        ],
        "documents": [
            {"name": "Drone_Orthomosaic_Tile_44.tif", "type": "GeoTIFF", "size": "42 MB"},
            {"name": "Cadastral_Title_Deed_TN-8824.pdf", "type": "PDF", "size": "2.4 MB"},
            {"name": "AI_Segmentation_Polygon.geojson", "type": "GeoJSON", "size": "18 KB"}
        ]
    },
    {
        "id": "parcel-441",
        "parcel_id": "Tech District Parcel #441",
        "title": "Tech District Parcel #441",
        "address": "441 Cyber Boulevard, Tech District",
        "zone": "C-1",
        "zone_description": "C-1 (Commercial / Mixed Conversion)",
        "existing_area_sqm": 2450.0,
        "ai_area_sqm": 2520.0,
        "difference_sqm": 70.0,
        "confidence_score": 0.91,
        "status": "High Confidence",
        "current_status_tag": "Zoning Mismatch Found",
        "valuation_usd": 4850000.0,
        "valuation_change_pct": 14.0,
        "suitability_score": 96,
        "roi_potential": "HIGH",
        "risk_level": "LOW",
        "description": "Zoning mismatch found. High ROI potential for mixed-use conversion.",
        "quote": '"AI predicts a 14% increase in value for the North-East corridor over the next 18 months due to infrastructure expansion."',
        "total_area_acres": 2.85,
        "geometry": {
            "type": "Polygon",
            "coordinates": [[
                [77.6420, 12.9782],
                [77.6442, 12.9784],
                [77.6439, 12.9802],
                [77.6418, 12.9800],
                [77.6420, 12.9782]
            ]]
        },
        "existing_geometry": {
            "type": "Polygon",
            "coordinates": [[
                [77.6421, 12.9783],
                [77.6441, 12.9784],
                [77.6438, 12.9801],
                [77.6419, 12.9799],
                [77.6421, 12.9783]
            ]]
        },
        "land_composition": {
            "buildable_area_pct": 60.0,
            "green_space_pct": 15.0,
            "paved_roads_pct": 15.0,
            "water_retention_pct": 10.0
        },
        "environmental": {
            "soil_quality": "Grade A",
            "flood_risk": "None",
            "solar_potential": 9.5,
            "air_quality": "Moderate"
        },
        "growth_predictions": [
            {"year": "2020", "valuation_millions": 3.8},
            {"year": "2021", "valuation_millions": 4.1},
            {"year": "2022", "valuation_millions": 4.3},
            {"year": "2023", "valuation_millions": 4.55},
            {"year": "2024", "valuation_millions": 4.85}
        ],
        "history_events": [
            {"date": "2026-08-01", "event": "Zoning variance application logged"},
            {"date": "2026-03-12", "event": "Commercial drone inspection completed"}
        ],
        "documents": [
            {"name": "Parcel_441_Commercial_Deed.pdf", "type": "PDF", "size": "3.1 MB"},
            {"name": "Zoning_Map_Overlay.tif", "type": "GeoTIFF", "size": "28 MB"}
        ]
    },
    {
        "id": "parcel-8825-b",
        "parcel_id": "Eco-Zone Sub-Dividing",
        "title": "Eco-Zone Sub-Dividing #8825-B",
        "address": "882 Green Park Parkway, Eco Corridor",
        "zone": "E-3",
        "zone_description": "E-3 (Eco Preservation & Clean Tech)",
        "existing_area_sqm": 3100.0,
        "ai_area_sqm": 3020.0,
        "difference_sqm": -80.0,
        "confidence_score": 0.76,
        "status": "Requires Verification",
        "current_status_tag": "Tax Incentive Candidate",
        "valuation_usd": 3150000.0,
        "valuation_change_pct": 8.5,
        "suitability_score": 88,
        "roi_potential": "MEDIUM",
        "risk_level": "LOW",
        "description": "Optimized for green-energy tax incentives starting Q3 2025.",
        "quote": '"Eco-zone sub-division allows solar canopy installation with accelerated municipal clearance."',
        "total_area_acres": 3.42,
        "geometry": {
            "type": "Polygon",
            "coordinates": [[
                [77.6370, 12.9775],
                [77.6390, 12.9777],
                [77.6387, 12.9793],
                [77.6368, 12.9791],
                [77.6370, 12.9775]
            ]]
        },
        "existing_geometry": {
            "type": "Polygon",
            "coordinates": [[
                [77.6369, 12.9774],
                [77.6391, 12.9777],
                [77.6388, 12.9794],
                [77.6367, 12.9792],
                [77.6369, 12.9774]
            ]]
        },
        "land_composition": {
            "buildable_area_pct": 32.0,
            "green_space_pct": 45.0,
            "paved_roads_pct": 13.0,
            "water_retention_pct": 10.0
        },
        "environmental": {
            "soil_quality": "Grade A+",
            "flood_risk": "Low",
            "solar_potential": 9.8,
            "air_quality": "Excellent"
        },
        "growth_predictions": [
            {"year": "2020", "valuation_millions": 2.4},
            {"year": "2021", "valuation_millions": 2.6},
            {"year": "2022", "valuation_millions": 2.75},
            {"year": "2023", "valuation_millions": 2.95},
            {"year": "2024", "valuation_millions": 3.15}
        ],
        "history_events": [
            {"date": "2026-07-14", "event": "Eco-zone municipal certificate renewed"}
        ],
        "documents": [
            {"name": "Green_Certification_Doc.pdf", "type": "PDF", "size": "1.8 MB"}
        ]
    },
    {
        "id": "parcel-1873",
        "parcel_id": "TN-CAD-004-01873",
        "title": "Parcel #1873 • Tech North",
        "address": "1250 Innovation Way, Tech District",
        "zone": "M-2",
        "zone_description": "M-2 (Mixed Use)",
        "existing_area_sqm": 1200.0,
        "ai_area_sqm": 1205.0,
        "difference_sqm": 5.0,
        "confidence_score": 0.98,
        "status": "Verified",
        "current_status_tag": "Fully Compliant",
        "valuation_usd": 2750000.0,
        "valuation_change_pct": 10.5,
        "suitability_score": 97,
        "roi_potential": "HIGH",
        "risk_level": "VERY LOW",
        "description": "High confidence cadastral polygon fully matching legal registry and CORS ground control points.",
        "quote": '"Zero discrepancy detected between AI drone extraction and state cadastral base."',
        "total_area_acres": 1.45,
        "geometry": {
            "type": "Polygon",
            "coordinates": [[
                [77.6393, 12.9800],
                [77.6413, 12.9802],
                [77.6410, 12.9818],
                [77.6390, 12.9816],
                [77.6393, 12.9800]
            ]]
        },
        "existing_geometry": {
            "type": "Polygon",
            "coordinates": [[
                [77.6393, 12.9800],
                [77.6413, 12.9802],
                [77.6410, 12.9818],
                [77.6390, 12.9816],
                [77.6393, 12.9800]
            ]]
        },
        "land_composition": {
            "buildable_area_pct": 52.0,
            "green_space_pct": 20.0,
            "paved_roads_pct": 18.0,
            "water_retention_pct": 10.0
        },
        "environmental": {
            "soil_quality": "Grade A",
            "flood_risk": "Minimal",
            "solar_potential": 9.1,
            "air_quality": "Good"
        },
        "growth_predictions": [
            {"year": "2020", "valuation_millions": 2.1},
            {"year": "2021", "valuation_millions": 2.25},
            {"year": "2022", "valuation_millions": 2.4},
            {"year": "2023", "valuation_millions": 2.58},
            {"year": "2024", "valuation_millions": 2.75}
        ],
        "history_events": [
            {"date": "2026-08-16", "event": "Automated AI verification passed"}
        ],
        "documents": [
            {"name": "Cadastral_Pass_Certificate.pdf", "type": "PDF", "size": "1.2 MB"}
        ]
    },
    {
        "id": "parcel-1874",
        "parcel_id": "TN-CAD-004-01874",
        "title": "Parcel #1874 • Conflict Zone A",
        "address": "1260 Innovation Way, Tech District",
        "zone": "R-3",
        "zone_description": "R-3 (High Density Residential)",
        "existing_area_sqm": 850.0,
        "ai_area_sqm": 960.0,
        "difference_sqm": 110.0,
        "confidence_score": 0.54,
        "status": "Conflict Detected",
        "current_status_tag": "Requires Survey Verification",
        "valuation_usd": 1850000.0,
        "valuation_change_pct": 5.2,
        "suitability_score": 72,
        "roi_potential": "MEDIUM",
        "risk_level": "ELEVATED",
        "description": "Possible Boundary Discrepancy detected against historical revenue sketch. Compound wall exceeds revenue limit by 110 m².",
        "quote": '"Requires survey verification prior to statutory mutation."',
        "total_area_acres": 1.05,
        "geometry": {
            "type": "Polygon",
            "coordinates": [[
                [77.6417, 12.9803],
                [77.6437, 12.9805],
                [77.6434, 12.9821],
                [77.6414, 12.9819],
                [77.6417, 12.9803]
            ]]
        },
        "existing_geometry": {
            "type": "Polygon",
            "coordinates": [[
                [77.6418, 12.9804],
                [77.6435, 12.9805],
                [77.6433, 12.9818],
                [77.6415, 12.9817],
                [77.6418, 12.9804]
            ]]
        },
        "land_composition": {
            "buildable_area_pct": 45.0,
            "green_space_pct": 18.0,
            "paved_roads_pct": 25.0,
            "water_retention_pct": 12.0
        },
        "environmental": {
            "soil_quality": "Grade B",
            "flood_risk": "Moderate",
            "solar_potential": 8.7,
            "air_quality": "Good"
        },
        "growth_predictions": [
            {"year": "2020", "valuation_millions": 1.5},
            {"year": "2021", "valuation_millions": 1.6},
            {"year": "2022", "valuation_millions": 1.7},
            {"year": "2023", "valuation_millions": 1.78},
            {"year": "2024", "valuation_millions": 1.85}
        ],
        "history_events": [
            {"date": "2026-08-14", "event": "Boundary discrepancy flagged by AI matcher"}
        ],
        "documents": [
            {"name": "Discrepancy_Warning_TN1874.pdf", "type": "PDF", "size": "890 KB"}
        ]
    }
]

MOCK_BUILDINGS: List[Dict[str, Any]] = [
    {
        "id": "bldg-01",
        "parcel_id": "TN-CAD-004-01872",
        "footprint_area_sqm": 420.0,
        "height_meters": 16.5,
        "confidence_score": 0.96,
        "status": "Extracted",
        "geometry": {
            "type": "Polygon",
            "coordinates": [[
                [77.6399, 12.9785],
                [77.6409, 12.9786],
                [77.6407, 12.9793],
                [77.6397, 12.9792],
                [77.6399, 12.9785]
            ]]
        }
    },
    {
        "id": "bldg-02",
        "parcel_id": "Tech District Parcel #441",
        "footprint_area_sqm": 880.0,
        "height_meters": 24.0,
        "confidence_score": 0.98,
        "status": "Extracted",
        "geometry": {
            "type": "Polygon",
            "coordinates": [[
                [77.6425, 12.9788],
                [77.6436, 12.9789],
                [77.6434, 12.9797],
                [77.6423, 12.9796],
                [77.6425, 12.9788]
            ]]
        }
    },
    {
        "id": "bldg-03",
        "parcel_id": "TN-CAD-004-01873",
        "footprint_area_sqm": 560.0,
        "height_meters": 18.2,
        "confidence_score": 0.94,
        "status": "Extracted",
        "geometry": {
            "type": "Polygon",
            "coordinates": [[
                [77.6397, 12.9805],
                [77.6407, 12.9806],
                [77.6405, 12.9813],
                [77.6395, 12.9812],
                [77.6397, 12.9805]
            ]]
        }
    }
]

MOCK_ROADS: List[Dict[str, Any]] = [
    {
        "id": "road-01",
        "name": "Innovation Way",
        "road_type": "Primary Arterial",
        "width_meters": 24.0,
        "confidence_score": 0.99,
        "geometry": {
            "type": "LineString",
            "coordinates": [
                [77.6360, 12.9778],
                [77.6400, 12.9780],
                [77.6450, 12.9783]
            ]
        }
    },
    {
        "id": "road-02",
        "name": "Cyber Boulevard",
        "road_type": "Secondary Collector",
        "width_meters": 18.0,
        "confidence_score": 0.97,
        "geometry": {
            "type": "LineString",
            "coordinates": [
                [77.6415, 12.9770],
                [77.6416, 12.9805],
                [77.6418, 12.9830]
            ]
        }
    },
    {
        "id": "road-03",
        "name": "Eco Link Avenue",
        "road_type": "Local Access",
        "width_meters": 12.0,
        "confidence_score": 0.95,
        "geometry": {
            "type": "LineString",
            "coordinates": [
                [77.6375, 12.9770],
                [77.6390, 12.9800],
                [77.6392, 12.9825]
            ]
        }
    }
]

MOCK_PATHWAYS: List[Dict[str, Any]] = [
    {
        "id": "path-01",
        "pathway_type": "Pedestrian Galleria",
        "width_meters": 4.5,
        "geometry": {
            "type": "LineString",
            "coordinates": [
                [77.6402, 12.9783],
                [77.6405, 12.9795],
                [77.6408, 12.9802]
            ]
        }
    },
    {
        "id": "path-02",
        "pathway_type": "Greenway Cycle Trail",
        "width_meters": 3.0,
        "geometry": {
            "type": "LineString",
            "coordinates": [
                [77.6372, 12.9785],
                [77.6385, 12.9788],
                [77.6388, 12.9810]
            ]
        }
    }
]

MOCK_CONFLICTS: List[Dict[str, Any]] = [
    {
        "id": "conf-01",
        "parcel_id": "TN-CAD-004-01872",
        "conflict_type": "Boundary mismatch",
        "existing_area_sqm": 1000.0,
        "ai_area_sqm": 1080.0,
        "difference_sqm": 80.0,
        "affected_area_sqm": 80.0,
        "confidence_score": 0.82,
        "status": "Requires Survey Verification",
        "recommendation": "Possible Boundary Discrepancy - Requires Survey Verification",
        "severity": "Medium",
        "notes": "East boundary wall aligns with drone vegetation line, but title deed indicates 1.2m offset from storm water drain.",
        "geometry": {
            "type": "Polygon",
            "coordinates": [[
                [77.6411, 12.9795],
                [77.6412, 12.9798],
                [77.6415, 12.9782],
                [77.6413, 12.9782],
                [77.6411, 12.9795]
            ]]
        }
    },
    {
        "id": "conf-02",
        "parcel_id": "TN-CAD-004-01874",
        "conflict_type": "Area mismatch",
        "existing_area_sqm": 850.0,
        "ai_area_sqm": 960.0,
        "difference_sqm": 110.0,
        "affected_area_sqm": 110.0,
        "confidence_score": 0.54,
        "status": "Requires Survey Verification",
        "recommendation": "Possible Boundary Discrepancy - Requires Survey Verification",
        "severity": "High",
        "notes": "Compound fence constructed into municipal road setback buffer.",
        "geometry": {
            "type": "Polygon",
            "coordinates": [[
                [77.6433, 12.9818],
                [77.6434, 12.9821],
                [77.6437, 12.9805],
                [77.6435, 12.9805],
                [77.6433, 12.9818]
            ]]
        }
    },
    {
        "id": "conf-03",
        "parcel_id": "Tech District Parcel #441",
        "conflict_type": "Building boundary issue",
        "existing_area_sqm": 2450.0,
        "ai_area_sqm": 2520.0,
        "difference_sqm": 70.0,
        "affected_area_sqm": 70.0,
        "confidence_score": 0.88,
        "status": "Pending",
        "recommendation": "Possible Boundary Discrepancy - High ROI Mixed-Use Potential",
        "severity": "Low",
        "notes": "New canopy structure projects 0.8m over cadastral easement line.",
        "geometry": {
            "type": "Polygon",
            "coordinates": [[
                [77.6438, 12.9801],
                [77.6439, 12.9802],
                [77.6442, 12.9784],
                [77.6441, 12.9784],
                [77.6438, 12.9801]
            ]]
        }
    }
]

MOCK_GROUND_TRUTH_TASKS: List[Dict[str, Any]] = [
    {
        "id": "gt-01",
        "parcel_id": "TN-CAD-004-01872",
        "task_id": "GT-TASK-2026-088",
        "reason": "Boundary discrepancy on eastern corridor (+80 m² difference)",
        "surveyor": "R. Ramanathan (Chief Cadastral Surveyor)",
        "status": "In Progress",
        "gnss_accuracy_cm": 1.8,
        "cors_reference": "TN-CORS-KA-04",
        "coordinates": [12.9785, 77.6412],
        "evidence_notes": "RTK GNSS dual-frequency survey in progress with total station prism control points.",
        "evidence_files": ["GNSS_Raw_RINEX_088.log", "Field_Photo_EastBoundary.jpg"]
    },
    {
        "id": "gt-02",
        "parcel_id": "TN-CAD-004-01874",
        "task_id": "GT-TASK-2026-092",
        "reason": "Road buffer encroachment verification (+110 m²)",
        "surveyor": "P. Meenakshi (Senior Field Surveyor)",
        "status": "Open",
        "gnss_accuracy_cm": 2.2,
        "cors_reference": "TN-CORS-KA-04",
        "coordinates": [12.9815, 77.6434],
        "evidence_notes": "Scheduled for site inspection with municipal engineering wing.",
        "evidence_files": []
    },
    {
        "id": "gt-03",
        "parcel_id": "Eco-Zone Sub-Dividing",
        "task_id": "GT-TASK-2026-077",
        "reason": "Eco-zone subdivision monument demarcation",
        "surveyor": "A. K. Sharma (DGPS Lead)",
        "status": "Verified",
        "gnss_accuracy_cm": 1.2,
        "cors_reference": "TN-CORS-KA-02",
        "coordinates": [12.9780, 77.6380],
        "evidence_notes": "Boundaries confirmed with permanent stone pillars and DGPS benchmarks.",
        "evidence_files": ["Monument_Coordinates_Table.csv", "Surveyor_Signoff.pdf"]
    }
]

MOCK_CHANGE_DETECTION: List[Dict[str, Any]] = [
    {
        "id": "chg-01",
        "parcel_id": "TN-CAD-004-01872",
        "feature_type": "New Building",
        "date_a": "January 2026",
        "date_b": "August 2026",
        "change_description": "New mixed-use 4-story tech hub facility erected (+420 m² footprint).",
        "geometry": {
            "type": "Polygon",
            "coordinates": [[
                [77.6399, 12.9785],
                [77.6409, 12.9786],
                [77.6407, 12.9793],
                [77.6397, 12.9792],
                [77.6399, 12.9785]
            ]]
        }
    },
    {
        "id": "chg-02",
        "parcel_id": "Tech District Parcel #441",
        "feature_type": "Road Change",
        "date_a": "January 2026",
        "date_b": "August 2026",
        "change_description": "Innovation Way widened from 18m to 24m with new pedestrian promenade.",
        "geometry": {
            "type": "LineString",
            "coordinates": [
                [77.6400, 12.9780],
                [77.6430, 12.9782]
            ]
        }
    },
    {
        "id": "chg-03",
        "parcel_id": "Eco-Zone Sub-Dividing",
        "feature_type": "Land-use Change",
        "date_a": "January 2026",
        "date_b": "August 2026",
        "change_description": "Vacant lot converted into sustainable solar green-energy canopy and retention basin.",
        "geometry": {
            "type": "Polygon",
            "coordinates": [[
                [77.6372, 12.9778],
                [77.6385, 12.9780],
                [77.6383, 12.9790],
                [77.6370, 12.9788],
                [77.6372, 12.9778]
            ]]
        }
    }
]

MOCK_TOPOLOGY_ISSUES: List[Dict[str, Any]] = [
    {
        "id": "top-01",
        "issue_type": "Overlapping parcels",
        "severity": "Error",
        "parcel_ids": ["TN-CAD-004-01872", "TN-CAD-004-01874"],
        "description": "Parcel boundaries overlap along eastern shared perimeter by 1.4m.",
        "coordinates": [12.9798, 77.6412],
        "resolved": False
    },
    {
        "id": "top-02",
        "issue_type": "Gaps",
        "severity": "Warning",
        "parcel_ids": ["Tech District Parcel #441", "TN-CAD-004-01874"],
        "description": "Unclaimed narrow sliver gap (0.3m width) between adjacent lots.",
        "coordinates": [12.9803, 77.6434],
        "resolved": False
    },
    {
        "id": "top-03",
        "issue_type": "Boundary discontinuity",
        "severity": "Warning",
        "parcel_ids": ["TN-CAD-004-01872"],
        "description": "Vertex misalignment on south-western curb boundary.",
        "coordinates": [12.9780, 77.6395],
        "resolved": False
    },
    {
        "id": "top-04",
        "issue_type": "Duplicate polygons",
        "severity": "Passed",
        "parcel_ids": [],
        "description": "Zero duplicate polygons found in current orthomosaic tile.",
        "coordinates": [12.9785, 77.6405],
        "resolved": True
    }
]

MOCK_AUDIT_LOGS: List[Dict[str, Any]] = [
    {
        "id": "aud-01",
        "timestamp": "2026-09-18 20:45:12",
        "user": "Surveyor R. Ramanathan",
        "action": "Modified Parcel",
        "parcel_id": "TN-CAD-004-01872",
        "previous_state": "AI Raw Boundary (1,080 m²)",
        "new_state": "Corrected Boundary with CORS GNSS Control (1,040 m²)",
        "details": "Adjusted eastern boundary along concrete drainage channel."
    },
    {
        "id": "aud-02",
        "timestamp": "2026-09-18 18:22:40",
        "user": "AI Extraction Pipeline",
        "action": "AI Feature Extraction",
        "parcel_id": "PROJECT-TECH-II",
        "previous_state": "Pending Imagery",
        "new_state": "Extracted: 11,932 Parcels, 18,742 Buildings",
        "details": "High-resolution 5cm orthomosaic processed with ResNet-UNet cadastral segmenter."
    },
    {
        "id": "aud-03",
        "timestamp": "2026-09-18 16:10:05",
        "user": "GIS Officer Priya V.",
        "action": "Conflict Verification",
        "parcel_id": "TN-CAD-004-01874",
        "previous_state": "Pending Review",
        "new_state": "Flagged for Ground Truth Survey",
        "details": "Area discrepancy (+110 m²) sent to field survey team with task GT-TASK-2026-092."
    },
    {
        "id": "aud-04",
        "timestamp": "2026-09-18 14:05:30",
        "user": "System Auditor",
        "action": "Topology Validation Engine",
        "parcel_id": "ALL",
        "previous_state": "Unvalidated",
        "new_state": "1 Error, 2 Warnings, 99.8% Pass Rate",
        "details": "Automated topological consistency checks executed over 12,486 parcels."
    }
]
