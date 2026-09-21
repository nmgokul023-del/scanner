import {
  Parcel,
  Conflict,
  GroundTruthTask,
  ChangeDetectionItem,
  TopologyIssue,
  AuditLogEntry,
  Project
} from '../types';

const API_BASE = 'http://127.0.0.1:8000/api';

export const apiClient = {
  async login(email: string, password?: string) {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      const error: any = new Error(errData.detail || 'Invalid email or password');
      error.status = res.status;
      error.detail = errData.detail;
      throw error;
    }
    return res.json();
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

  async getParcels(query?: string, zone?: string, status?: string): Promise<Parcel[]> {
    const params = new URLSearchParams();
    if (query) params.append('search', query);
    if (zone) params.append('zone', zone);
    if (status) params.append('status', status);
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

  async getGeoJSON(): Promise<any> {
    const res = await fetch(`${API_BASE}/gis/geojson`);
    return res.json();
  },

  async getBuildings(): Promise<any[]> {
    const res = await fetch(`${API_BASE}/buildings`);
    return res.json();
  },

  async getRoads(): Promise<any[]> {
    const res = await fetch(`${API_BASE}/roads`);
    return res.json();
  },

  async getConflicts(): Promise<Conflict[]> {
    const res = await fetch(`${API_BASE}/conflicts`);
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

  async getGroundTruthTasks(): Promise<GroundTruthTask[]> {
    const res = await fetch(`${API_BASE}/ground-truth`);
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
  async getDashboardStatistics(): Promise<any> {
    const res = await fetch(`${API_BASE}/dashboard/statistics`);
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
  }
};


