import React, { useState, useEffect } from 'react';
import {
  UserCheck,
  RefreshCw,
  Mail,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Clock,
  Info,
  Loader2,
  UserX,
} from 'lucide-react';
import { verificationService } from '../../services/verification.service';

interface UnverifiedUser {
  id: string;
  email: string;
  name: string;
  role: string;
  created: string;
  updated: string;
}

export const AdminVerificationPanel: React.FC = () => {
  const [users, setUsers] = useState<UnverifiedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [verifyingId, setVerifyingId] = useState<string | null>(null);
  const [featureAvailable, setFeatureAvailable] = useState(true);

  useEffect(() => {
    loadUnverifiedUsers();
    let interval = setInterval(loadUnverifiedUsers, 30000);
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        loadUnverifiedUsers();
        interval = setInterval(loadUnverifiedUsers, 30000);
      } else {
        clearInterval(interval);
      }
    };
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, []);

  const loadUnverifiedUsers = async () => {
    setLoading(true);
    const result = await verificationService.getUnverifiedUsers();

    if (result.success) {
      setUsers(result.users);
      setMessage(null);
      setFeatureAvailable(true);
    } else {
      if (result.error?.includes('Unauthorized') || result.error?.includes('Forbidden') || result.error?.includes('404')) {
        setFeatureAvailable(false);
        setMessage(null);
      } else {
        setMessage({ text: result.error || 'Failed to load unverified users', type: 'error' });
      }
      setUsers([]);
    }

    setLoading(false);
  };

  const handleVerifyUser = async (userId: string, email: string) => {
    setVerifyingId(userId);
    setMessage(null);

    const result = await verificationService.manuallyVerifyUser(userId);

    if (result.success) {
      setMessage({ text: `${email || 'User'} verified successfully!`, type: 'success' });
      await loadUnverifiedUsers();
    } else {
      setMessage({ text: result.message || 'Verification failed', type: 'error' });
    }

    setVerifyingId(null);
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return 'N/A';
    try {
      return new Date(dateStr).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateStr;
    }
  };

  if (!featureAvailable && !loading) {
    return null;
  }

  return (
    <div className="bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 md:p-8 shadow-sm space-y-6 transition-colors">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200/60 dark:border-emerald-800/60 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shadow-xs">
            <UserCheck size={22} />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">
              Pending User Verification
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Manually activate team accounts when email confirmation is delayed or bypassed
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800/80 px-3 py-1.5 rounded-xl border border-slate-200/60 dark:border-slate-700/60">
            {loading ? 'Checking...' : `${users.length} pending`}
          </span>

          <button
            onClick={loadUnverifiedUsers}
            disabled={loading}
            className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold rounded-xl border border-slate-200/60 dark:border-slate-700/60 transition-all cursor-pointer disabled:opacity-50"
            title="Refresh unverified users list"
          >
            <RefreshCw size={13} className={loading ? 'animate-spin text-emerald-600' : ''} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Status Message Alert */}
      {message && (
        <div
          className={`flex items-center gap-3 p-4 rounded-2xl text-xs font-semibold border ${
            message.type === 'success'
              ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800/60 text-emerald-800 dark:text-emerald-300'
              : 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800/60 text-rose-800 dark:text-rose-300'
          }`}
        >
          {message.type === 'success' ? (
            <CheckCircle2 size={16} className="text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
          ) : (
            <AlertCircle size={16} className="text-rose-600 dark:text-rose-400 flex-shrink-0" />
          )}
          <span>{message.text}</span>
        </div>
      )}

      {/* Main Content Area */}
      {loading ? (
        <div className="py-12 flex flex-col items-center justify-center text-center space-y-3">
          <Loader2 size={28} className="animate-spin text-emerald-600 dark:text-emerald-400" />
          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
            Checking verified status against identity database...
          </p>
        </div>
      ) : users.length === 0 ? (
        <div className="py-8 px-6 bg-emerald-50/70 dark:bg-emerald-950/20 border border-emerald-200/80 dark:border-emerald-900/40 rounded-2xl text-center flex flex-col items-center justify-center space-y-2">
          <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-1">
            <CheckCircle2 size={20} />
          </div>
          <p className="text-sm font-bold text-emerald-900 dark:text-emerald-300">
            All users are fully verified
          </p>
          <p className="text-xs text-emerald-700/80 dark:text-emerald-400/80 max-w-md">
            No accounts are currently awaiting email verification in EcoGlobal Trading BD.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-slate-200/80 dark:border-slate-800">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 uppercase tracking-wider font-bold border-b border-slate-200/80 dark:border-slate-800 text-[10px]">
              <tr>
                <th className="py-3 px-4">User</th>
                <th className="py-3 px-4">Role</th>
                <th className="py-3 px-4">Registered Date</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
              {users.map(user => (
                <tr
                  key={user.id}
                  className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
                >
                  <td className="py-3.5 px-4">
                    <div className="font-bold text-slate-900 dark:text-white">
                      {user.name || 'Unnamed Employee'}
                    </div>
                    {user.email ? (
                      <code className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
                        {user.email}
                      </code>
                    ) : (
                      <span className="text-[11px] text-slate-400 font-mono italic">
                        ID: {user.id.slice(0, 8)}...
                      </span>
                    )}
                  </td>
                  <td className="py-3.5 px-4">
                    <span
                      className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        user.role === 'ADMIN'
                          ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800/50'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                      }`}
                    >
                      {user.role || 'STAFF'}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-slate-600 dark:text-slate-400">
                    <div className="flex items-center gap-1.5">
                      <Clock size={12} className="text-slate-400" />
                      <span>{formatDate(user.created)}</span>
                    </div>
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <button
                      onClick={() => handleVerifyUser(user.id, user.email)}
                      disabled={verifyingId === user.id}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-semibold text-xs rounded-xl shadow-xs transition-all cursor-pointer disabled:opacity-50"
                    >
                      {verifyingId === user.id ? (
                        <Loader2 size={13} className="animate-spin" />
                      ) : (
                        <ShieldCheck size={13} />
                      )}
                      <span>Verify Account</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Supabase Verification Guidance Note */}
      <div className="p-4 bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 rounded-2xl space-y-2">
        <div className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300">
          <Info size={14} className="text-indigo-600 dark:text-cyan-400 flex-shrink-0" />
          <span>About Manual User Verification</span>
        </div>
        <ul className="text-xs text-slate-500 dark:text-slate-400 space-y-1.5 pl-6 list-disc leading-relaxed">
          <li>Use manual verification when an invited user has not received their Supabase email or needs instant access.</li>
          <li>Once verified, the user can log in immediately using their registered credentials.</li>
          <li>For automated delivery, verify that your project's custom SMTP provider is enabled in the Supabase Dashboard under <strong>Authentication &rarr; Email Templates</strong>.</li>
        </ul>
      </div>
    </div>
  );
};
