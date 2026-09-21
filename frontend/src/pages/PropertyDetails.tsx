import React, { useState } from 'react';
import { 
  ArrowLeft, 
  MapPin, 
  Share2, 
  Camera, 
  CheckCircle2, 
  ExternalLink,
  ShieldCheck,
  TrendingUp,
  FileText,
  Clock,
  Sparkles,
  Award
} from 'lucide-react';
import { Parcel } from '../types';

interface PropertyDetailsProps {
  parcel: Parcel;
  onBack: () => void;
  onCompare: (parcel: Parcel) => void;
  onRequestAcquisition: (parcel: Parcel) => void;
}

export const PropertyDetails: React.FC<PropertyDetailsProps> = ({
  parcel,
  onBack,
  onCompare,
  onRequestAcquisition
}) => {
  const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'AI ANALYSIS' | 'HISTORY' | 'DOCUMENTS'>('OVERVIEW');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  return (
    <div className="max-w-4xl mx-auto bg-white min-h-screen pb-24 select-none shadow-sm md:border-x border-slate-200">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-slate-900/95 text-white px-4 py-2.5 rounded-2xl shadow-xl text-xs font-semibold flex items-center gap-2 border border-slate-700 animate-in fade-in">
          <span className="w-2 h-2 rounded-full bg-blue-400"></span>
          <span>{toastMessage}</span>
          <button onClick={() => setToastMessage(null)} className="ml-2 text-slate-400 hover:text-white">✕</button>
        </div>
      )}

      {/* Top Header */}
      <div className="h-14 px-4 flex items-center justify-between border-b border-slate-100 sticky top-0 bg-white/95 backdrop-blur-sm z-20">
        <button 
          onClick={onBack}
          className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>

        <div className="flex items-center space-x-1.5">
          <MapPin className="w-4 h-4 text-blue-600 fill-blue-600" />
          <h1 className="text-sm font-bold text-slate-900">Property Details</h1>
        </div>

        <button 
          onClick={() => {
            navigator.clipboard?.writeText(window.location.href);
            setToastMessage('Parcel link copied to clipboard.');
            setTimeout(() => setToastMessage(null), 4000);
          }}
          className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors"
        >
          <Share2 className="w-4 h-4" />
        </button>
      </div>

      {/* Hero Visual matching the uploaded 3D building render */}
      <div className="relative w-full h-80 sm:h-96 bg-slate-900 overflow-hidden">
        <img
          src="https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=1200&auto=format&fit=crop&q=80"
          alt="3D Building Render & Drone Perspective"
          className="w-full h-full object-cover object-center brightness-95"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20" />

        {/* Current Status Pill (Top Left) */}
        <div className="absolute top-4 left-4 bg-white/95 backdrop-blur-md rounded-xl px-3 py-1.5 shadow-md border border-slate-100">
          <div className="text-[9px] font-extrabold uppercase tracking-wider text-slate-400">
            CURRENT STATUS
          </div>
          <div className="text-xs font-bold text-slate-900 flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            {parcel.current_status_tag || 'Development Ready'}
          </div>
        </div>

        {/* Camera Snapshot Button (Top Right) */}
        <button 
          onClick={() => {
            setToastMessage('High-resolution 5cm drone ortho tile downloaded.');
            setTimeout(() => setToastMessage(null), 4000);
          }}
          className="absolute top-4 right-4 w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-lg shadow-blue-500/30 hover:scale-105 transition-transform"
        >
          <Camera className="w-5 h-5" />
        </button>

        {/* AI Score Circular Pill (Left side) */}
        <div className="absolute top-28 left-4 w-16 h-16 rounded-full bg-white/95 backdrop-blur-md border-2 border-blue-500 shadow-xl flex flex-col items-center justify-center">
          <span className="text-xl font-extrabold text-blue-600 leading-none">
            {parcel.suitability_score || 94}
          </span>
          <span className="text-[8px] font-bold text-slate-400 uppercase tracking-tighter">
            AI SCORE
          </span>
        </div>

        {/* Center Donut Graphic for Land Composition */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <div className="relative w-36 h-36 flex items-center justify-center">
            {/* SVG Donut */}
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
              {/* Buildable (48%) - Blue */}
              <circle
                cx="50"
                cy="50"
                r="40"
                fill="transparent"
                stroke="#3b82f6"
                strokeWidth="14"
                strokeDasharray="120.6 251.2"
                strokeDashoffset="0"
              />
              {/* Green Space (22%) - Green */}
              <circle
                cx="50"
                cy="50"
                r="40"
                fill="transparent"
                stroke="#10b981"
                strokeWidth="14"
                strokeDasharray="55.2 251.2"
                strokeDashoffset="-120.6"
              />
              {/* Paved/Roads (18%) - Amber */}
              <circle
                cx="50"
                cy="50"
                r="40"
                fill="transparent"
                stroke="#f59e0b"
                strokeWidth="14"
                strokeDasharray="45.2 251.2"
                strokeDashoffset="-175.8"
              />
              {/* Water Retention (12%) - Red */}
              <circle
                cx="50"
                cy="50"
                r="40"
                fill="transparent"
                stroke="#ef4444"
                strokeWidth="14"
                strokeDasharray="30.1 251.2"
                strokeDashoffset="-221"
              />
            </svg>

            {/* Inner Center Label */}
            <div className="absolute inset-0 flex flex-col items-center justify-center text-white text-center">
              <span className="text-[10px] font-bold tracking-tight text-white/80">Total Area</span>
              <span className="text-sm font-extrabold text-white">{parcel.total_area_acres || 1.24} AC</span>
            </div>
          </div>
        </div>

        {/* Donut Legend below image */}
        <div className="absolute bottom-3 left-0 right-0 flex items-center justify-center space-x-3 text-[10px] text-white/90 font-medium px-2">
          <div className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-sm bg-blue-500"></span>
            <span>Buildable Area</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-sm bg-emerald-500"></span>
            <span>Green Space</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-sm bg-amber-500"></span>
            <span>Paved/Roads</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-sm bg-rose-500"></span>
            <span>Water Retention</span>
          </div>
        </div>
      </div>

      {/* Tabs matching uploaded UI: OVERVIEW | AI ANALYSIS | HISTORY | DOCUMENTS */}
      <div className="flex border-b border-slate-200 px-4 bg-white sticky top-14 z-10">
        {(['OVERVIEW', 'AI ANALYSIS', 'HISTORY', 'DOCUMENTS'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`py-3 px-3 text-xs font-bold tracking-wider transition-colors border-b-2 ${
              activeTab === tab
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-400 hover:text-slate-700'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="p-4 sm:p-6 space-y-6">
        {activeTab === 'OVERVIEW' && (
          <>
            {/* Header info */}
            <div>
              <div className="text-xs font-extrabold text-blue-600 uppercase tracking-widest mb-1">
                {parcel.title || 'PARCEL #8824-A • ZONE M-2'}
              </div>
              <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">
                {parcel.address || '1242 Innovation Way'}
              </h2>
              <p className="text-xs text-slate-600 font-medium mt-2 leading-relaxed">
                {parcel.description || 'Prime urban development lot located in the heart of the Tech District. High-density potential with approved AI-optimized zoning variances.'}
              </p>
            </div>

            {/* AI Optimization Score Card */}
            <div className="bg-slate-50 rounded-2xl p-4 sm:p-5 border border-slate-200 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700">AI Optimization Score</span>
                <div className="flex items-center space-x-2">
                  <span className="text-[10px] font-extrabold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
                    ROI POTENTIAL {parcel.roi_potential || 'EXCELLENT'}
                  </span>
                  <span className="text-[10px] font-extrabold px-2 py-0.5 rounded bg-blue-100 text-blue-800">
                    RISK LEVEL {parcel.risk_level || 'LOW'}
                  </span>
                </div>
              </div>

              <blockquote className="text-xs italic text-slate-600 border-l-2 border-blue-500 pl-3 py-0.5 font-medium">
                {parcel.quote || '"This parcel is 15% undervalued compared to similar Tech District developments." — AI Insights'}
              </blockquote>
            </div>

            {/* Environmental Impact Grid */}
            <div className="space-y-2.5">
              <h3 className="text-xs font-extrabold text-slate-400 uppercase tracking-wider">
                Environmental Impact
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-center">
                  <div className="text-[10px] font-bold text-slate-400 uppercase">SOIL QUALITY</div>
                  <div className="text-sm font-bold text-slate-900 mt-1">{parcel.environmental.soil_quality}</div>
                </div>
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-center">
                  <div className="text-[10px] font-bold text-slate-400 uppercase">FLOOD RISK</div>
                  <div className="text-sm font-bold text-emerald-600 mt-1">{parcel.environmental.flood_risk}</div>
                </div>
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-center">
                  <div className="text-[10px] font-bold text-slate-400 uppercase">SOLAR POT.</div>
                  <div className="text-sm font-bold text-blue-600 mt-1">{parcel.environmental.solar_potential}/10</div>
                </div>
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-center">
                  <div className="text-[10px] font-bold text-slate-400 uppercase">AIR QUALITY</div>
                  <div className="text-sm font-bold text-slate-900 mt-1">{parcel.environmental.air_quality}</div>
                </div>
              </div>
            </div>
          </>
        )}

        {activeTab === 'AI ANALYSIS' && (
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-slate-900">Cadastral AI Inference Metrics</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50">
                <div className="text-xs text-slate-500 font-medium">Existing Revenue Area</div>
                <div className="text-lg font-bold text-slate-900">{parcel.existing_area_sqm} m²</div>
              </div>
              <div className="p-4 rounded-xl border border-blue-200 bg-blue-50">
                <div className="text-xs text-blue-600 font-medium">AI Drone Extracted Area</div>
                <div className="text-lg font-bold text-blue-900">{parcel.ai_area_sqm} m² ({parcel.difference_sqm > 0 ? '+' : ''}{parcel.difference_sqm} m²)</div>
              </div>
            </div>
            <div className="p-4 rounded-xl border border-slate-200 text-xs text-slate-600 space-y-2">
              <div className="font-semibold text-slate-800">Drone Feature Breakdown:</div>
              <p>• Drone Orthomosaic resolution: 5cm GSD captured on 2026-08-15.</p>
              <p>• Building boundary extraction: ResNet-50 UNet with 96% IoU confidence.</p>
              <p>• Compound wall detection aligns with RTK GNSS benchmark TN-04.</p>
            </div>
          </div>
        )}

        {activeTab === 'HISTORY' && (
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-slate-900">Cadastral Mutation & Survey History</h3>
            <div className="space-y-2">
              {parcel.history_events.map((ev, i) => (
                <div key={i} className="flex items-start space-x-3 p-3 rounded-xl border border-slate-200 bg-slate-50 text-xs">
                  <Clock className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-slate-900">{ev.date}:</span>{' '}
                    <span className="text-slate-600">{ev.event}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'DOCUMENTS' && (
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-slate-900">Cadastral Records & Drone Layers</h3>
            <div className="space-y-2">
              {parcel.documents.map((doc, i) => (
                <div key={i} className="flex items-center justify-between p-3 rounded-xl border border-slate-200 bg-slate-50 text-xs">
                  <div className="flex items-center space-x-2.5">
                    <FileText className="w-4 h-4 text-blue-600" />
                    <div>
                      <div className="font-bold text-slate-900">{doc.name}</div>
                      <div className="text-[10px] text-slate-400">{doc.type} • {doc.size}</div>
                    </div>
                  </div>
                  <button 
                    onClick={() => {
                      setToastMessage(`Downloading ${doc.name} from cadastral record vault...`);
                      setTimeout(() => setToastMessage(null), 4000);
                    }}
                    className="text-xs font-semibold text-blue-600 hover:underline"
                  >
                    Download
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Bottom Sticky Action Bar matching Page 2 */}
      <div className="fixed bottom-0 left-0 right-0 max-w-4xl mx-auto bg-white/95 backdrop-blur-md border-t border-slate-200 p-3 sm:p-4 flex items-center space-x-3 z-30">
        <button
          onClick={() => onCompare(parcel)}
          className="flex-1 py-3 px-4 bg-white border border-slate-200 hover:bg-slate-50 text-slate-800 font-semibold rounded-xl text-sm transition-all"
        >
          Compare
        </button>
        <button
          onClick={() => onRequestAcquisition(parcel)}
          className="flex-[2] py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl text-sm shadow-md shadow-blue-500/25 transition-all"
        >
          Request Acquisition AI
        </button>
      </div>
    </div>
  );
};
