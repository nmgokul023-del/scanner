import React, { useEffect, useState } from 'react';
import { Parcel, Conflict, GroundTruthTask, ChangeDetectionItem, TopologyIssue, Project, Building, Road } from './types';
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
import { DroneUploadPipeline } from './pages/DroneUploadPipeline';
import { DroneImageryUpload } from './pages/DroneImageryUpload';


export function App() {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [currentRoute, setCurrentRoute] = useState<string>('dashboard');
  const [currentProject, setCurrentProject] = useState<string>('Tech District Phase II');
  
  const [parcels, setParcels] = useState<Parcel[]>([]);
  const [conflicts, setConflicts] = useState<Conflict[]>([]);
  const [groundTruthTasks, setGroundTruthTasks] = useState<GroundTruthTask[]>([]);
  const [changes, setChanges] = useState<ChangeDetectionItem[]>([]);
  const [topologyIssues, setTopologyIssues] = useState<TopologyIssue[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [roads, setRoads] = useState<Road[]>([]);
  
  const [selectedParcel, setSelectedParcel] = useState<Parcel | null>(null);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [acquisitionModalParcel, setAcquisitionModalParcel] = useState<Parcel | null>(null);
  const [acquisitionSubmitted, setAcquisitionSubmitted] = useState(false);

  // Dynamic dashboard stats from database
  const [dashboardStats, setDashboardStats] = useState<any>({
    total_parcels: 14,
    ai_extracted: 14,
    requires_review: 4,
    boundary_conflicts: 6,
    high_confidence: 10,
    gt_verified: 1
  });

  const handleDatasetProcessed = (stats: any) => {
    if (stats) {
      setDashboardStats({
        total_parcels: stats.parcels_detected || 14,
        ai_extracted: stats.parcels_detected || 14,
        requires_review: stats.requires_review || 4,
        boundary_conflicts: stats.boundary_conflicts || 6,
        high_confidence: stats.high_confidence_features || 10,
        gt_verified: stats.gt_verified || 1
      });
    }
  };


  // Load initial datasets from backend
  const loadData = async () => {
    try {
      const [pList, cList, gtList, chList, topList, projList, dbStats, bList, rList] = await Promise.all([
        apiClient.getParcels(),
        apiClient.getConflicts(),
        apiClient.getGroundTruthTasks(),
        apiClient.getChangeDetection(),
        apiClient.getTopologyIssues(),
        apiClient.getProjects(),
        apiClient.getDashboardStatistics(),
        apiClient.getBuildings(),
        apiClient.getRoads()
      ]);

      setParcels(pList);
      setConflicts(cList);
      setGroundTruthTasks(gtList);
      setChanges(chList);
      setTopologyIssues(topList);
      setProjects(projList);
      setBuildings(bList || []);
      setRoads(rList || []);
      if (dbStats) {
        setDashboardStats(dbStats);
      }

      // Default selected parcel is 8824-A (Flagship lot)
      if (pList.length > 0) {
        setSelectedParcel(pList[0]);
      }
    } catch (e) {
      console.error('Failed loading backend data:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
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
      setCurrentRoute('parcel-map');
    }
  };

  // If user is not logged in, render Login page (matching Page 4)
  if (!currentUser) {
    return (
      <Login
        onLoginSuccess={(user) => {
          setCurrentUser(user);
          setCurrentRoute('dashboard');
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
        onLogout={() => setCurrentUser(null)}
        onNavigate={(route) => setCurrentRoute(route)}
      />

      <div className="flex-1 flex overflow-hidden">
        {/* Desktop Sidebar Navigation */}
        <Sidebar
          currentRoute={currentRoute}
          onNavigate={(route) => {
            setCurrentRoute(route);
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
        />

        {/* Main Content Viewport */}
        <main className="flex-1 overflow-y-auto bg-slate-50 relative">
          {currentRoute === 'dashboard' && (
            <Dashboard
              parcels={parcels}
              conflicts={conflicts}
              onNavigate={setCurrentRoute}
              onSelectParcel={(p) => {
                setSelectedParcel(p);
                setCurrentRoute('parcel-map');
              }}
              stats={dashboardStats}
            />
          )}

          {currentRoute === 'insights' && (
            <AIInsights
              onNavigate={setCurrentRoute}
              onSelectParcel={handleSelectParcelById}
            />
          )}

          {currentRoute === 'property-details' && selectedParcel && (
            <PropertyDetails
              parcel={selectedParcel}
              onBack={() => setCurrentRoute('parcel-map')}
              onCompare={() => setCurrentRoute('verification')}
              onRequestAcquisition={(p) => {
                setAcquisitionModalParcel(p);
                setAcquisitionSubmitted(false);
              }}
            />
          )}

          {currentRoute === 'parcel-map' && selectedParcel && (
            <ParcelMap
              parcels={parcels}
              conflicts={conflicts}
              selectedParcel={selectedParcel}
              onSelectParcel={setSelectedParcel}
              onNavigate={setCurrentRoute}
              onUpdateParcel={handleUpdateParcel}
            />
          )}

          {currentRoute === 'drone-imagery' && (
            <DroneImageryUpload
              onNavigate={setCurrentRoute}
              onDatasetProcessed={handleDatasetProcessed}
            />
          )}


          {currentRoute === 'ai-extraction' && (
            <AIExtraction
              onNavigate={setCurrentRoute}
            />
          )}

          {currentRoute === 'conflicts' && (
            <ConflictDetection
              conflicts={conflicts}
              onSelectParcel={handleSelectParcelById}
              onNavigate={setCurrentRoute}
              onRefreshConflicts={loadData}
            />
          )}

          {currentRoute === 'confidence' && (
            <ConfidenceQueue
              parcels={parcels}
              onSelectParcel={(p) => {
                setSelectedParcel(p);
                setCurrentRoute('verification');
              }}
              onNavigate={setCurrentRoute}
            />
          )}

          {currentRoute === 'verification' && (selectedParcel || parcels.length > 0) && (
            <Verification
              parcel={selectedParcel || parcels[0]}
              onUpdateParcel={handleUpdateParcel}
              onNavigate={setCurrentRoute}
            />
          )}

          {currentRoute === 'ground-truth' && (
            <GroundTruth
              tasks={groundTruthTasks}
              onSelectParcel={handleSelectParcelById}
              onNavigate={setCurrentRoute}
              onRefreshTasks={loadData}
            />
          )}

          {currentRoute === 'change-detection' && (
            <ChangeDetection
              changes={changes}
              onSelectParcel={handleSelectParcelById}
              onNavigate={setCurrentRoute}
            />
          )}

          {currentRoute === 'topology' && (
            <TopologyValidator
              issues={topologyIssues}
              onSelectParcel={handleSelectParcelById}
              onNavigate={setCurrentRoute}
            />
          )}

          {currentRoute === 'gis-editor' && (selectedParcel || parcels.length > 0) && (
            <GISEditor
              parcels={parcels}
              selectedParcel={selectedParcel || parcels[0]}
              onSelectParcel={setSelectedParcel}
              onUpdateParcel={handleUpdateParcel}
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
              onNavigate={setCurrentRoute}
            />
          )}
        </main>
      </div>

      {/* Mobile Bottom Navigation matching Page 1 & Page 3 */}
      <MobileNav
        currentRoute={currentRoute}
        onNavigate={(route) => setCurrentRoute(route)}
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
                { id: 'conflicts', label: 'Conflicts (126)' },
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
                    setCurrentRoute(m.id);
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
