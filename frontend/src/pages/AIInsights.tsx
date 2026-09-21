import React, { useState } from 'react';
import { 
  MapPin, 
  Percent, 
  Building2, 
  Leaf, 
  FileDown, 
  TrendingUp, 
  ArrowUpRight,
  Sparkles,
  ChevronRight
} from 'lucide-react';
import { apiClient } from '../api/client';

interface AIInsightsProps {
  onNavigate: (route: string) => void;
  onSelectParcel: (parcelId: string) => void;
}

export const AIInsights: React.FC<AIInsightsProps> = ({ onNavigate, onSelectParcel }) => {
  const [activeTab, setActiveTab] = useState<'City Wide' | 'Commercial' | 'Residential' | 'Industrial'>('City Wide');
  const [downloading, setDownloading] = useState(false);

  const handleExportReport = async () => {
    setDownloading(true);
    try {
      await apiClient.generateReport('AI Insights Market Report', 'csv');
    } catch (e) {
      console.error(e);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 md:py-8 space-y-6 select-none pb-24 md:pb-12">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <MapPin className="w-5 h-5 text-blue-600 fill-blue-600" />
          <h1 className="text-xl md:text-2xl font-bold text-slate-900 tracking-tight">AI Insights</h1>
        </div>
        <button 
          onClick={() => onNavigate('dashboard')}
          className="p-2 text-blue-600 hover:bg-blue-50 rounded-xl transition-colors"
        >
          <Percent className="w-5 h-5" />
        </button>
      </div>

      {/* Filter Pills */}
      <div className="flex items-center space-x-2 overflow-x-auto pb-1 scrollbar-none">
        {(['City Wide', 'Commercial', 'Residential', 'Industrial'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-5 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
              activeTab === tab
                ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/25'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Card 1: Market Value Heatmap */}
      <div className="bg-white rounded-2xl p-5 md:p-6 border border-slate-200/90 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-900 tracking-tight">Market Value Heatmap</h2>
          <span className="text-[10px] font-extrabold tracking-widest text-slate-800 bg-slate-100 px-2 py-0.5 rounded uppercase">
            PREDICTIVE
          </span>
        </div>

        {/* Heatmap Graphic matching the uploaded image */}
        <div className="relative w-full h-44 sm:h-52 rounded-xl overflow-hidden border border-rose-100 group cursor-pointer" onClick={() => onNavigate('parcel-map')}>
          <div 
            className="w-full h-full bg-cover bg-center"
            style={{
              backgroundImage: `url('https://images.unsplash.com/photo-1524661135-423995f22d0b?w=1200&auto=format&fit=crop&q=80')`
            }}
          />
          {/* Cadastral overlay with pink/rose translucent heatmap tint */}
          <div className="absolute inset-0 bg-rose-500/40 mix-blend-multiply transition-opacity group-hover:opacity-90" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
          
          <div className="absolute bottom-3 left-3 text-white flex items-center gap-1.5 text-xs font-semibold bg-slate-900/60 backdrop-blur-sm px-2.5 py-1 rounded-lg">
            <Sparkles className="w-3.5 h-3.5 text-rose-300" />
            <span>Tech District North-East Corridor</span>
          </div>
        </div>

        <p className="text-xs text-slate-500 leading-relaxed font-medium">
          AI predicts a <span className="text-slate-900 font-semibold">14% increase</span> in value for the North-East corridor over the next 18 months due to infrastructure expansion.
        </p>
      </div>

      {/* Card 2: Investment Trends */}
      <div className="bg-white rounded-2xl p-5 md:p-6 border border-slate-200/90 shadow-sm space-y-4">
        <h2 className="text-sm font-bold text-slate-900 tracking-tight">Investment Trends</h2>

        {/* Custom SVG Line Chart matching uploaded UI */}
        <div className="w-full h-44 relative flex flex-col justify-between pt-2">
          {/* SVG canvas */}
          <svg className="w-full h-32 overflow-visible" viewBox="0 0 500 120" preserveAspectRatio="none">
            {/* Grid lines */}
            <line x1="0" y1="20" x2="500" y2="20" stroke="#f1f5f9" strokeWidth="1" />
            <line x1="0" y1="60" x2="500" y2="60" stroke="#f1f5f9" strokeWidth="1" />
            <line x1="0" y1="100" x2="500" y2="100" stroke="#f1f5f9" strokeWidth="1" />

            {/* Gradient fill under historical line */}
            <defs>
              <linearGradient id="marketPriceFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.15" />
                <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.0" />
              </linearGradient>
            </defs>
            <path
              d="M 0 55 Q 120 48 240 40 L 240 120 L 0 120 Z"
              fill="url(#marketPriceFill)"
            />

            {/* Solid Line: Market Price (Jan to Jun: 0 to 240) */}
            <path
              d="M 0 55 Q 60 52 120 48 T 240 40"
              fill="none"
              stroke="#2563eb"
              strokeWidth="2.5"
            />

            {/* Dotted Line: AI Forecast (Jun to Nov: 240 to 500) */}
            <path
              d="M 240 40 Q 360 25 500 20"
              fill="none"
              stroke="#0d9488"
              strokeWidth="2.5"
              strokeDasharray="4 4"
            />

            {/* Junction point at Jun */}
            <circle cx="240" cy="40" r="3.5" fill="#2563eb" stroke="#ffffff" strokeWidth="1.5" />
          </svg>

          {/* Month labels along x-axis */}
          <div className="flex justify-between text-[10px] font-medium text-slate-400 px-1 border-t border-slate-100 pt-2">
            <span>Jan</span>
            <span>Feb</span>
            <span>Mar</span>
            <span>Apr</span>
            <span>May</span>
            <span>Jun</span>
            <span>Jul</span>
            <span>Aug</span>
            <span>Sep</span>
            <span>Oct</span>
            <span>Nov</span>
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center space-x-6 text-xs text-slate-600 font-medium pt-1">
          <div className="flex items-center space-x-2">
            <span className="w-4 h-0.5 bg-blue-600 rounded"></span>
            <span>Market Price</span>
          </div>
          <div className="flex items-center space-x-2">
            <span className="w-4 h-0.5 border-t-2 border-dotted border-teal-600"></span>
            <span>AI Forecast</span>
          </div>
        </div>
      </div>

      {/* Card 3: Top Opportunities */}
      <div className="space-y-3">
        <h2 className="text-sm font-bold text-slate-900 tracking-tight">Top Opportunities</h2>

        <div className="space-y-2.5">
          {/* Tech District Parcel #441 */}
          <div 
            onClick={() => onSelectParcel('Tech District Parcel #441')}
            className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-sm flex items-center justify-between hover:border-blue-300 hover:shadow-md transition-all cursor-pointer group"
          >
            <div className="flex items-center space-x-3.5">
              <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors">
                <Building2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                  Tech District Parcel #441
                </h3>
                <p className="text-[11px] text-slate-500 font-medium mt-0.5 line-clamp-1">
                  Zoning mismatch found. High ROI potential for mixed-use conversion.
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-100">
                High
              </span>
              <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-blue-600 transition-colors" />
            </div>
          </div>

          {/* Eco-Zone Sub-Dividing */}
          <div 
            onClick={() => onSelectParcel('Eco-Zone Sub-Dividing')}
            className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-sm flex items-center justify-between hover:border-blue-300 hover:shadow-md transition-all cursor-pointer group"
          >
            <div className="flex items-center space-x-3.5">
              <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors">
                <Leaf className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                  Eco-Zone Sub-Dividing
                </h3>
                <p className="text-[11px] text-slate-500 font-medium mt-0.5 line-clamp-1">
                  Optimized for green-energy tax incentives starting Q3 2025.
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <span className="text-xs font-bold text-slate-800 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200">
                Med
              </span>
              <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-blue-600 transition-colors" />
            </div>
          </div>
        </div>
      </div>

      {/* Export Full AI Market Report Button */}
      <button
        onClick={handleExportReport}
        disabled={downloading}
        className="w-full py-4 px-4 bg-blue-600 hover:bg-blue-700 active:scale-[0.99] text-white font-semibold rounded-2xl shadow-md shadow-blue-500/25 transition-all flex items-center justify-center space-x-2 text-sm"
      >
        <FileDown className="w-4 h-4" />
        <span>{downloading ? 'Compiling Report...' : 'Export Full AI Market Report'}</span>
      </button>
    </div>
  );
};
