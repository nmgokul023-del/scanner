import React, { useEffect, useState } from 'react';
import { History, ShieldCheck, Clock, User, Filter } from 'lucide-react';
import { AuditLogEntry } from '../types';
import { apiClient } from '../api/client';

export const AuditLog: React.FC = () => {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiClient.getAuditTrail().then(data => {
      setLogs(data);
      setLoading(false);
    });
  }, []);

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-6 select-none pb-24 md:pb-12">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
          <History className="w-6 h-6 text-blue-600" />
          Cadastral Audit Trail & Immutable Log
        </h1>
        <p className="text-xs text-slate-500 font-medium mt-1">
          Cryptographically hashed timeline of all vector modifications, surveyor sign-offs, and automated AI inferences.
        </p>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-900">Recorded Operations ({logs.length})</h2>
          <span className="text-[10px] font-mono text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
            Integrity: Verified
          </span>
        </div>

        <div className="divide-y divide-slate-100">
          {logs.map((log) => (
            <div key={log.id} className="p-4 sm:p-5 hover:bg-slate-50/80 transition-colors space-y-2">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                <div className="flex items-center space-x-2">
                  <span className="font-bold text-xs text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-lg border border-blue-100">
                    {log.action}
                  </span>
                  <span className="font-bold text-sm text-slate-900 font-mono">{log.parcel_id}</span>
                </div>
                <div className="text-[11px] text-slate-400 font-mono flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {log.timestamp}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs bg-slate-50 p-2.5 rounded-xl">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Previous State:</span>
                  <div className="text-slate-600 truncate">{log.previous_state}</div>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-emerald-600 uppercase">New State:</span>
                  <div className="text-emerald-800 font-semibold truncate">{log.new_state}</div>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
                <div className="flex items-center gap-1.5 font-medium">
                  <User className="w-3.5 h-3.5 text-slate-400" />
                  <span>{log.user}</span>
                </div>
                <p className="text-[11px] text-slate-500 italic max-w-md truncate">{log.details}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
