import {
  Parcel,
  Conflict,
  GroundTruthTask,
  ChangeDetectionItem,
  TopologyIssue,
  AuditLogEntry,
  Project
} from '../types';

const API_BASE = typeof window !== 'undefined' && window.location.port !== '5173' ? '/api' : 'http://127.0.0.1:8000/api';

export const apiClient = {
  async createParcel(parcel: Partial<Parcel>): Promise<Parcel> {
    const res = await fetch(`${API_BASE}/parcels`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(parcel)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Failed to create parcel');
    }
    return res.json();
  },

  async deleteParcel(id: string): Promise<any> {
    const res = await fetch(`${API_BASE}/parcels/${id}`, {
      method: 'DELETE'
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Failed to delete parcel');
    }
    return res.json();
  },

  async mergeParcels(parcelIds: string[]): Promise<any> {
    const res = await fetch(`${API_BASE}/parcels/merge`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ parcel_ids: parcelIds })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Failed to merge parcels');
    }
    return res.json();
  },

  async splitParcel(parcelId: string, cutLine: [number, number][]): Promise<any> {
    const res = await fetch(`${API_BASE}/parcels/split`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ parcel_id: parcelId, cut_line: cutLine })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Failed to split parcel');
    }
    return res.json();
  },

  async generateTopology(payload: { lines?: any; bounds?: any; rows?: number; cols?: number; save_to_db?: boolean }): Promise<any> {
    const res = await fetch(`${API_BASE}/topology/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Failed to generate topology');
    }
    return res.json();
  },

  async detectConflicts(): Promise<any> {
    const res = await fetch(`${API_BASE}/conflicts/detect`, {
      method: 'POST'
    });
    return res.json();
  },
  async login(email: string, password?: string) {
    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data.success === false) {
        const error: any = new Error(data.message || data.detail || 'Enter a valid email and password.');
        error.status = res.status;
        error.detail = data.message || data.detail;
        throw error;
      }
      return data;
    } catch (err: any) {
      if (
        err.name === 'TypeError' ||
        (err.message && (
          err.message.includes('Failed to fetch') ||
          err.message.includes('NetworkError') ||
          err.message.includes('Load failed')
        ))
      ) {
        const error: any = new Error('Unable to connect to authentication server.');
        error.detail = 'Unable to connect to authentication server.';
        throw error;
      }
      throw err;
    }
  },

  async logout(token?: string) {
    try {
      const activeToken = token || (typeof window !== 'undefined' ? localStorage.getItem('cadastral_auth_token') : null) || '';
      if (activeToken) {
        await fetch(`${API_BASE}/auth/logout`, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${activeToken}`
          },
          body: JSON.stringify({ token: activeToken })
        }).catch(() => {});
      }
    } finally {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('cadastral_auth_token');
        localStorage.removeItem('cadastral_auth_user');
      }
    }
  },

  async verifySession(): Promise<any> {
    if (typeof window === 'undefined') return null;
    const token = localStorage.getItem('cadastral_auth_token');
    if (!token) return null;
    try {
      const res = await fetch(`${API_BASE}/auth/session`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        return data.user || null;
      }
    } catch (e) {
      // Offline fallback: keep cached session if present
    }
    const cachedUser = localStorage.getItem('cadastral_auth_user');
    if (cachedUser) {
      try { return JSON.parse(cachedUser); } catch {}
    }
    return null;
  },

  async loginGoogle() {
    const res = await fetch(`${API_BASE}/auth/google`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      const error: any = new Error(errData.detail || 'Google authentication failed.');
      error.status = res.status;
      error.detail = errData.detail;
      throw error;
    }
    return res.json();
  },

  async getProjects(): Promise<Project[]> {
    const res = await fetch(`${API_BASE}/projects`);
    return res.json();
  },

  async getParcels(query?: string, zone?: string, status?: string, mode: string = 'real'): Promise<Parcel[]> {
    const params = new URLSearchParams();
    if (query) params.append('search', query);
    if (zone) params.append('zone', zone);
    if (status) params.append('status', status);
    if (mode) params.append('mode', mode);
    const res = await fetch(`${API_BASE}/parcels?${params.toString()}`);
    return res.json();
  },

  async getParcel(id: string): Promise<Parcel> {
    const res = await fetch(`${API_BASE}/parcels/${id}`);
    return res.json();
  },

  async updateParcel(id: string, updates: Partial<Parcel>): Promise<Parcel> {
    const res = await fetch(`${API_BASE}/parcels/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates)
    });
    return res.json();
  },

  async acceptParcel(parcelId: string, notes?: string): Promise<Parcel> {
    const res = await fetch(`${API_BASE}/verification/${encodeURIComponent(parcelId)}/accept`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ notes })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Failed to accept parcel');
    }
    return res.json();
  },

  async rejectParcel(parcelId: string, notes?: string): Promise<Parcel> {
    const res = await fetch(`${API_BASE}/verification/${encodeURIComponent(parcelId)}/reject`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ notes })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Failed to reject parcel');
    }
    return res.json();
  },

  async getGeoJSON(mode: string = 'real'): Promise<any> {
    const res = await fetch(`${API_BASE}/gis/geojson?mode=${encodeURIComponent(mode)}`);
    return res.json();
  },

  async getBuildings(mode: string = 'real'): Promise<any[]> {
    const res = await fetch(`${API_BASE}/buildings?mode=${encodeURIComponent(mode)}`);
    return res.json();
  },

  async getRoads(mode: string = 'real'): Promise<any[]> {
    const res = await fetch(`${API_BASE}/roads?mode=${encodeURIComponent(mode)}`);
    return res.json();
  },

  async getLandUse(datasetId?: string, mode: string = 'real'): Promise<any[]> {
    const params = new URLSearchParams();
    if (datasetId) params.append('dataset_id', datasetId);
    if (mode) params.append('mode', mode);
    const res = await fetch(`${API_BASE}/land-use?${params.toString()}`);
    return res.json();
  },

  async getConflicts(mode: string = 'real'): Promise<Conflict[]> {
    const res = await fetch(`${API_BASE}/conflicts?mode=${encodeURIComponent(mode)}`);
    return res.json();
  },

  async resolveConflict(id: string, payload: any): Promise<Conflict> {
    const res = await fetch(`${API_BASE}/conflicts/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    return res.json();
  },

  async triggerAIExtraction(payload: any) {
    const res = await fetch(`${API_BASE}/ai/extract`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    return res.json();
  },

  async getVerificationTasks(): Promise<Parcel[]> {
    const res = await fetch(`${API_BASE}/verification/tasks`);
    return res.json();
  },

  async submitVerification(parcelId: string, payload: any): Promise<Parcel> {
    const res = await fetch(`${API_BASE}/verification/tasks/${parcelId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    return res.json();
  },

  async getGroundTruthTasks(mode: string = 'real'): Promise<GroundTruthTask[]> {
    const res = await fetch(`${API_BASE}/ground-truth?mode=${encodeURIComponent(mode)}`);
    return res.json();
  },

  async createGroundTruthTask(task: Partial<GroundTruthTask>): Promise<GroundTruthTask> {
    const res = await fetch(`${API_BASE}/ground-truth`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(task)
    });
    return res.json();
  },

  async updateGroundTruthTask(id: string, payload: any): Promise<GroundTruthTask> {
    const res = await fetch(`${API_BASE}/ground-truth/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    return res.json();
  },

  async uploadGroundTruthEvidence(
    taskId: string,
    files: File[],
    options?: {
      notes?: string;
      surveyor?: string;
      onProgress?: (loaded: number, total: number, pct: number) => void;
      abortSignal?: AbortSignal;
    }
  ): Promise<{ success: boolean; task_id: string; evidence: any[]; task: GroundTruthTask; message: string }> {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      const formData = new FormData();

      files.forEach((file) => {
        formData.append('files', file);
      });

      if (options?.notes) {
        formData.append('notes', options.notes);
      }
      if (options?.surveyor) {
        formData.append('surveyor', options.surveyor);
      }

      if (options?.abortSignal) {
        options.abortSignal.addEventListener('abort', () => {
          xhr.abort();
          reject(new DOMException('Upload aborted by user', 'AbortError'));
        });
      }

      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable && options?.onProgress) {
          const percent = Math.round((event.loaded / event.total) * 100);
          options.onProgress(event.loaded, event.total, percent);
        }
      };

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const data = JSON.parse(xhr.responseText);
            resolve(data);
          } catch (e) {
            resolve(xhr.responseText as any);
          }
        } else {
          try {
            const errData = JSON.parse(xhr.responseText);
            reject(new Error(errData.detail || `Upload failed with status ${xhr.status}`));
          } catch (e) {
            reject(new Error(`Upload failed with status ${xhr.status}`));
          }
        }
      };

      xhr.onerror = () => {
        reject(new Error('Network error occurred during evidence upload. Please verify backend connection.'));
      };

      xhr.open('POST', `${API_BASE}/ground-truth/tasks/${encodeURIComponent(taskId)}/evidence`);
      xhr.send(formData);
    });
  },

  async getGroundTruthEvidence(taskId: string): Promise<any[]> {
    const res = await fetch(`${API_BASE}/ground-truth/tasks/${encodeURIComponent(taskId)}/evidence`);
    return res.json();
  },

  async deleteGroundTruthEvidence(taskId: string, evidenceId: string): Promise<any> {
    const res = await fetch(`${API_BASE}/ground-truth/tasks/${encodeURIComponent(taskId)}/evidence/${encodeURIComponent(evidenceId)}`, {
      method: 'DELETE'
    });
    return res.json();
  },


  async getChangeDetection(): Promise<ChangeDetectionItem[]> {
    const res = await fetch(`${API_BASE}/changes`);
    return res.json();
  },

  async getTopologyIssues(): Promise<TopologyIssue[]> {
    const res = await fetch(`${API_BASE}/topology/issues`);
    return res.json();
  },

  async runTopologyValidation(): Promise<any> {
    const res = await fetch(`${API_BASE}/topology/validate`, { method: 'POST' });
    return res.json();
  },

  async generateReport(reportType: string, format: string = 'json'): Promise<any> {
    if (format === 'csv') {
      const res = await fetch(`${API_BASE}/reports`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ report_type: reportType, format: 'csv' })
      });
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `urbancadastral_${reportType.replace(/\s+/g, '_').toLowerCase()}.csv`;
      a.click();
      return { success: true };
    }

    if (format === 'geojson') {
      const res = await fetch(`${API_BASE}/reports`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ report_type: reportType, format: 'geojson' })
      });
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `urbancadastral_${reportType.replace(/\s+/g, '_').toLowerCase()}.geojson`;
      a.click();
      return { success: true };
    }

    const res = await fetch(`${API_BASE}/reports`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ report_type: reportType, format: 'json' })
    });
    return res.json();
  },

  async getAuditTrail(): Promise<AuditLogEntry[]> {
    const res = await fetch(`${API_BASE}/audit`);
    return res.json();
  },

  async getDroneMissions(): Promise<any[]> {
    const res = await fetch(`${API_BASE}/drone/missions`);
    return res.json();
  },

  async uploadDroneData(payload: any): Promise<any> {
    const res = await fetch(`${API_BASE}/drone/upload`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    return res.json();
  },

  async validateDroneData(payload: any): Promise<any> {
    const res = await fetch(`${API_BASE}/drone/validate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    return res.json();
  },

  async processDroneData(payload: any): Promise<any> {
    const res = await fetch(`${API_BASE}/drone/process`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    return res.json();
  },

  // Dashboard Real Dynamic Statistics
  async getDashboardStatistics(mode: string = 'real'): Promise<any> {
    const res = await fetch(`${API_BASE}/dashboard/statistics?mode=${encodeURIComponent(mode)}`);
    return res.json();
  },

  // Section 14 real endpoints: Drone Imagery Upload & Processing
  async getDroneImageryDatasets(): Promise<any[]> {
    const res = await fetch(`${API_BASE}/drone-imagery`);
    return res.json();
  },

  async getDroneImagery(): Promise<any[]> {
    return this.getDroneImageryDatasets();
  },

  async getActiveDroneDataset(): Promise<any> {
    const res = await fetch(`${API_BASE}/drone-imagery/active`);
    if (!res.ok) return null;
    return res.json();
  },


  async getDroneImageryById(id: string): Promise<any> {
    const res = await fetch(`${API_BASE}/drone-imagery/${id}`);
    return res.json();
  },

  async deleteDroneImagery(id: string): Promise<any> {
    const res = await fetch(`${API_BASE}/drone-imagery/${id}`, {
      method: 'DELETE'
    });
    return res.json();
  },

  uploadDroneImageryFile(
    file: File,
    dataType: string,
    onProgress: (loaded: number, total: number, percent: number) => void,
    abortSignal?: AbortSignal
  ): Promise<any> {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      const formData = new FormData();
      formData.append('file', file);
      formData.append('data_type', dataType);
      formData.append('name', file.name.replace(/\.[^/.]+$/, '').replace(/_/g, ' '));

      if (abortSignal) {
        abortSignal.addEventListener('abort', () => {
          xhr.abort();
          reject(new DOMException('Upload aborted by user', 'AbortError'));
        });
      }

      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          const percent = Math.round((event.loaded / event.total) * 100);
          onProgress(event.loaded, event.total, percent);
        }
      };

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const data = JSON.parse(xhr.responseText);
            resolve(data);
          } catch (e) {
            resolve(xhr.responseText);
          }
        } else {
          try {
            const errData = JSON.parse(xhr.responseText);
            reject(new Error(errData.detail || `Upload failed with status ${xhr.status}`));
          } catch (e) {
            reject(new Error(`Upload failed with status ${xhr.status}`));
          }
        }
      };

      xhr.onerror = () => {
        reject(new Error('Network error occurred during upload. Please verify backend connection.'));
      };

      xhr.open('POST', `${API_BASE}/drone-imagery/upload`);
      xhr.send(formData);
    });
  },

  async uploadDroneImageryPreset(payload: any): Promise<any> {
    const res = await fetch(`${API_BASE}/drone-imagery/upload`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    return res.json();
  },

  async validateDroneImagery(id: string, payload?: any): Promise<any> {
    const res = await fetch(`${API_BASE}/drone-imagery/${id}/validate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload || {})
    });
    return res.json();
  },

  async processDroneImagery(id: string, payload?: any): Promise<any> {
    const res = await fetch(`${API_BASE}/drone-imagery/${id}/process`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload || {})
    });
    return res.json();
  },

  async getDroneImageryStatus(id: string): Promise<any> {
    const res = await fetch(`${API_BASE}/drone-imagery/${id}/status`);
    return res.json();
  },

  async getDroneImageryResults(id: string): Promise<any> {
    const res = await fetch(`${API_BASE}/drone-imagery/${id}/results`);
    return res.json();
  },

  getDroneImageryPreviewUrl(id: string): string {
    return `${API_BASE}/drone-imagery/${id}/preview?t=${Date.now()}`;
  },

  getDroneImageryEventsUrl(id: string): string {
    return `${API_BASE}/drone-imagery/${id}/events`;
  },

  // Real Multi-Source Dataset Endpoints
  async getDatasets(sourceType?: string): Promise<any[]> {
    const url = sourceType ? `${API_BASE}/datasets?source_type=${encodeURIComponent(sourceType)}` : `${API_BASE}/datasets`;
    const res = await fetch(url);
    if (!res.ok) return [];
    return res.json();
  },

  async getDatasetById(id: string): Promise<any> {
    const res = await fetch(`${API_BASE}/datasets/${id}`);
    if (!res.ok) throw new Error('Dataset not found');
    return res.json();
  },

  async getDatasetMetadata(id: string): Promise<any> {
    const res = await fetch(`${API_BASE}/datasets/${id}/metadata`);
    if (!res.ok) throw new Error('Dataset metadata not found');
    return res.json();
  },

  async getDatasetLayers(id: string): Promise<any> {
    const res = await fetch(`${API_BASE}/datasets/${id}/layers`);
    if (!res.ok) throw new Error('Dataset layers not found');
    return res.json();
  },

  getDatasetPreviewUrl(id: string): string {
    return `${API_BASE}/datasets/${id}/preview?t=${Date.now()}`;
  },

  uploadDataset(
    file: File,
    sourceType: string = 'existing_geotiff',
    dataType: string = 'Drone Orthomosaic',
    onProgress?: (loaded: number, total: number, percent: number) => void,
    abortSignal?: AbortSignal
  ): Promise<any> {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      const formData = new FormData();
      formData.append('file', file);
      formData.append('source_type', sourceType);
      formData.append('data_type', dataType);
      formData.append('name', file.name.replace(/\.[^/.]+$/, '').replace(/_/g, ' '));

      if (abortSignal) {
        abortSignal.addEventListener('abort', () => {
          xhr.abort();
          reject(new DOMException('Upload aborted by user', 'AbortError'));
        });
      }

      if (onProgress) {
        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) {
            const percent = Math.round((event.loaded / event.total) * 100);
            onProgress(event.loaded, event.total, percent);
          }
        };
      }

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            resolve(JSON.parse(xhr.responseText));
          } catch (e) {
            reject(new Error('Failed parsing server response'));
          }
        } else {
          try {
            const errData = JSON.parse(xhr.responseText);
            reject(new Error(errData.detail || `Upload failed with status ${xhr.status}`));
          } catch (e) {
            reject(new Error(`Upload failed with status ${xhr.status}`));
          }
        }
      };

      xhr.onerror = () => {
        reject(new Error('Network error during dataset upload.'));
      };

      xhr.open('POST', `${API_BASE}/datasets/upload`);
      xhr.send(formData);
    });
  },

  async importGovernmentDataset(formData: FormData): Promise<any> {
    const res = await fetch(`${API_BASE}/datasets/import`, {
      method: 'POST',
      body: formData
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || `Import failed with status ${res.status}`);
    }
    return res.json();
  },

  async processDatasetAI(id: string, options?: any): Promise<any> {
    const res = await fetch(`${API_BASE}/datasets/${id}/process`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(options || {})
    });
    return res.json();
  },

  async compareDatasets(referenceId: string, currentId: string): Promise<any> {
    const res = await fetch(`${API_BASE}/datasets/compare`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        reference_dataset_id: referenceId,
        current_dataset_id: currentId
      })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Spatial comparison failed');
    }
    return res.json();
  },

  async temporalAnalysis(baselineId: string, subsequentId: string): Promise<any> {
    const res = await fetch(`${API_BASE}/datasets/temporal`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        baseline_dataset_id: baselineId,
        subsequent_dataset_id: subsequentId
      })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Temporal analysis failed');
    }
    return res.json();
  },

  // GIS Map & Feature APIs: /api/gis/*
  async getGISDatasets(sourceType?: string): Promise<any[]> {
    const url = sourceType ? `${API_BASE}/gis/datasets?source_type=${encodeURIComponent(sourceType)}` : `${API_BASE}/gis/datasets`;
    const res = await fetch(url);
    if (!res.ok) return [];
    return res.json();
  },

  async getGISDataset(id: string): Promise<any> {
    const res = await fetch(`${API_BASE}/gis/datasets/${id}`);
    if (!res.ok) return null;
    return res.json();
  },

  async getGISLayers(datasetId?: string): Promise<any> {
    const url = datasetId ? `${API_BASE}/gis/layers?dataset_id=${encodeURIComponent(datasetId)}` : `${API_BASE}/gis/layers`;
    const res = await fetch(url);
    if (!res.ok) return null;
    return res.json();
  },

  async getGISParcels(params?: { search?: string; zone?: string; status?: string; dataset_id?: string; mode?: string }): Promise<any[]> {
    const q = new URLSearchParams();
    if (params?.search) q.append('search', params.search);
    if (params?.zone) q.append('zone', params.zone);
    if (params?.status) q.append('status', params.status);
    if (params?.dataset_id) q.append('dataset_id', params.dataset_id);
    if (params?.mode) q.append('mode', params.mode);
    const qs = q.toString() ? `?${q.toString()}` : '';
    const res = await fetch(`${API_BASE}/gis/parcels${qs}`);
    if (!res.ok) return [];
    return res.json();
  },

  async getGISBuildings(datasetId?: string, mode: string = 'real'): Promise<any[]> {
    const q = new URLSearchParams({ mode });
    if (datasetId) q.append('dataset_id', datasetId);
    const res = await fetch(`${API_BASE}/gis/buildings?${q.toString()}`);
    if (!res.ok) return [];
    return res.json();
  },

  async getGISRoads(datasetId?: string, mode: string = 'real'): Promise<any[]> {
    const q = new URLSearchParams({ mode });
    if (datasetId) q.append('dataset_id', datasetId);
    const res = await fetch(`${API_BASE}/gis/roads?${q.toString()}`);
    if (!res.ok) return [];
    return res.json();
  },

  async createGISParcel(data: any): Promise<any> {
    const res = await fetch(`${API_BASE}/gis/parcels`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Failed to create parcel');
    }
    return res.json();
  },

  async updateGISParcel(id: string, data: any): Promise<any> {
    const res = await fetch(`${API_BASE}/gis/parcels/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Failed to update parcel');
    }
    return res.json();
  },

  async deleteGISParcel(id: string): Promise<any> {
    const res = await fetch(`${API_BASE}/gis/parcels/${id}`, {
      method: 'DELETE'
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Failed to delete parcel');
    }
    return res.json();
  }
};


