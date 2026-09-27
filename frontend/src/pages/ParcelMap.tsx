import React, { useState, useEffect, useRef } from 'react';
import { 
  Search, 
  Mic, 
  CheckCircle2, 
  TrendingUp, 
  Maximize2, 
  ChevronRight, 
  Layers, 
  FileText,
  AlertTriangle,
  ArrowRight,
  Sparkles,
  Compass,
  Building,
  Ruler,
  Check,
  X,
  Edit3,
  Send,
  GitCompare,
  UploadCloud,
  Clock,
  Info,
  FileSpreadsheet,
  Database,
  Calendar,
  Globe,
  RefreshCw
} from 'lucide-react';
import { Parcel, Conflict, Building as BuildingType, Road, LandUseFeature, GroundTruthTask } from '../types';
import { LeafletMap } from '../components/map/LeafletMap';
import { apiClient } from '../api/client';

interface ParcelMapProps {
  parcels: Parcel[];
  conflicts: Conflict[];
  selectedParcel: Parcel | null;
  onSelectParcel: (parcel: Parcel) => void;
  onNavigate: (route: string) => void;
  onUpdateParcel: (parcelId: string, updates: Partial<Parcel>) => void;
  buildings?: BuildingType[];
  roads?: Road[];
  landUse?: LandUseFeature[];
  groundTruthTasks?: GroundTruthTask[];
  gisMode?: 'real' | 'demo';
  onToggleMode?: (mode: 'real' | 'demo') => void;
}

export const ParcelMap: React.FC<ParcelMapProps> = ({
  parcels,
  conflicts,
  selectedParcel,
  onSelectParcel,
  onNavigate,
  onUpdateParcel,
  buildings = [],
  roads = [],
  landUse = [],
  groundTruthTasks = [],
  gisMode = 'real',
  onToggleMode
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [showComparisonModal, setShowComparisonModal] = useState(false);
  const [sheetExpanded, setSheetExpanded] = useState(true);
  const [mapToast, setMapToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [activeDataset, setActiveDataset] = useState<any>(null);
  const [datasetsCount, setDatasetsCount] = useState<number>(0);
  const [datasetsList, setDatasetsList] = useState<any[]>([]);

  // Multi-source GIS Ingestion State
  const [showImportModal, setShowImportModal] = useState(false);
  const [showMetadataModal, setShowMetadataModal] = useState(false);
  const [metadataDetails, setMetadataDetails] = useState<any>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadMsg, setUploadMsg] = useState('');
  
  // Spatial & Temporal Comparison State
  const [spatialModalOpen, setSpatialModalOpen] = useState(false);
  const [compareRefId, setCompareRefId] = useState('');
  const [compareCurId, setCompareCurId] = useState('');
  const [comparisonData, setComparisonData] = useState<any>(null);
  const [comparisonBusy, setComparisonBusy] = useState(false);
  const [temporalMode, setTemporalMode] = useState(false);

  // Hidden File Inputs
  const geoTiffInputRef = useRef<HTMLInputElement>(null);
  const droneImageInputRef = useRef<HTMLInputElement>(null);

  // Import Form State
  const [importForm, setImportForm] = useState({
    name: '',
    source_organization: 'State Cadastral Authority',
    source_url: '',
    acquisition_date: new Date().toISOString().slice(0, 10),
    service_url: '',
    file: null as File | null
  });

  const loadDatasets = async () => {
    try {
      const list = await apiClient.getDatasets();
      setDatasetsList(list || []);
      setDatasetsCount(list ? list.length : 0);
      if (list && list.length > 0) {
        setActiveDataset((prev: any) => {
          if (prev) {
            const found = list.find((d: any) => d.id === prev.id);
            return found || list[0];
          }
          return list[0];
        });
      }
      return list;
    } catch (e) {
      console.error('Failed fetching datasets:', e);
      return [];
    }
  };

  useEffect(() => {
    loadDatasets();
  }, []);

  const filteredParcels = parcels.filter(p => 
    p.parcel_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (p.address && p.address.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (p.title && p.title.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const handleAction = async (action: string) => {
    if (!selectedParcel) return;

    if (action === 'Accept') {
      setActionLoading(true);
      try {
        await apiClient.acceptParcel(selectedParcel.id);
        onUpdateParcel(selectedParcel.id, { status: 'Human Verified' });
        setMapToast({
          message: `Parcel ${selectedParcel.parcel_id} verified and recorded as official cadastral record.`,
          type: 'success'
        });
      } catch (e: any) {
        setMapToast({
          message: `Failed to accept parcel: ${e.message}`,
          type: 'error'
        });
      } finally {
        setActionLoading(false);
        setTimeout(() => setMapToast(null), 5000);
      }
    } else if (action === 'Reject') {
      setActionLoading(true);
      try {
        await apiClient.rejectParcel(selectedParcel.id);
        onUpdateParcel(selectedParcel.id, { status: 'Rejected' });
        setMapToast({
          message: `AI proposal for ${selectedParcel.parcel_id} marked as Rejected.`,
          type: 'success'
        });
      } catch (e: any) {
        setMapToast({
          message: `Failed to reject parcel: ${e.message}`,
          type: 'error'
        });
      } finally {
        setActionLoading(false);
        setTimeout(() => setMapToast(null), 5000);
      }
    } else if (action === 'Send to Survey') {
      onNavigate('ground-truth');
    } else if (action === 'Edit') {
      onNavigate('gis-editor');
    } else if (action === 'Verify') {
      onNavigate('verification');
    } else if (action === 'Compare') {
      if (activeDataset && datasetsList.length > 1) {
        setCompareCurId(activeDataset.id);
        const other = datasetsList.find(d => d.id !== activeDataset.id);
        if (other) setCompareRefId(other.id);
      }
      setSpatialModalOpen(true);
    }
  };

  const handleGeoTiffSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    setUploadMsg(`Uploading & inspecting ${file.name}...`);
    try {
      const ds = await apiClient.uploadDataset(file, 'existing_geotiff');
      setActiveDataset(ds);
      await loadDatasets();
      setMapToast({
        message: `GeoTIFF "${ds.name}" loaded. CRS: ${ds.crs}, Resolution: ${ds.resolution}`,
        type: 'success'
      });
      setMetadataDetails(ds);
      setShowMetadataModal(true);
    } catch (err: any) {
      setMapToast({
        message: `GeoTIFF upload failed: ${err.message}`,
        type: 'error'
      });
    } finally {
      setIsUploading(false);
      if (geoTiffInputRef.current) geoTiffInputRef.current.value = '';
    }
  };

  const handleDroneImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    setUploadMsg(`Uploading ${file.name}...`);
    try {
      const ds = await apiClient.uploadDataset(file, 'drone_upload');
      setActiveDataset(ds);
      await loadDatasets();
      setMapToast({
        message: `Drone image "${ds.name}" uploaded. Georeferencing: ${ds.crs || 'Unreferenced'}`,
        type: 'success'
      });
    } catch (err: any) {
      setMapToast({
        message: `Drone image upload failed: ${err.message}`,
        type: 'error'
      });
    } finally {
      setIsUploading(false);
      if (droneImageInputRef.current) droneImageInputRef.current.value = '';
    }
  };

  const handleImportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!importForm.file && !importForm.service_url) {
      setMapToast({ message: 'Please provide either a GIS file or an OGC Service URL.', type: 'error' });
      return;
    }
    setIsUploading(true);
    setUploadMsg('Importing Government / Open GIS dataset...');
    try {
      const fd = new FormData();
      if (importForm.file) fd.append('file', importForm.file);
      if (importForm.name) fd.append('name', importForm.name);
      if (importForm.source_organization) fd.append('source_organization', importForm.source_organization);
      if (importForm.source_url) fd.append('source_url', importForm.source_url);
      if (importForm.acquisition_date) fd.append('acquisition_date', importForm.acquisition_date);
      if (importForm.service_url) fd.append('service_url', importForm.service_url);

      const ds = await apiClient.importGovernmentDataset(fd);
      setActiveDataset(ds);
      await loadDatasets();
      setShowImportModal(false);
      setImportForm({
        name: '',
        source_organization: 'State Cadastral Authority',
        source_url: '',
        acquisition_date: new Date().toISOString().slice(0, 10),
        service_url: '',
        file: null
      });
      setMapToast({
        message: `Government GIS "${ds.name}" imported. Format: ${ds.file_format}`,
        type: 'success'
      });
    } catch (err: any) {
      setMapToast({
        message: `Import failed: ${err.message}`,
        type: 'error'
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleOpenMetadata = async () => {
    if (!activeDataset) return;
    try {
      const meta = await apiClient.getDatasetMetadata(activeDataset.id);
      setMetadataDetails(meta);
      setShowMetadataModal(true);
    } catch (e) {
      setMetadataDetails(activeDataset);
      setShowMetadataModal(true);
    }
  };

  const handleRunSpatialComparison = async () => {
    if (!compareRefId || !compareCurId) {
      setMapToast({ message: 'Select both a Reference and Current dataset to compare.', type: 'error' });
      return;
    }
    setComparisonBusy(true);
    try {
      let res;
      if (temporalMode) {
        res = await apiClient.temporalAnalysis(compareRefId, compareCurId);
      } else {
        res = await apiClient.compareDatasets(compareRefId, compareCurId);
      }
      setComparisonData(res);
    } catch (err: any) {
      setMapToast({
        message: `Comparison failed: ${err.message}`,
        type: 'error'
      });
    } finally {
      setComparisonBusy(false);
    }
  };

  const hasExistingArea = selectedParcel && selectedParcel.existing_area_sqm != null && selectedParcel.existing_area_sqm > 0;
  const hasAiArea = selectedParcel && selectedParcel.ai_area_sqm != null && selectedParcel.ai_area_sqm > 0;
  const areaDifference = (hasExistingArea && hasAiArea)
    ? Math.round(((selectedParcel.ai_area_sqm as number) - (selectedParcel.existing_area_sqm as number)) * 100) / 100
    : null;

  const valuationText = (selectedParcel?.valuation_usd && selectedParcel.valuation_usd !== 'Not Available' && selectedParcel.valuation_usd !== '$288.59M' && selectedParcel.valuation_usd !== '$0')
    ? (typeof selectedParcel.valuation_usd === 'number'
        ? `$${(selectedParcel.valuation_usd / 1000000).toFixed(1)}M`
        : String(selectedParcel.valuation_usd))
    : 'Not Available';

  const suitabilityText = (selectedParcel?.suitability_score != null && selectedParcel.suitability_score > 0 && selectedParcel.suitability_score !== 85)
    ? `${selectedParcel.suitability_score}/100`
    : 'Not Available';

  const activeSourceLabel = activeDataset?.source_type === 'government_open_gis'
    ? 'Government / Open GIS'
    : activeDataset?.source_type === 'existing_geotiff'
    ? 'Existing GeoTIFF'
    : activeDataset
    ? 'Drone Image'
    : 'None';

  return (
    <div className="relative w-full h-[calc(100vh-4rem)] flex flex-col md:flex-row overflow-hidden select-none">
      {/* Hidden File Inputs for Direct Real Uploads */}
      <input
        type="file"
        ref={geoTiffInputRef}
        accept=".tif,.tiff"
        onChange={handleGeoTiffSelect}
        className="hidden"
      />
      <input
        type="file"
        ref={droneImageInputRef}
        accept=".jpg,.jpeg,.png"
        onChange={handleDroneImageSelect}
        className="hidden"
      />

      {/* Toast Notification Banner */}
      {mapToast && (
        <div className={`absolute top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-2xl shadow-xl text-xs font-semibold flex items-center gap-2 border animate-in fade-in ${
          mapToast.type === 'success' 
            ? 'bg-slate-900/95 text-white border-slate-700' 
            : 'bg-rose-950/95 text-rose-100 border-rose-800'
        }`}>
          <span className={`w-2 h-2 rounded-full ${mapToast.type === 'success' ? 'bg-emerald-400' : 'bg-rose-400'}`}></span>
          <span>{mapToast.message}</span>
          <button onClick={() => setMapToast(null)} className="ml-2 text-slate-400 hover:text-white">✕</button>
        </div>
      )}

      {/* Top DATA SOURCE Banner & Controls */}
      <div className="absolute top-3 left-3 right-3 md:left-6 md:right-auto md:w-[680px] z-20 space-y-2 pointer-events-auto">
        <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-lg border border-slate-200/90 p-3 space-y-2">
          {/* Section 1: Active Data Source Indicator */}
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2 text-xs">
            <div className="flex items-center gap-2 min-w-0">
              <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${activeDataset ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`}></span>
              <span className="font-extrabold text-[11px] text-slate-800 uppercase tracking-wide">
                DATA SOURCE
              </span>
              <span className="text-slate-400">●</span>
              <span className="font-bold text-[11px] text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-100">
                {activeSourceLabel}
              </span>
              <span className="text-[11px] text-slate-600 truncate max-w-[200px] font-mono font-medium" title={activeDataset?.name || activeDataset?.original_filename}>
                {activeDataset
                  ? (activeDataset.source_type === 'government_open_gis' ? `Dataset: ${activeDataset.name}` : `File: ${activeDataset.original_filename}`)
                  : 'NO REAL GIS DATA LOADED'}
              </span>
            </div>

            {/* Quick Switcher dropdown if multiple datasets */}
            {datasetsList.length > 1 && (
              <select
                value={activeDataset?.id || ''}
                onChange={(e) => {
                  const target = datasetsList.find(d => d.id === e.target.value);
                  if (target) setActiveDataset(target);
                }}
                className="text-[10px] font-medium bg-slate-50 border border-slate-200 rounded px-1.5 py-1 text-slate-700 focus:outline-none"
              >
                {datasetsList.map(d => (
                  <option key={d.id} value={d.id}>
                    {d.name} ({d.source_type === 'government_open_gis' ? 'Gov GIS' : d.source_type === 'existing_geotiff' ? 'GeoTIFF' : 'Drone'})
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Section 2: Action Buttons */}
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              onClick={() => setShowImportModal(true)}
              disabled={isUploading}
              className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-[11px] rounded-lg shadow-sm transition-colors flex items-center gap-1.5 active:scale-95"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Import Government/Open GIS</span>
            </button>

            <button
              onClick={() => geoTiffInputRef.current?.click()}
              disabled={isUploading}
              className="px-2.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-[11px] rounded-lg shadow-sm transition-colors flex items-center gap-1.5 active:scale-95"
            >
              <UploadCloud className="w-3.5 h-3.5" />
              <span>Upload GeoTIFF</span>
            </button>

            <button
              onClick={() => droneImageInputRef.current?.click()}
              disabled={isUploading}
              className="px-2.5 py-1.5 bg-slate-700 hover:bg-slate-800 text-white font-semibold text-[11px] rounded-lg shadow-sm transition-colors flex items-center gap-1.5 active:scale-95"
            >
              <UploadCloud className="w-3.5 h-3.5" />
              <span>Upload Drone Image</span>
            </button>

            {activeDataset && (
              <button
                onClick={handleOpenMetadata}
                className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-[11px] rounded-lg transition-colors flex items-center gap-1 ml-auto"
                title="View Real Dataset Metadata"
              >
                <Info className="w-3.5 h-3.5 text-blue-600" />
                <span>Metadata</span>
              </button>
            )}
          </div>

          {/* Uploading indicator */}
          {isUploading && (
            <div className="flex items-center gap-2 text-xs text-blue-700 bg-blue-50 px-3 py-1.5 rounded-lg border border-blue-100">
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-blue-600 shrink-0" />
              <span>{uploadMsg}</span>
            </div>
          )}
        </div>

        {/* Search Header Overlay */}
        <div className="relative bg-white/95 backdrop-blur-md rounded-2xl shadow-lg border border-slate-200/90 flex items-center px-4 py-2">
          <Search className="w-4 h-4 text-blue-600 mr-2.5 shrink-0" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search cadastral parcels, plots, or addresses..."
            className="w-full bg-transparent text-xs sm:text-sm font-medium text-slate-800 focus:outline-none placeholder:text-slate-400"
          />
          <button className="p-1 text-slate-400 hover:text-slate-600">
            <Mic className="w-4 h-4" />
          </button>
        </div>

        {/* Live Search dropdown */}
        {searchQuery.trim() && (
          <div className="mt-1.5 bg-white/95 backdrop-blur-md rounded-xl shadow-xl border border-slate-200 overflow-hidden max-h-60 overflow-y-auto">
            {filteredParcels.length > 0 ? (
              filteredParcels.map(p => (
                <button
                  key={p.id}
                  onClick={() => {
                    onSelectParcel(p);
                    setSearchQuery('');
                  }}
                  className="w-full text-left px-3 py-2 text-xs hover:bg-blue-50 border-b border-slate-100 flex items-center justify-between"
                >
                  <div>
                    <div className="font-bold text-slate-900">{p.parcel_id}</div>
                    <div className="text-[10px] text-slate-500">{p.address}</div>
                  </div>
                  <span className="text-[10px] font-semibold text-blue-600">
                    {p.ai_area_sqm ? `${p.ai_area_sqm} m²` : 'Not Available'}
                  </span>
                </button>
              ))
            ) : (
              <div className="px-3 py-3 text-xs text-slate-500 text-center">
                No matching parcels found in database.
              </div>
            )}
          </div>
        )}
      </div>

      {/* Main Interactive Leaflet Map Area */}
      <div className="flex-1 w-full h-full relative">
        <LeafletMap
          parcels={parcels}
          conflicts={conflicts}
          buildings={buildings}
          roads={roads}
          landUse={landUse}
          groundTruthTasks={groundTruthTasks}
          activeDataset={activeDataset}
          selectedParcelId={selectedParcel?.id}
          onSelectParcel={onSelectParcel}
          heightClass="h-full"
          onRefreshData={loadDatasets}
        />
      </div>

      {/* Parcel Detail Bottom Sheet / Sidebar */}
      <div className={`w-full md:w-[420px] bg-white border-t md:border-t-0 md:border-l border-slate-200 shadow-2xl md:shadow-none z-20 flex flex-col transition-all duration-300 ${
        sheetExpanded ? 'max-h-[75vh] md:max-h-full' : 'max-h-20'
      } overflow-hidden`}>
        {/* Mobile Pull Tab */}
        <div 
          onClick={() => setSheetExpanded(!sheetExpanded)}
          className="md:hidden w-full py-2 flex items-center justify-center cursor-pointer bg-slate-50 border-b border-slate-100"
        >
          <div className="w-10 h-1 rounded-full bg-slate-300" />
        </div>

        {/* Sidebar Content */}
        {!selectedParcel ? (
          <div className="p-6 flex flex-col items-center justify-center text-center space-y-4 my-auto">
            <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100">
              <Layers className="w-7 h-7" />
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-slate-900">
                {parcels.length > 0 ? 'No Parcel Selected' : 'No GIS Features Available'}
              </h3>
              <p className="text-xs text-slate-500 max-w-xs mx-auto">
                {parcels.length > 0
                  ? 'Click on an AI-extracted cadastral parcel boundary on the map or search above to view its attributes and verify boundaries.'
                  : activeDataset
                  ? `Uploaded raster ${activeDataset.original_filename} is loaded. Execute AI feature extraction to generate parcel boundaries.`
                  : 'No drone dataset uploaded. Upload a drone orthomosaic (JPG, PNG, TIFF, GeoTIFF) to view raster imagery and perform AI cadastral extraction.'}
              </p>
            </div>
            <div className="flex flex-col gap-2 w-full max-w-xs pt-2">
              <button
                onClick={() => onNavigate('drone-imagery')}
                className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-xl shadow-sm transition-colors flex items-center justify-center gap-1.5"
              >
                <UploadCloud className="w-4 h-4" /> Upload Drone Orthomosaic
              </button>
            </div>
          </div>
        ) : (
          <div className="p-4 sm:p-5 overflow-y-auto flex-1 space-y-4">
            {/* Header with truthful status */}
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-base sm:text-lg font-extrabold text-slate-900 tracking-tight">
                  {selectedParcel.title || selectedParcel.parcel_id}
                </h2>
                <p className="text-xs text-slate-500 font-medium mt-0.5">
                  {selectedParcel.address && selectedParcel.address !== 'Sector Survey Extent' ? selectedParcel.address : 'Address Not Available'}
                </p>
              </div>
              <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1.5 shrink-0 border ${
                selectedParcel.status === 'Human Verified'
                  ? 'text-emerald-700 bg-emerald-50 border-emerald-200'
                  : selectedParcel.status === 'Rejected'
                  ? 'text-rose-700 bg-rose-50 border-rose-200'
                  : 'text-amber-700 bg-amber-50 border-amber-200'
              }`}>
                <span className={`w-2 h-2 rounded-full ${
                  selectedParcel.status === 'Human Verified' ? 'bg-emerald-600' :
                  selectedParcel.status === 'Rejected' ? 'bg-rose-600' : 'bg-amber-500'
                }`}></span>
                {selectedParcel.status === 'Human Verified' ? 'HUMAN VERIFIED' :
                 selectedParcel.status === 'Rejected' ? 'REJECTED' : 'HUMAN REVIEW REQUIRED'}
              </span>
            </div>

            {/* AI Valuation & Suitability Cards */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                <div className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
                  AI VALUATION
                </div>
                <div className="text-base font-extrabold text-slate-900 mt-1">
                  {valuationText}
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5">
                  {valuationText !== 'Not Available' ? 'Estimated Property Value' : 'Not Available'}
                </div>
              </div>

              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                <div className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
                  SUITABILITY
                </div>
                <div className="text-base font-extrabold text-slate-900 mt-1 flex items-center gap-1.5">
                  <span>{suitabilityText}</span>
                  {suitabilityText !== 'Not Available' && (
                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                  )}
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5">
                  {suitabilityText !== 'Not Available' ? 'Topography / Slope Score' : 'Not Available'}
                </div>
              </div>
            </div>

            {/* Multi-Temporal / Growth Analysis */}
            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-2">
              <div className="flex items-center space-x-1.5 text-xs font-bold text-slate-700">
                <TrendingUp className="w-3.5 h-3.5 text-blue-600" />
                <span>Multi-Temporal Cadastral Analysis</span>
              </div>

              <div className="p-2.5 bg-white rounded-lg border border-slate-100 text-xs space-y-1">
                <div className="text-[11px] font-semibold text-slate-700 flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                  Temporal Analysis: Second Dated Dataset Required
                </div>
                <p className="text-[11px] text-slate-500">
                  {datasetsCount === 1
                    ? 'Only 1 drone survey dataset is uploaded. Temporal boundary growth and encroachment analysis requires a second dated dataset.'
                    : 'Temporal analysis requires a second dated dataset.'}
                </p>
              </div>
            </div>

            {/* Area & Zoning Rows with Chevrons */}
            <div className="space-y-2">
              <div 
                onClick={() => onNavigate('property-details')}
                className="flex items-center justify-between p-3 rounded-xl bg-slate-50 hover:bg-blue-50/50 border border-slate-200 transition-colors cursor-pointer group"
              >
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center">
                    <Ruler className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-[10px] font-bold text-slate-400 uppercase">Computed Area</div>
                    <div className="text-xs font-bold text-slate-900">
                      {hasAiArea
                        ? `${(selectedParcel.ai_area_sqm / 4046.86).toFixed(3)} Acres (${selectedParcel.ai_area_sqm.toLocaleString()} m²)`
                        : 'Not Available'}
                    </div>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-blue-600 transition-colors" />
              </div>

              <div 
                onClick={() => onNavigate('property-details')}
                className="flex items-center justify-between p-3 rounded-xl bg-slate-50 hover:bg-blue-50/50 border border-slate-200 transition-colors cursor-pointer group"
              >
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center">
                    <Building className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-[10px] font-bold text-slate-400 uppercase">Zoning Classification</div>
                    <div className="text-xs font-bold text-slate-900">
                      {selectedParcel.zone && selectedParcel.zone !== 'Unclassified Zone' && selectedParcel.zone !== 'M-2' && selectedParcel.zone !== 'Cadastral Candidate'
                        ? selectedParcel.zone
                        : 'Not Available'}
                    </div>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-blue-600 transition-colors" />
              </div>
            </div>

            {/* Truthful Cadastral Discrepancy Breakdown */}
            <div className="p-3 bg-amber-50/70 border border-amber-200/80 rounded-xl space-y-1.5 text-xs">
              <div className="flex justify-between items-center text-slate-600">
                <span>Existing Revenue Area:</span>
                <span className="font-semibold text-slate-900">
                  {hasExistingArea ? `${selectedParcel.existing_area_sqm} m²` : 'Not Available'}
                </span>
              </div>
              <div className="flex justify-between items-center text-slate-600">
                <span>AI Drone Extracted Area:</span>
                <span className="font-semibold text-blue-700">
                  {hasAiArea ? `${selectedParcel.ai_area_sqm} m²` : 'Not Available'}
                </span>
              </div>
              <div className="flex justify-between items-center border-t border-amber-200 pt-1 text-slate-700 font-bold">
                <span>Difference:</span>
                <span className={areaDifference != null ? (areaDifference > 0 ? 'text-rose-600' : 'text-slate-800') : 'text-slate-500'}>
                  {areaDifference != null 
                    ? `${areaDifference > 0 ? `+${areaDifference}` : areaDifference} m²`
                    : 'Not Available'}
                </span>
              </div>
            </div>

            {/* Operational Action Buttons */}
            <div className="space-y-2 pt-1">
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => handleAction('Compare')}
                  disabled={actionLoading}
                  className="py-2 px-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl flex items-center justify-center gap-1 transition-colors"
                >
                  <GitCompare className="w-3.5 h-3.5" /> Compare
                </button>
                <button
                  onClick={() => handleAction('Verify')}
                  disabled={actionLoading}
                  className="py-2 px-2 bg-blue-50 hover:bg-blue-100 text-blue-700 font-semibold text-xs rounded-xl flex items-center justify-center gap-1 transition-colors"
                >
                  <Check className="w-3.5 h-3.5" /> Verify
                </button>
                <button
                  onClick={() => handleAction('Edit')}
                  disabled={actionLoading}
                  className="py-2 px-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl flex items-center justify-center gap-1 transition-colors"
                >
                  <Edit3 className="w-3.5 h-3.5" /> Edit
                </button>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => handleAction('Send to Survey')}
                  disabled={actionLoading}
                  className="py-2 px-2 bg-amber-50 hover:bg-amber-100 text-amber-800 font-semibold text-xs rounded-xl flex items-center justify-center gap-1 transition-colors"
                >
                  <Send className="w-3.5 h-3.5" /> Survey
                </button>
                <button
                  onClick={() => handleAction('Accept')}
                  disabled={actionLoading}
                  className="py-2 px-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-xl flex items-center justify-center gap-1 transition-colors shadow-sm disabled:opacity-50"
                >
                  <Check className="w-3.5 h-3.5" /> Accept
                </button>
                <button
                  onClick={() => handleAction('Reject')}
                  disabled={actionLoading}
                  className="py-2 px-2 bg-rose-50 hover:bg-rose-100 text-rose-700 font-semibold text-xs rounded-xl flex items-center justify-center gap-1 transition-colors disabled:opacity-50"
                >
                  <X className="w-3.5 h-3.5" /> Reject
                </button>
              </div>
            </div>

            {/* Generate Full AI Report Button */}
            <button
              onClick={() => onNavigate('property-details')}
              className="w-full py-3.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-2xl shadow-md shadow-blue-500/25 transition-all text-xs sm:text-sm flex items-center justify-center space-x-2 active:scale-[0.99]"
            >
              <span>Generate Cadastral Report</span>
            </button>
          </div>
        )}
      </div>

      {/* Side-by-side comparison modal */}
      {showComparisonModal && selectedParcel && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="text-base font-bold text-slate-900">
                Cadastral Boundary Comparison: {selectedParcel.parcel_id}
              </h3>
              <button onClick={() => setShowComparisonModal(false)} className="text-slate-400 hover:text-slate-600">×</button>
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs">
              <div className="p-4 rounded-xl border border-amber-200 bg-amber-50 space-y-2">
                <div className="font-bold text-amber-900 uppercase tracking-wider text-[10px]">Official Land Record</div>
                <div className="text-xl font-bold text-slate-900">
                  {hasExistingArea ? `${selectedParcel.existing_area_sqm} m²` : 'Registry Not Connected'}
                </div>
                <p className="text-slate-600 text-[11px]">
                  {selectedParcel.zone ? `Sub-Registrar recorded zone: ${selectedParcel.zone}` : 'Registry records unlinked'}
                </p>
              </div>

              <div className="p-4 rounded-xl border border-blue-200 bg-blue-50 space-y-2">
                <div className="font-bold text-blue-900 uppercase tracking-wider text-[10px]">AI Drone Extracted</div>
                <div className="text-xl font-bold text-blue-900">
                  {hasAiArea ? `${selectedParcel.ai_area_sqm} m²` : 'Not Available'}
                </div>
                <p className="text-slate-600 text-[11px]">
                  Computed from drone raster vectorization with {selectedParcel.confidence_score != null ? `${Math.round(selectedParcel.confidence_score * 100)}%` : 'uncalibrated'} confidence.
                </p>
              </div>
            </div>

            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-1">
              <div className="font-semibold text-slate-800">Boundary Discrepancy Assessment:</div>
              <p className="text-slate-600">
                {areaDifference != null ? (
                  <>Net area difference of <span className="font-bold text-rose-600">{areaDifference > 0 ? `+${areaDifference}` : areaDifference} m²</span>. Requires surveyor review before mutation.</>
                ) : (
                  <>Revenue registry area not linked to this parcel geometry. Ground verification recommended.</>
                )}
              </p>
            </div>

            <div className="flex justify-end space-x-2 pt-2">
              <button
                onClick={() => setShowComparisonModal(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-xs"
              >
                Close
              </button>
              <button
                onClick={() => {
                  setShowComparisonModal(false);
                  onNavigate('verification');
                }}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl text-xs"
              >
                Launch Verification Tool
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Government / Open GIS Import Modal */}
      {showImportModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 space-y-4 animate-in fade-in">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
                <h3 className="text-base font-bold text-slate-900">
                  Import Government / Open GIS Dataset
                </h3>
              </div>
              <button 
                onClick={() => setShowImportModal(false)}
                className="text-slate-400 hover:text-slate-600 text-lg"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleImportSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  GIS File (GeoJSON, Shapefile .zip, GeoPackage .gpkg, GeoTIFF)
                </label>
                <input
                  type="file"
                  accept=".geojson,.json,.zip,.gpkg,.tif,.tiff"
                  onChange={(e) => {
                    const f = e.target.files?.[0] || null;
                    setImportForm(prev => ({
                      ...prev,
                      file: f,
                      name: prev.name || (f ? f.name.replace(/\.[^/.]+$/, '').replace(/_/g, ' ') : '')
                    }));
                  }}
                  className="w-full text-xs text-slate-600 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100 cursor-pointer border border-slate-200 rounded-lg p-1.5"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Dataset Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. State Cadastral Survey - Guindy"
                  value={importForm.name}
                  onChange={(e) => setImportForm(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Source Organization
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Tamil Nadu Land Records"
                    value={importForm.source_organization}
                    onChange={(e) => setImportForm(prev => ({ ...prev, source_organization: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Acquisition Date
                  </label>
                  <input
                    type="date"
                    value={importForm.acquisition_date}
                    onChange={(e) => setImportForm(prev => ({ ...prev, acquisition_date: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Source URL / Repository (Optional)
                </label>
                <input
                  type="url"
                  placeholder="https://surveyofindia.gov.in/data/cadastral"
                  value={importForm.source_url}
                  onChange={(e) => setImportForm(prev => ({ ...prev, source_url: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <div className="pt-1">
                <label className="block font-semibold text-slate-700 mb-1">
                  OR OGC Service URL (WMS / WMTS / WFS)
                </label>
                <input
                  type="text"
                  placeholder="https://bhuvan-vec1.nrsc.gov.in/bhuvan/wms"
                  value={importForm.service_url}
                  onChange={(e) => setImportForm(prev => ({ ...prev, service_url: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowImportModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUploading}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl text-xs flex items-center gap-1.5 shadow-sm"
                >
                  {isUploading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <FileSpreadsheet className="w-3.5 h-3.5" />}
                  <span>Import Real GIS Dataset</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Real Geospatial Metadata Modal */}
      {showMetadataModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full p-6 space-y-4 animate-in fade-in max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Info className="w-5 h-5 text-blue-600" />
                <h3 className="text-base font-bold text-slate-900">
                  Geospatial Dataset Metadata
                </h3>
              </div>
              <button 
                onClick={() => setShowMetadataModal(false)}
                className="text-slate-400 hover:text-slate-600 text-lg"
              >
                ✕
              </button>
            </div>

            {metadataDetails ? (
              <div className="space-y-3 text-xs">
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-1.5">
                  <div className="text-sm font-bold text-slate-900">{metadataDetails.name}</div>
                  <div className="text-slate-500 font-mono text-[11px]">{metadataDetails.original_filename || metadataDetails.name}</div>
                  <div className="inline-block bg-blue-100 text-blue-800 font-semibold text-[10px] px-2 py-0.5 rounded">
                    {metadataDetails.source_type === 'government_open_gis' ? 'Government / Open GIS' :
                     metadataDetails.source_type === 'existing_geotiff' ? 'GeoTIFF Orthomosaic' : 'Drone Imagery'}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-100">
                    <div className="text-[10px] uppercase font-bold text-slate-400">CRS</div>
                    <div className="font-mono font-bold text-slate-900 mt-0.5">{metadataDetails.crs || 'CRS: Not Available'}</div>
                  </div>
                  <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-100">
                    <div className="text-[10px] uppercase font-bold text-slate-400">Pixel Resolution / GSD</div>
                    <div className="font-mono font-bold text-slate-900 mt-0.5">{metadataDetails.resolution || (metadataDetails.gsd_cm ? `${metadataDetails.gsd_cm} cm GSD` : 'GSD: Not Available')}</div>
                  </div>
                  <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-100">
                    <div className="text-[10px] uppercase font-bold text-slate-400">Raster Dimensions</div>
                    <div className="font-mono font-bold text-slate-900 mt-0.5">
                      {metadataDetails.width_px ? `${metadataDetails.width_px.toLocaleString()} × ${metadataDetails.height_px.toLocaleString()} px` : 'Not Available'}
                    </div>
                  </div>
                  <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-100">
                    <div className="text-[10px] uppercase font-bold text-slate-400">Bands / File Size</div>
                    <div className="font-mono font-bold text-slate-900 mt-0.5">
                      {metadataDetails.bands ? `${metadataDetails.bands} Bands` : '1 Band'} | {metadataDetails.file_size_str || 'N/A'}
                    </div>
                  </div>
                </div>

                <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-100 space-y-1">
                  <div className="text-[10px] uppercase font-bold text-slate-400">Bounding Coordinates (WGS84)</div>
                  <div className="font-mono text-[11px] text-slate-700 break-all">
                    {metadataDetails.bounds ? JSON.stringify(metadataDetails.bounds) : 'Bounds Not Available'}
                  </div>
                </div>

                <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-100 space-y-1">
                  <div className="text-[10px] uppercase font-bold text-slate-400">Affine Geotransform Matrix</div>
                  <div className="font-mono text-[11px] text-slate-700 break-all">
                    {metadataDetails.affine_transform ? JSON.stringify(metadataDetails.affine_transform) : 'Transform: None (Unreferenced)'}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-100">
                    <div className="text-[10px] uppercase font-bold text-slate-400">Source Organization</div>
                    <div className="font-medium text-slate-800 mt-0.5">{metadataDetails.source_organization || 'Not Available'}</div>
                  </div>
                  <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-100">
                    <div className="text-[10px] uppercase font-bold text-slate-400">Acquisition Date</div>
                    <div className="font-medium text-slate-800 mt-0.5">{metadataDetails.acquisition_date || 'Not Available'}</div>
                  </div>
                </div>

                {metadataDetails.checklist && metadataDetails.checklist.length > 0 && (
                  <div className="space-y-1 pt-1">
                    <div className="text-[10px] uppercase font-bold text-slate-400">Inspection Checklist</div>
                    <div className="space-y-1">
                      {metadataDetails.checklist.map((item: any, idx: number) => (
                        <div key={idx} className="flex items-center justify-between p-1.5 bg-slate-50 rounded border border-slate-100 text-[11px]">
                          <span className="font-medium text-slate-700">{item.name}</span>
                          <span className={`font-bold px-1.5 py-0.5 rounded text-[10px] ${item.status === 'Passed' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                            {item.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-6 text-slate-400">No metadata available</div>
            )}

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setShowMetadataModal(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-xs"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Spatial & Temporal Comparison Modal */}
      {spatialModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-6 space-y-4 animate-in fade-in max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <GitCompare className="w-5 h-5 text-blue-600" />
                <h3 className="text-base font-bold text-slate-900">
                  Spatial & Multi-Temporal Dataset Comparison
                </h3>
              </div>
              <button 
                onClick={() => setSpatialModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-lg"
              >
                ✕
              </button>
            </div>

            {/* Mode Switcher */}
            <div className="flex items-center gap-2 p-1 bg-slate-100 rounded-xl text-xs">
              <button
                onClick={() => { setTemporalMode(false); setComparisonData(null); }}
                className={`flex-1 py-1.5 font-semibold rounded-lg transition-colors ${!temporalMode ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
              >
                Spatial Boundary Discrepancy
              </button>
              <button
                onClick={() => { setTemporalMode(true); setComparisonData(null); }}
                className={`flex-1 py-1.5 font-semibold rounded-lg transition-colors ${temporalMode ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
              >
                Multi-Temporal Survey Change
              </button>
            </div>

            {/* Dataset Selection */}
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  {temporalMode ? 'Baseline Survey (Earlier Date)' : 'Reference Dataset (Gov / Open GIS)'}
                </label>
                <select
                  value={compareRefId}
                  onChange={(e) => setCompareRefId(e.target.value)}
                  className="w-full p-2 border border-slate-200 rounded-lg bg-white text-slate-800"
                >
                  <option value="">Select reference dataset...</option>
                  {datasetsList.map(d => (
                    <option key={d.id} value={d.id}>
                      {d.name} ({d.source_type} - {d.acquisition_date || 'No Date'})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  {temporalMode ? 'Subsequent Survey (Later Date)' : 'Current Dataset (GeoTIFF / Drone)'}
                </label>
                <select
                  value={compareCurId}
                  onChange={(e) => setCompareCurId(e.target.value)}
                  className="w-full p-2 border border-slate-200 rounded-lg bg-white text-slate-800"
                >
                  <option value="">Select comparison dataset...</option>
                  {datasetsList.map(d => (
                    <option key={d.id} value={d.id}>
                      {d.name} ({d.source_type} - {d.acquisition_date || 'No Date'})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <button
              onClick={handleRunSpatialComparison}
              disabled={comparisonBusy || !compareRefId || !compareCurId || compareRefId === compareCurId}
              className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold text-xs rounded-xl shadow-sm transition-colors flex items-center justify-center gap-1.5"
            >
              {comparisonBusy ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <GitCompare className="w-3.5 h-3.5" />}
              <span>Execute Real Spatial Analysis</span>
            </button>

            {/* Comparison Results */}
            {comparisonData && (
              <div className="space-y-3 pt-2 text-xs border-t border-slate-100">
                {comparisonData.success ? (
                  <div className="space-y-3">
                    <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200">
                      <div className="font-bold text-emerald-900 text-sm">{comparisonData.comparison_title}</div>
                      <div className="text-emerald-700 text-xs mt-0.5">
                        Status: <span className="font-semibold">{comparisonData.metrics?.discrepancy_classification}</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                      <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-100 text-center">
                        <div className="text-[10px] uppercase font-bold text-slate-400">Overlap Area</div>
                        <div className="font-extrabold text-slate-900 text-sm mt-0.5">{comparisonData.metrics?.computed_overlap_area_sqm?.toLocaleString()} m²</div>
                      </div>
                      <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-100 text-center">
                        <div className="text-[10px] uppercase font-bold text-slate-400">Overlap %</div>
                        <div className="font-extrabold text-blue-600 text-sm mt-0.5">{comparisonData.metrics?.overlap_percentage}%</div>
                      </div>
                      <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-100 text-center">
                        <div className="text-[10px] uppercase font-bold text-slate-400">Boundary Difference</div>
                        <div className="font-extrabold text-rose-600 text-sm mt-0.5">{comparisonData.metrics?.potential_boundary_difference_sqm?.toLocaleString()} m²</div>
                      </div>
                    </div>

                    <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-100 space-y-1 font-mono text-[11px] text-slate-600">
                      <div>Processing Coordinate System: <span className="font-bold text-slate-800">{comparisonData.transformations?.processing_crs}</span></div>
                      <div>Output Geometric System: <span className="font-bold text-slate-800">{comparisonData.transformations?.output_crs}</span></div>
                    </div>
                  </div>
                ) : (
                  <div className="p-3 bg-rose-50 rounded-xl border border-rose-200 text-rose-700">
                    <div className="font-bold">{comparisonData.status}</div>
                    <p className="mt-0.5 text-[11px]">{comparisonData.message}</p>
                  </div>
                )}
              </div>
            )}

            <div className="flex justify-end pt-2 border-t border-slate-100">
              <button
                onClick={() => setSpatialModalOpen(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-xs"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
