import React from 'react';
import { 
  MapPin, 
  Layers, 
  Bell, 
  ShieldCheck, 
  User, 
  LogOut, 
  ChevronDown,
  Search,
  CheckCircle2
} from 'lucide-react';

interface NavbarProps {
  currentProject: string;
  onProjectChange: (proj: string) => void;
  currentUser: any;
  onLogout: () => void;
  onNavigate: (route: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentProject,
  onProjectChange,
  currentUser,
  onLogout,
  onNavigate
}) => {
  return (
    <header className="h-16 bg-white border-b border-slate-200 px-4 md:px-6 flex items-center justify-between sticky top-0 z-30 shadow-sm">
      {/* Brand & Project Selector */}
      <div className="flex items-center space-x-3 md:space-x-6">
        <button 
          onClick={() => onNavigate('dashboard')}
          className="flex items-center space-x-2.5 group text-left"
        >
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-blue-400 flex items-center justify-center text-white shadow-md shadow-blue-500/20 group-hover:scale-105 transition-transform">
            <MapPin className="w-5 h-5 fill-white" />
          </div>
          <div>
            <div className="text-base font-bold text-slate-900 tracking-tight flex items-center gap-1.5">
              <span>UrbanCadastral</span>
              <span className="text-[10px] uppercase font-extrabold tracking-widest px-1.5 py-0.5 rounded bg-blue-50 text-blue-600 border border-blue-200">AI</span>
            </div>
            <p className="text-[10px] text-slate-500 font-medium hidden sm:block">AI-Powered Land Intelligence</p>
          </div>
        </button>

        {/* Project Selector Badge */}
        <div className="hidden lg:flex items-center bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-700">
          <Layers className="w-3.5 h-3.5 text-blue-600 mr-2" />
          <span className="font-medium mr-1">Project:</span>
          <select 
            value={currentProject}
            onChange={(e) => onProjectChange(e.target.value)}
            className="bg-transparent font-semibold text-slate-900 border-none outline-none cursor-pointer pr-1"
          >
            <option value="Tech District Phase II">Tech District Phase II Drone Cadastre (5cm)</option>
            <option value="Metropolitan Outer Ring">Metropolitan Outer Ring Cadastral Resurvey (4.5cm)</option>
          </select>
          <span className="ml-2 px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 text-[10px] font-semibold border border-emerald-200 flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" /> Live
          </span>
        </div>
      </div>

      {/* Center Search Bar (Responsive) */}
      <div className="hidden md:flex flex-1 max-w-md mx-6">
        <div className="relative w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input 
            type="text"
            placeholder="Search parcels, owners, or AI insights..."
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                onNavigate('parcel-map');
              }
            }}
            className="w-full pl-9 pr-4 py-1.5 text-xs rounded-full border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all placeholder:text-slate-400"
          />
        </div>
      </div>

      {/* Right Controls */}
      <div className="flex items-center space-x-2 md:space-x-4">
        {/* CRS Badge */}
        <div className="hidden xl:flex items-center space-x-1.5 bg-slate-100 px-2.5 py-1 rounded text-[11px] text-slate-600 font-mono">
          <ShieldCheck className="w-3.5 h-3.5 text-slate-500" />
          <span>EPSG:4326</span>
        </div>

        {/* Notification Bell */}
        <button 
          onClick={() => onNavigate('conflicts')}
          title="Boundary Conflicts"
          className="relative p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
        >
          <Bell className="w-4 h-4" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-rose-500 ring-2 ring-white"></span>
        </button>

        {/* User Pill */}
        <div className="flex items-center pl-2 border-l border-slate-200 space-x-2.5">
          <div className="w-8 h-8 rounded-full bg-blue-100 border border-blue-200 text-blue-700 flex items-center justify-center font-bold text-xs">
            RR
          </div>
          <div className="hidden sm:block text-left">
            <div className="text-xs font-semibold text-slate-900 leading-tight">
              {currentUser?.name || 'R. Ramanathan'}
            </div>
            <div className="text-[10px] text-slate-500">
              Chief Cadastral Surveyor
            </div>
          </div>
          <button 
            onClick={onLogout}
            title="Sign Out"
            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
