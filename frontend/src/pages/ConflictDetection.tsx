import React, { useState } from 'react';
import { 
  AlertTriangle, 
  MapPin, 
  CheckCircle, 
  Clock, 
  ExternalLink, 
  Filter, 
  ShieldAlert, 
  Search,
  Check,
  Send,
  Eye
} from 'lucide-react';
import { Conflict, Parcel } from '../types';
import { apiClient } from '../api/client';

interface ConflictDetectionProps {
  conflicts: Conflict[];
  onSelectParcel: (parcelId: string) => void;
  onNavigate: (route: string) => void;
  onRefreshConflicts: () => void;
}

export const ConflictDetection: React.FC<ConflictDetectionProps> = ({
  conflicts,
  onSelectParcel,
  onNavigate,
  onRefreshConflicts
}) => {
  const [filterSeverity, setFilterSeverity] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedConflict, setSelectedConflict] = useState<Conflict | null>(conflicts[0] || null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const filtered = conflicts.filter(c => {
    const matchesSeverity = filterSeverity === 'all' || c.severity.toLowerCase() === filterSeverity.toLowerCase();
    const matchesSearch = c.parcel_id.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          c.conflict_type.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSeverity && matchesSearch;
  });

  const handleResolve = async (conflictId: string) => {
    await apiClient.resolveConflict(conflictId, { status: 'Resolved' });
    setToastMessage(`Boundary conflict ${conflictId} successfully verified and marked as Resolved in cadastral register.`);
    onRefreshConflicts();
    setTimeout(() => setToastMessage(null), 5000);
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-6 select-none pb-24 md:pb-12">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="p-3.5 bg-emerald-900 text-emerald-100 rounded-xl text-xs font-semibold flex items-center justify-between shadow-lg border border-emerald-700 animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-400" />
            <span>{toastMessage}</span>
          </div>
          <button onClick={() => setToastMessage(null)} className="text-emerald-300 hover:text-white text-xs">Dismiss</button>
        </div>
      )}

      {/* Disclaimer Header */}
      <div className="bg-amber-50 border border-amber-200/90 rounded-2xl p-4 sm:p-5 flex items-start space-x-3.5">
        <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <h1 className="text-sm font-bold text-amber-900 tracking-tight">
            Cadastral Boundary Conflict & Discrepancy Detection
          </h1>
          <p className="text-xs text-amber-800 leading-relaxed font-medium">
            AI boundaries are compared against registered cadastral deed coordinates. 
            All detected variations are classified as <span className="font-bold underline">"Possible Boundary Discrepancies"</span> and strictly marked <span className="font-bold underline">"Requires Survey Verification"</span>. These do not constitute legally confirmed encroachments without field surveyor certification.
          </p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Filter by Parcel ID or Conflict Type..."
            className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          />
        </div>

        <div className="flex items-center space-x-2">
          <span className="text-xs font-semibold text-slate-500">Severity:</span>
          {(['all', 'high', 'medium', 'low'] as const).map((sev) => (
            <button
              key={sev}
              onClick={() => setFilterSeverity(sev)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors ${
                filterSeverity === sev
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {sev}
            </button>
          ))}
        </div>
      </div>

      {/* Conflicts List & Details Split */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* List of Conflicts (2 cols) */}
        <div className="lg:col-span-2 space-y-3">
          {filtered.map((c) => {
            const isSelected = selectedConflict?.id === c.id;
            return (
              <div
                key={c.id}
                onClick={() => setSelectedConflict(c)}
                className={`bg-white rounded-2xl p-4 sm:p-5 border transition-all cursor-pointer shadow-sm ${
                  isSelected
                    ? 'border-blue-600 ring-2 ring-blue-500/20'
                    : 'border-slate-200/90 hover:border-slate-300'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <span className="font-extrabold text-sm text-slate-900">{c.parcel_id}</span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        c.severity === 'High' ? 'bg-rose-100 text-rose-800' :
                        c.severity === 'Medium' ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-700'
                      }`}>
                        {c.severity} Severity
                      </span>
                    </div>
                    <div className="text-xs font-semibold text-rose-600 flex items-center gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      <span>{c.conflict_type}</span>
                    </div>
                  </div>

                  <span className="text-xs font-bold text-slate-500 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-200">
                    {Math.round(c.confidence_score * 100)}% Conf
                  </span>
                </div>

                {/* Metrics row */}
                <div className="grid grid-cols-3 gap-2 my-3 p-3 bg-slate-50 rounded-xl text-xs">
                  <div>
                    <span className="text-slate-400 font-medium text-[10px] uppercase">Existing Area</span>
                    <div className="font-bold text-slate-800">{c.existing_area_sqm} m²</div>
                  </div>
                  <div>
                    <span className="text-slate-400 font-medium text-[10px] uppercase">AI Extracted Area</span>
                    <div className="font-bold text-blue-600">{c.ai_area_sqm} m²</div>
                  </div>
                  <div>
                    <span className="text-slate-400 font-medium text-[10px] uppercase">Discrepancy Delta</span>
                    <div className="font-bold text-rose-600">
                      {c.difference_sqm > 0 ? `+${c.difference_sqm}` : c.difference_sqm} m²
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
                  <span className="italic text-[11px] truncate max-w-sm">{c.notes}</span>
                  <span className="font-bold text-blue-600 hover:underline flex items-center gap-1">
                    Details →
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Selected Conflict Action Panel (1 col) */}
        {selectedConflict && (
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-4 h-fit sticky top-20">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900">Conflict Inspection</h3>
              <span className="text-[10px] font-mono text-slate-400">{selectedConflict.id}</span>
            </div>

            <div className="space-y-2">
              <div className="text-xs font-bold text-slate-400 uppercase">Recommendation</div>
              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs font-semibold text-amber-900">
                {selectedConflict.recommendation}
              </div>
            </div>

            <div className="space-y-1.5 text-xs text-slate-600">
              <div className="flex justify-between">
                <span>Affected Area:</span>
                <span className="font-bold text-slate-900">{selectedConflict.affected_area_sqm} m²</span>
              </div>
              <div className="flex justify-between">
                <span>Current Status:</span>
                <span className="font-bold text-amber-700">{selectedConflict.status}</span>
              </div>
            </div>

            <div className="space-y-2 pt-2">
              <button
                onClick={() => {
                  onSelectParcel(selectedConflict.parcel_id);
                  onNavigate('parcel-map');
                }}
                className="w-full py-2.5 px-3 bg-blue-50 hover:bg-blue-100 text-blue-700 font-semibold rounded-xl text-xs flex items-center justify-center gap-1.5 transition-colors"
              >
                <Eye className="w-4 h-4" /> View On Cadastral Map
              </button>

              <button
                onClick={() => {
                  onSelectParcel(selectedConflict.parcel_id);
                  onNavigate('ground-truth');
                }}
                className="w-full py-2.5 px-3 bg-amber-600 hover:bg-amber-700 text-white font-semibold rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-sm transition-colors"
              >
                <Send className="w-4 h-4" /> Send to Survey Verification
              </button>

              <button
                onClick={() => handleResolve(selectedConflict.id)}
                className="w-full py-2.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-sm transition-colors"
              >
                <Check className="w-4 h-4" /> Mark Discrepancy Resolved
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
