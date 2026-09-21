import React, { useState } from 'react';
import { 
  FileText, 
  Download, 
  FileSpreadsheet, 
  FileCode, 
  CheckCircle2, 
  Layers, 
  AlertTriangle,
  Clock,
  Navigation2
} from 'lucide-react';
import { apiClient } from '../api/client';

export const Reports: React.FC = () => {
  const [downloadingReport, setDownloadingReport] = useState<string | null>(null);

  const reportTypes = [
    {
      title: 'Cadastral Parcel Report',
      description: 'Official schedule of parcels, revenue area, AI extracted area, and boundary discrepancy tolerances.',
      icon: Layers,
      type: 'Cadastral Parcel Report'
    },
    {
      title: 'AI Extraction Report',
      description: 'Inference performance, IoU scores, building footprint heights, and photogrammetric resolution logs.',
      icon: FileText,
      type: 'AI Extraction Report'
    },
    {
      title: 'Conflict & Discrepancy Report',
      description: 'Comprehensive audit of all flagged boundary discrepancies, road buffer encroachments, and affected areas.',
      icon: AlertTriangle,
      type: 'Conflict Report'
    },
    {
      title: 'Ground Truth & CORS Report',
      description: 'Dual-frequency GNSS RTK coordinates, CORS reference benchmarks, and field surveyor sign-offs.',
      icon: Navigation2,
      type: 'Ground Truth Report'
    },
    {
      title: 'Change Detection Report',
      description: 'Temporal differences between January 2026 baseline and August 2026 drone survey.',
      icon: Clock,
      type: 'Change Detection Report'
    },
    {
      title: 'Topology Validation Report',
      description: 'Geometrical consistency audits verifying zero overlaps, closed rings, and polygon boundary integrity.',
      icon: CheckCircle2,
      type: 'Topology Validation Report'
    }
  ];

  const handleDownload = async (reportType: string, format: 'csv' | 'json' | 'geojson') => {
    setDownloadingReport(`${reportType}-${format}`);
    try {
      if (format === 'csv') {
        await apiClient.generateReport(reportType, 'csv');
      } else if (format === 'geojson') {
        await apiClient.generateReport(reportType, 'geojson');
      } else {
        const data = await apiClient.generateReport(reportType, 'json');
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `urbancadastral_${reportType.replace(/\s+/g, '_').toLowerCase()}.json`;
        a.click();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setTimeout(() => setDownloadingReport(null), 600);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-6 select-none pb-24 md:pb-12">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
          <FileText className="w-6 h-6 text-blue-600" />
          Cadastral Reports & Statutory GIS Export
        </h1>
        <p className="text-xs text-slate-500 font-medium mt-1">
          Generate, verify, and export official municipal land administration schedules in CSV, JSON, and GeoJSON standards.
        </p>
      </div>

      {/* Reports Grid matching Section 18 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {reportTypes.map((r, i) => {
          const Icon = r.icon;
          const isDownloading = downloadingReport?.startsWith(r.type);

          return (
            <div key={i} className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-4 flex flex-col justify-between">
              <div className="space-y-2">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                    <Icon className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-sm font-bold text-slate-900">{r.title}</h2>
                    <span className="text-[10px] font-mono text-slate-400">Statutory Cadastral Format</span>
                  </div>
                </div>
                <p className="text-xs text-slate-600 font-medium leading-relaxed">
                  {r.description}
                </p>
              </div>

              <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
                <div className="text-[10px] text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> Ready to export
                </div>

                <div className="flex items-center space-x-1.5">
                  <button
                    onClick={() => handleDownload(r.type, 'csv')}
                    disabled={isDownloading}
                    className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                    <span>CSV</span>
                  </button>

                  <button
                    onClick={() => handleDownload(r.type, 'geojson')}
                    disabled={isDownloading}
                    className="px-2.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors border border-indigo-100"
                  >
                    <FileCode className="w-3.5 h-3.5 text-indigo-600" />
                    <span>GeoJSON</span>
                  </button>

                  <button
                    onClick={() => handleDownload(r.type, 'json')}
                    disabled={isDownloading}
                    className="px-2.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1 shadow-sm transition-colors"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>JSON</span>
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
