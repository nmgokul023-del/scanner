import React from 'react';
import {
  LayoutDashboard,
  FolderKanban,
  Camera,
  Cpu,
  Map,
  Building2,
  GitFork,
  PieChart,
  AlertTriangle,
  Award,
  CheckSquare,
  Navigation2,
  Clock,
  CheckCircle,
  FileSpreadsheet,
  FileText,
  History,
  Settings,
  Sparkles,
  Building
} from 'lucide-react';

interface SidebarProps {
  currentRoute: string;
  onNavigate: (route: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentRoute, onNavigate }) => {
  const sections = [
    {
      title: 'OVERVIEW & PIPELINE',
      items: [
        { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { id: 'insights', label: 'AI Insights (Preview)', icon: Sparkles, badge: 'Design' },
        { id: 'projects', label: 'Cadastral Projects', icon: FolderKanban },
        { id: 'drone-imagery', label: 'Drone Imagery (ORI/DSM)', icon: Camera },
        { id: 'ai-extraction', label: 'AI Feature Extraction', icon: Cpu, badge: 'Live AI' },
      ]
    },
    {
      title: 'GIS CADASTRAL FEATURES',
      items: [
        { id: 'parcel-map', label: 'Cadastral Map & Parcels', icon: Map },
        { id: 'property-details', label: 'Property Details (3D)', icon: Building, badge: 'Design' },
        { id: 'buildings', label: 'Building Footprints', icon: Building2 },
        { id: 'roads', label: 'Roads & Rights-of-Way', icon: GitFork },
        { id: 'land-use', label: 'Land Use Classification', icon: PieChart },
      ]
    },
    {
      title: 'ANALYSIS & VERIFICATION',
      items: [
        { id: 'conflicts', label: 'Boundary Conflicts', icon: AlertTriangle, count: 126, countColor: 'bg-rose-500 text-white' },
        { id: 'confidence', label: 'Confidence Queue', icon: Award, count: 428, countColor: 'bg-amber-100 text-amber-800' },
        { id: 'verification', label: 'Human Verification', icon: CheckSquare },
        { id: 'ground-truth', label: 'Ground Truth & CORS', icon: Navigation2 },
        { id: 'change-detection', label: 'Change Detection (2026)', icon: Clock },
      ]
    },
    {
      title: 'GIS ENGINE & COMPLIANCE',
      items: [
        { id: 'topology', label: 'Topology Validation', icon: CheckCircle, badge: '99.8%' },
        { id: 'gis-editor', label: 'Vector GIS Editor', icon: FileSpreadsheet },
        { id: 'reports', label: 'Reports & GIS Export', icon: FileText },
        { id: 'audit', label: 'Audit Trail', icon: History },
        { id: 'settings', label: 'Settings & CRS', icon: Settings },
      ]
    }
  ];

  return (
    <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col h-[calc(100vh-4rem)] sticky top-16 border-r border-slate-800 select-none overflow-y-auto hidden md:flex">
      <div className="py-4 space-y-6 flex-1 px-3">
        {sections.map((section, idx) => (
          <div key={idx} className="space-y-1">
            <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-3 mb-1.5">
              {section.title}
            </h3>
            <div className="space-y-0.5">
              {section.items.map((item) => {
                const Icon = item.icon;
                const isActive = currentRoute === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => onNavigate(item.id)}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-all group ${
                      isActive
                        ? 'bg-blue-600 text-white shadow-sm shadow-blue-600/30'
                        : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/60'
                    }`}
                  >
                    <div className="flex items-center space-x-2.5">
                      <Icon className={`w-4 h-4 transition-colors ${
                        isActive ? 'text-white' : 'text-slate-400 group-hover:text-blue-400'
                      }`} />
                      <span className="truncate">{item.label}</span>
                    </div>

                    <div className="flex items-center space-x-1.5">
                      {item.badge && (
                        <span className={`text-[9px] px-1.5 py-0.2 rounded font-semibold uppercase tracking-wide ${
                          isActive ? 'bg-blue-700 text-white' : 'bg-slate-800 text-blue-300 border border-slate-700'
                        }`}>
                          {item.badge}
                        </span>
                      )}
                      {item.count !== undefined && (
                        <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${item.countColor}`}>
                          {item.count}
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Cadastral State Footer */}
      <div className="p-3 bg-slate-950/60 border-t border-slate-800/80 text-[11px] text-slate-400">
        <div className="flex items-center justify-between font-mono">
          <span className="text-slate-500">CORS Real-Time:</span>
          <span className="text-emerald-400 font-semibold flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span> Active (2cm)
          </span>
        </div>
      </div>
    </aside>
  );
};
