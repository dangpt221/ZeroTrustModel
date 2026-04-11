import React from "react";
import { User } from "../../types";
import { X, Clock, Monitor, ShieldCheck, Trash2 } from "lucide-react";

interface StaffActionModalProps {
  user: User | null;
  isOpen: boolean;
  onClose: () => void;
  onDelete?: () => void;
}

const MOCK_LOGS = [
  { id: "1", action: "LOGIN", timestamp: new Date().toISOString() },
];

export const StaffActionModal: React.FC<StaffActionModalProps> = ({ user, isOpen, onClose, onDelete }) => {
  if (!isOpen || !user) return null;

  const logs = MOCK_LOGS;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/60" onClick={onClose}></div>
      <div className="bg-white w-full max-w-2xl rounded-[40px] shadow-2xl relative z-10 overflow-hidden">
        <div className="p-4 md:p-8 border-b border-slate-50 flex justify-between items-center bg-sky-50/30">
          <div className="flex items-center gap-4">
            <img src={user.avatar} className="w-16 h-16 rounded-[24px] object-cover ring-4 ring-white" alt="" />
            <div>
              <h3 className="text-xl font-black text-slate-800">{user.name}</h3>
              <p className="text-sm text-slate-500 font-medium">{user.role}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 bg-white rounded-2xl shadow-sm">
            <X size={24} />
          </button>
        </div>

        <div className="p-4 md:p-8 grid grid-cols-2 gap-4 md:gap-8">
          <div className="space-y-4">
            <h4 className="font-black text-xs uppercase text-sky-600">Device Info</h4>
            <div className="bg-slate-50 p-4 rounded-2xl space-y-3">
              <div className="flex items-center gap-3">
                <Monitor size={16} />
                <span className="text-xs">{user.device || "-"}</span>
              </div>
              <div className="flex items-center gap-3">
                <ShieldCheck size={16} />
                <span className="text-xs">{user.mfaEnabled ? "Active" : "Inactive"}</span>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h4 className="font-black text-xs uppercase text-indigo-600">History</h4>
            <div className="space-y-2">
              {logs.map((log) => (
                <div key={log.id} className="text-xs">
                  <span className="font-bold">{log.action}</span>
                  <p className="text-slate-400">{new Date(log.timestamp).toLocaleTimeString()}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="p-4 md:p-6 bg-slate-50 flex justify-end gap-3">
          {onDelete && (
            <button
              onClick={() => {
                onDelete();
                onClose();
              }}
              className="px-4 py-2 bg-rose-50 text-rose-600 rounded-xl text-xs font-bold"
            >
              Delete
            </button>
          )}
          <button onClick={onClose} className="px-4 py-2 bg-slate-200 text-slate-700 rounded-xl text-xs font-bold">
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
