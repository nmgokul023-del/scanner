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
  MapPin
} from 'lucide-react';
import { Parcel } from '../types';
import { LeafletMap } from '../components/map/LeafletMap';

interface GISEditorProps {
  parcels: Parcel[];
  selectedParcel: Parcel;
  onSelectParcel: (p: Parcel) => void;
  onUpdateParcel: (id: string, updates: Partial<Parcel>) => void;
}

export const GISEditor: React.FC<GISEditorProps> = ({
  parcels,
  selectedParcel,
  onSelectParcel,
  onUpdateParcel
}) => {
  const [activeTool, setActiveTool] = useState<'select' | 'draw' | 'vertex' | 'split' | 'merge' | 'delete' | 'measure'>('select');
  const [historyIndex, setHistoryIndex] = useState(0);
  const [history, setHistory] = useState<string[]>(['Initial state: Parcel #8824-A baseline loaded.']);
  const [savedNotice, setSavedNotice] = useState(false);

  const handleToolClick = (tool: typeof activeTool) => {
    setActiveTool(tool);
    const log = `Tool activated: ${tool.toUpperCase()} mode`;
    setHistory(prev => [log, ...prev]);
  };

  const handleUndo = () => {
    if (history.length > 1) {
      setHistory(prev => prev.slice(1));
    }
  };

  const handleRedo = () => {
    setHistory(prev => ['Action redone', ...prev]);
  };

  const handleSave = () => {
    onUpdateParcel(selectedParcel.id, {
      status: 'Verified',
      notes: `Edited in GIS Editor using ${activeTool} tool.`
    } as any);
    setSavedNotice(true);
    setTimeout(() => setSavedNotice(false), 2500);
  };

  return (
    <div className="relative w-full h-[calc(100vh-4rem)] flex flex-col select-none overflow-hidden">
      {/* GIS Editor Floating Top Action Ribbon matching Section 17 */}
      <div className="absolute top-4 left-4 right-4 z-20 flex flex-wrap items-center justify-between gap-2 bg-white/95 backdrop-blur-md p-2 rounded-2xl shadow-xl border border-slate-200">
        {/* Vector Manipulation Tools */}
        <div className="flex items-center space-x-1">
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
            title="Draw New Cadastral Boundary"
            className={`p-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
              activeTool === 'draw' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-700 hover:bg-slate-100'
            }`}
          >
            <PenTool className="w-4 h-4" /> Draw
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
            className={`p-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
              activeTool === 'delete' ? 'bg-rose-600 text-white shadow-sm' : 'text-slate-700 hover:bg-slate-100'
            }`}
          >
            <Trash2 className="w-4 h-4" /> Delete
          </button>

          <button
            onClick={() => handleToolClick('measure')}
            title="Measure Geodesic Distance / Area"
            className={`p-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
              activeTool === 'measure' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-700 hover:bg-slate-100'
            }`}
          >
            <Ruler className="w-4 h-4" /> Measure
          </button>
        </div>

        {/* Undo / Redo / Save Controls */}
        <div className="flex items-center space-x-2 border-l border-slate-200 pl-2">
          <button
            onClick={handleUndo}
            title="Undo"
            className="p-2 text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
          >
            <Undo className="w-4 h-4" />
          </button>

          <button
            onClick={handleRedo}
            title="Redo"
            className="p-2 text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
          >
            <Redo className="w-4 h-4" />
          </button>

          <button
            onClick={handleSave}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all"
          >
            <Save className="w-4 h-4" /> Save GIS Changes
          </button>
        </div>
      </div>

      {savedNotice && (
        <div className="absolute top-20 right-6 z-30 bg-emerald-600 text-white px-4 py-2 rounded-xl shadow-xl text-xs font-bold animate-in fade-in">
          ✓ Vector edits committed to Cadastral Database & Audit Trail!
        </div>
      )}

      {/* Main Interactive Leaflet Map for Editing */}
      <div className="w-full h-full">
        <LeafletMap
          parcels={parcels}
          selectedParcelId={selectedParcel.id}
          onSelectParcel={onSelectParcel}
          heightClass="h-full"
        />
      </div>

      {/* Bottom Floating Info Drawer */}
      <div className="absolute bottom-4 left-4 z-20 bg-slate-900/90 backdrop-blur-md text-white px-4 py-2.5 rounded-xl shadow-xl border border-slate-700 flex items-center space-x-4 text-xs font-mono">
        <div>Feature: <span className="text-blue-400 font-bold">{selectedParcel.parcel_id}</span></div>
        <div>CRS: <span className="text-emerald-400">EPSG:4326 (WGS 84)</span></div>
        <div>Tolerance: <span className="text-amber-400">0.05m Snapping</span></div>
      </div>
    </div>
  );
};
