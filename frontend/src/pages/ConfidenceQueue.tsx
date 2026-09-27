import React, { useState } from 'react';
import { 
  Award, 
  ArrowUpDown, 
  CheckCircle, 
  AlertCircle, 
  Filter, 
  ArrowRight,
  ShieldAlert,
  Search
} from 'lucide-react';
import { Parcel } from '../types';

interface ConfidenceQueueProps {
  parcels: Parcel[];
  onSelectParcel: (parcel: Parcel) => void;
  onNavigate: (route: string) => void;
}

export const ConfidenceQueue: React.FC<ConfidenceQueueProps> = ({
  parcels,
  onSelectParcel,
  onNavigate
}) => {
  const [sortField, setSortField] = useState<'confidence' | 'difference' | 'priority'>('confidence');
  const [filterTier, setFilterTier] = useState<'all' | 'high' | 'medium' | 'low'>('all');

  const highParcels = parcels.filter(p => (p.confidence_score || 0) >= 0.90);
  const mediumParcels = parcels.filter(p => (p.confidence_score || 0) >= 0.70 && (p.confidence_score || 0) < 0.90);
  const lowParcels = parcels.filter(p => (p.confidence_score || 0) < 0.70);

  const sortedParcels = [...parcels].filter(p => {
    if (filterTier === 'high') return (p.confidence_score || 0) >= 0.90;
    if (filterTier === 'medium') return (p.confidence_score || 0) >= 0.70 && (p.confidence_score || 0) < 0.90;
    if (filterTier === 'low') return (p.confidence_score || 0) < 0.70;
    return true;
  }).sort((a, b) => {
    if (sortField === 'confidence') return (a.confidence_score || 0) - (b.confidence_score || 0);
    if (sortField === 'difference') return Math.abs(b.difference_sqm || 0) - Math.abs(a.difference_sqm || 0);
    if (sortField === 'priority') return (b.suitability_score || 0) - (a.suitability_score || 0);
    return 0;
  });

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-6 select-none pb-24 md:pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <Award className="w-6 h-6 text-blue-600" />
            AI Confidence Analysis & Review Queue
          </h1>
          <p className="text-xs text-slate-500 font-medium mt-1">
            Prioritize cadastral parcels requiring human-in-the-loop survey verification.
          </p>
        </div>

        {/* Sort Controls */}
        <div className="flex items-center space-x-2 bg-white p-1.5 rounded-xl border border-slate-200 text-xs shadow-sm">
          <span className="text-slate-400 font-semibold px-2 flex items-center gap-1">
            <ArrowUpDown className="w-3.5 h-3.5" /> Sort by:
          </span>
          <button
            onClick={() => setSortField('confidence')}
            className={`px-3 py-1 rounded-lg font-bold transition-colors ${
              sortField === 'confidence' ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Lowest Confidence
          </button>
          <button
            onClick={() => setSortField('difference')}
            className={`px-3 py-1 rounded-lg font-bold transition-colors ${
              sortField === 'difference' ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Largest Area Delta
          </button>
          <button
            onClick={() => setSortField('priority')}
            className={`px-3 py-1 rounded-lg font-bold transition-colors ${
              sortField === 'priority' ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Highest Priority
          </button>
        </div>
      </div>

      {/* Confidence Tier Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div 
          onClick={() => setFilterTier('high')}
          className={`bg-white p-4 rounded-2xl border transition-all cursor-pointer shadow-sm ${
            filterTier === 'high' ? 'border-emerald-500 ring-2 ring-emerald-500/20' : 'border-slate-200'
          }`}
        >
          <div className="flex justify-between items-center text-xs">
            <span className="font-bold text-emerald-700 uppercase">High Confidence (&gt;90%)</span>
            <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-extrabold text-[10px]">
              {highParcels.length} Parcels
            </span>
          </div>
          <div className="text-xl font-extrabold text-slate-900 mt-2">
            {parcels.length > 0 ? `${Math.round((highParcels.length / parcels.length) * 100)}% of Total` : '0 Parcels'}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Directly eligible for automated mutation without field resurvey.</p>
        </div>

        <div 
          onClick={() => setFilterTier('medium')}
          className={`bg-white p-4 rounded-2xl border transition-all cursor-pointer shadow-sm ${
            filterTier === 'medium' ? 'border-amber-500 ring-2 ring-amber-500/20' : 'border-slate-200'
          }`}
        >
          <div className="flex justify-between items-center text-xs">
            <span className="font-bold text-amber-700 uppercase">Medium Confidence (70-90%)</span>
            <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 font-extrabold text-[10px]">
              {mediumParcels.length} Parcels
            </span>
          </div>
          <div className="text-xl font-extrabold text-slate-900 mt-2">
            {parcels.length > 0 ? `${Math.round((mediumParcels.length / parcels.length) * 100)}% of Total` : '0 Parcels'}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Requires visual cross-check against orthophoto before endorsement.</p>
        </div>

        <div 
          onClick={() => setFilterTier('low')}
          className={`bg-white p-4 rounded-2xl border transition-all cursor-pointer shadow-sm ${
            filterTier === 'low' ? 'border-rose-500 ring-2 ring-rose-500/20' : 'border-slate-200'
          }`}
        >
          <div className="flex justify-between items-center text-xs">
            <span className="font-bold text-rose-700 uppercase">Low Confidence (&lt;70%)</span>
            <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 font-extrabold text-[10px]">
              {lowParcels.length} Parcels
            </span>
          </div>
          <div className="text-xl font-extrabold text-slate-900 mt-2">
            {parcels.length > 0 ? `${Math.round((lowParcels.length / parcels.length) * 100)}% of Total` : '0 Parcels'}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Automatic DGPS/CORS field survey assignment dispatched.</p>
        </div>
      </div>

      {/* Parcels Review List */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-900">
            Parcels in Review Queue ({sortedParcels.length})
          </h2>
          {filterTier !== 'all' && (
            <button
              onClick={() => setFilterTier('all')}
              className="text-xs font-semibold text-blue-600 hover:underline"
            >
              Clear filter
            </button>
          )}
        </div>

        <div className="divide-y divide-slate-100">
          {sortedParcels.length === 0 ? (
            <div className="p-8 text-center text-slate-500 text-xs">
              No parcels available in the review queue. Upload drone imagery or extract parcels to populate.
            </div>
          ) : sortedParcels.map((p) => (
            <div
              key={p.id}
              className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50 transition-colors"
            >
              <div className="space-y-1">
                <div className="flex items-center space-x-2">
                  <span className="font-bold text-slate-900 text-sm">{p.parcel_id}</span>
                  <span className="text-xs text-slate-500 font-medium">({p.zone})</span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    p.confidence_score >= 0.9 ? 'bg-emerald-100 text-emerald-800' :
                    p.confidence_score >= 0.7 ? 'bg-amber-100 text-amber-800' : 'bg-rose-100 text-rose-800'
                  }`}>
                    {Math.round(p.confidence_score * 100)}% Confidence
                  </span>
                </div>
                <div className="text-xs text-slate-600">{p.address}</div>
                <div className="text-[11px] text-slate-400 font-mono">
                  Existing: {p.existing_area_sqm} m² • AI Extracted: {p.ai_area_sqm} m² • Delta:{' '}
                  <span className={p.difference_sqm > 0 ? 'text-rose-600 font-bold' : 'text-slate-800'}>
                    {p.difference_sqm > 0 ? `+${p.difference_sqm}` : p.difference_sqm} m²
                  </span>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  onClick={() => {
                    onSelectParcel(p);
                    onNavigate('verification');
                  }}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-sm transition-colors"
                >
                  Verify Boundary
                </button>
                <button
                  onClick={() => {
                    onSelectParcel(p);
                    onNavigate('parcel-map');
                  }}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-colors"
                >
                  View on Map
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
