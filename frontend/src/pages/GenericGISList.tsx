import React, { useState } from 'react';
import { 
  Building2, 
  GitFork, 
  PieChart, 
  Camera, 
  FolderKanban, 
  Settings as SettingsIcon,
  MapPin,
  ExternalLink,
  CheckCircle2,
  Layers
} from 'lucide-react';
import { Building, Road, Project, Parcel } from '../types';

interface GenericGISListProps {
  type: 'buildings' | 'roads' | 'land-use' | 'projects' | 'drone-imagery' | 'settings';
  buildings?: Building[];
  roads?: Road[];
  projects?: Project[];
  parcels?: Parcel[];
  onSelectParcel?: (parcel: Parcel) => void;
  onNavigate: (route: string) => void;
}

export const GenericGISList: React.FC<GenericGISListProps> = ({
  type,
  buildings = [],
  roads = [],
  projects = [],
  parcels = [],
  onSelectParcel,
  onNavigate
}) => {
  const [settingsSaved, setSettingsSaved] = useState(false);
  if (type === 'buildings') {
    return (
      <div className="max-w-5xl mx-auto px-4 py-8 space-y-6 select-none pb-24 md:pb-12">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
              <Building2 className="w-6 h-6 text-indigo-600" />
              Extracted Building Footprints (18,742)
            </h1>
            <p className="text-xs text-slate-500 font-medium mt-1">
              Photogrammetrically segmented rooflines, 3D heights, and built-up land cover.
            </p>
          </div>
          <button
            onClick={() => onNavigate('parcel-map')}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-sm flex items-center gap-1.5"
          >
            <MapPin className="w-4 h-4" /> View on GIS Map
          </button>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-100 text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
                <th className="py-3 px-4">Building ID</th>
                <th className="py-3 px-4">Associated Parcel</th>
                <th className="py-3 px-4">Footprint Area</th>
                <th className="py-3 px-4">Estimated Height</th>
                <th className="py-3 px-4">AI Confidence</th>
                <th className="py-3 px-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {buildings.map((b) => (
                <tr key={b.id} className="hover:bg-slate-50">
                  <td className="py-3 px-4 font-bold text-slate-900 font-mono">{b.id}</td>
                  <td className="py-3 px-4 font-semibold text-blue-600">{b.parcel_id}</td>
                  <td className="py-3 px-4 font-bold text-slate-800">{b.footprint_area_sqm} m²</td>
                  <td className="py-3 px-4 text-slate-600">{b.height_meters} meters</td>
                  <td className="py-3 px-4">
                    <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold text-[10px]">
                      {Math.round(b.confidence_score * 100)}%
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 text-[10px] font-semibold">
                      {b.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  if (type === 'roads') {
    return (
      <div className="max-w-5xl mx-auto px-4 py-8 space-y-6 select-none pb-24 md:pb-12">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
              <GitFork className="w-6 h-6 text-slate-700" />
              Roads & Municipal Rights-of-Way (1,284 Segments)
            </h1>
            <p className="text-xs text-slate-500 font-medium mt-1">
              Extracted road centerlines, curb reservations, and arterial corridors.
            </p>
          </div>
          <button
            onClick={() => onNavigate('parcel-map')}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-sm flex items-center gap-1.5"
          >
            <MapPin className="w-4 h-4" /> View Road Overlay
          </button>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-100 text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
                <th className="py-3 px-4">Road Name</th>
                <th className="py-3 px-4">Classification</th>
                <th className="py-3 px-4">Carriageway Width</th>
                <th className="py-3 px-4">Extraction Confidence</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {roads.map((r) => (
                <tr key={r.id} className="hover:bg-slate-50">
                  <td className="py-3 px-4 font-bold text-slate-900">{r.name}</td>
                  <td className="py-3 px-4 font-semibold text-slate-700">{r.road_type}</td>
                  <td className="py-3 px-4 font-mono font-bold text-blue-600">{r.width_meters} m</td>
                  <td className="py-3 px-4">
                    <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold text-[10px]">
                      {Math.round(r.confidence_score * 100)}%
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <button 
                      onClick={() => onNavigate('parcel-map')}
                      className="text-blue-600 font-bold hover:underline"
                    >
                      Locate →
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  if (type === 'land-use') {
    return (
      <div className="max-w-5xl mx-auto px-4 py-8 space-y-6 select-none pb-24 md:pb-12">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <PieChart className="w-6 h-6 text-emerald-600" />
            AI Land-Use & Zoning Classification
          </h1>
          <p className="text-xs text-slate-500 font-medium mt-1">
            Automated semantic land cover segmentation across commercial, residential, and eco conservation zones.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-blue-200 shadow-sm space-y-2">
            <span className="text-[10px] font-bold text-blue-700 uppercase">Commercial & Mixed Use</span>
            <div className="text-2xl font-extrabold text-blue-900">48.2%</div>
            <p className="text-[11px] text-slate-500">Innovation Way tech hubs, data centers, and multi-tenant offices.</p>
          </div>
          <div className="bg-white p-5 rounded-2xl border border-emerald-200 shadow-sm space-y-2">
            <span className="text-[10px] font-bold text-emerald-700 uppercase">Green Space & Eco Zones</span>
            <div className="text-2xl font-extrabold text-emerald-900">22.4%</div>
            <p className="text-[11px] text-slate-500">Preserved vegetation belts, solar canopies, and parks.</p>
          </div>
          <div className="bg-white p-5 rounded-2xl border border-amber-200 shadow-sm space-y-2">
            <span className="text-[10px] font-bold text-amber-700 uppercase">Transport Infrastructure</span>
            <div className="text-2xl font-extrabold text-amber-900">18.0%</div>
            <p className="text-[11px] text-slate-500">Arterial roadways, pedestrian gallerias, and parking facilities.</p>
          </div>
        </div>
      </div>
    );
  }

  if (type === 'drone-imagery') {
    return (
      <div className="max-w-5xl mx-auto px-4 py-8 space-y-6 select-none pb-24 md:pb-12">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
              <Camera className="w-6 h-6 text-blue-600" />
              Drone Survey Imagery Catalog (ORI / DSM / DTM)
            </h1>
            <p className="text-xs text-slate-500 font-medium mt-1">
              High-resolution 5cm Ground Sampling Distance orthomosaics with photogrammetric surface models.
            </p>
          </div>
          <button 
            onClick={() => onNavigate('ai-extraction')}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-sm"
          >
            Launch AI Extraction
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-3">
            <div className="h-44 rounded-xl overflow-hidden bg-slate-900 relative">
              <img 
                src="https://images.unsplash.com/photo-1524661135-423995f22d0b?w=800" 
                alt="Orthomosaic preview" 
                className="w-full h-full object-cover"
              />
              <span className="absolute top-3 left-3 bg-blue-600 text-white text-[10px] font-bold px-2 py-0.5 rounded">
                ORI 5cm GSD
              </span>
            </div>
            <div className="font-bold text-sm text-slate-900">ORI_TechDistrict_2026.tif</div>
            <p className="text-xs text-slate-500">Flown 2026-08-15 • DJI Matrice 350 RTK with Zenmuse P1 camera • 42 MB</p>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-3">
            <div className="h-44 rounded-xl overflow-hidden bg-slate-900 relative">
              <img 
                src="https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=800" 
                alt="DSM Elevation surface" 
                className="w-full h-full object-cover"
              />
              <span className="absolute top-3 left-3 bg-indigo-600 text-white text-[10px] font-bold px-2 py-0.5 rounded">
                DSM 3D Surface
              </span>
            </div>
            <div className="font-bold text-sm text-slate-900">DSM_TechDistrict_5cm.tif</div>
            <p className="text-xs text-slate-500">Digital Surface Model elevation grid for automated 3D building height calculation • 38 MB</p>
          </div>
        </div>
      </div>
    );
  }

  if (type === 'projects') {
    return (
      <div className="max-w-5xl mx-auto px-4 py-8 space-y-6 select-none pb-24 md:pb-12">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
              <FolderKanban className="w-6 h-6 text-blue-600" />
              Cadastral Survey Projects
            </h1>
            <p className="text-xs text-slate-500 font-medium mt-1">
              Active municipal drone resurvey projects and statutory cadastral boundaries.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {projects.map(proj => (
            <div key={proj.id} className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-slate-900 text-sm">{proj.name}</h3>
                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  Active
                </span>
              </div>
              <p className="text-xs text-slate-500">{proj.district}, {proj.state}</p>
              <div className="grid grid-cols-3 gap-2 text-xs bg-slate-50 p-3 rounded-xl">
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase">Parcels</span>
                  <div className="font-bold text-slate-800">{proj.total_parcels}</div>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase">AI Extracted</span>
                  <div className="font-bold text-blue-600">{proj.ai_extracted}</div>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase">Conflicts</span>
                  <div className="font-bold text-rose-600">{proj.boundary_conflicts}</div>
                </div>
              </div>
              <button
                onClick={() => onNavigate('dashboard')}
                className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl font-semibold text-xs transition-colors"
              >
                Switch to this Project Workspace
              </button>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Settings
  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-6 select-none pb-24 md:pb-12">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
          <SettingsIcon className="w-6 h-6 text-slate-700" />
          System & Geodetic Settings
        </h1>
        <p className="text-xs text-slate-500 font-medium mt-1">
          Configure Coordinate Reference Systems (CRS), drone photogrammetry tolerances, and AI models.
        </p>
      </div>

      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4 text-xs">
        <div>
          <label className="block font-bold text-slate-700 uppercase tracking-wider text-[10px] mb-1">
            Default Map Projection (CRS)
          </label>
          <select className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 font-mono">
            <option value="EPSG:4326">EPSG:4326 - WGS 84 (Geographic Lat/Lng)</option>
            <option value="EPSG:32643">EPSG:32643 - WGS 84 / UTM Zone 43N (Metric)</option>
            <option value="EPSG:32644">EPSG:32644 - WGS 84 / UTM Zone 44N (Metric)</option>
          </select>
        </div>

        <div>
          <label className="block font-bold text-slate-700 uppercase tracking-wider text-[10px] mb-1">
            CORS Real-Time Network IP
          </label>
          <input
            type="text"
            defaultValue="192.168.10.45:2101 (NTRIP Caster)"
            className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 font-mono"
          />
        </div>

        <div>
          <label className="block font-bold text-slate-700 uppercase tracking-wider text-[10px] mb-1">
            Discrepancy Alarm Tolerance Threshold
          </label>
          <div className="flex items-center space-x-2">
            <input
              type="number"
              defaultValue={10}
              className="w-24 p-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 font-bold"
            />
            <span className="text-slate-600 font-medium">m² difference triggers survey verification</span>
          </div>
        </div>

        {settingsSaved && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold rounded-xl flex items-center gap-2 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>Geodetic datum, ellipsoid parameters, and discrepancy alarm tolerances saved successfully.</span>
          </div>
        )}

        <div className="pt-2">
          <button
            onClick={() => {
              setSettingsSaved(true);
              setTimeout(() => setSettingsSaved(false), 4000);
            }}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-sm transition-colors"
          >
            Save Geodetic Settings
          </button>
        </div>
      </div>
    </div>
  );
};
