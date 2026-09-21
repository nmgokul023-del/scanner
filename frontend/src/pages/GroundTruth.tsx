import React, { useState, useEffect, useRef } from 'react';
import { 
  Navigation2, 
  MapPin, 
  Upload, 
  CheckCircle, 
  XCircle, 
  Radio, 
  Plus, 
  FileText,
  UserCheck,
  Check,
  X,
  AlertTriangle,
  ShieldCheck,
  FileCheck,
  Image as ImageIcon,
  Trash2,
  Download,
  AlertCircle,
  HardDrive,
  RefreshCw
} from 'lucide-react';
import { GroundTruthTask, GroundTruthEvidenceRecord } from '../types';
import { apiClient } from '../api/client';

interface GroundTruthProps {
  tasks: GroundTruthTask[];
  onSelectParcel: (parcelId: string) => void;
  onNavigate: (route: string) => void;
  onRefreshTasks: () => void;
}

const ALLOWED_EXTENSIONS = [
  '.rinex', '.rnx', '.obs', '.nav', '.log', '.csv', '.txt', '.dat',
  '.jpg', '.jpeg', '.png', '.webp', '.pdf'
];
const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024; // 50 MB

export const GroundTruth: React.FC<GroundTruthProps> = ({
  tasks,
  onSelectParcel,
  onNavigate,
  onRefreshTasks
}) => {
  const [activeTasks, setActiveTasks] = useState<GroundTruthTask[]>(tasks);
  
  // New Task Modal
  const [showNewTaskModal, setShowNewTaskModal] = useState(false);
  const [newParcelId, setNewParcelId] = useState('TN-CAD-004-01874');
  const [newReason, setNewReason] = useState('DGPS boundary demarcation on eastern road setback');
  const [newSurveyor, setNewSurveyor] = useState('P. Meenakshi (Senior Field Surveyor)');

  // Evidence Upload Modal State
  const [uploadModalTask, setUploadModalTask] = useState<GroundTruthTask | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [evidenceNotes, setEvidenceNotes] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({ loaded: 0, total: 0, percent: 0 });
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccessMessage, setUploadSuccessMessage] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Verification Prerequisite & Confirmation Modal State
  const [prerequisiteModalTask, setPrerequisiteModalTask] = useState<GroundTruthTask | null>(null);
  const [verifyModalTask, setVerifyModalTask] = useState<GroundTruthTask | null>(null);
  const [sealAffirmed, setSealAffirmed] = useState(false);

  // Reject Survey Modal State
  const [rejectModalTask, setRejectModalTask] = useState<GroundTruthTask | null>(null);
  const [rejectionReason, setRejectionReason] = useState('RTK GNSS multipath error exceeding ±5cm tolerance');

  useEffect(() => {
    setActiveTasks(tasks);
  }, [tasks]);

  const getFileTypeMeta = (filename: string) => {
    const ext = filename.slice(filename.lastIndexOf('.')).toLowerCase();
    if (['.rinex', '.rnx', '.obs', '.nav', '.dat'].includes(ext)) {
      return {
        label: 'RTK RINEX Observation',
        color: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        icon: Radio,
        badge: 'GNSS RAW'
      };
    }
    if (['.log'].includes(ext)) {
      return {
        label: 'GNSS Receiver Log',
        color: 'bg-blue-50 text-blue-700 border-blue-200',
        icon: Radio,
        badge: 'LOG'
      };
    }
    if (['.csv', '.txt'].includes(ext)) {
      return {
        label: 'Survey Benchmark Coords',
        color: 'bg-cyan-50 text-cyan-700 border-cyan-200',
        icon: FileText,
        badge: 'COORD'
      };
    }
    if (['.jpg', '.jpeg', '.png', '.webp'].includes(ext)) {
      return {
        label: 'Monument Field Photo',
        color: 'bg-indigo-50 text-indigo-700 border-indigo-200',
        icon: ImageIcon,
        badge: 'PHOTO'
      };
    }
    if (['.pdf'].includes(ext)) {
      return {
        label: 'Surveyor Sign-off',
        color: 'bg-purple-50 text-purple-700 border-purple-200',
        icon: FileCheck,
        badge: 'SEAL'
      };
    }
    return {
      label: 'Survey Evidence',
      color: 'bg-slate-50 text-slate-700 border-slate-200',
      icon: FileText,
      badge: 'DOC'
    };
  };

  const formatSize = (bytes: number) => {
    if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    if (bytes >= 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${bytes} B`;
  };

  const handleUpdateStatus = async (taskId: string, status: GroundTruthTask['status'], notes?: string) => {
    const payload: any = { status };
    if (notes) {
      payload.evidence_notes = notes;
    }
    await apiClient.updateGroundTruthTask(taskId, payload);
    setActiveTasks(prev => prev.map(t => (t.id === taskId || t.task_id === taskId) ? { ...t, status, ...(notes ? { evidence_notes: notes } : {}) } : t));
    onRefreshTasks();
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    const created = await apiClient.createGroundTruthTask({
      parcel_id: newParcelId,
      reason: newReason,
      surveyor: newSurveyor,
      gnss_accuracy_cm: 1.5,
      cors_reference: 'TN-CORS-KA-04',
      coordinates: [12.9785, 77.6410]
    });
    setActiveTasks([created, ...activeTasks]);
    setShowNewTaskModal(false);
    onRefreshTasks();
  };

  // Open Evidence Upload Modal
  const openUploadModal = (task: GroundTruthTask) => {
    setUploadModalTask(task);
    setSelectedFiles([]);
    setEvidenceNotes(task.evidence_notes || '');
    setUploadError(null);
    setUploadSuccessMessage(null);
    setUploadProgress({ loaded: 0, total: 0, percent: 0 });
    setIsUploading(false);
  };

  const closeUploadModal = () => {
    if (isUploading && abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setUploadModalTask(null);
    setSelectedFiles([]);
    setUploadError(null);
    setUploadSuccessMessage(null);
    setIsUploading(false);
  };

  const handleFileSelection = (newFiles: FileList | File[]) => {
    setUploadError(null);
    const validFiles: File[] = [];
    const filesArray = Array.from(newFiles);

    for (const f of filesArray) {
      const ext = f.name.slice(f.name.lastIndexOf('.')).toLowerCase();
      if (!ALLOWED_EXTENSIONS.includes(ext)) {
        setUploadError(`Unsupported format "${ext}". Supported: ${ALLOWED_EXTENSIONS.join(', ')}`);
        return;
      }
      if (f.size > MAX_FILE_SIZE_BYTES) {
        setUploadError(`File "${f.name}" exceeds the 50 MB limit (${(f.size / (1024 * 1024)).toFixed(1)} MB).`);
        return;
      }
      if (!selectedFiles.some(existing => existing.name === f.name && existing.size === f.size)) {
        validFiles.push(f);
      }
    }

    setSelectedFiles(prev => [...prev, ...validFiles]);
  };

  const removeSelectedFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handlePerformUpload = async () => {
    if (!uploadModalTask) return;
    if (selectedFiles.length === 0) {
      setUploadError('Please select or drop at least one evidence file to upload.');
      return;
    }

    setIsUploading(true);
    setUploadError(null);
    setUploadSuccessMessage(null);
    setUploadProgress({ loaded: 0, total: 0, percent: 0 });

    const abortCtrl = new AbortController();
    abortControllerRef.current = abortCtrl;

    try {
      const response = await apiClient.uploadGroundTruthEvidence(
        uploadModalTask.task_id,
        selectedFiles,
        {
          notes: evidenceNotes,
          surveyor: uploadModalTask.surveyor,
          onProgress: (loaded, total, percent) => {
            setUploadProgress({ loaded, total, percent });
          },
          abortSignal: abortCtrl.signal
        }
      );

      if (response && response.success) {
        setUploadSuccessMessage(`Successfully uploaded ${response.evidence?.length || selectedFiles.length} evidence file(s).`);
        
        if (response.task) {
          setActiveTasks(prev => prev.map(t => (t.id === response.task.id || t.task_id === response.task.task_id) ? response.task : t));
        }
        
        onRefreshTasks();
        setTimeout(() => {
          closeUploadModal();
        }, 1200);
      } else {
        setUploadError(response?.message || 'Evidence upload failed.');
      }
    } catch (err: any) {
      if (err.name === 'AbortError') {
        setUploadError('Upload was cancelled.');
      } else {
        setUploadError(err.message || 'Error occurred while uploading evidence.');
      }
    } finally {
      setIsUploading(false);
      abortControllerRef.current = null;
    }
  };

  const handleDeleteEvidence = async (task: GroundTruthTask, evidenceId: string) => {
    try {
      const res = await apiClient.deleteGroundTruthEvidence(task.task_id, evidenceId);
      if (res && res.task) {
        setActiveTasks(prev => prev.map(t => (t.id === res.task.id || t.task_id === res.task.task_id) ? res.task : t));
      }
      onRefreshTasks();
    } catch (err: any) {
      console.error('Failed to remove evidence record:', err);
    }
  };


  // Verify & Seal Click Handler
  const handleVerifyClick = (task: GroundTruthTask) => {
    const hasEvidence = (task.evidence_files && task.evidence_files.length > 0) || 
                        (task.evidence_records && task.evidence_records.length > 0);

    if (!hasEvidence) {
      // Mandated: Do not automatically verify without evidence!
      setPrerequisiteModalTask(task);
    } else {
      setVerifyModalTask(task);
      setSealAffirmed(false);
    }
  };

  const handleConfirmSeal = async () => {
    if (!verifyModalTask) return;
    await handleUpdateStatus(verifyModalTask.id, 'Verified');
    setVerifyModalTask(null);
    setSealAffirmed(false);
  };

  const handleConfirmReject = async () => {
    if (!rejectModalTask) return;
    await handleUpdateStatus(rejectModalTask.id, 'Rejected', `Rejected: ${rejectionReason}`);
    setRejectModalTask(null);
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-6 select-none pb-24 md:pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <Navigation2 className="w-6 h-6 text-teal-600" />
            Ground Truth & CORS GNSS Survey Management
          </h1>
          <p className="text-xs text-slate-500 font-medium mt-1">
            Dispatch, track, and calibrate ground verification surveys linked to the state CORS network.
          </p>
        </div>

        <button
          onClick={() => setShowNewTaskModal(true)}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-sm flex items-center gap-1.5 transition-colors self-start sm:self-auto cursor-pointer"
        >
          <Plus className="w-4 h-4" /> Assign New Field Survey
        </button>
      </div>

      {/* CORS Network Real-Time Status Bar */}
      <div className="bg-slate-900 text-white p-4 sm:p-5 rounded-2xl shadow-md border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-teal-500/20 text-teal-400 border border-teal-500/30 flex items-center justify-center">
            <Radio className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="text-xs font-bold text-white flex items-center gap-2">
              <span>Continuously Operating Reference Station (CORS)</span>
              <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5 font-mono">
              Station TN-CORS-KA-04 • Fixed RTK Precision: ±1.8 cm • Dual Frequency L1/L2/L5
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-4 text-xs font-mono text-slate-300">
          <div>Satellites: <span className="text-emerald-400 font-bold">28</span></div>
          <div>Epoch Rate: <span className="text-blue-400 font-bold">1 Hz</span></div>
          <div>Datum: <span className="text-slate-100 font-bold">ITRF2020</span></div>
        </div>
      </div>

      {/* Ground Truth Task Table matching Section 14 */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <span>Ground Truth Dispatches ({activeTasks.length})</span>
          </h2>
        </div>

        <div className="divide-y divide-slate-100">
          {activeTasks.map((t) => {
            const hasEvidence = (t.evidence_files && t.evidence_files.length > 0) || 
                                (t.evidence_records && t.evidence_records.length > 0);

            return (
              <div key={t.id || t.task_id} className="p-4 sm:p-5 hover:bg-slate-50/80 transition-colors space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center space-x-3">
                    <span className="font-mono font-bold text-xs text-blue-600 bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-100">
                      {t.task_id}
                    </span>
                    <span className="font-bold text-sm text-slate-900">{t.parcel_id}</span>
                  </div>

                  <div className="flex items-center space-x-2">
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                      t.status === 'Verified' ? 'bg-emerald-100 text-emerald-800' :
                      t.status === 'In Progress' ? 'bg-blue-100 text-blue-800' :
                      t.status === 'Rejected' ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800'
                    }`}>
                      {t.status}
                    </span>
                  </div>
                </div>

                {/* Task Details */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs text-slate-600">
                  <div>
                    <span className="text-[10px] font-extrabold uppercase text-slate-400">Reason</span>
                    <div className="font-medium text-slate-800 mt-0.5">{t.reason}</div>
                  </div>
                  <div>
                    <span className="text-[10px] font-extrabold uppercase text-slate-400">Surveyor</span>
                    <div className="font-medium text-slate-800 mt-0.5 flex items-center gap-1">
                      <UserCheck className="w-3.5 h-3.5 text-blue-600" />
                      {t.surveyor}
                    </div>
                  </div>
                  <div>
                    <span className="text-[10px] font-extrabold uppercase text-slate-400">GNSS Accuracy / CORS</span>
                    <div className="font-mono text-emerald-700 font-bold mt-0.5">
                      ±{t.gnss_accuracy_cm} cm ({t.cors_reference})
                    </div>
                  </div>
                </div>

                {/* Attached Evidence Records Display */}
                <div className="bg-slate-50/70 border border-slate-100 rounded-xl p-3">
                  <div className="flex items-center justify-between text-[11px] mb-2">
                    <span className="font-bold text-slate-700 flex items-center gap-1.5">
                      <HardDrive className="w-3.5 h-3.5 text-slate-500" />
                      Survey Field Evidence ({t.evidence_files?.length || 0} file{t.evidence_files?.length === 1 ? '' : 's'})
                    </span>
                    {!hasEvidence && (
                      <span className="text-[10px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                        Evidence required before seal
                      </span>
                    )}
                  </div>

                  {hasEvidence ? (
                    <div className="flex flex-wrap gap-2">
                      {t.evidence_records && t.evidence_records.length > 0 ? (
                        t.evidence_records.map((rec) => {
                          const meta = getFileTypeMeta(rec.original_filename);
                          const IconComp = meta.icon;
                          return (
                            <div 
                              key={rec.id}
                              className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg border text-xs font-mono shadow-2xs ${meta.color}`}
                            >
                              <IconComp className="w-3.5 h-3.5 shrink-0" />
                              <span className="font-medium truncate max-w-[200px]" title={rec.original_filename}>
                                {rec.original_filename}
                              </span>
                              <span className="text-[10px] opacity-75 font-sans">
                                ({rec.file_size_str})
                              </span>
                              {rec.file_url && (
                                <a 
                                  href={rec.file_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-slate-500 hover:text-blue-600 transition-colors"
                                  title="Download / View Evidence"
                                >
                                  <Download className="w-3.5 h-3.5" />
                                </a>
                              )}
                              {t.status !== 'Verified' && (
                                <button
                                  type="button"
                                  onClick={() => handleDeleteEvidence(t, rec.id)}
                                  className="text-slate-400 hover:text-rose-600 transition-colors ml-1 cursor-pointer"
                                  title="Remove Evidence"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              )}
                            </div>
                          );
                        })
                      ) : (
                        t.evidence_files.map((filename, idx) => {
                          const meta = getFileTypeMeta(filename);
                          const IconComp = meta.icon;
                          return (
                            <div 
                              key={idx}
                              className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg border text-xs font-mono shadow-2xs ${meta.color}`}
                            >
                              <IconComp className="w-3.5 h-3.5 shrink-0" />
                              <span className="font-medium truncate max-w-[220px]" title={filename}>
                                {filename}
                              </span>
                              <span className="text-[9px] px-1 py-0.2 bg-white/70 rounded border font-sans font-bold">
                                {meta.badge}
                              </span>
                            </div>
                          );
                        })
                      )}
                    </div>
                  ) : (
                    <p className="text-[11px] text-slate-400 italic">
                      No RTK observation logs or monument photos attached. Use "Upload Evidence" to ingest field survey data.
                    </p>
                  )}
                </div>

                {/* Action Buttons matching Section 14 */}
                <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => {
                        onSelectParcel(t.parcel_id);
                        onNavigate('parcel-map');
                      }}
                      className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                    >
                      <MapPin className="w-3.5 h-3.5" /> Open Map
                    </button>

                    <button
                      onClick={() => openUploadModal(t)}
                      className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                    >
                      <Upload className="w-3.5 h-3.5" /> Upload Evidence
                    </button>
                  </div>

                  <div className="flex items-center space-x-2">
                    {t.status !== 'Verified' && (
                      <button
                        onClick={() => handleVerifyClick(t)}
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors shadow-sm cursor-pointer"
                      >
                        <Check className="w-3.5 h-3.5" /> Verify & Seal
                      </button>
                    )}
                    {t.status !== 'Rejected' && (
                      <button
                        onClick={() => {
                          setRejectModalTask(t);
                          setRejectionReason('RTK GNSS multipath error exceeding ±5cm tolerance');
                        }}
                        className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg text-xs font-semibold border border-rose-200 transition-colors cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" /> Reject Survey
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* REAL WORKING UPLOAD EVIDENCE MODAL */}
      {uploadModalTask && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Upload className="w-5 h-5 text-blue-600" />
                  Upload Ground Truth Evidence
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Upload RTK RINEX observation logs, receiver files, and monument photos.
                </p>
              </div>
              <button 
                type="button" 
                onClick={closeUploadModal} 
                disabled={isUploading}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg text-lg font-bold cursor-pointer"
              >
                ×
              </button>
            </div>

            {/* Task Information Box */}
            <div className="bg-blue-50/60 border border-blue-100 rounded-xl p-3.5 text-xs space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center space-x-2">
                  <span className="font-mono font-bold text-blue-700 bg-white px-2 py-0.5 rounded border border-blue-200">
                    {uploadModalTask.task_id}
                  </span>
                  <span className="font-bold text-slate-800">{uploadModalTask.parcel_id}</span>
                </div>
                <div className="text-slate-500 font-mono text-[11px]">
                  CORS: {uploadModalTask.cors_reference} (±{uploadModalTask.gnss_accuracy_cm} cm)
                </div>
              </div>
              <div className="text-slate-700 font-medium">
                <span className="font-bold text-slate-900">Survey Requirement:</span> {uploadModalTask.reason}
              </div>
            </div>

            {/* Drag and Drop Zone */}
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragOver(true);
              }}
              onDragLeave={() => setIsDragOver(false)}
              onDrop={(e) => {
                e.preventDefault();
                setIsDragOver(false);
                if (e.dataTransfer.files) {
                  handleFileSelection(e.dataTransfer.files);
                }
              }}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${
                isDragOver 
                  ? 'border-blue-500 bg-blue-50/80 scale-[0.99]' 
                  : 'border-slate-300 hover:border-blue-400 bg-slate-50/50 hover:bg-slate-50'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept=".rinex,.rnx,.obs,.nav,.log,.csv,.txt,.dat,.jpg,.jpeg,.png,.webp,.pdf"
                onChange={(e) => {
                  if (e.target.files) {
                    handleFileSelection(e.target.files);
                  }
                }}
                className="hidden"
              />
              <div className="w-12 h-12 mx-auto rounded-full bg-blue-100/80 text-blue-600 flex items-center justify-center mb-3">
                <Upload className="w-6 h-6" />
              </div>
              <p className="text-xs font-bold text-slate-800">
                Click to browse or drag & drop survey files here
              </p>
              <p className="text-[11px] text-slate-500 mt-1">
                RTK RINEX (.rinex, .rnx, .obs, .log), benchmark points (.csv), monument photos (.jpg, .png), or sign-off (.pdf)
              </p>
              <p className="text-[10px] text-slate-400 font-mono mt-1">
                Max 50 MB per file • Multi-file upload supported
              </p>
            </div>

            {/* Selected Files List */}
            {selectedFiles.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                  <span>Files Selected ({selectedFiles.length})</span>
                  <button
                    type="button"
                    onClick={() => setSelectedFiles([])}
                    className="text-rose-600 hover:text-rose-700 text-[11px] font-semibold cursor-pointer"
                  >
                    Clear all
                  </button>
                </div>

                <div className="max-h-40 overflow-y-auto space-y-1.5 border border-slate-200 rounded-xl p-2 bg-white">
                  {selectedFiles.map((file, idx) => {
                    const meta = getFileTypeMeta(file.name);
                    const IconComp = meta.icon;
                    return (
                      <div
                        key={idx}
                        className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-100 text-xs"
                      >
                        <div className="flex items-center space-x-2.5 min-w-0">
                          <div className={`p-1.5 rounded-md border ${meta.color}`}>
                            <IconComp className="w-3.5 h-3.5" />
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold text-slate-800 truncate text-[11px]">
                              {file.name}
                            </p>
                            <p className="text-[10px] text-slate-400 font-mono">
                              {formatSize(file.size)} • {meta.label}
                            </p>
                          </div>
                        </div>

                        <button
                          type="button"
                          disabled={isUploading}
                          onClick={(e) => {
                            e.stopPropagation();
                            removeSelectedFile(idx);
                          }}
                          className="text-slate-400 hover:text-rose-600 p-1 rounded-md transition-colors cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Survey Notes Field */}
            <div className="text-xs space-y-1">
              <label className="block font-bold text-slate-700">
                Field Surveyor Notes & Benchmark Remarks (Optional)
              </label>
              <textarea
                rows={2}
                value={evidenceNotes}
                onChange={(e) => setEvidenceNotes(e.target.value)}
                placeholder="e.g., Dual-frequency Trimble R12 base-rover RTK session recorded. Monument marked with brass cadastral cap."
                className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-xs"
              />
            </div>

            {/* Real Progress Bar */}
            {isUploading && (
              <div className="space-y-1.5 p-3 rounded-xl bg-blue-50/80 border border-blue-100 text-xs">
                <div className="flex items-center justify-between text-[11px] font-bold text-blue-900">
                  <span className="flex items-center gap-1.5">
                    <RefreshCw className="w-3.5 h-3.5 animate-spin text-blue-600" />
                    Transmitting multipart survey evidence...
                  </span>
                  <span className="font-mono">{uploadProgress.percent}%</span>
                </div>
                <div className="w-full bg-blue-200 rounded-full h-2 overflow-hidden">
                  <div 
                    className="bg-blue-600 h-2 rounded-full transition-all duration-150"
                    style={{ width: `${uploadProgress.percent}%` }}
                  />
                </div>
                <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono">
                  <span>{formatSize(uploadProgress.loaded)} of {formatSize(uploadProgress.total || 1)}</span>
                  <span>HTTP Multipart Stream</span>
                </div>
              </div>
            )}

            {/* Error Message */}
            {uploadError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-start space-x-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
                <div className="font-medium">{uploadError}</div>
              </div>
            )}

            {/* Success Message */}
            {uploadSuccessMessage && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-700 flex items-center space-x-2">
                <CheckCircle className="w-4 h-4 shrink-0 text-emerald-600" />
                <div className="font-semibold">{uploadSuccessMessage}</div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex items-center justify-between pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={closeUploadModal}
                disabled={isUploading}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handlePerformUpload}
                disabled={isUploading || selectedFiles.length === 0}
                className={`px-5 py-2 rounded-xl text-xs font-semibold text-white flex items-center gap-1.5 shadow-sm transition-colors ${
                  isUploading || selectedFiles.length === 0
                    ? 'bg-blue-300 cursor-not-allowed'
                    : 'bg-blue-600 hover:bg-blue-700 cursor-pointer'
                }`}
              >
                <Upload className="w-3.5 h-3.5" />
                {isUploading 
                  ? `Uploading (${uploadProgress.percent}%)...` 
                  : `Upload Evidence (${selectedFiles.length})`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PREREQUISITE WARNING MODAL: When Verify & Seal is clicked without evidence */}
      {prerequisiteModalTask && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <div>
              <h3 className="text-base font-bold text-slate-900">
                Ground Truth Evidence Required
              </h3>
              <p className="text-xs text-slate-600 mt-1">
                Under ISO 19152 (Land Administration Domain Model) and Cadastral Survey Guidelines, this parcel boundary cannot be officially verified and sealed without ground truth evidence.
              </p>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs space-y-1.5">
              <div className="font-semibold text-slate-800">Required Verification Evidence:</div>
              <ul className="list-disc list-inside text-slate-600 space-y-1 text-[11px]">
                <li>RTK GNSS dual-frequency raw observation log (.rinex, .obs, .log)</li>
                <li>Geotagged monument photograph or surveyor boundary sign-off (.jpg, .pdf)</li>
              </ul>
              <div className="pt-1 text-[10px] text-slate-400 font-mono">
                Task ID: {prerequisiteModalTask.task_id} • Parcel: {prerequisiteModalTask.parcel_id}
              </div>
            </div>

            <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setPrerequisiteModalTask(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  const target = prerequisiteModalTask;
                  setPrerequisiteModalTask(null);
                  openUploadModal(target);
                }}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-sm cursor-pointer"
              >
                <Upload className="w-3.5 h-3.5" /> Upload Evidence Now
              </button>
            </div>
          </div>
        </div>
      )}

      {/* VERIFY & SEAL CONFIRMATION MODAL */}
      {verifyModalTask && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div className="flex items-center space-x-2.5">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Verify & Apply Digital Cadastral Seal
                  </h3>
                  <p className="text-xs text-slate-500">
                    Official ground truth survey sign-off and title calibration
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setVerifyModalTask(null)}
                className="text-slate-400 hover:text-slate-600 text-lg font-bold"
              >
                ×
              </button>
            </div>

            <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-200 text-xs space-y-2">
              <div className="flex justify-between font-mono">
                <span className="text-slate-500">Task:</span>
                <span className="font-bold text-blue-600">{verifyModalTask.task_id}</span>
              </div>
              <div className="flex justify-between font-mono">
                <span className="text-slate-500">Target Parcel:</span>
                <span className="font-bold text-slate-800">{verifyModalTask.parcel_id}</span>
              </div>
              <div className="flex justify-between font-mono">
                <span className="text-slate-500">Surveyor:</span>
                <span className="font-bold text-slate-800">{verifyModalTask.surveyor}</span>
              </div>
              <div className="flex justify-between font-mono">
                <span className="text-slate-500">CORS Station / Precision:</span>
                <span className="font-bold text-emerald-700">{verifyModalTask.cors_reference} (±{verifyModalTask.gnss_accuracy_cm} cm)</span>
              </div>

              <div className="pt-2 border-t border-slate-200">
                <div className="text-[11px] font-bold text-slate-700 mb-1">Attached Verified Evidence:</div>
                <div className="space-y-1">
                  {verifyModalTask.evidence_files.map((file, i) => (
                    <div key={i} className="text-[11px] font-mono text-slate-600 flex items-center gap-1.5">
                      <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                      <span>{file}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex items-start space-x-2.5 p-3 bg-emerald-50/60 border border-emerald-200 rounded-xl text-xs">
              <input
                type="checkbox"
                id="affirmation"
                checked={sealAffirmed}
                onChange={(e) => setSealAffirmed(e.target.checked)}
                className="mt-0.5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
              />
              <label htmlFor="affirmation" className="text-emerald-900 font-medium cursor-pointer">
                I hereby certify as an authorized cadastral surveyor that these field observations conform to state survey regulations, and the calibrated parcel boundary shall be officially registered.
              </label>
            </div>

            <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setVerifyModalTask(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!sealAffirmed}
                onClick={handleConfirmSeal}
                className={`px-5 py-2 rounded-xl text-xs font-semibold text-white flex items-center gap-1.5 shadow-sm transition-colors ${
                  sealAffirmed ? 'bg-emerald-600 hover:bg-emerald-700 cursor-pointer' : 'bg-emerald-300 cursor-not-allowed'
                }`}
              >
                <ShieldCheck className="w-4 h-4" /> Confirm Verification & Seal
              </button>
            </div>
          </div>
        </div>
      )}

      {/* REJECT SURVEY MODAL */}
      {rejectModalTask && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center space-x-2.5 border-b border-slate-200 pb-3">
              <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center">
                <XCircle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Reject Field Survey Task
                </h3>
                <p className="text-xs text-slate-500">
                  Document the survey failure or boundary discrepancy
                </p>
              </div>
            </div>

            <div className="text-xs space-y-2">
              <div className="font-semibold text-slate-700">Reason for Rejection:</div>
              <select
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white text-xs"
              >
                <option value="RTK GNSS multipath error exceeding ±5cm tolerance">RTK GNSS multipath error exceeding ±5cm tolerance</option>
                <option value="Boundary dispute / encroachment conflict with adjacent title deed">Boundary dispute / encroachment conflict with adjacent title deed</option>
                <option value="Physical boundary monument displaced or missing">Physical boundary monument displaced or missing</option>
                <option value="Unfavorable satellite DOP during epoch recording">Unfavorable satellite DOP during epoch recording</option>
                <option value="Site access restricted by local dispute">Site access restricted by local dispute</option>
              </select>
            </div>

            <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setRejectModalTask(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmReject}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-semibold shadow-sm cursor-pointer"
              >
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Assign New Task Modal */}
      {showNewTaskModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <form onSubmit={handleCreateTask} className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="text-base font-bold text-slate-900">Assign Ground Truth Survey Task</h3>
              <button type="button" onClick={() => setShowNewTaskModal(false)} className="text-slate-400 hover:text-slate-600">×</button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Target Parcel ID</label>
                <input
                  type="text"
                  value={newParcelId}
                  onChange={(e) => setNewParcelId(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  required
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Reason & Discrepancy Description</label>
                <textarea
                  rows={2}
                  value={newReason}
                  onChange={(e) => setNewReason(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  required
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Assigned Cadastral Surveyor</label>
                <select
                  value={newSurveyor}
                  onChange={(e) => setNewSurveyor(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                >
                  <option value="R. Ramanathan (Chief Cadastral Surveyor)">R. Ramanathan (Chief Cadastral Surveyor)</option>
                  <option value="P. Meenakshi (Senior Field Surveyor)">P. Meenakshi (Senior Field Surveyor)</option>
                  <option value="A. K. Sharma (DGPS Lead)">A. K. Sharma (DGPS Lead)</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end space-x-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowNewTaskModal(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-sm"
              >
                Assign Task
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

