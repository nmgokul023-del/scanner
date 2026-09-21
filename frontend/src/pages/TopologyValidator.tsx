import React, { useState } from 'react';
import { 
  CheckCircle, 
  AlertOctagon, 
  AlertTriangle, 
  Play, 
  MapPin, 
  RotateCcw, 
  ShieldCheck,
  ArrowRight
} from 'lucide-react';
import { TopologyIssue } from '../types';
import { apiClient } from '../api/client';

interface TopologyValidatorProps {
  issues: TopologyIssue[];
  onSelectParcel: (parcelId: string) => void;
  onNavigate: (route: string) => void;
}

export const TopologyValidator: React.FC<TopologyValidatorProps> = ({
  issues,
  onSelectParcel,
  onNavigate
}) => {
  const [running, setRunning] = useState(false);
  const [summary, setSummary] = useState({
    errors: 1,
    warnings: 2,
    passed: 12483,
    passRate: 99.8
  });

  const handleRunValidation = async () => {
    setRunning(true);
    try {
      const res = await apiClient.runTopologyValidation();
      setSummary({
        errors: res.summary.errors_count,
        warnings: res.summary.warnings_count,
        passed: res.summary.passed_count,
        passRate: res.pass_rate_pct
      });
    } catch (e) {
      console.error(e);
    } finally {
      setTimeout(() => setRunning(false), 500);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 space-y-6 select-none pb-24 md:pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-blue-600" />
            Cadastral Topology Validation Engine
          </h1>
          <p className="text-xs text-slate-500 font-medium mt-1">
            Automated geometrical consistency rules: overlaps, gaps, self-intersections, slivers, and boundary continuity.
          </p>
        </div>

        <button
          onClick={handleRunValidation}
          disabled={running}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-sm flex items-center gap-1.5 transition-all self-start sm:self-auto"
        >
          <Play className="w-3.5 h-3.5 fill-white" />
          <span>{running ? 'Validating Topologies...' : 'Run Topology Audit'}</span>
        </button>
      </div>

      {/* Summary Score Cards matching Section 16 */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Topology Pass Rate</div>
          <div className="text-2xl font-extrabold text-emerald-600 mt-1">{summary.passRate}%</div>
          <div className="text-[10px] text-slate-500 mt-0.5">Compliant with State Rules</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-rose-200 shadow-sm bg-rose-50/30">
          <div className="text-[10px] font-bold text-rose-600 uppercase tracking-wider flex items-center gap-1">
            <AlertOctagon className="w-3.5 h-3.5" /> Errors
          </div>
          <div className="text-2xl font-extrabold text-rose-700 mt-1">{summary.errors}</div>
          <div className="text-[10px] text-rose-500 mt-0.5">Must be resolved</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-amber-200 shadow-sm bg-amber-50/30">
          <div className="text-[10px] font-bold text-amber-600 uppercase tracking-wider flex items-center gap-1">
            <AlertTriangle className="w-3.5 h-3.5" /> Warnings
          </div>
          <div className="text-2xl font-extrabold text-amber-700 mt-1">{summary.warnings}</div>
          <div className="text-[10px] text-amber-600 mt-0.5">Permissible tolerance</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-emerald-200 shadow-sm bg-emerald-50/30">
          <div className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider flex items-center gap-1">
            <CheckCircle className="w-3.5 h-3.5" /> Passed Rules
          </div>
          <div className="text-2xl font-extrabold text-emerald-700 mt-1">{summary.passed}</div>
          <div className="text-[10px] text-emerald-600 mt-0.5">Clean geometries</div>
        </div>
      </div>

      {/* Rules Validation Table matching Section 16 */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-900">
            Topological Rule Inspection & Zoom-to-Error
          </h2>
          <span className="text-xs text-slate-400">Click any error to zoom directly to the affected parcel</span>
        </div>

        <div className="divide-y divide-slate-100">
          {issues.map((issue) => (
            <div
              key={issue.id}
              onClick={() => {
                if (issue.parcel_ids.length > 0) {
                  onSelectParcel(issue.parcel_ids[0]);
                  onNavigate('parcel-map');
                }
              }}
              className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50 cursor-pointer transition-colors"
            >
              <div className="space-y-1">
                <div className="flex items-center space-x-2">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                    issue.severity === 'Error' ? 'bg-rose-100 text-rose-800' :
                    issue.severity === 'Warning' ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
                  }`}>
                    {issue.severity}
                  </span>
                  <span className="font-bold text-sm text-slate-900">{issue.issue_type}</span>
                </div>
                <p className="text-xs text-slate-600">{issue.description}</p>
                <div className="text-[10px] text-slate-400 font-mono">
                  Affected: {issue.parcel_ids.join(', ') || 'Global district checks'}
                </div>
              </div>

              <div className="flex items-center space-x-2">
                {issue.parcel_ids.length > 0 && (
                  <button className="px-3 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors">
                    <MapPin className="w-3.5 h-3.5" /> Zoom to Affected Parcel
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
