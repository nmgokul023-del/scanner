import React, { useState, useEffect, useRef } from 'react';
import { 
  UploadCloud, 
  FileCheck2, 
  Eye, 
  Cpu, 
  Sparkles, 
  Map, 
  CheckCircle2, 
  AlertCircle, 
  ArrowRight, 
  ArrowLeft, 
  Layers, 
  Camera, 
  Maximize2, 
  RotateCcw,
  Sliders,
  Check,
  Play,
  FileSpreadsheet,
  Building2,
  GitFork,
  Footprints,
  Info
} from 'lucide-react';
import L from 'leaflet';
import { apiClient } from '../api/client';

interface DroneUploadPipelineProps {
  onNavigate: (route: string) => void;
  initialStep?: number;
}

export const DroneUploadPipeline: React.FC<DroneUploadPipelineProps> = ({ 
  onNavigate,
  initialStep = 1 
}) => {
  const [currentStep, setCurrentStep] = useState<number>(initialStep);
  const [missions, setMissions] = useState<any[]>([]);
  const [selectedMission, setSelectedMission] = useState<any>(null);
  
  // Upload State
  const [isDragging, setIsDragging] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<{ name: string; size: string; type: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Validation State
  const [validationReport, setValidationReport] = useState<any>(null);
  const [isValidating, setIsValidating] = useState(false);

  // Preview State
  const previewMapRef = useRef<HTMLDivElement>(null);
  const previewMapInstance = useRef<L.Map | null>(null);
  const [previewBand, setPreviewBand] = useState<'rgb' | 'nir'>('rgb');

  // Processing State
  const [isProcessing, setIsProcessing] = useState(false);
  const [processProgress, setProcessProgress] = useState(0);
  const [processLogs, setProcessLogs] = useState<string[]>([]);
  const [processResult, setProcessResult] = useState<any>(null);

  // AI Extraction State
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractProgress, setExtractProgress] = useState(100);

  // Load available missions on mount
  useEffect(() => {
    apiClient.getDroneMissions().then(data => {
      setMissions(data);
      if (data.length > 0) {
        setSelectedMission(data[0]);
      }
    });
  }, []);

  // Map initialization for Step 3 (Preview)
  useEffect(() => {
    if (currentStep !== 3 || !previewMapRef.current) return;

    if (previewMapInstance.current) {
      previewMapInstance.current.remove();
      previewMapInstance.current = null;
    }

    const map = L.map(previewMapRef.current, {
      center: [12.9790, 77.6410],
      zoom: 15,
      zoomControl: false,
      attributionControl: false
    });

    L.control.zoom({ position: 'bottomright' }).addTo(map);

    // Drone satellite base
    L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
      maxZoom: 20
    }).addTo(map);

    // Flight boundary bounding box polygon (Tech District 14.2 sq.km)
    const boundsPolygon: [number, number][] = [
      [12.9750, 77.6350],
      [12.9830, 77.6350],
      [12.9830, 77.6460],
      [12.9750, 77.6460]
    ];

    const poly = L.polygon(boundsPolygon, {
      color: '#06b6d4',
      weight: 2.5,
      fillColor: '#0ea5e9',
      fillOpacity: 0.25,
      dashArray: '5, 5'
    }).addTo(map);

    poly.bindTooltip("Drone Survey Footprint: 14.2 sq.km (5cm GSD)", { permanent: true, direction: "center", className: "font-sans text-xs font-bold text-slate-800 bg-white/90 p-1.5 rounded shadow" });

    // Flight path lines simulation
    for (let lat = 12.9760; lat <= 12.9820; lat += 0.0015) {
      L.polyline([[lat, 77.6355], [lat, 77.6455]], {
        color: '#ffffff',
        weight: 1.2,
        opacity: 0.6,
        dashArray: '4, 4'
      }).addTo(map);
    }

    // CORS Benchmark pin
    const corsMarker = L.circleMarker([12.9785, 77.6412], {
      radius: 6,
      fillColor: '#10b981',
      color: '#ffffff',
      weight: 2,
      fillOpacity: 1
    }).addTo(map);
    corsMarker.bindTooltip("CORS RTK Checkpoint TN-04", { permanent: false });

    map.fitBounds(poly.getBounds());
    previewMapInstance.current = map;

    return () => {
      if (previewMapInstance.current) {
        previewMapInstance.current.remove();
        previewMapInstance.current = null;
      }
    };
  }, [currentStep, previewBand]);

  // Handle Drag and Drop
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      setUploadedFile({
        name: file.name,
        size: `${(file.size / (1024 * 1024)).toFixed(1)} MB`,
        type: file.type || 'image/tiff'
      });
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setUploadedFile({
        name: file.name,
        size: `${(file.size / (1024 * 1024)).toFixed(1)} MB`,
        type: file.type || 'image/tiff'
      });
    }
  };

  // Run Step 2: Validate
  const handleValidate = async () => {
    setIsValidating(true);
    setCurrentStep(2);
    try {
      const res = await apiClient.validateDroneData({
        ori_filename: uploadedFile?.name || selectedMission?.ori_filename || 'ORI_TechDistrict_2026.tif',
        gsd_cm: selectedMission?.gsd_cm_per_px || 5.0,
        crs: selectedMission?.crs || 'EPSG:4326 / WGS 84'
      });
      setValidationReport(res);
    } catch (e) {
      console.error(e);
    } finally {
      setIsValidating(false);
    }
  };

  // Run Step 4: Process
  const handleProcess = async () => {
    setIsProcessing(true);
    setProcessProgress(10);
    setProcessLogs(['[0.0s] Initializing photogrammetric raster preprocessor...']);

    setTimeout(() => {
      setProcessProgress(35);
      setProcessLogs(prev => [...prev, '[1.2s] Verifying orthorectification bundle adjustment (RMSE: 2.1cm)...', '[1.5s] Calibrating 4-band radiometric balance & solar irradiance...']);
    }, 600);

    setTimeout(() => {
      setProcessProgress(70);
      setProcessLogs(prev => [...prev, '[2.4s] Generating multi-resolution tile pyramids (Levels 0-5)...', '[2.9s] Normalizing DSM elevations against bare-earth DTM...']);
    }, 1300);

    setTimeout(async () => {
      setProcessProgress(100);
      setProcessLogs(prev => [...prev, '[3.8s] Edge sharpening applied for compound boundary detection.', '[4.1s] Preprocessing complete. Ready for AI Cadastral Inference.']);
      const res = await apiClient.processDroneData({
        ori_filename: uploadedFile?.name || selectedMission?.ori_filename || 'ORI_TechDistrict_2026.tif'
      });
      setProcessResult(res);
      setIsProcessing(false);
    }, 2000);
  };

  // Run Step 5: AI Extraction
  const handleRunAIExtraction = async () => {
    setIsExtracting(true);
    setExtractProgress(20);
    setTimeout(() => setExtractProgress(60), 500);
    setTimeout(async () => {
      setExtractProgress(100);
      setIsExtracting(false);
      await apiClient.triggerAIExtraction({
        ori_file: uploadedFile?.name || selectedMission?.ori_filename || 'ORI_TechDistrict_2026.tif'
      });
    }, 1100);
  };

  const steps = [
    { id: 1, label: 'Upload Drone Data', icon: UploadCloud },
    { id: 2, label: 'Validate Metadata', icon: FileCheck2 },
    { id: 3, label: 'Raster Preview', icon: Eye },
    { id: 4, label: 'Process Tiling', icon: Sliders },
    { id: 5, label: 'AI Extraction', icon: Sparkles },
    { id: 6, label: 'Parcel Map', icon: Map }
  ];

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-6 select-none pb-28 md:pb-16">
      {/* Workflow Stepper Header */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/90 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-4">
          <div>
            <div className="text-[10px] font-extrabold uppercase tracking-widest text-blue-600 mb-1">
              Statutory Cadastral Ingestion Workflow
            </div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
              Drone Imagery Ingestion & AI Pipeline
            </h1>
          </div>
          <div className="text-xs font-semibold text-slate-500 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200 self-start sm:self-auto">
            Stage {currentStep} of 6: <span className="text-blue-600 font-bold">{steps[currentStep - 1]?.label}</span>
          </div>
        </div>

        {/* Stepper Progress Bar */}
        <div className="grid grid-cols-6 gap-2 pt-1">
          {steps.map((s) => {
            const Icon = s.icon;
            const isCompleted = currentStep > s.id;
            const isActive = currentStep === s.id;

            return (
              <button
                key={s.id}
                onClick={() => {
                  if (s.id === 6) {
                    onNavigate('parcel-map');
                  } else {
                    setCurrentStep(s.id);
                  }
                }}
                className={`flex flex-col items-center text-center p-2 rounded-2xl transition-all ${
                  isActive ? 'bg-blue-50/80 ring-2 ring-blue-500/30' :
                  isCompleted ? 'bg-emerald-50/50 hover:bg-emerald-50' : 'hover:bg-slate-50 opacity-60'
                }`}
              >
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center mb-1.5 transition-colors ${
                  isActive ? 'bg-blue-600 text-white shadow-md shadow-blue-500/25' :
                  isCompleted ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-400'
                }`}>
                  {isCompleted ? <Check className="w-4 h-4" /> : <Icon className="w-4 h-4" />}
                </div>
                <span className={`text-[10px] font-bold leading-tight line-clamp-1 ${
                  isActive ? 'text-blue-700' : isCompleted ? 'text-emerald-800' : 'text-slate-500'
                }`}>
                  {s.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* STEP 1: UPLOAD DRONE DATA */}
      {currentStep === 1 && (
        <div className="space-y-6 animate-in fade-in">
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-sm space-y-6">
            <div className="space-y-1">
              <h2 className="text-base sm:text-lg font-bold text-slate-900">
                1. Upload Raw Drone Survey Files
              </h2>
              <p className="text-xs text-slate-500 font-medium leading-relaxed">
                Upload your Orthomosaic True-Ortho (ORI), Digital Surface Model (DSM), Bare-Earth DTM, and Flight GNSS RTK logs.
              </p>
            </div>

            {/* Drag & Drop File Zone */}
            <div
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-3xl p-8 sm:p-12 flex flex-col items-center justify-center text-center cursor-pointer transition-all ${
                isDragging 
                  ? 'border-blue-500 bg-blue-50/60 scale-[0.99]' 
                  : 'border-slate-200 hover:border-blue-400 bg-slate-50/60 hover:bg-white'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept=".tif,.tiff,.las,.geojson,.zip,.json,.csv"
                onChange={handleFileInput}
                className="hidden"
              />

              <div className="w-16 h-16 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mb-3 shadow-inner">
                <UploadCloud className="w-8 h-8" />
              </div>

              <div className="text-sm font-bold text-slate-900">
                {uploadedFile ? uploadedFile.name : 'Click to select or drag & drop GeoTIFF / Drone Rasters'}
              </div>
              <p className="text-xs text-slate-500 mt-1 max-w-sm">
                Supported: GeoTIFF (.tif, .tiff), LiDAR point clouds (.las), Elevation models (DSM/DTM), RTK Telemetry logs.
              </p>
              {uploadedFile && (
                <div className="mt-3 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-semibold border border-emerald-200 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5" /> {uploadedFile.name} ({uploadedFile.size}) Ready
                </div>
              )}
            </div>

            {/* Preset Mission Quick Selection */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Or Select Pre-Loaded Survey Mission:
                </span>
                <span className="text-[11px] text-slate-400">Standard Municipal Datasets</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {missions.map((m) => {
                  const isSel = selectedMission?.id === m.id && !uploadedFile;
                  return (
                    <div
                      key={m.id}
                      onClick={() => { setSelectedMission(m); setUploadedFile(null); }}
                      className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                        isSel
                          ? 'border-blue-600 bg-blue-50/50 ring-2 ring-blue-500/20 shadow-sm'
                          : 'border-slate-200 bg-white hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs text-slate-900">{m.name}</span>
                        <span className="text-[10px] font-mono font-bold text-blue-600 bg-white px-2 py-0.5 rounded border border-slate-200">
                          {m.gsd_cm_per_px} cm GSD
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-1">
                        Flown {m.flight_date} • {m.camera} • {m.crs}
                      </p>
                      <div className="text-[10px] text-slate-400 font-mono mt-2 flex items-center justify-between pt-2 border-t border-slate-100">
                        <span>{m.ori_filename}</span>
                        <span>{m.coverage_sq_km} sq.km</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* CTA Button */}
            <div className="flex justify-end pt-4 border-t border-slate-100">
              <button
                onClick={handleValidate}
                className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-bold text-xs shadow-md shadow-blue-500/25 flex items-center gap-2 transition-all"
              >
                <span>Validate Drone Data</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* STEP 2: VALIDATE METADATA */}
      {currentStep === 2 && (
        <div className="space-y-6 animate-in fade-in">
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-sm space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h2 className="text-base sm:text-lg font-bold text-slate-900">
                  2. Raster & Photogrammetric Validation
                </h2>
                <p className="text-xs text-slate-500 font-medium">
                  Verification of coordinate systems, ground sampling resolution, and photogrammetric geometry.
                </p>
              </div>
              <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" /> Validation Passed
              </span>
            </div>

            {/* Validation Scorecard Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-700">Coordinate Reference System (CRS)</span>
                  <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">PASS</span>
                </div>
                <div className="font-mono text-slate-900 font-semibold">{validationReport?.crs || 'EPSG:4326 / WGS 84 (UTM Zone 43N)'}</div>
                <p className="text-[11px] text-slate-500">Correctly projected onto state geodetic survey datum.</p>
              </div>

              <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-700">Ground Sampling Distance (GSD)</span>
                  <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">5.0 cm/px</span>
                </div>
                <div className="font-mono text-slate-900 font-semibold">{validationReport?.gsd_status || 'Optimal for 1:500 Cadastral Scale'}</div>
                <p className="text-[11px] text-slate-500">Allows detection of individual compound walls and rooflines.</p>
              </div>

              <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-700">Raster Dimensions & Megapixels</span>
                  <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">PASS</span>
                </div>
                <div className="font-mono text-slate-900 font-semibold">8,420 × 6,180 px (52.0 MP)</div>
                <p className="text-[11px] text-slate-500">Full geographic envelope covers 14.2 sq.km area.</p>
              </div>

              <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-700">Photogrammetric Overlap Checks</span>
                  <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">PASS</span>
                </div>
                <div className="font-mono text-slate-900 font-semibold">Forward: 82% • Side: 75%</div>
                <p className="text-[11px] text-slate-500">8 CORS Ground Control Points calibrated within ±2.0 cm.</p>
              </div>
            </div>

            {/* Navigation buttons */}
            <div className="flex items-center justify-between pt-4 border-t border-slate-100">
              <button
                onClick={() => setCurrentStep(1)}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" /> Back to Upload
              </button>

              <button
                onClick={() => setCurrentStep(3)}
                className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-bold text-xs shadow-md shadow-blue-500/25 flex items-center gap-2 transition-all"
              >
                <span>Continue to Raster Preview</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* STEP 3: PREVIEW */}
      {currentStep === 3 && (
        <div className="space-y-6 animate-in fade-in">
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-sm space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
              <div>
                <h2 className="text-base sm:text-lg font-bold text-slate-900">
                  3. Drone Orthomosaic Spatial Preview
                </h2>
                <p className="text-xs text-slate-500 font-medium">
                  Inspect geographic footprint, flight corridor flightlines, and sensor telemetry on the GIS canvas.
                </p>
              </div>

              {/* Band Toggle */}
              <div className="flex items-center bg-slate-100 p-1 rounded-xl text-xs font-bold">
                <button
                  onClick={() => setPreviewBand('rgb')}
                  className={`px-3 py-1.5 rounded-lg transition-colors ${
                    previewBand === 'rgb' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-600'
                  }`}
                >
                  RGB True Color
                </button>
                <button
                  onClick={() => setPreviewBand('nir')}
                  className={`px-3 py-1.5 rounded-lg transition-colors ${
                    previewBand === 'nir' ? 'bg-white text-rose-600 shadow-sm' : 'text-slate-600'
                  }`}
                >
                  NIR Infrared
                </button>
              </div>
            </div>

            {/* Interactive Preview Leaflet Map */}
            <div className="relative w-full h-80 sm:h-96 rounded-2xl overflow-hidden border border-slate-200 shadow-inner">
              <div ref={previewMapRef} className="w-full h-full" />

              <div className="absolute top-4 left-4 z-10 bg-slate-900/90 backdrop-blur-md text-white p-3 rounded-xl text-xs space-y-1 shadow-lg border border-slate-700">
                <div className="font-bold text-blue-400 flex items-center gap-1.5">
                  <Camera className="w-3.5 h-3.5" /> DJI Zenmuse P1 (45 MP)
                </div>
                <div className="text-[11px] text-slate-300">Altitude: 120m AGL • GSD: 5.0 cm/px</div>
                <div className="text-[10px] text-slate-400 font-mono">BBox: [12.9750, 77.6350, 12.9830, 77.6460]</div>
              </div>
            </div>

            {/* Navigation buttons */}
            <div className="flex items-center justify-between pt-4 border-t border-slate-100">
              <button
                onClick={() => setCurrentStep(2)}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" /> Back to Validation
              </button>

              <button
                onClick={() => {
                  setCurrentStep(4);
                  handleProcess();
                }}
                className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-bold text-xs shadow-md shadow-blue-500/25 flex items-center gap-2 transition-all"
              >
                <span>Proceed to Preprocessing</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* STEP 4: PROCESS */}
      {currentStep === 4 && (
        <div className="space-y-6 animate-in fade-in">
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-sm space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h2 className="text-base sm:text-lg font-bold text-slate-900">
                  4. Photogrammetric Preprocessing Pipeline
                </h2>
                <p className="text-xs text-slate-500 font-medium">
                  Pyramid tiling, shadow masking, radiometric normalization, and boundary enhancement.
                </p>
              </div>
              <span className="text-xs font-bold text-blue-600 bg-blue-50 px-3 py-1 rounded-full border border-blue-200">
                {processProgress}% Complete
              </span>
            </div>

            {/* Progress Bar */}
            <div className="space-y-2">
              <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-blue-600 via-indigo-600 to-emerald-500 transition-all duration-300"
                  style={{ width: `${processProgress}%` }}
                />
              </div>
            </div>

            {/* Terminal Console Output */}
            <div className="bg-slate-950 text-slate-200 p-4 rounded-2xl font-mono text-xs space-y-1.5 max-h-56 overflow-y-auto border border-slate-800 shadow-inner">
              {processLogs.map((log, i) => (
                <div key={i} className="flex items-start gap-2">
                  <span className="text-emerald-400 font-bold">✓</span>
                  <span>{log}</span>
                </div>
              ))}
              {isProcessing && (
                <div className="flex items-center gap-2 text-blue-400 animate-pulse">
                  <span className="w-2 h-2 rounded-full bg-blue-400"></span>
                  <span>Processing sub-tiles and calculating slope gradients...</span>
                </div>
              )}
            </div>

            {/* Navigation buttons */}
            <div className="flex items-center justify-between pt-4 border-t border-slate-100">
              <button
                onClick={() => setCurrentStep(3)}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" /> Back to Preview
              </button>

              <button
                onClick={() => {
                  setCurrentStep(5);
                  handleRunAIExtraction();
                }}
                disabled={isProcessing}
                className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-bold text-xs shadow-md shadow-blue-500/25 flex items-center gap-2 transition-all disabled:opacity-50"
              >
                <span>Run AI Extraction</span>
                <Sparkles className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* STEP 5: AI EXTRACTION */}
      {currentStep === 5 && (
        <div className="space-y-6 animate-in fade-in">
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-sm space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h2 className="text-base sm:text-lg font-bold text-slate-900">
                  5. AI Deep Learning Extraction Completed
                </h2>
                <p className="text-xs text-slate-500 font-medium">
                  ResNet-UNet semantic segmentation generated 12,486 parcels and 18,742 building footprints.
                </p>
              </div>
              <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" /> Extraction Finished
              </span>
            </div>

            {/* Extracted Metrics */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-1">
                <div className="flex items-center gap-2 text-blue-600 text-xs font-bold">
                  <Layers className="w-4 h-4" /> Parcels
                </div>
                <div className="text-2xl font-extrabold text-slate-900">12,486</div>
                <div className="text-[10px] text-slate-400">95.6% completeness</div>
              </div>

              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-1">
                <div className="flex items-center gap-2 text-indigo-600 text-xs font-bold">
                  <Building2 className="w-4 h-4" /> Buildings
                </div>
                <div className="text-2xl font-extrabold text-slate-900">18,742</div>
                <div className="text-[10px] text-slate-400">IoU precision 96.2%</div>
              </div>

              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-1">
                <div className="flex items-center gap-2 text-slate-700 text-xs font-bold">
                  <GitFork className="w-4 h-4" /> Roads
                </div>
                <div className="text-2xl font-extrabold text-slate-900">1,284</div>
                <div className="text-[10px] text-slate-400">Rights-of-way mapped</div>
              </div>

              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-1">
                <div className="flex items-center gap-2 text-emerald-600 text-xs font-bold">
                  <Footprints className="w-4 h-4" /> Pathways
                </div>
                <div className="text-2xl font-extrabold text-slate-900">3,624</div>
                <div className="text-[10px] text-slate-400">Pedestrian gallerias</div>
              </div>
            </div>

            {/* Step 6 CTA: Transition to Parcel Map */}
            <div className="p-6 bg-gradient-to-r from-blue-600 to-indigo-700 rounded-3xl text-white flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xl shadow-blue-500/15">
              <div className="space-y-1 text-center sm:text-left">
                <div className="text-xs font-bold uppercase tracking-wider text-blue-200">
                  Pipeline Complete • Ready for Inspection
                </div>
                <h3 className="text-lg font-extrabold tracking-tight">
                  Explore Extracted Cadastral Parcels on GIS Map
                </h3>
                <p className="text-xs text-blue-100 max-w-md">
                  Inspect Parcel #8824-A, verify boundary discrepancies, and initiate mutation workflows.
                </p>
              </div>

              <button
                onClick={() => onNavigate('parcel-map')}
                className="px-6 py-3.5 bg-white text-blue-700 hover:bg-blue-50 rounded-2xl font-extrabold text-xs shadow-md transition-all flex items-center gap-2 shrink-0 active:scale-[0.99]"
              >
                <span>Open Parcel Map</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
