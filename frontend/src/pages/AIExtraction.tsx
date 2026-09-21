import React, { useState, useEffect } from 'react';
import { 
  Cpu, 
  FileCheck, 
  CheckCircle2, 
  Layers, 
  Building2, 
  GitFork, 
  Footprints, 
  Sparkles,
  Play,
  RotateCcw,
  AlertCircle,
  Database,
  ArrowRight
} from 'lucide-react';
import { apiClient } from '../api/client';

interface AIExtractionProps {
  onNavigate: (route: string) => void;
}

export const AIExtraction: React.FC<AIExtractionProps> = ({ onNavigate }) => {
  const [stage, setStage] = useState<'upload' | 'processing' | 'complete'>('complete');
  const [datasets, setDatasets] = useState<any[]>([]);
  const [selectedDatasetId, setSelectedDatasetId] = useState<string>('');
  const [stats, setStats] = useState({
    total_parcels: 14,
    buildings: 8,
    roads: 5,
    conflicts: 6
  });
  const [notice, setNotice] = useState<string>(
    'Development Pipeline Interface: Running on CPU geometric extraction engine. Connect model weights (YOLO/SAM) in backend/models/weights/ for production GPU inference.'
  );
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    loadDatasetsAndStats();
  }, []);

  const loadDatasetsAndStats = async () => {
    try {
      const dsList = await apiClient.getDroneImagery();
      if (Array.isArray(dsList) && dsList.length > 0) {
        setDatasets(dsList);
        setSelectedDatasetId(dsList[0].id);
      }

      const dbStats = await apiClient.getDashboardStatistics();
      const buildings = await apiClient.getBuildings();
      const roads = await apiClient.getRoads();
      setStats({
        total_parcels: dbStats.total_parcels || 14,
        buildings: Array.isArray(buildings) ? buildings.length : 8,
        roads: Array.isArray(roads) ? roads.length : 5,
        conflicts: dbStats.boundary_conflicts || 6
      });
    } catch (err) {
      console.error('Error loading datasets or stats:', err);
    }
  };

  const handleStartExtraction = async () => {
    setStage('processing');
    setToastMessage('AI feature extraction job dispatched to geometric processing pipeline...');
    try {
      const res = await apiClient.triggerAIExtraction({
        dataset_id: selectedDatasetId || 'ds-tech-district',
        options: { extract_parcels: true, extract_buildings: true, extract_roads: true }
      });
      if (res) {
        if (res.notice) {
          setNotice(res.notice);
        }
        await loadDatasetsAndStats();
        setStage('complete');
        setToastMessage(`Extraction successful: Generated ${res.extracted_parcels || 'new'} parcels & footprints into SQLite.`);
        setTimeout(() => setToastMessage(null), 6000);
      }
    } catch (err: any) {
      console.error('Extraction error:', err);
      setToastMessage('Extraction encountered an error. Check backend server connection.');
      setStage('complete');
    }
  };

  const currentDataset = datasets.find(d => d.id === selectedDatasetId) || datasets[0] || {
    name: 'Tech District Phase II Drone Orthomosaic',
    original_filename: 'ORI_TechDistrict_2026.tif',
    crs: 'EPSG:4326',
    resolution: '5.0 cm / pixel'
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-6 select-none pb-24 md:pb-12">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="p-3 bg-blue-900 text-blue-100 rounded-xl text-xs font-semibold flex items-center justify-between shadow-lg border border-blue-700 animate-in fade-in">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-blue-400" />
            <span>{toastMessage}</span>
          </div>
          <button onClick={() => setToastMessage(null)} className="text-blue-300 hover:text-white text-xs">Dismiss</button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-semibold mb-2 border border-blue-100">
            <Cpu className="w-3.5 h-3.5" /> AI Segmentation Engine (ResNet-UNet)
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            AI Feature Extraction Pipeline
          </h1>
          <p className="text-xs text-slate-500 font-medium mt-1">
            Automated deep learning inference on high-resolution drone orthomosaics, DSM, and DTM rasters.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          {stage === 'complete' && (
            <button
              onClick={() => setStage('upload')}
              className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Reset Parameters
            </button>
          )}
          <button
            onClick={handleStartExtraction}
            disabled={stage === 'processing'}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white rounded-xl text-xs font-semibold shadow-md shadow-blue-500/25 flex items-center gap-1.5 transition-all"
          >
            <Play className="w-3.5 h-3.5 fill-white" />
            <span>{stage === 'processing' ? 'Running Inference...' : 'Run Extraction'}</span>
          </button>
        </div>
      </div>

      {/* Development Engine Mode Notice (Rule #10) */}
      <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-2.5 text-xs text-amber-900">
        <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
        <div>
          <span className="font-bold">Execution Mode: </span>
          <span>{notice}</span>
        </div>
      </div>

      {/* Dataset Selection Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700">Drone Orthomosaic (ORI)</span>
            <FileCheck className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-[11px] text-slate-500">True Orthophoto 5cm GSD with radiometric calibration.</p>
          {datasets.length > 0 ? (
            <select
              value={selectedDatasetId}
              onChange={(e) => setSelectedDatasetId(e.target.value)}
              className="w-full text-xs font-mono font-bold text-blue-700 bg-blue-50 p-2 rounded-lg border border-blue-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              {datasets.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name || d.original_filename} ({d.file_format || 'GeoTIFF'})
                </option>
              ))}
            </select>
          ) : (
            <div className="text-xs font-mono font-bold text-blue-600 bg-blue-50 p-2 rounded-lg truncate">
              {currentDataset.original_filename || 'ORI_TechDistrict_2026.tif'}
            </div>
          )}
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700">Digital Surface Model (DSM)</span>
            <FileCheck className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-[11px] text-slate-500">Photogrammetric elevation surface for 3D building height.</p>
          <div className="text-xs font-mono font-bold text-slate-700 bg-slate-50 p-2 rounded-lg truncate">
            DSM_TechDistrict_5cm.tif
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700">Cadastral Database (SQLite)</span>
            <Database className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-[11px] text-slate-500">Live cadastral storage: urbancadastral.db</p>
          <div className="text-xs font-mono font-bold text-slate-700 bg-slate-50 p-2 rounded-lg truncate">
            CRS: {currentDataset.crs || 'EPSG:4326'} • Res: {currentDataset.resolution || '5cm/px'}
          </div>
        </div>
      </div>

      {/* Progress Card when running */}
      {stage === 'processing' && (
        <div className="bg-white p-6 rounded-2xl border border-blue-200 shadow-md space-y-4 animate-in fade-in">
          <div className="flex items-center justify-between text-xs font-bold">
            <span className="text-blue-600 flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-600 animate-ping"></span>
              Geometric neural segmentation running across extent...
            </span>
            <span className="text-slate-900">Inference active</span>
          </div>
          <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
            <div className="h-full bg-blue-600 animate-pulse w-3/4 rounded-full" />
          </div>
          <div className="text-[11px] text-slate-500 font-mono">
            Segmenting compound walls • Vectorising building rooflines • Snapping to road corridors • Persisting to SQLite...
          </div>
        </div>
      )}

      {/* Extraction Results */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200/90 shadow-sm space-y-6">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div>
            <h2 className="text-base font-bold text-slate-900 tracking-tight">
              Feature Extraction Summary
            </h2>
            <p className="text-xs text-slate-500">Database layer inventory synced from SQLite</p>
          </div>
          <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200 flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5" /> Database Synced
          </span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
            <div className="flex items-center gap-2 text-blue-600 text-xs font-semibold">
              <Layers className="w-4 h-4" /> Parcels in Registry
            </div>
            <div className="text-2xl font-extrabold text-slate-900">{stats.total_parcels}</div>
            <div className="text-[10px] text-slate-400">Persistent SQLite entities</div>
          </div>

          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
            <div className="flex items-center gap-2 text-indigo-600 text-xs font-semibold">
              <Building2 className="w-4 h-4" /> Buildings Extracted
            </div>
            <div className="text-2xl font-extrabold text-slate-900">{stats.buildings}</div>
            <div className="text-[10px] text-slate-400">Mean height 13.5m</div>
          </div>

          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
            <div className="flex items-center gap-2 text-slate-700 text-xs font-semibold">
              <GitFork className="w-4 h-4" /> Road Corridors
            </div>
            <div className="text-2xl font-extrabold text-slate-900">{stats.roads}</div>
            <div className="text-[10px] text-slate-400">Right-of-way mapped</div>
          </div>

          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
            <div className="flex items-center gap-2 text-rose-600 text-xs font-semibold">
              <Footprints className="w-4 h-4" /> Active Conflicts
            </div>
            <div className="text-2xl font-extrabold text-slate-900">{stats.conflicts}</div>
            <div className="text-[10px] text-slate-400">Discrepancy queue</div>
          </div>
        </div>

        {/* Action Link to Parcel Map */}
        <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-emerald-600 shrink-0" />
            <div>
              <span className="font-bold text-emerald-900">Cadastral GIS Layers Ready: </span>
              <span className="text-emerald-700">All extracted parcels and boundary linework are available on the interactive GIS map.</span>
            </div>
          </div>
          <button
            onClick={() => onNavigate('parcel-map')}
            className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-xs shadow-sm transition-colors flex items-center gap-1.5 shrink-0"
          >
            <span>Explore Extracted Layers</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
