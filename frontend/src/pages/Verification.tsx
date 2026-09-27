import React, { useState } from 'react';
import { 
  CheckSquare, 
  Check, 
  X, 
  Send, 
  Edit3, 
  Plus, 
  Trash2, 
  Scissors, 
  Merge, 
  Maximize2, 
  Save, 
  Layers,
  Sparkles
} from 'lucide-react';
import { Parcel } from '../types';
import { apiClient } from '../api/client';

interface VerificationProps {
  parcel: Parcel;
  onUpdateParcel: (parcelId: string, updates: Partial<Parcel>) => void;
  onNavigate: (route: string) => void;
}

export const Verification: React.FC<VerificationProps> = ({
  parcel,
  onUpdateParcel,
  onNavigate
}) => {
  const [activeTool, setActiveTool] = useState<'move' | 'add' | 'delete' | 'split' | 'merge'>('move');
  const [notes, setNotes] = useState('');
  const [correctedArea, setCorrectedArea] = useState<number>(parcel.ai_area_sqm);
  const [statusMessage, setStatusMessage] = useState('');

  const handleAction = async (actionType: string) => {
    try {
      if (actionType === 'Accept AI') {
        onUpdateParcel(parcel.id, { status: 'Human-verified' });
        setStatusMessage(`Accepted candidate AI boundary for ${parcel.parcel_id}. Promoted to Human-verified.`);
      } else if (actionType === 'Correct Boundary') {
        onUpdateParcel(parcel.id, { 
          status: 'Human-verified', 
          ai_area_sqm: correctedArea, 
          difference_sqm: Math.round((correctedArea - parcel.existing_area_sqm) * 100) / 100 
        });
        setStatusMessage(`Saved surveyor-corrected boundary (${correctedArea} m²) as Human-verified.`);
      } else if (actionType === 'Finalize') {
        onUpdateParcel(parcel.id, { status: 'Final' });
        setStatusMessage(`Official cadastral sign-off recorded. Status promoted to Final.`);
      } else if (actionType === 'Reject') {
        onUpdateParcel(parcel.id, { status: 'Rejected' });
        setStatusMessage(`Rejected candidate AI boundary for ${parcel.parcel_id}. Retaining official deed record.`);
      } else if (actionType === 'Send to Ground Truth') {
        await apiClient.createGroundTruthTask({
          parcel_id: parcel.parcel_id,
          reason: notes || 'Cadastral boundary requires DGPS total station survey verification',
          surveyor: 'R. Ramanathan',
          coordinates: (parcel.geometry && parcel.geometry.coordinates && parcel.geometry.coordinates[0] && parcel.geometry.coordinates[0][0])
            ? [parcel.geometry.coordinates[0][0][1], parcel.geometry.coordinates[0][0][0]]
            : null
        });
        setStatusMessage(`Dispatched ground-truth CORS survey task.`);
        setTimeout(() => onNavigate('ground-truth'), 900);
      }
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-6 select-none pb-24 md:pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <CheckSquare className="w-5 h-5 text-blue-600" />
            <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">
              Human-in-the-Loop Cadastral Verification
            </h1>
          </div>
          <div className="flex items-center gap-2 mt-1">
            <p className="text-xs text-slate-500 font-medium">
              Parcel: <span className="font-bold text-slate-800">{parcel.parcel_id}</span> ({parcel.address})
            </p>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
              parcel.status === 'Final' ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' :
              parcel.status === 'Human-verified' ? 'bg-blue-100 text-blue-800 border border-blue-300' :
              'bg-sky-100 text-sky-800 border border-sky-300'
            }`}>
              {parcel.status || 'AI-generated (Probable)'}
            </span>
          </div>
        </div>

        {/* Verification Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => handleAction('Accept AI')}
            className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl shadow-sm flex items-center gap-1.5 transition-colors"
          >
            <Check className="w-4 h-4" /> Accept AI
          </button>
          <button
            onClick={() => handleAction('Correct Boundary')}
            className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl shadow-sm flex items-center gap-1.5 transition-colors"
          >
            <Save className="w-4 h-4" /> Correct Boundary
          </button>
          <button
            onClick={() => handleAction('Finalize')}
            className="px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold rounded-xl shadow-sm flex items-center gap-1.5 transition-colors"
          >
            <Sparkles className="w-4 h-4" /> Final Sign-off
          </button>
          <button
            onClick={() => handleAction('Reject')}
            className="px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-semibold rounded-xl border border-rose-200 transition-colors"
          >
            <X className="w-4 h-4" /> Reject
          </button>
          <button
            onClick={() => handleAction('Send to Ground Truth')}
            className="px-3 py-2 bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold rounded-xl shadow-sm flex items-center gap-1.5 transition-colors"
          >
            <Send className="w-4 h-4" /> Send to Ground Truth
          </button>
        </div>
      </div>

      {statusMessage && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold rounded-xl animate-in fade-in flex items-center gap-2">
          <Check className="w-4 h-4" />
          <span>{statusMessage}</span>
        </div>
      )}

      {/* Editing Toolbar */}
      <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center space-x-2">
          <span className="text-slate-400 font-bold uppercase tracking-wider text-[10px] mr-1">Vector Tools:</span>
          <button
            onClick={() => setActiveTool('move')}
            className={`px-3 py-1.5 rounded-lg font-semibold flex items-center gap-1.5 transition-colors ${
              activeTool === 'move' ? 'bg-blue-600 text-white shadow-sm' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <Edit3 className="w-3.5 h-3.5" /> Move Vertex
          </button>
          <button
            onClick={() => setActiveTool('add')}
            className={`px-3 py-1.5 rounded-lg font-semibold flex items-center gap-1.5 transition-colors ${
              activeTool === 'add' ? 'bg-blue-600 text-white shadow-sm' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <Plus className="w-3.5 h-3.5" /> Add Vertex
          </button>
          <button
            onClick={() => setActiveTool('delete')}
            className={`px-3 py-1.5 rounded-lg font-semibold flex items-center gap-1.5 transition-colors ${
              activeTool === 'delete' ? 'bg-blue-600 text-white shadow-sm' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <Trash2 className="w-3.5 h-3.5" /> Delete Vertex
          </button>
          <button
            onClick={() => {
              setActiveTool('split');
              const halfArea = Math.round(parcel.ai_area_sqm / 2);
              setCorrectedArea(halfArea);
              setStatusMessage(`Parcel split tool activated: Division into two sub-parcels A and B (${halfArea} m² each). Click 'Correct Boundary' to confirm.`);
            }}
            className={`px-3 py-1.5 rounded-lg font-semibold flex items-center gap-1.5 transition-colors ${
              activeTool === 'split' ? 'bg-blue-600 text-white shadow-sm' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <Scissors className="w-3.5 h-3.5" /> Split Parcel
          </button>
          <button
            onClick={() => {
              setActiveTool('merge');
              const mergedArea = parcel.ai_area_sqm + 800;
              setCorrectedArea(mergedArea);
              setStatusMessage(`Amalgamation tool activated: Combined with adjacent parcel TN-1873 (${mergedArea} m² total). Click 'Correct Boundary' to confirm.`);
            }}
            className={`px-3 py-1.5 rounded-lg font-semibold flex items-center gap-1.5 transition-colors ${
              activeTool === 'merge' ? 'bg-blue-600 text-white shadow-sm' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <Merge className="w-3.5 h-3.5" /> Merge Parcel
          </button>
        </div>

        <div className="flex items-center space-x-3 font-mono text-[11px] text-slate-600">
          <span>Active Vertex: #4 (Lat: 12.9782, Lng: 77.6415)</span>
          <span className="font-bold text-blue-600">Area: {correctedArea} m²</span>
        </div>
      </div>

      {/* Side-by-Side Dual Viewer (Section 13 Requirement: Drone Imagery and GIS Map Side-by-Side) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Left: High Resolution Drone Orthomosaic with Segment Overlay */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
          <div className="p-3 bg-slate-900 text-white text-xs font-bold flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-sky-400"></span> Drone Orthomosaic 5cm GSD
            </span>
            <span className="text-[10px] text-slate-400 font-mono">Flight: 2026-08-15</span>
          </div>

          <div className="relative h-80 sm:h-96 bg-slate-950 overflow-hidden group">
            <img
              src="https://images.unsplash.com/photo-1524661135-423995f22d0b?w=1200&auto=format&fit=crop&q=80"
              alt="Drone Orthomosaic View"
              className="w-full h-full object-cover brightness-90"
            />
            {/* Overlay boundary polygon simulation */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 400 300">
              <polygon
                points="80,60 320,70 300,240 60,230"
                fill="rgba(59, 130, 246, 0.25)"
                stroke="#3b82f6"
                strokeWidth="3"
              />
              {/* Vertices */}
              <circle cx="80" cy="60" r="5" fill="#ffffff" stroke="#2563eb" strokeWidth="2" />
              <circle cx="320" cy="70" r="5" fill="#ffffff" stroke="#2563eb" strokeWidth="2" />
              <circle cx="300" cy="240" r="6" fill="#3b82f6" stroke="#ffffff" strokeWidth="2" className="animate-pulse" />
              <circle cx="60" cy="230" r="5" fill="#ffffff" stroke="#2563eb" strokeWidth="2" />
            </svg>

            <div className="absolute bottom-3 left-3 bg-slate-900/80 backdrop-blur-sm text-white px-2.5 py-1 rounded text-[10px]">
              Drone feature edge snapping: Compound Wall / Fence
            </div>
          </div>
        </div>

        {/* Right: Existing Cadastral Deed & Revenue Map Vector */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
          <div className="p-3 bg-slate-800 text-white text-xs font-bold flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-400"></span> Registered Cadastral Base
            </span>
            <span className="text-[10px] text-slate-400 font-mono">Survey Office Deed Ref</span>
          </div>

          <div className="relative h-80 sm:h-96 bg-slate-100 overflow-hidden flex items-center justify-center p-4">
            <svg className="w-full h-full" viewBox="0 0 400 300">
              {/* Grid backdrop */}
              <defs>
                <pattern id="cadGrid" width="20" height="20" patternUnits="userSpaceOnUse">
                  <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#e2e8f0" strokeWidth="1" />
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#cadGrid)" />

              {/* Official Existing Boundary (Amber dashed) */}
              <polygon
                points="90,75 310,75 295,225 75,225"
                fill="rgba(245, 158, 11, 0.12)"
                stroke="#f59e0b"
                strokeWidth="2.5"
                strokeDasharray="6 4"
              />
              <text x="140" y="150" fill="#b45309" fontSize="12" fontWeight="bold">
                Existing: {parcel.existing_area_sqm} m²
              </text>

              {/* Proposed AI Boundary (Blue Solid) */}
              <polygon
                points="80,60 320,70 300,240 60,230"
                fill="rgba(37, 99, 235, 0.08)"
                stroke="#2563eb"
                strokeWidth="2"
              />
              <text x="140" y="170" fill="#1d4ed8" fontSize="12" fontWeight="bold">
                AI Proposed: {correctedArea} m²
              </text>
            </svg>

            <div className="absolute bottom-3 left-3 bg-white/90 backdrop-blur-sm text-slate-700 px-2.5 py-1 rounded border border-slate-200 text-[10px]">
              Discrepancy: +{correctedArea - parcel.existing_area_sqm} m² on Eastern Margin
            </div>
          </div>
        </div>
      </div>

      {/* Surveyor Notes & Mutation Justification */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-2">
        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
          Surveyor Endorsement Notes & Revenue Justification
        </label>
        <textarea
          rows={2}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Enter survey findings, physical compound wall alignment remarks, or reason for ground survey..."
          className="w-full p-3 rounded-xl border border-slate-200 bg-slate-50 text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 placeholder:text-slate-400"
        />
      </div>
    </div>
  );
};
