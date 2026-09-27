import React, { useState } from 'react';
import { 
  Pointer, 
  PenTool, 
  Edit3, 
  Scissors, 
  Merge, 
  Trash2, 
  Ruler, 
  Undo, 
  Redo, 
  Save, 
  Layers, 
  CheckCircle2, 
  AlertCircle,
  MapPin,
  Grid,
  Play,
  ShieldAlert,
  X,
  Plus,
  RefreshCw,
  AlertTriangle
} from 'lucide-react';
import { Parcel, Conflict, Building, Road, LandUseFeature } from '../types';
import { LeafletMap } from '../components/map/LeafletMap';
import { apiClient } from '../api/client';

interface GISEditorProps {
  parcels: Parcel[];
  selectedParcel?: Parcel | null;
  onSelectParcel: (p: Parcel) => void;
  onUpdateParcel: (id: string, updates: Partial<Parcel>) => void;
  onRefreshData?: () => void;
  conflicts?: Conflict[];
  buildings?: Building[];
  roads?: Road[];
  landUse?: LandUseFeature[];
  activeDataset?: any;
}

export const GISEditor: React.FC<GISEditorProps> = ({
  parcels,
  selectedParcel,
  onSelectParcel,
  onUpdateParcel,
  onRefreshData,
  conflicts = [],
  buildings = [],
  roads = [],
  landUse = [],
  activeDataset
}) => {
  const [activeTool, setActiveTool] = useState<'select' | 'draw' | 'vertex' | 'split' | 'merge' | 'delete' | 'measure'>('select');
  const [history, setHistory] = useState<string[]>([
    selectedParcel ? `Initial state: Parcel #${selectedParcel.parcel_id} loaded.` : 'Initial state: GIS Editor ready. Select or draw a parcel.'
  ]);
  const [savedNotice, setSavedNotice] = useState<string | null>(null);
  const [loadingAction, setLoadingAction] = useState<string | null>(null);

  // Modals state
  const [showDrawModal, setShowDrawModal] = useState(false);
  const [showSplitModal, setShowSplitModal] = useState(false);
  const [showMergeModal, setShowMergeModal] = useState(false);
  const [showTopologyModal, setShowTopologyModal] = useState(false);
  const [showAuditResults, setShowAuditResults] = useState(false);
  const [auditResultData, setAuditResultData] = useState<any>(null);

  // Draw form state
  const [newParcelId, setNewParcelId] = useState(`PB-${Date.now().toString().slice(-4)}`);
  const [newOwner, setNewOwner] = useState('');
  const [newAddress, setNewAddress] = useState('');

  // Split state
  const [splitMethod, setSplitMethod] = useState<'vertical' | 'horizontal'>('vertical');

  // Merge state
  const [mergeTargetId, setMergeTargetId] = useState<string>('');

  // Topology generation state
  const [topologyGridSize, setTopologyGridSize] = useState<number>(3);

  const showNotification = (msg: string) => {
    setSavedNotice(msg);
    setTimeout(() => setSavedNotice(null), 3500);
  };

  const handleToolClick = (tool: typeof activeTool) => {
    setActiveTool(tool);
    setHistory(prev => [`Tool activated: ${tool.toUpperCase()} mode`, ...prev]);

    if (tool === 'draw') {
      setShowDrawModal(true);
    } else if (tool === 'split') {
      if (!selectedParcel) {
        showNotification("Please select a parcel first to split.");
        return;
      }
      setShowSplitModal(true);
    } else if (tool === 'merge') {
      if (!selectedParcel) {
        showNotification("Please select a parcel first to merge.");
        return;
      }
      const others = parcels.filter(p => p.id !== selectedParcel?.id);
      if (others.length > 0) setMergeTargetId(others[0].id);
      setShowMergeModal(true);
    } else if (tool === 'delete') {
      if (!selectedParcel) {
        showNotification("No parcel selected to delete.");
        return;
      }
      handleDeleteParcel();
    }
  };

  const handleSave = () => {
    if (!selectedParcel) {
      showNotification("No parcel selected to save.");
      return;
    }
    onUpdateParcel(selectedParcel.id, {
      status: 'Verified',
      notes: `Edited in GIS Editor using ${activeTool} tool.`
    } as any);
    showNotification(`✓ Vector edits saved to Cadastral Database for #${selectedParcel.parcel_id}!`);
  };

  // 1. Draw / Create New Parcel Polygon
  const handleCreateParcelSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoadingAction('Creating parcel polygon...');
    try {
      const baseCoords = (selectedParcel?.geometry as any)?.coordinates?.[0] || (parcels[0]?.geometry as any)?.coordinates?.[0];
      if (!baseCoords) {
        alert('Cannot create adjacent parcel: No existing parcel geometry available.');
        setLoadingAction(null);
        return;
      }
      // Offset slightly to create adjacent parcel
      const offsetCoords = baseCoords.map((pt: [number, number]) => [
        Number((pt[0] + 0.0018).toFixed(6)),
        Number((pt[1] + 0.0012).toFixed(6))
      ]);

      const created = await apiClient.createParcel({
        parcel_id: newParcelId,
        title: `Cadastral Parcel #${newParcelId}`,
        owner: newOwner,
        address: newAddress,
        geometry: {
          type: 'Polygon',
          coordinates: [offsetCoords]
        } as any,
        status: 'Requires Verification',
        zone: 'Commercial Zone C-2'
      });

      setShowDrawModal(false);
      showNotification(`✓ Parcel #${created.parcel_id} polygon created successfully!`);
      setHistory(prev => [`Created parcel #${created.parcel_id}`, ...prev]);
      if (onRefreshData) onRefreshData();
      onSelectParcel(created);
    } catch (err: any) {
      alert(`Error creating parcel: ${err.message}`);
    } finally {
      setLoadingAction(null);
    }
  };

  // 2. Split Parcel
  const handleSplitSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedParcel) return;
    setLoadingAction('Topologically splitting polygon...');
    try {
      const coords: [number, number][] = (selectedParcel.geometry as any).coordinates[0];
      const lats = coords.map(c => c[1]);
      const lngs = coords.map(c => c[0]);
      const minLat = Math.min(...lats);
      const maxLat = Math.max(...lats);
      const minLng = Math.min(...lngs);
      const maxLng = Math.max(...lngs);

      let cutLine: [number, number][];
      if (splitMethod === 'vertical') {
        const midLng = (minLng + maxLng) / 2;
        cutLine = [[midLng, minLat - 0.001], [midLng, maxLat + 0.001]];
      } else {
        const midLat = (minLat + maxLat) / 2;
        cutLine = [[minLng - 0.001, midLat], [maxLng + 0.001, midLat]];
      }

      await apiClient.splitParcel(selectedParcel.id, cutLine);
      setShowSplitModal(false);
      showNotification(`✓ Parcel #${selectedParcel.parcel_id} successfully bisected into 2 parcels!`);
      setHistory(prev => [`Split parcel #${selectedParcel.parcel_id}`, ...prev]);
      if (onRefreshData) onRefreshData();
    } catch (err: any) {
      alert(`Error splitting parcel: ${err.message}`);
    } finally {
      setLoadingAction(null);
    }
  };

  // 3. Merge Parcels
  const handleMergeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedParcel || !mergeTargetId) return;
    setLoadingAction('Topologically merging parcels...');
    try {
      const merged = await apiClient.mergeParcels([selectedParcel.id, mergeTargetId]);
      setShowMergeModal(false);
      showNotification(`✓ Parcels merged into single polygon (Area: ${merged.ai_area_sqm} m²)!`);
      setHistory(prev => [`Merged parcels into #${merged.parcel_id}`, ...prev]);
      if (onRefreshData) onRefreshData();
      onSelectParcel(merged);
    } catch (err: any) {
      alert(`Error merging parcels: ${err.message}`);
    } finally {
      setLoadingAction(null);
    }
  };

  // 4. Delete Parcel
  const handleDeleteParcel = async () => {
    if (!selectedParcel) return;
    if (!confirm(`Are you sure you want to delete Parcel #${selectedParcel.parcel_id}?`)) return;
    setLoadingAction('Deleting parcel...');
    try {
      await apiClient.deleteParcel(selectedParcel.id);
      showNotification(`✓ Parcel #${selectedParcel.parcel_id} deleted.`);
      setHistory(prev => [`Deleted parcel #${selectedParcel.parcel_id}`, ...prev]);
      if (onRefreshData) onRefreshData();
      const remaining = parcels.filter(p => p.id !== selectedParcel.id);
      if (remaining.length > 0) onSelectParcel(remaining[0]);
    } catch (err: any) {
      alert(`Error deleting parcel: ${err.message}`);
    } finally {
      setLoadingAction(null);
    }
  };

  // 5. Automated Topology Generation
  const handleGenerateTopology = async () => {
    setLoadingAction(`Generating ${topologyGridSize}x${topologyGridSize} planar polygon topology...`);
    try {
      let extentBounds: [[number, number], [number, number]] | undefined = undefined;
      const allPts: [number, number][] = [];
      parcels.forEach(p => {
        const ring = (p.geometry as any)?.coordinates?.[0];
        if (Array.isArray(ring)) {
          ring.forEach((pt: any) => {
            if (Array.isArray(pt) && pt.length >= 2) {
              allPts.push([pt[1], pt[0]]);
            }
          });
        }
      });
      if (allPts.length > 0) {
        const lats = allPts.map(pt => pt[0]);
        const lngs = allPts.map(pt => pt[1]);
        extentBounds = [
          [Math.min(...lats), Math.min(...lngs)],
          [Math.max(...lats), Math.max(...lngs)]
        ];
      }
      const res = await apiClient.generateTopology({
        bounds: extentBounds,
        rows: topologyGridSize,
        cols: topologyGridSize,
        save_to_db: true
      });
      setShowTopologyModal(false);
      showNotification(`✓ Generated ${res.total_polygons_generated || res.parcels?.length} clean topological parcel polygons!`);
      setHistory(prev => [`Generated ${res.total_polygons_generated} topology polygons`, ...prev]);
      if (onRefreshData) onRefreshData();
    } catch (err: any) {
      alert(`Error generating topology: ${err.message}`);
    } finally {
      setLoadingAction(null);
    }
  };

  // 6. Overlap & Geometric Inconsistency Audit
  const handleRunAudit = async () => {
    setLoadingAction('Executing pairwise overlap & geometry consistency audit...');
    try {
      const res = await apiClient.runTopologyValidation();
      setAuditResultData(res);
      setShowAuditResults(true);
      showNotification(`Audit complete: Pass rate ${res.pass_rate_pct}%. ${res.overlaps?.length || 0} overlaps detected.`);
      setHistory(prev => [`Topology Audit: ${res.overlaps?.length || 0} overlaps, ${res.inconsistencies?.length || 0} issues`, ...prev]);
      if (onRefreshData) onRefreshData();
    } catch (err: any) {
      alert(`Audit failed: ${err.message}`);
    } finally {
      setLoadingAction(null);
    }
  };

  return (
    <div className="relative w-full h-[calc(100vh-4rem)] flex flex-col select-none overflow-hidden">
      {/* Floating Top GIS Toolbar */}
      <div className="absolute top-4 left-4 right-4 z-20 flex flex-wrap items-center justify-between gap-2 bg-white/95 backdrop-blur-md p-2 rounded-2xl shadow-xl border border-slate-200">
        {/* Core Vector Manipulation Tools */}
        <div className="flex items-center space-x-1 overflow-x-auto pb-1 sm:pb-0">
          <button
            onClick={() => handleToolClick('select')}
            title="Select Parcel / Feature"
            className={`p-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
              activeTool === 'select' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-700 hover:bg-slate-100'
            }`}
          >
            <Pointer className="w-4 h-4" /> Select
          </button>

          <button
            onClick={() => handleToolClick('draw')}
            title="Draw New Cadastral Boundary Polygon"
            className={`p-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
              activeTool === 'draw' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-700 hover:bg-slate-100'
            }`}
          >
            <PenTool className="w-4 h-4" /> Draw Polygon
          </button>

          <button
            onClick={() => handleToolClick('vertex')}
            title="Edit Polygon Vertices"
            className={`p-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
              activeTool === 'vertex' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-700 hover:bg-slate-100'
            }`}
          >
            <Edit3 className="w-4 h-4" /> Edit Vertex
          </button>

          <button
            onClick={() => handleToolClick('split')}
            title="Split Parcel Polygon"
            className={`p-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
              activeTool === 'split' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-700 hover:bg-slate-100'
            }`}
          >
            <Scissors className="w-4 h-4" /> Split
          </button>

          <button
            onClick={() => handleToolClick('merge')}
            title="Merge Adjacent Parcels"
            className={`p-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
              activeTool === 'merge' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-700 hover:bg-slate-100'
            }`}
          >
            <Merge className="w-4 h-4" /> Merge
          </button>

          <button
            onClick={() => handleToolClick('delete')}
            title="Delete Geometry Feature"
            className="p-2 rounded-xl text-xs font-bold flex items-center gap-1.5 text-rose-600 hover:bg-rose-50 transition-all"
          >
            <Trash2 className="w-4 h-4" /> Delete
          </button>
        </div>

        {/* Automated Spatial Engines Actions */}
        <div className="flex items-center space-x-2 border-l border-slate-200 pl-2">
          <button
            onClick={() => setShowTopologyModal(true)}
            className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all border border-indigo-200"
            title="Feature 3: Automated Topology Generation & Polygon Creation"
          >
            <Grid className="w-3.5 h-3.5" /> Auto-Topology
          </button>

          <button
            onClick={handleRunAudit}
            className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all border border-rose-200"
            title="Feature 4: Overlap & Inconsistency Detection"
          >
            <ShieldAlert className="w-3.5 h-3.5" /> Detect Overlaps
          </button>

          <button
            onClick={handleSave}
            className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all"
          >
            <Save className="w-3.5 h-3.5" /> Save
          </button>
        </div>
      </div>

      {/* Notifications & Status Banner */}
      {savedNotice && (
        <div className="absolute top-20 right-6 z-30 bg-slate-900 text-white px-4 py-2.5 rounded-xl shadow-2xl text-xs font-bold flex items-center gap-2 border border-slate-700 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{savedNotice}</span>
        </div>
      )}

      {loadingAction && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 z-30 bg-blue-600 text-white px-5 py-2.5 rounded-2xl shadow-2xl text-xs font-bold flex items-center gap-2.5 animate-pulse">
          <RefreshCw className="w-4 h-4 animate-spin" />
          <span>{loadingAction}</span>
        </div>
      )}

      {/* Empty GIS State Message when no parcels loaded */}
      {parcels.length === 0 && (
        <div className="absolute top-20 left-4 z-20 bg-white/95 backdrop-blur-md p-4 rounded-2xl shadow-xl border border-slate-200 max-w-sm">
          <div className="flex items-center gap-2 mb-1.5">
            <Layers className="w-4 h-4 text-blue-600" />
            <h4 className="font-bold text-xs text-slate-800">Vector GIS Editor • 0 Features Loaded</h4>
          </div>
          <p className="text-[11px] text-slate-600 mb-3">
            No GIS features available. Upload or load a real GIS dataset to begin.
          </p>
          <button
            onClick={() => setShowDrawModal(true)}
            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors"
          >
            Draw New Parcel Polygon
          </button>
        </div>
      )}

      {/* Main Interactive Leaflet Map for Web-GIS Editing */}
      <div className="w-full flex-1 min-h-[500px] h-full">
        <LeafletMap
          parcels={parcels}
          conflicts={conflicts}
          buildings={buildings}
          roads={roads}
          landUse={landUse}
          activeDataset={activeDataset}
          selectedParcelId={selectedParcel?.id}
          onSelectParcel={onSelectParcel}
          heightClass="h-full min-h-[500px]"
          onRefreshData={onRefreshData}
        />
      </div>

      {/* Bottom Floating Info Drawer */}
      <div className="absolute bottom-4 left-4 z-20 bg-slate-900/90 backdrop-blur-md text-white px-4 py-2.5 rounded-xl shadow-xl border border-slate-700 flex flex-wrap items-center gap-4 text-xs font-mono">
        <div>Feature: <span className="text-blue-400 font-bold">{selectedParcel?.parcel_id || 'None Selected'}</span></div>
        <div>Area: <span className="text-emerald-400">{selectedParcel ? `${selectedParcel.ai_area_sqm || 0} m²` : '—'}</span></div>
        <div>Status: <span className="text-amber-400">{selectedParcel?.status || 'No parcel selected'}</span></div>
        <div className="hidden sm:inline">CRS: <span className="text-slate-400">{activeDataset?.crs ? (activeDataset.crs.toLowerCase().includes('unreferenced') ? 'CRS: Not Available' : activeDataset.crs) : 'CRS: Not Available'}</span></div>
      </div>

      {/* MODAL 1: Draw / Create Parcel Polygon */}
      {showDrawModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                <PenTool className="w-4 h-4 text-blue-600" /> Draw New Cadastral Parcel
              </h3>
              <button onClick={() => setShowDrawModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreateParcelSubmit} className="mt-4 space-y-3.5 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Parcel Identifier</label>
                <input
                  type="text"
                  required
                  value={newParcelId}
                  onChange={e => setNewParcelId(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 font-mono"
                />
              </div>
              <div>
                <label className="font-bold text-slate-700 block mb-1">Owner / Titleholder</label>
                <input
                  type="text"
                  required
                  value={newOwner}
                  onChange={e => setNewOwner(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="font-bold text-slate-700 block mb-1">Address / Location</label>
                <input
                  type="text"
                  required
                  value={newAddress}
                  onChange={e => setNewAddress(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="p-3 bg-blue-50 rounded-xl text-blue-800 text-[11px] leading-relaxed">
                Initial polygon boundary will be automatically synthesized adjacent to survey center and registered in the database with computed planar area.
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowDrawModal(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-md"
                >
                  Create Polygon
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Split Parcel Polygon */}
      {showSplitModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                <Scissors className="w-4 h-4 text-blue-600" /> Split Parcel #{selectedParcel?.parcel_id}
              </h3>
              <button onClick={() => setShowSplitModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSplitSubmit} className="mt-4 space-y-4 text-xs">
              <p className="text-slate-600 text-xs">
                Select the topological bisector plane to cleanly subdivide the parcel polygon into 2 verified sub-parcels with recalculated areas:
              </p>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setSplitMethod('vertical')}
                  className={`p-3 rounded-xl border text-left font-bold ${
                    splitMethod === 'vertical' ? 'border-blue-600 bg-blue-50 text-blue-700 ring-2 ring-blue-500' : 'border-slate-200 text-slate-700'
                  }`}
                >
                  North-South (Vertical)
                  <div className="text-[10px] text-slate-500 font-normal mt-1">Splits into East & West portions</div>
                </button>
                <button
                  type="button"
                  onClick={() => setSplitMethod('horizontal')}
                  className={`p-3 rounded-xl border text-left font-bold ${
                    splitMethod === 'horizontal' ? 'border-blue-600 bg-blue-50 text-blue-700 ring-2 ring-blue-500' : 'border-slate-200 text-slate-700'
                  }`}
                >
                  East-West (Horizontal)
                  <div className="text-[10px] text-slate-500 font-normal mt-1">Splits into North & South portions</div>
                </button>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowSplitModal(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-md"
                >
                  Execute Split
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: Merge Adjacent Parcels */}
      {showMergeModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                <Merge className="w-4 h-4 text-blue-600" /> Merge Parcel #{selectedParcel?.parcel_id}
              </h3>
              <button onClick={() => setShowMergeModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleMergeSubmit} className="mt-4 space-y-4 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Select Parcel to Merge With</label>
                <select
                  value={mergeTargetId}
                  onChange={e => setMergeTargetId(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 font-mono"
                >
                  {parcels.filter(p => p.id !== selectedParcel?.id).map(p => (
                    <option key={p.id} value={p.id}>
                      #{p.parcel_id} - {p.address} ({p.ai_area_sqm} m²)
                    </option>
                  ))}
                </select>
              </div>
              <p className="text-slate-500 text-[11px]">
                Both parcel polygons will be combined using Shapely unary_union with mutual shared boundary dissolved.
              </p>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowMergeModal(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-md"
                >
                  Execute Merge
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 4: Automated Topology Generation */}
      {showTopologyModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                <Grid className="w-4 h-4 text-indigo-600" /> Automated Topology Generator
              </h3>
              <button onClick={() => setShowTopologyModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="mt-4 space-y-4 text-xs">
              <p className="text-slate-600 text-xs">
                Generates topologically shared, non-overlapping planar parcel polygons across the survey sector using Python Shapely polygonize and coordinate snapping.
              </p>
              <div>
                <label className="font-bold text-slate-700 block mb-1">Cadastral Sector Grid Resolution</label>
                <div className="grid grid-cols-3 gap-2">
                  {[2, 3, 4].map(size => (
                    <button
                      key={size}
                      type="button"
                      onClick={() => setTopologyGridSize(size)}
                      className={`p-2.5 rounded-xl border text-center font-bold ${
                        topologyGridSize === size ? 'border-indigo-600 bg-indigo-50 text-indigo-700 ring-2 ring-indigo-500' : 'border-slate-200 text-slate-700'
                      }`}
                    >
                      {size}x{size} Grid
                      <div className="text-[10px] text-slate-500 font-normal">{size * size} Parcels</div>
                    </button>
                  ))}
                </div>
              </div>
              <div className="p-3 bg-emerald-50 rounded-xl text-emerald-800 text-[11px] leading-relaxed">
                ✓ Guaranteed zero polygon self-intersections.<br />
                ✓ Shared boundaries snapped to 0.05m tolerance.<br />
                ✓ Automatic area calculation in m² stored in SQLite database.
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowTopologyModal(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl font-bold"
                >
                  Cancel
                </button>
                <button
                  onClick={handleGenerateTopology}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-md"
                >
                  Generate Parcels
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* DRAWER / MODAL 5: Overlap & Geometry Inconsistency Results */}
      {showAuditResults && auditResultData && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-2xl w-full max-h-[85vh] flex flex-col shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-rose-600" />
                <h3 className="text-base font-extrabold text-slate-900">
                  Topology & Overlap Validation Audit
                </h3>
              </div>
              <button onClick={() => setShowAuditResults(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-3 gap-3 my-4">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-center">
                <div className="text-[10px] uppercase font-bold text-slate-400">Pass Rate</div>
                <div className="text-xl font-extrabold text-emerald-600">{auditResultData.pass_rate_pct}%</div>
              </div>
              <div className="p-3 bg-rose-50 rounded-xl border border-rose-200 text-center">
                <div className="text-[10px] uppercase font-bold text-rose-500">Overlaps Detected</div>
                <div className="text-xl font-extrabold text-rose-700">{auditResultData.overlaps?.length || 0}</div>
              </div>
              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-center">
                <div className="text-[10px] uppercase font-bold text-amber-500">Inconsistencies</div>
                <div className="text-xl font-extrabold text-amber-700">{auditResultData.inconsistencies?.length || 0}</div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3 pr-1 text-xs">
              <div className="font-bold text-slate-800">Detected Boundary Overlaps:</div>
              {(!auditResultData.overlaps || auditResultData.overlaps.length === 0) ? (
                <div className="p-3 bg-emerald-50 text-emerald-700 rounded-xl">
                  ✓ Zero overlapping parcel polygons detected. All boundaries are topologically clean.
                </div>
              ) : (
                auditResultData.overlaps.map((ov: any) => (
                  <div key={ov.id} className="p-3.5 bg-rose-50/60 rounded-xl border border-rose-200 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-rose-800">
                        Overlap between #{ov.parcel_a_id} and #{ov.parcel_b_id}
                      </span>
                      <span className="px-2 py-0.5 bg-rose-600 text-white rounded text-[10px] font-bold">
                        {ov.severity}
                      </span>
                    </div>
                    <div className="text-slate-700">
                      Disputed / Overlapping Area: <strong className="text-rose-700">{ov.overlap_area_sqm} m²</strong>
                    </div>
                    <div className="text-[11px] text-slate-500">
                      Topological intersection geometry computed via Shapely and registered in conflicts database.
                    </div>
                  </div>
                ))
              )}

              <div className="font-bold text-slate-800 pt-2">Geometric Inconsistencies:</div>
              {(!auditResultData.inconsistencies || auditResultData.inconsistencies.length === 0) ? (
                <div className="p-3 bg-emerald-50 text-emerald-700 rounded-xl">
                  ✓ All parcel polygons are valid, closed, and satisfy minimum area rules.
                </div>
              ) : (
                auditResultData.inconsistencies.map((inc: any) => (
                  <div key={inc.id} className="p-3 bg-amber-50/60 rounded-xl border border-amber-200">
                    <div className="font-bold text-amber-800">{inc.issue_type}</div>
                    <div className="text-slate-600 text-[11px]">{inc.description}</div>
                  </div>
                ))
              )}
            </div>

            <div className="pt-4 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setShowAuditResults(false)}
                className="px-4 py-2 bg-slate-900 text-white font-bold rounded-xl text-xs"
              >
                Close Audit
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
