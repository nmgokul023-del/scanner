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
  AlertCircle
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
  const [selectedDate, setSelectedDate] = useState<'January 2026' | 'August 2026'>('August 2026');

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
            Differential photogrammetric analysis comparing survey epochs: January 2026 vs August 2026.
          </p>
        </div>

        {/* Survey Epoch Toggle */}
        <div className="flex items-center bg-white p-1 rounded-xl border border-slate-200 shadow-sm text-xs">
          <button
            onClick={() => setSelectedDate('January 2026')}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
              selectedDate === 'January 2026' ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            January 2026 (Baseline)
          </button>
          <div className="w-[1px] h-4 bg-slate-200 mx-1" />
          <button
            onClick={() => setSelectedDate('August 2026')}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
              selectedDate === 'August 2026' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            August 2026 (Current Drone)
          </button>
        </div>
      </div>

      {/* Temporal Comparison Visual Banner */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center justify-between text-xs font-bold text-slate-800">
          <span>Comparing Drone Surveys</span>
          <span className="text-blue-600 font-mono">7-Month Interval</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-xs text-slate-700 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-slate-500" /> Epoch A: January 2026
              </span>
              <span className="text-[10px] text-slate-400">Fixed-Wing 10cm</span>
            </div>
            <p className="text-[11px] text-slate-500">
              Initial statutory baseline cadastre. 11,200 total structures recorded.
            </p>
          </div>

          <div className="p-4 rounded-xl border border-blue-200 bg-blue-50/60 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-xs text-blue-900 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-blue-600" /> Epoch B: August 2026
              </span>
              <span className="text-[10px] text-blue-700 font-bold">Multirotor 5cm RTK</span>
            </div>
            <p className="text-[11px] text-blue-800">
              High-resolution resurvey. AI detected 742 newly erected structures and road modifications.
            </p>
          </div>
        </div>
      </div>

      {/* Change Items List matching Section 15 */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100">
          <h2 className="text-sm font-bold text-slate-900">
            Detected Morphological & Cadastral Changes ({changes.length})
          </h2>
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
                  Comparison: {item.date_a} → {item.date_b}
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
    </div>
  );
};
