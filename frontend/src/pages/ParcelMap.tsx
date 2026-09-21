import React, { useState } from 'react';
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
  GitCompare
} from 'lucide-react';
import { Parcel, Conflict } from '../types';
import { LeafletMap } from '../components/map/LeafletMap';

interface ParcelMapProps {
  parcels: Parcel[];
  conflicts: Conflict[];
  selectedParcel: Parcel;
  onSelectParcel: (parcel: Parcel) => void;
  onNavigate: (route: string) => void;
  onUpdateParcel: (parcelId: string, updates: Partial<Parcel>) => void;
}

export const ParcelMap: React.FC<ParcelMapProps> = ({
  parcels,
  conflicts,
  selectedParcel,
  onSelectParcel,
  onNavigate,
  onUpdateParcel
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [showComparisonModal, setShowComparisonModal] = useState(false);
  const [sheetExpanded, setSheetExpanded] = useState(true);
  const [mapToast, setMapToast] = useState<string | null>(null);

  const filteredParcels = parcels.filter(p => 
    p.parcel_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.address.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleAction = (action: string) => {
    if (action === 'Accept') {
      onUpdateParcel(selectedParcel.id, { status: 'Verified', confidence_score: 0.99 });
      setMapToast(`Parcel ${selectedParcel.parcel_id} accepted and registered as official verified record.`);
      setTimeout(() => setMapToast(null), 5000);
    } else if (action === 'Reject') {
      onUpdateParcel(selectedParcel.id, { status: 'Rejected' });
      setMapToast(`AI proposal for ${selectedParcel.parcel_id} rejected. Retaining registered boundary.`);
      setTimeout(() => setMapToast(null), 5000);
    } else if (action === 'Send to Survey') {
      onNavigate('ground-truth');
    } else if (action === 'Edit') {
      onNavigate('gis-editor');
    } else if (action === 'Verify') {
      onNavigate('verification');
    } else if (action === 'Compare') {
      setShowComparisonModal(true);
    }
  };

  return (
    <div className="relative w-full h-[calc(100vh-4rem)] flex flex-col md:flex-row overflow-hidden select-none">
      {/* Toast Notification Banner */}
      {mapToast && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 bg-slate-900/95 text-white px-4 py-2.5 rounded-2xl shadow-xl text-xs font-semibold flex items-center gap-2 border border-slate-700 animate-in fade-in">
          <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
          <span>{mapToast}</span>
          <button onClick={() => setMapToast(null)} className="ml-2 text-slate-400 hover:text-white">✕</button>
        </div>
      )}

      {/* Search Header Overlay */}
      <div className="absolute top-3 left-3 right-3 md:left-6 md:right-auto md:w-96 z-20">
        <div className="relative bg-white/95 backdrop-blur-md rounded-2xl shadow-lg border border-slate-200/90 flex items-center px-4 py-2.5">
          <Search className="w-4 h-4 text-blue-600 mr-2.5 shrink-0" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search parcels, owners, or AI insights..."
            className="w-full bg-transparent text-xs sm:text-sm font-medium text-slate-800 focus:outline-none placeholder:text-slate-400"
          />
          <button className="p-1 text-slate-400 hover:text-slate-600">
            <Mic className="w-4 h-4" />
          </button>
        </div>

        {/* Live Search dropdown */}
        {searchQuery.trim() && (
          <div className="mt-1.5 bg-white/95 backdrop-blur-md rounded-xl shadow-xl border border-slate-200 overflow-hidden max-h-60 overflow-y-auto">
            {filteredParcels.map(p => (
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
                <span className="text-[10px] font-semibold text-blue-600">{p.ai_area_sqm} m²</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Main Interactive Leaflet Map Area */}
      <div className="flex-1 w-full h-full relative">
        <LeafletMap
          parcels={parcels}
          conflicts={conflicts}
          selectedParcelId={selectedParcel.id}
          onSelectParcel={onSelectParcel}
          heightClass="h-full"
          showSatellite={false}
        />
      </div>

      {/* Parcel Detail Bottom Sheet / Sidebar matching Page 3 */}
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

        <div className="p-4 sm:p-5 overflow-y-auto flex-1 space-y-4">
          {/* Header */}
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-base sm:text-lg font-extrabold text-slate-900 tracking-tight">
                {selectedParcel.title || selectedParcel.parcel_id}
              </h2>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                {selectedParcel.address}
              </p>
            </div>
            <span className="text-[11px] font-bold text-blue-600 bg-blue-50 border border-blue-100 px-2.5 py-1 rounded-full flex items-center gap-1.5 shrink-0">
              <span className="w-2 h-2 rounded-full bg-blue-600"></span> AI VERIFIED
            </span>
          </div>

          {/* AI Valuation & Suitability Cards */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
              <div className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
                AI VALUATION
              </div>
              <div className="text-lg font-extrabold text-slate-900 mt-1">
                ${(selectedParcel.valuation_usd / 1000000).toFixed(1)}M{' '}
                <span className="text-xs font-bold text-emerald-600">+{selectedParcel.valuation_change_pct}%</span>
              </div>
            </div>

            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
              <div className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
                SUITABILITY
              </div>
              <div className="text-lg font-extrabold text-slate-900 mt-1 flex items-center gap-1.5">
                <span>{selectedParcel.suitability_score}/100</span>
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              </div>
            </div>
          </div>

          {/* AI Growth Prediction Chart matching Page 3 */}
          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-2">
            <div className="flex items-center space-x-1.5 text-xs font-bold text-slate-700">
              <TrendingUp className="w-3.5 h-3.5 text-blue-600" />
              <span>AI Growth Prediction</span>
            </div>

            <div className="w-full h-24 relative flex flex-col justify-between pt-1">
              <svg className="w-full h-16 overflow-visible" viewBox="0 0 300 60" preserveAspectRatio="none">
                <line x1="0" y1="10" x2="300" y2="10" stroke="#e2e8f0" strokeWidth="1" />
                <line x1="0" y1="35" x2="300" y2="35" stroke="#e2e8f0" strokeWidth="1" />
                <path
                  d="M 10 40 Q 80 36 150 30 T 290 18"
                  fill="none"
                  stroke="#2563eb"
                  strokeWidth="2.5"
                />
                <circle cx="10" cy="40" r="3" fill="#2563eb" />
                <circle cx="80" cy="35" r="3" fill="#2563eb" />
                <circle cx="150" cy="30" r="3" fill="#2563eb" />
                <circle cx="220" cy="24" r="3" fill="#2563eb" />
                <circle cx="290" cy="18" r="3" fill="#2563eb" />
              </svg>

              <div className="flex justify-between text-[9px] font-medium text-slate-400 border-t border-slate-200 pt-1">
                <span>2020</span>
                <span>2021</span>
                <span>2022</span>
                <span>2023</span>
                <span>2024</span>
              </div>
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
                  <div className="text-[10px] font-bold text-slate-400 uppercase">Total Area</div>
                  <div className="text-xs font-bold text-slate-900">{selectedParcel.total_area_acres} Acres ({selectedParcel.ai_area_sqm} m²)</div>
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
                  <div className="text-[10px] font-bold text-slate-400 uppercase">Zoning Code</div>
                  <div className="text-xs font-bold text-slate-900">{selectedParcel.zone_description}</div>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-blue-600 transition-colors" />
            </div>
          </div>

          {/* Cadastral Discrepancy Breakdown */}
          <div className="p-3 bg-amber-50/70 border border-amber-200/80 rounded-xl space-y-1.5 text-xs">
            <div className="flex justify-between items-center text-slate-600">
              <span>Existing Revenue Area:</span>
              <span className="font-semibold text-slate-900">{selectedParcel.existing_area_sqm} m²</span>
            </div>
            <div className="flex justify-between items-center text-slate-600">
              <span>AI Drone Extracted Area:</span>
              <span className="font-semibold text-blue-700">{selectedParcel.ai_area_sqm} m²</span>
            </div>
            <div className="flex justify-between items-center border-t border-amber-200 pt-1 text-slate-700 font-bold">
              <span>Difference:</span>
              <span className={selectedParcel.difference_sqm > 0 ? 'text-rose-600' : 'text-slate-800'}>
                {selectedParcel.difference_sqm > 0 ? `+${selectedParcel.difference_sqm}` : selectedParcel.difference_sqm} m²
              </span>
            </div>
          </div>

          {/* Operational Action Buttons (Prompt Section 9) */}
          <div className="space-y-2 pt-1">
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => handleAction('Compare')}
                className="py-2 px-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl flex items-center justify-center gap-1 transition-colors"
              >
                <GitCompare className="w-3.5 h-3.5" /> Compare
              </button>
              <button
                onClick={() => handleAction('Verify')}
                className="py-2 px-2 bg-blue-50 hover:bg-blue-100 text-blue-700 font-semibold text-xs rounded-xl flex items-center justify-center gap-1 transition-colors"
              >
                <Check className="w-3.5 h-3.5" /> Verify
              </button>
              <button
                onClick={() => handleAction('Edit')}
                className="py-2 px-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl flex items-center justify-center gap-1 transition-colors"
              >
                <Edit3 className="w-3.5 h-3.5" /> Edit
              </button>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => handleAction('Send to Survey')}
                className="py-2 px-2 bg-amber-50 hover:bg-amber-100 text-amber-800 font-semibold text-xs rounded-xl flex items-center justify-center gap-1 transition-colors"
              >
                <Send className="w-3.5 h-3.5" /> Survey
              </button>
              <button
                onClick={() => handleAction('Accept')}
                className="py-2 px-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-xl flex items-center justify-center gap-1 transition-colors shadow-sm"
              >
                <Check className="w-3.5 h-3.5" /> Accept
              </button>
              <button
                onClick={() => handleAction('Reject')}
                className="py-2 px-2 bg-rose-50 hover:bg-rose-100 text-rose-700 font-semibold text-xs rounded-xl flex items-center justify-center gap-1 transition-colors"
              >
                <X className="w-3.5 h-3.5" /> Reject
              </button>
            </div>
          </div>

          {/* Generate Full AI Report Button matching Page 3 */}
          <button
            onClick={() => onNavigate('property-details')}
            className="w-full py-3.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-2xl shadow-md shadow-blue-500/25 transition-all text-xs sm:text-sm flex items-center justify-center space-x-2 active:scale-[0.99]"
          >
            <span>Generate Full AI Report</span>
          </button>
        </div>
      </div>

      {/* Side-by-side comparison modal */}
      {showComparisonModal && (
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
                <div className="text-xl font-bold text-slate-900">{selectedParcel.existing_area_sqm} m²</div>
                <p className="text-slate-600 text-[11px]">Recorded in Sub-Registrar revenue books under Zone {selectedParcel.zone}.</p>
              </div>

              <div className="p-4 rounded-xl border border-blue-200 bg-blue-50 space-y-2">
                <div className="font-bold text-blue-900 uppercase tracking-wider text-[10px]">AI Drone Extracted</div>
                <div className="text-xl font-bold text-blue-900">{selectedParcel.ai_area_sqm} m²</div>
                <p className="text-slate-600 text-[11px]">Computed from 5cm GSD Orthomosaic segmentation with {Math.round(selectedParcel.confidence_score * 100)}% confidence.</p>
              </div>
            </div>

            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-1">
              <div className="font-semibold text-slate-800">Possible Boundary Discrepancy:</div>
              <p className="text-slate-600">
                Net area difference of <span className="font-bold text-rose-600">+{selectedParcel.difference_sqm} m²</span>. Requires ground survey verification before statutory mutation.
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
    </div>
  );
};
