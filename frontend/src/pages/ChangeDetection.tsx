import React, { useState } from 'react';
import { 
  Clock, 
  Building2, 
  GitFork, 
  PieChart, 
  MapPin, 
  ArrowRight, 
  Layers, 
  Calendar,
  AlertCircle,
  UploadCloud,
  FileQuestion
} from 'lucide-react';
import { ChangeDetectionItem } from '../types';

interface ChangeDetectionProps {
  changes: ChangeDetectionItem[];
  onSelectParcel: (parcelId: string) => void;
  onNavigate: (route: string) => void;
}

export const ChangeDetection: React.FC<ChangeDetectionProps> = ({
  changes,
  onSelectParcel,
  onNavigate
}) => {
  const hasChanges = changes && changes.length > 0;

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 space-y-6 select-none pb-24 md:pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <Clock className="w-6 h-6 text-indigo-600" />
            Temporal Cadastral Change Detection
          </h1>
          <p className="text-xs text-slate-500 font-medium mt-1">
            Differential photogrammetric analysis comparing multi-temporal drone survey epochs.
          </p>
        </div>

        {hasChanges && (
          <div className="text-xs font-semibold px-3 py-1.5 bg-emerald-50 text-emerald-800 rounded-xl border border-emerald-200">
            {changes.length} Real Changes Detected
          </div>
        )}
      </div>

      {!hasChanges ? (
        /* Empty / Insufficient Temporal Data State */
        <div className="bg-white rounded-3xl p-10 border border-slate-200 shadow-sm text-center space-y-5 max-w-2xl mx-auto my-8">
          <div className="w-16 h-16 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center mx-auto text-amber-600">
            <FileQuestion className="w-8 h-8" />
          </div>
          <div className="space-y-2">
            <h2 className="text-lg font-bold text-slate-900">
              Not Available — Second temporal dataset required
            </h2>
            <p className="text-xs text-slate-500 leading-relaxed max-w-md mx-auto">
              Automated temporal cadastral change detection requires at least two distinct georeferenced orthomosaic surveys over the same geographical boundary.
            </p>
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-600 font-mono inline-block mt-2">
              Status: Insufficient Temporal Data (Requires Epoch A & Epoch B)
            </div>
          </div>

          <div className="pt-2">
            <button
              onClick={() => onNavigate('drone-upload')}
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-200 inline-flex items-center gap-2 transition-all"
            >
              <UploadCloud className="w-4 h-4" /> Upload Additional Survey Dataset
            </button>
          </div>
        </div>
      ) : (
        /* Real Detected Changes List */
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-900">
              Detected Morphological & Cadastral Changes ({changes.length})
            </h2>
            <span className="text-[11px] font-medium text-slate-500">
              Computed from actual orthomosaic raster diffs
            </span>
          </div>

          <div className="divide-y divide-slate-100">
            {changes.map((item) => (
              <div
                key={item.id}
                className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50 transition-colors"
              >
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                      item.feature_type === 'New Building' ? 'bg-indigo-100 text-indigo-800' :
                      item.feature_type === 'Road Change' ? 'bg-amber-100 text-amber-800' :
                      item.feature_type === 'Land-use Change' ? 'bg-emerald-100 text-emerald-800' :
                      'bg-rose-100 text-rose-800'
                    }`}>
                      {item.feature_type}
                    </span>
                    <span className="font-bold text-sm text-slate-900">{item.parcel_id}</span>
                  </div>
                  <p className="text-xs text-slate-600 font-medium">{item.change_description}</p>
                  <div className="text-[10px] text-slate-400 font-mono">
                    Comparison: {item.date_a || 'Epoch A'} → {item.date_b || 'Epoch B'}
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => {
                      onSelectParcel(item.parcel_id);
                      onNavigate('parcel-map');
                    }}
                    className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors"
                  >
                    <MapPin className="w-3.5 h-3.5" /> View on Map
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

