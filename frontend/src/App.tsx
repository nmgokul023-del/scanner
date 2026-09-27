import React, { useEffect, useState } from 'react';
import { Parcel, Conflict, GroundTruthTask, ChangeDetectionItem, TopologyIssue, Project, Building, Road, LandUseFeature } from './types';
import { apiClient } from './api/client';
import { Navbar } from './components/layout/Navbar';
import { Sidebar } from './components/layout/Sidebar';
import { MobileNav } from './components/layout/MobileNav';

// Pages
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { AIInsights } from './pages/AIInsights';
import { PropertyDetails } from './pages/PropertyDetails';
import { ParcelMap } from './pages/ParcelMap';
import { AIExtraction } from './pages/AIExtraction';
import { ConflictDetection } from './pages/ConflictDetection';
import { ConfidenceQueue } from './pages/ConfidenceQueue';
import { Verification } from './pages/Verification';
import { GroundTruth } from './pages/GroundTruth';
import { ChangeDetection } from './pages/ChangeDetection';
import { TopologyValidator } from './pages/TopologyValidator';
import { GISEditor } from './pages/GISEditor';
import { Reports } from './pages/Reports';
import { AuditLog } from './pages/AuditLog';
import { GenericGISList } from './pages/GenericGISList';
import { DroneImageryUpload } from './pages/DroneImageryUpload';
import { GISErrorBoundary } from './components/common/GISErrorBoundary';
import { Building as BuildingIcon, CheckSquare } from 'lucide-react';


const getInitialRoute = (): string => {
  if (typeof window === 'undefined') return 'dashboard';
  const path = window.location.pathname.replace(/^\/+/, '').split('/')[0] || '';
  const validRoutes = [
    'dashboard', 'insights', 'projects', 'drone-imagery', 'ai-extraction',
    'parcel-map', 'property-details', 'buildings', 'roads', 'land-use',
    'conflicts', 'confidence', 'verification', 'ground-truth', 'change-detection',
    'topology', 'gis-editor', 'reports', 'audit', 'settings'
  ];
  if (validRoutes.includes(path)) {
    return path;
  }
  return 'dashboard';
};

export function App() {
  const [currentUser, setCurrentUser] = useState<any>(() => {
    try {
      const token = localStorage.getItem('cadastral_auth_token');
      const cached = localStorage.getItem('cadastral_auth_user');
      if (token && cached) {
        return JSON.parse(cached);
      }
    } catch (e) {}
    return null;
  });
  const [currentRoute, setCurrentRoute] = useState<string>(getInitialRoute);
  const [currentProject, setCurrentProject] = useState<string>('Tech District Phase II');
  
  const [parcels, setParcels] = useState<Parcel[]>([]);
  const [conflicts, setConflicts] = useState<Conflict[]>([]);
  const [groundTruthTasks, setGroundTruthTasks] = useState<GroundTruthTask[]>([]);
  const [changes, setChanges] = useState<ChangeDetectionItem[]>([]);
  const [topologyIssues, setTopologyIssues] = useState<TopologyIssue[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [roads, setRoads] = useState<Road[]>([]);
  const [landUse, setLandUse] = useState<LandUseFeature[]>([]);
  
  const [selectedParcel, setSelectedParcel] = useState<Parcel | null>(null);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [acquisitionModalParcel, setAcquisitionModalParcel] = useState<Parcel | null>(null);
  const [acquisitionSubmitted, setAcquisitionSubmitted] = useState(false);

  const [gisMode, setGisMode] = useState<'real' | 'demo'>('real');
  const [activeDataset, setActiveDataset] = useState<any>(null);

  // Dynamic dashboard stats from database
  const [dashboardStats, setDashboardStats] = useState<any>({
    total_parcels: 0,
    ai_extracted: 0,
    requires_review: 0,
    boundary_conflicts: 0,
    high_confidence: 0,
    gt_verified: 0
  });

  const handleDatasetProcessed = (stats: any) => {
    if (stats) {
      setDashboardStats({
        total_parcels: stats.parcels_detected || 0,
        ai_extracted: stats.parcels_detected || 0,
        requires_review: stats.requires_review || 0,
        boundary_conflicts: stats.boundary_conflicts || 0,
        high_confidence: stats.high_confidence_features || 0,
        gt_verified: stats.gt_verified || 0
      });
    }
  };


  // Load initial datasets from backend with mode support
  const loadData = async (mode: 'real' | 'demo' = gisMode) => {
    try {
      const [pList, cList, gtList, chList, topList, projList, dbStats, bList, rList, luList] = await Promise.all([
        apiClient.getParcels(undefined, undefined, undefined, mode).catch(() => []),
        apiClient.getConflicts(mode).catch(() => []),
        apiClient.getGroundTruthTasks(mode).catch(() => []),
        apiClient.getChangeDetection().catch(() => []),
        apiClient.getTopologyIssues().catch(() => []),
        apiClient.getProjects().catch(() => []),
        apiClient.getDashboardStatistics(mode).catch(() => null),
        apiClient.getBuildings(mode).catch(() => []),
        apiClient.getRoads(mode).catch(() => []),
        apiClient.getLandUse(undefined, mode).catch(() => []),
        apiClient.getGISDatasets().catch(() => [])
      ]);

      setParcels(pList || []);
      setConflicts(cList || []);
      setGroundTruthTasks(gtList || []);
      setChanges(chList || []);
      setTopologyIssues(topList || []);
      setProjects(projList || []);
      setBuildings(bList || []);
      setRoads(rList || []);
      setLandUse(luList || []);
      if (arguments && arguments.length > 0) {} // no-op
      const dsList = arguments ? (await apiClient.getGISDatasets().catch(() => [])) : [];
      if (dsList && dsList.length > 0) {
        setActiveDataset(dsList[0]);
      }
      if (dbStats) {
        setDashboardStats(dbStats);
      }

      // Pure Real Mode: Do not auto-select a parcel; initially show "No parcel selected"
      setSelectedParcel(null);
    } catch (e) {
      console.error('Failed loading backend data:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleGisMode = (newMode: 'real' | 'demo') => {
    setGisMode(newMode);
    loadData(newMode);
  };

  useEffect(() => {
    loadData('real');
  }, []);

  const handleUpdateParcel = async (parcelId: string, updates: Partial<Parcel>) => {
    try {
      const updated = await apiClient.updateParcel(parcelId, updates);
      setParcels(prev => prev.map(p => p.id === parcelId || p.parcel_id === parcelId ? updated : p));
      if (selectedParcel?.id === parcelId || selectedParcel?.parcel_id === parcelId) {
        setSelectedParcel(updated);
      }
    } catch (e) {
      console.error('Update parcel failed:', e);
    }
  };

  const handleSelectParcelById = (parcelIdOrTitle: string) => {
    const found = parcels.find(p => p.id === parcelIdOrTitle || p.parcel_id === parcelIdOrTitle || p.title === parcelIdOrTitle);
    if (found) {
      setSelectedParcel(found);
      navigate('parcel-map');
    }
  };

  const navigate = (route: string) => {
    setCurrentRoute(route);
    if (typeof window !== 'undefined') {
      const targetPath = route === 'dashboard' ? '/dashboard' : `/${route}`;
      if (window.location.pathname !== targetPath) {
        window.history.pushState(null, '', targetPath);
      }
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleLogout = async () => {
    try {
      await apiClient.logout();
    } catch (e) {}
    setCurrentUser(null);
    setCurrentRoute('login');
    if (typeof window !== 'undefined') {
      window.history.replaceState(null, '', '/login');
    }
  };

  // Verify server session on application startup
  useEffect(() => {
    const token = localStorage.getItem('cadastral_auth_token');
    if (token) {
      apiClient.verifySession().then(user => {
        if (user) {
          setCurrentUser(user);
        } else {
          localStorage.removeItem('cadastral_auth_token');
          localStorage.removeItem('cadastral_auth_user');
          setCurrentUser(null);
        }
      }).catch(() => {
        // Offline / network issue: maintain cached user
      });
    }
  }, []);

  // Handle browser back and forward buttons
  useEffect(() => {
    const handlePopState = () => {
      const path = window.location.pathname.replace(/^\/+/, '').split('/')[0] || '';
      if (!currentUser) {
        setCurrentRoute('login');
      } else if (!path || path === 'login') {
        setCurrentRoute('dashboard');
      } else {
        setCurrentRoute(path);
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [currentUser]);

  // Sync URL when authenticated user opens root or /login
  useEffect(() => {
    if (currentUser && typeof window !== 'undefined') {
      if (window.location.pathname === '/login' || window.location.pathname === '/' || !window.location.pathname) {
        window.history.replaceState(null, '', '/dashboard');
      }
    }
  }, [currentUser]);

  // Protected Routes: Unauthenticated users are redirected to /login
  if (!currentUser) {
    if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
      window.history.replaceState(null, '', '/login');
    }
    return (
      <Login
        onLoginSuccess={(user) => {
          setCurrentUser(user);
          const targetRoute = currentRoute === 'login' ? 'dashboard' : currentRoute;
          setCurrentRoute(targetRoute);
          if (typeof window !== 'undefined') {
            window.history.pushState(null, '', `/${targetRoute}`);
          }
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col antialiased text-slate-900 selection:bg-blue-100 selection:text-blue-900">
      {/* Top Navbar */}
      <Navbar
        currentProject={currentProject}
        onProjectChange={setCurrentProject}
        currentUser={currentUser}
        onLogout={handleLogout}
        onNavigate={navigate}
      />

      <div className="flex-1 flex overflow-hidden">
        {/* Desktop Sidebar Navigation */}
        <Sidebar
          currentRoute={currentRoute}
          onNavigate={navigate}
          conflictsCount={conflicts.length}
          confidenceCount={parcels.filter(p => (p.confidence_score || 0) < 0.7).length}
          topologyPassRate={topologyIssues.length === 0 && parcels.length > 0 ? 100 : null}
          corsConnected={false}
        />

        {/* Main Content Viewport */}
        <main className="flex-1 overflow-y-auto bg-slate-50 relative">
          <GISErrorBoundary fallbackTitle="GIS VIEW ERROR">
          {currentRoute === 'dashboard' && (
            <Dashboard
              parcels={parcels}
              conflicts={conflicts}
              onNavigate={navigate}
              onSelectParcel={(p) => {
                setSelectedParcel(p);
                navigate('parcel-map');
              }}
              stats={dashboardStats}
            />
          )}

          {currentRoute === 'insights' && (
            <AIInsights
              onNavigate={navigate}
              onSelectParcel={handleSelectParcelById}
            />
          )}

          {currentRoute === 'property-details' && (
            (selectedParcel || parcels.length > 0) ? (
              <PropertyDetails
                parcel={selectedParcel || parcels[0]}
                onBack={() => navigate('parcel-map')}
                onCompare={() => navigate('verification')}
                onRequestAcquisition={(p) => {
                  setAcquisitionModalParcel(p);
                  setAcquisitionSubmitted(false);
                }}
              />
            ) : (
              <div className="flex flex-col items-center justify-center min-h-[60vh] p-8 text-center">
                <div className="w-16 h-16 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 mb-4">
                  <BuildingIcon className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-bold text-slate-800 mb-2">No Parcel Selected</h3>
                <p className="text-sm text-slate-500 max-w-md mb-6">
                  Select a parcel from the Cadastral Map or upload drone imagery to inspect 3D cadastral property boundaries and intelligence.
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={() => navigate('parcel-map')}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-sm transition-colors"
                  >
                    View Cadastral Map
                  </button>
                  <button
                    onClick={() => navigate('drone-imagery')}
                    className="px-4 py-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-colors"
                  >
                    Upload Drone Ortho
                  </button>
                </div>
              </div>
            )
          )}

          {currentRoute === 'parcel-map' && (
            <ParcelMap
              parcels={parcels}
              conflicts={conflicts}
              buildings={buildings}
              roads={roads}
              landUse={landUse}
              groundTruthTasks={groundTruthTasks}
              selectedParcel={selectedParcel}
              onSelectParcel={setSelectedParcel}
              onNavigate={navigate}
              onUpdateParcel={handleUpdateParcel}
              gisMode={gisMode}
              onToggleMode={handleToggleGisMode}
            />
          )}

          {currentRoute === 'drone-imagery' && (
            <DroneImageryUpload
              onNavigate={navigate}
              onDatasetProcessed={handleDatasetProcessed}
            />
          )}


          {currentRoute === 'ai-extraction' && (
            <AIExtraction
              onNavigate={navigate}
            />
          )}

          {currentRoute === 'conflicts' && (
            <ConflictDetection
              conflicts={conflicts}
              onSelectParcel={handleSelectParcelById}
              onNavigate={navigate}
              onRefreshConflicts={loadData}
            />
          )}

          {currentRoute === 'confidence' && (
            <ConfidenceQueue
              parcels={parcels}
              onSelectParcel={(p) => {
                setSelectedParcel(p);
                navigate('verification');
              }}
              onNavigate={navigate}
            />
          )}

          {currentRoute === 'verification' && (
            (selectedParcel || parcels.length > 0) ? (
              <Verification
                parcel={selectedParcel || parcels[0]}
                onUpdateParcel={handleUpdateParcel}
                onNavigate={navigate}
              />
            ) : (
              <div className="flex flex-col items-center justify-center min-h-[60vh] p-8 text-center">
                <div className="w-16 h-16 rounded-2xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600 mb-4">
                  <CheckSquare className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-bold text-slate-800 mb-2">No Verification Items in Queue</h3>
                <p className="text-sm text-slate-500 max-w-md mb-6">
                  There are currently no parcels flagged for manual surveyor verification. Once drone imagery is processed and boundary ambiguities are detected, they will appear here.
                </p>
                <button
                  onClick={() => navigate('drone-imagery')}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-sm transition-colors"
                >
                  Upload Drone Imagery
                </button>
              </div>
            )
          )}

          {currentRoute === 'ground-truth' && (
            <GroundTruth
              tasks={groundTruthTasks}
              onSelectParcel={handleSelectParcelById}
              onNavigate={navigate}
              onRefreshTasks={loadData}
            />
          )}

          {currentRoute === 'change-detection' && (
            <ChangeDetection
              changes={changes}
              onSelectParcel={handleSelectParcelById}
              onNavigate={navigate}
            />
          )}

          {currentRoute === 'topology' && (
            <TopologyValidator
              issues={topologyIssues}
              onSelectParcel={handleSelectParcelById}
              onNavigate={navigate}
            />
          )}

          {currentRoute === 'gis-editor' && (
            <GISEditor
              parcels={parcels}
              selectedParcel={selectedParcel || (parcels.length > 0 ? parcels[0] : null)}
              onSelectParcel={setSelectedParcel}
              onUpdateParcel={handleUpdateParcel}
              onRefreshData={loadData}
              conflicts={conflicts}
              buildings={buildings}
              roads={roads}
              landUse={landUse}
              activeDataset={activeDataset}
            />
          )}

          {currentRoute === 'reports' && (
            <Reports />
          )}

          {currentRoute === 'audit' && (
            <AuditLog />
          )}

          {['buildings', 'roads', 'land-use', 'projects', 'settings'].includes(currentRoute) && (
            <GenericGISList
              type={currentRoute as any}
              buildings={buildings}
              roads={roads}
              projects={projects}
              parcels={parcels}
              onSelectParcel={setSelectedParcel}
              onNavigate={navigate}
            />
          )}

          {!['dashboard', 'insights', 'property-details', 'parcel-map', 'drone-imagery', 'ai-extraction', 'conflicts', 'confidence', 'verification', 'ground-truth', 'change-detection', 'topology', 'gis-editor', 'reports', 'audit', 'buildings', 'roads', 'land-use', 'projects', 'settings'].includes(currentRoute) && (
            <Dashboard
              parcels={parcels}
              conflicts={conflicts}
              onNavigate={navigate}
              onSelectParcel={(p) => {
                setSelectedParcel(p);
                navigate('parcel-map');
              }}
              stats={dashboardStats}
            />
          )}
          </GISErrorBoundary>
        </main>
      </div>

      {/* Mobile Bottom Navigation matching Page 1 & Page 3 */}
      <MobileNav
        currentRoute={currentRoute}
        onNavigate={navigate}
        onOpenMobileDrawer={() => setMobileDrawerOpen(true)}
      />

      {/* Mobile Drawer for Full Navigation Access */}
      {mobileDrawerOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex flex-col justify-end md:hidden">
          <div className="bg-white rounded-t-3xl max-h-[80vh] overflow-y-auto p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <span className="font-bold text-sm text-slate-900">Cadastral Modules & GIS Tools</span>
              <button 
                onClick={() => setMobileDrawerOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-700"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              {[
                { id: 'dashboard', label: 'Dashboard' },
                { id: 'insights', label: 'AI Insights' },
                { id: 'parcel-map', label: 'Cadastral Map' },
                { id: 'property-details', label: 'Property (3D)' },
                { id: 'ai-extraction', label: 'AI Extraction' },
                { id: 'conflicts', label: `Conflicts (${conflicts.length})` },
                { id: 'confidence', label: 'Confidence Queue' },
                { id: 'verification', label: 'Verification' },
                { id: 'ground-truth', label: 'Ground Truth CORS' },
                { id: 'change-detection', label: 'Change Detection' },
                { id: 'topology', label: 'Topology Engine' },
                { id: 'gis-editor', label: 'Vector Editor' },
                { id: 'reports', label: 'Reports & Export' },
                { id: 'audit', label: 'Audit Trail' },
                { id: 'projects', label: 'Projects' },
                { id: 'drone-imagery', label: 'Drone Rasters' },
                { id: 'buildings', label: 'Buildings' },
                { id: 'roads', label: 'Roads' },
                { id: 'land-use', label: 'Land Use' },
                { id: 'settings', label: 'Settings' }
              ].map((m) => (
                <button
                  key={m.id}
                  onClick={() => {
                    navigate(m.id);
                    setMobileDrawerOpen(false);
                  }}
                  className={`p-3 rounded-xl text-left font-semibold transition-colors ${
                    currentRoute === m.id
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'bg-slate-50 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Acquisition Proposal Modal */}
      {acquisitionModalParcel && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-xs">
                  AI
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Municipal Land Acquisition Proposal</h3>
                  <p className="text-[11px] text-slate-500">Official Cadastral Assessment Dossier</p>
                </div>
              </div>
              <button
                onClick={() => setAcquisitionModalParcel(null)}
                className="text-slate-400 hover:text-slate-700 p-1"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/80 space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-slate-500">Parcel ID:</span>
                  <span className="font-mono font-bold text-slate-900">{acquisitionModalParcel.parcel_id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Current Zone:</span>
                  <span className="font-semibold text-slate-800">{acquisitionModalParcel.zone}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Registered Area:</span>
                  <span className="font-semibold text-slate-800">{acquisitionModalParcel.existing_area_sqm} m²</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Municipal Valuation:</span>
                  <span className="font-bold text-blue-600">
                    {typeof acquisitionModalParcel.valuation_usd === 'number'
                      ? `$${(acquisitionModalParcel.valuation_usd / 1000000).toFixed(2)}M`
                      : String(acquisitionModalParcel.valuation_usd)}
                  </span>
                </div>
              </div>

              {acquisitionSubmitted ? (
                <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl font-medium text-center">
                  ✓ Acquisition dossier officially dispatched to Revenue Authority & Municipal Land Committee.
                </div>
              ) : (
                <p className="text-slate-600 text-[11px] leading-relaxed">
                  The AI valuation algorithm assesses this parcel with a high development suitability rating ({acquisitionModalParcel.suitability_score}/100) and recommends public corridor reservation for transit infrastructure.
                </p>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                onClick={() => setAcquisitionModalParcel(null)}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-semibold text-xs transition-colors"
              >
                Close
              </button>
              {!acquisitionSubmitted && (
                <button
                  onClick={() => setAcquisitionSubmitted(true)}
                  className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold text-xs shadow-sm shadow-blue-500/20 transition-colors"
                >
                  Submit Proposal
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
export default App;
