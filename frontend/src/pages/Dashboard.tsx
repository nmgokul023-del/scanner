import React, { useState, useEffect } from 'react';
import { 
  Layers, 
  Cpu, 
  AlertTriangle, 
  CheckCircle2, 
  Award, 
  MapPin, 
  ArrowUpRight, 
  TrendingUp, 
  PieChart as PieChartIcon, 
  ShieldCheck,
  ChevronRight,
  Sparkles,
  Camera
} from 'lucide-react';
import { Parcel, Conflict } from '../types';
import { apiClient } from '../api/client';

interface DashboardProps {
  parcels: Parcel[];
  conflicts: Conflict[];
  onNavigate: (route: string) => void;
  onSelectParcel: (parcel: Parcel) => void;
  stats?: {
    total_parcels?: number | string;
    ai_extracted?: number | string;
    requires_review?: number | string;
    boundary_conflicts?: number | string;
    high_confidence?: number | string;
    gt_verified?: number | string;
  };
}

export const Dashboard: React.FC<DashboardProps> = ({
  parcels,
  conflicts,
  onNavigate,
  onSelectParcel,
  stats: initialStats
}) => {
  const [liveStats, setLiveStats] = useState<any>(initialStats);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const data = await apiClient.getDashboardStatistics();
        if (data) {
          setLiveStats({
            total_parcels: (data.total_parcels !== undefined ? data.total_parcels : parcels.length).toLocaleString(),
            ai_extracted: (data.ai_extracted !== undefined ? data.ai_extracted : parcels.length).toLocaleString(),
            requires_review: (data.requires_review !== undefined ? data.requires_review : 0).toLocaleString(),
            boundary_conflicts: (data.boundary_conflicts !== undefined ? data.boundary_conflicts : conflicts.length).toLocaleString(),
            high_confidence: (data.high_confidence !== undefined ? data.high_confidence : 0).toLocaleString(),
            gt_verified: (data.gt_verified !== undefined ? data.gt_verified : 0).toLocaleString()
          });
        }
      } catch (e) {
        console.error('Error fetching dashboard statistics:', e);
      }
    };
    fetchStats();
  }, [initialStats, parcels, conflicts]);

  const stats = liveStats || initialStats;

  const metrics = [
    {
      id: 'total-parcels',
      label: 'Total Parcels',
      value: stats?.total_parcels !== undefined ? String(stats.total_parcels) : String(parcels.length),
      sub: 'Registry Baseline',
      icon: Layers,
      color: 'text-slate-900',
      bg: 'bg-slate-100',
      route: 'parcel-map'
    },
    {
      id: 'ai-extracted',
      label: 'AI Extracted',
      value: stats?.ai_extracted !== undefined ? String(stats.ai_extracted) : String(parcels.length),
      sub: 'AI Cadastral Linework',
      icon: Cpu,
      color: 'text-blue-600',
      bg: 'bg-blue-50',
      route: 'ai-extraction'
    },
    {
      id: 'requires-review',
      label: 'Requires Review',
      value: stats?.requires_review !== undefined ? String(stats.requires_review) : '0',
      sub: 'Discrepancy Review Queue',
      icon: AlertTriangle,
      color: 'text-amber-600',
      bg: 'bg-amber-50',
      route: 'confidence'
    },
    {
      id: 'boundary-conflicts',
      label: 'Boundary Conflicts',
      value: stats?.boundary_conflicts !== undefined ? String(stats.boundary_conflicts) : String(conflicts.length),
      sub: 'Discrepancy Flagged',
      icon: AlertTriangle,
      color: 'text-rose-600',
      bg: 'bg-rose-50',
      route: 'conflicts'
    },
    {
      id: 'high-confidence',
      label: 'High Confidence',
      value: stats?.high_confidence !== undefined ? String(stats.high_confidence) : '0',
      sub: 'AI Conf. ≥ 0.85',
      icon: Award,
      color: 'text-emerald-600',
      bg: 'bg-emerald-50',
      route: 'confidence'
    },
    {
      id: 'gt-verified',
      label: 'GT Verified',
      value: stats?.gt_verified !== undefined ? String(stats.gt_verified) : '0',
      sub: 'CORS / Field Surveyed',
      icon: CheckCircle2,
      color: 'text-teal-600',
      bg: 'bg-teal-50',
      route: 'ground-truth'
    }
  ];

  // Dynamic calculations from actual parcels and conflicts
  const totalParcelsCount = parcels.length;
  const verifiedCount = parcels.filter(p => p.status === 'Verified' || p.status === 'Human-verified').length;
  const highConfCount = parcels.filter(p => (p.confidence_score || 0) >= 0.85 || p.status === 'High Confidence').length;
  const reviewCount = parcels.filter(p => p.status === 'Requires Verification' || ((p.confidence_score || 0) >= 0.7 && (p.confidence_score || 0) < 0.85)).length;
  const conflictsCount = conflicts.length;

  const verifiedPct = totalParcelsCount > 0 ? Math.round((verifiedCount / totalParcelsCount) * 100) : 0;
  const highConfPct = totalParcelsCount > 0 ? Math.round((highConfCount / totalParcelsCount) * 100) : 0;
  const reviewPct = totalParcelsCount > 0 ? Math.round((reviewCount / totalParcelsCount) * 100) : 0;
  const conflictsPct = totalParcelsCount > 0 ? Math.min(100, Math.round((conflictsCount / totalParcelsCount) * 100)) : 0;

  // AI Confidence buckets
  const confHigh = parcels.filter(p => (p.confidence_score || 0) >= 0.85).length;
  const confMed = parcels.filter(p => (p.confidence_score || 0) >= 0.70 && (p.confidence_score || 0) < 0.85).length;
  const confLow = parcels.filter(p => (p.confidence_score || 0) < 0.70).length;

  // Land-use averages from loaded parcels
  const parcelsWithComp = parcels.filter(p => p.land_composition);
  const avgBuildable = parcelsWithComp.length > 0 ? Math.round(parcelsWithComp.reduce((acc, p) => acc + (p.land_composition.buildable_area_pct || 0), 0) / parcelsWithComp.length) : 0;
  const avgGreen = parcelsWithComp.length > 0 ? Math.round(parcelsWithComp.reduce((acc, p) => acc + (p.land_composition.green_space_pct || 0), 0) / parcelsWithComp.length) : 0;
  const avgRoads = parcelsWithComp.length > 0 ? Math.round(parcelsWithComp.reduce((acc, p) => acc + (p.land_composition.paved_roads_pct || 0), 0) / parcelsWithComp.length) : 0;
  const avgWater = parcelsWithComp.length > 0 ? Math.round(parcelsWithComp.reduce((acc, p) => acc + (p.land_composition.water_retention_pct || 0), 0) / parcelsWithComp.length) : 0;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6 select-none pb-24 md:pb-12">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-blue-700 via-blue-600 to-indigo-700 rounded-3xl p-6 sm:p-8 text-white shadow-xl shadow-blue-500/10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="space-y-2 max-w-2xl">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 backdrop-blur-md text-xs font-semibold text-blue-100">
            <Sparkles className="w-3.5 h-3.5 text-blue-200" />
            <span>AI Cadastral Pipeline Active • Neural Inference</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            UrbanCadastral AI Operations
          </h1>
          <p className="text-sm text-blue-100/90 leading-relaxed">
            Automated urban parcel mapping, building footprint extraction, and cadastral discrepancy detection for municipal revenue regularisation.
          </p>
        </div>

        <div className="flex flex-wrap gap-2.5">
          <button
            onClick={() => onNavigate('insights')}
            className="px-4 py-2.5 bg-white text-blue-700 hover:bg-blue-50 font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-1.5"
          >
            <Sparkles className="w-4 h-4" /> View AI Insights
          </button>
          <button
            onClick={() => onNavigate('parcel-map')}
            className="px-4 py-2.5 bg-blue-800/60 hover:bg-blue-800 text-white font-bold text-xs rounded-xl border border-white/20 transition-all flex items-center gap-1.5"
          >
            <MapPin className="w-4 h-4" /> Open GIS Map
          </button>
        </div>
      </div>

      {/* 6 Key Cadastral Metrics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
        {metrics.map((m) => {
          const Icon = m.icon;
          return (
            <div
              key={m.id}
              onClick={() => onNavigate(m.route)}
              className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-sm hover:shadow-md hover:border-blue-300 transition-all cursor-pointer group"
            >
              <div className="flex items-center justify-between mb-3">
                <div className={`w-9 h-9 rounded-xl ${m.bg} ${m.color} flex items-center justify-center group-hover:scale-110 transition-transform`}>
                  <Icon className="w-4 h-4" />
                </div>
                <ArrowUpRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-blue-600 transition-colors" />
              </div>
              <div className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
                {m.value}
              </div>
              <div className="text-xs font-semibold text-slate-700 mt-0.5 truncate">
                {m.label}
              </div>
              <div className="text-[10px] text-slate-400 font-medium truncate mt-0.5">
                {m.sub}
              </div>
            </div>
          );
        })}
      </div>

      {/* Analytics & Distribution Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Verification Progress (Left 2 cols) */}
        <div className="lg:col-span-2 bg-white rounded-2xl p-5 sm:p-6 border border-slate-200/90 shadow-sm space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-slate-900 tracking-tight">Cadastral Verification Progress</h2>
              <p className="text-xs text-slate-500 font-medium">
                {totalParcelsCount > 0 
                  ? `${verifiedCount.toLocaleString()} of ${totalParcelsCount.toLocaleString()} parcels verified with Ground Truth / Survey`
                  : 'No cadastral records currently loaded'}
              </p>
            </div>
            <button 
              onClick={() => onNavigate('verification')}
              className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1"
            >
              Review Tasks <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Progress bar */}
          <div className="space-y-2">
            <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden flex">
              <div className="h-full bg-emerald-500" style={{ width: `${verifiedPct}%` }} title={`GT Verified: ${verifiedPct}%`} />
              <div className="h-full bg-blue-500" style={{ width: `${highConfPct}%` }} title={`High Confidence AI: ${highConfPct}%`} />
              <div className="h-full bg-amber-400" style={{ width: `${reviewPct}%` }} title={`Requires Review: ${reviewPct}%`} />
              <div className="h-full bg-rose-500" style={{ width: `${conflictsPct}%` }} title={`Conflicts: ${conflictsPct}%`} />
            </div>
            <div className="flex flex-wrap items-center justify-between text-[11px] text-slate-500 font-medium pt-1">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500"></span> Verified ({verifiedPct}%)
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-blue-500"></span> AI High Conf ({highConfPct}%)
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-amber-400"></span> In Review ({reviewPct}%)
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-rose-500"></span> Conflicts ({conflictsPct}%)
              </span>
            </div>
          </div>

          {/* AI Confidence Distribution */}
          <div className="pt-3 border-t border-slate-100 space-y-3">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">AI Confidence Distribution</h3>
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                <div className="text-[10px] font-bold text-emerald-600 uppercase">High (≥ 85%)</div>
                <div className="text-lg font-bold text-slate-900 mt-0.5">{confHigh.toLocaleString()}</div>
                <div className="text-[10px] text-slate-400">Auto-validatable</div>
              </div>
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                <div className="text-[10px] font-bold text-amber-600 uppercase">Medium (70-85%)</div>
                <div className="text-lg font-bold text-slate-900 mt-0.5">{confMed.toLocaleString()}</div>
                <div className="text-[10px] text-slate-400">Analyst review</div>
              </div>
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                <div className="text-[10px] font-bold text-rose-600 uppercase">Low (&lt; 70%)</div>
                <div className="text-lg font-bold text-slate-900 mt-0.5">{confLow.toLocaleString()}</div>
                <div className="text-[10px] text-slate-400">Field GNSS required</div>
              </div>
            </div>
          </div>
        </div>

        {/* Land-use Distribution (Right col) */}
        <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200/90 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-900 tracking-tight">Land-Use Distribution</h2>
            <PieChartIcon className="w-4 h-4 text-slate-400" />
          </div>

          {parcelsWithComp.length > 0 ? (
            <div className="space-y-3 text-xs">
              <div>
                <div className="flex justify-between font-semibold text-slate-700 mb-1">
                  <span>Buildable Area (Residential/Commercial)</span>
                  <span>{avgBuildable}%</span>
                </div>
                <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-600 rounded-full" style={{ width: `${avgBuildable}%` }} />
                </div>
              </div>

              <div>
                <div className="flex justify-between font-semibold text-slate-700 mb-1">
                  <span>Green Space & Urban Tree Canopy</span>
                  <span>{avgGreen}%</span>
                </div>
                <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${avgGreen}%` }} />
                </div>
              </div>

              <div>
                <div className="flex justify-between font-semibold text-slate-700 mb-1">
                  <span>Paved Roads & Infrastructure</span>
                  <span>{avgRoads}%</span>
                </div>
                <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-amber-500 rounded-full" style={{ width: `${avgRoads}%` }} />
                </div>
              </div>

              <div>
                <div className="flex justify-between font-semibold text-slate-700 mb-1">
                  <span>Water Retention & Wetlands</span>
                  <span>{avgWater}%</span>
                </div>
                <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-rose-500 rounded-full" style={{ width: `${avgWater}%` }} />
                </div>
              </div>
            </div>
          ) : (
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-500 text-center">
              Land-use composition metrics not available for current parcel selection.
            </div>
          )}

          <div className="p-3 bg-blue-50/60 rounded-xl border border-blue-100 text-[11px] text-blue-900">
            <strong>Cadastral Note:</strong> Metrics reflect active database records and neural drone segmentation.
          </div>
        </div>
      </div>

      {/* Featured Parcels Table & Recent Conflicts */}
      <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200/90 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-slate-900 tracking-tight">Active Cadastral Queue</h2>
            <p className="text-xs text-slate-500 font-medium">Click on any parcel to inspect GIS geometry, valuation, or verify boundaries</p>
          </div>
          <button 
            onClick={() => onNavigate('parcel-map')}
            className="px-3 py-1.5 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-lg text-xs font-bold transition-colors"
          >
            View on GIS Map
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-100 text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
                <th className="py-2.5 px-3">Parcel ID</th>
                <th className="py-2.5 px-3">Address</th>
                <th className="py-2.5 px-3">Zone</th>
                <th className="py-2.5 px-3">Existing Area</th>
                <th className="py-2.5 px-3">AI Drone Area</th>
                <th className="py-2.5 px-3">Delta</th>
                <th className="py-2.5 px-3">Confidence</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {parcels.map((p) => (
                <tr 
                  key={p.id}
                  onClick={() => onSelectParcel(p)}
                  className="hover:bg-slate-50/80 cursor-pointer transition-colors"
                >
                  <td className="py-3 px-3 font-bold text-slate-900 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-blue-600"></span>
                    {p.parcel_id}
                  </td>
                  <td className="py-3 px-3 text-slate-600 font-medium max-w-xs truncate">{p.address}</td>
                  <td className="py-3 px-3 font-semibold text-slate-700">{p.zone}</td>
                  <td className="py-3 px-3 text-slate-600">{p.existing_area_sqm} m²</td>
                  <td className="py-3 px-3 font-semibold text-blue-600">{p.ai_area_sqm} m²</td>
                  <td className="py-3 px-3 font-bold">
                    <span className={p.difference_sqm > 0 ? 'text-rose-600' : 'text-slate-700'}>
                      {p.difference_sqm > 0 ? `+${p.difference_sqm}` : p.difference_sqm} m²
                    </span>
                  </td>
                  <td className="py-3 px-3">
                    <span className={`px-2 py-0.5 rounded font-bold text-[10px] ${
                      p.confidence_score >= 0.9 ? 'bg-emerald-100 text-emerald-800' :
                      p.confidence_score >= 0.7 ? 'bg-amber-100 text-amber-800' : 'bg-rose-100 text-rose-800'
                    }`}>
                      {Math.round(p.confidence_score * 100)}%
                    </span>
                  </td>
                  <td className="py-3 px-3">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                      p.status === 'Verified' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                      p.status === 'Conflict Detected' ? 'bg-rose-50 text-rose-700 border border-rose-200' :
                      'bg-blue-50 text-blue-700 border border-blue-200'
                    }`}>
                      {p.status}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-right">
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectParcel(p);
                        onNavigate('property-details');
                      }}
                      className="text-blue-600 font-bold hover:underline"
                    >
                      Inspect →
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
