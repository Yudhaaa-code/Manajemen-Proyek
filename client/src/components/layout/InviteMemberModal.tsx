import React, { useState } from 'react';
import { Workspace, WorkspaceMember, Role } from '../../types';
import { api } from '../../services/api';
import { useAuthStore } from '../../store/useAuthStore';
import { useToastStore } from '../../store/useToastStore';
import { Avatar } from '../common/Avatar';
import {
  X,
  Mail,
  Shield,
  UserCheck,
  UserX,
  Copy,
  Check,
  Send,
  Users,
  Eye,
} from 'lucide-react';

interface InviteMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  workspace: Workspace;
  onRefresh: () => void;
}

export const InviteMemberModal: React.FC<InviteMemberModalProps> = ({
  isOpen,
  onClose,
  workspace,
  onRefresh,
}) => {
  const { user } = useAuthStore();
  const { addToast } = useToastStore();

  const [email, setEmail] = useState('');
  const [role, setRole] = useState<Role>('MEMBER');
  const [isSending, setIsSending] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  if (!isOpen) return null;

  const currentMember = workspace.members?.find((m) => m.userId === user?.id);
  const isAdmin = currentMember?.role === 'ADMIN' || workspace.userRole === 'ADMIN';

  const handleSendInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setIsSending(true);
    try {
      const res = await api.post(`/workspaces/${workspace.id}/invites`, {
        email: email.trim(),
        role,
      });
      addToast(res.data.message || 'Undangan berhasil dikirim ke email!', 'success');
      setEmail('');
      onRefresh();
    } catch (err: any) {
      addToast(err.response?.data?.error || 'Gagal mengirim undangan', 'error');
    } finally {
      setIsSending(false);
    }
  };

  const handleUpdateRole = async (memberId: string, newRole: Role) => {
    try {
      const res = await api.patch(`/workspaces/${workspace.id}/members/${memberId}/role`, {
        role: newRole,
      });
      addToast(res.data.message || 'Peran anggota berhasil diubah', 'success');
      onRefresh();
    } catch (err: any) {
      addToast(err.response?.data?.error || 'Gagal mengubah peran anggota', 'error');
    }
  };

  const handleRemoveMember = async (memberId: string, memberName: string) => {
    if (!window.confirm(`Yakin ingin mengeluarkan ${memberName} dari workspace ini?`)) return;

    try {
      const res = await api.delete(`/workspaces/${workspace.id}/members/${memberId}`);
      addToast(res.data.message || 'Anggota berhasil dikeluarkan', 'success');
      onRefresh();
    } catch (err: any) {
      addToast(err.response?.data?.error || 'Gagal mengeluarkan anggota', 'error');
    }
  };

  const handleCopyInviteCode = () => {
    navigator.clipboard.writeText(workspace.inviteCode);
    setCopiedCode(true);
    addToast('Kode ruang kerja berhasil disalin!', 'success');
    setTimeout(() => setCopiedCode(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-lg w-full max-h-[85vh] flex flex-col shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden text-slate-800 dark:text-slate-100">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/70 dark:bg-slate-900/70">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Kolaborasi Tim: {workspace.name}
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Kelola anggota dan hak akses peran (Role RBAC)
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Invite Form (Admins only) */}
          {isAdmin ? (
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-3">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                Kirim Undangan ke Gmail Anggota
              </label>

              <form onSubmit={handleSendInvite} className="space-y-3">
                <div className="flex flex-col sm:flex-row gap-2">
                  <div className="relative flex-1">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="email"
                      required
                      placeholder="rekan@gmail.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    />
                  </div>

                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value as Role)}
                    className="text-xs px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-100 font-medium focus:outline-none"
                  >
                    <option value="MEMBER">Member (Editor)</option>
                    <option value="VIEWER">Viewer (Hanya Lihat)</option>
                    <option value="ADMIN">Admin (Akses Penuh)</option>
                  </select>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <span className="text-[11px] text-slate-400 dark:text-slate-500">
                    Sistem akan mengirimkan email undangan ber-tautan 1-klik masuk.
                  </span>
                  <button
                    type="submit"
                    disabled={isSending || !email.trim()}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer disabled:opacity-50 transition-all shadow-xs shrink-0"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>{isSending ? 'Mengirim...' : 'Kirim Undangan'}</span>
                  </button>
                </div>
              </form>
            </div>
          ) : (
            <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/40 text-amber-800 dark:text-amber-300 text-xs">
              Hanya Admin ruang kerja yang dapat mengundang anggota baru atau mengubah peran.
            </div>
          )}

          {/* Quick Invite Code Copy Box */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-slate-100/70 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 text-xs">
            <div>
              <span className="text-[11px] text-slate-500 dark:text-slate-400 block font-medium">
                Kode Undangan Workspace:
              </span>
              <span className="font-mono font-bold text-slate-900 dark:text-slate-100 text-sm">
                {workspace.inviteCode}
              </span>
            </div>
            <button
              type="button"
              onClick={handleCopyInviteCode}
              className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-50 text-slate-700 dark:text-slate-300 font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedCode ? 'Tersalin' : 'Salin Kode'}</span>
            </button>
          </div>

          {/* Member List */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3">
              Daftar Anggota Saat Ini ({workspace.members?.length || 0})
            </h4>

            <div className="space-y-2">
              {workspace.members?.map((m) => {
                const isSelf = m.userId === user?.id;
                return (
                  <div
                    key={m.id}
                    className="flex items-center justify-between p-3 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900/60 text-xs"
                  >
                    <div className="flex items-center gap-2.5 min-w-0 pr-2">
                      <Avatar name={m.user.name} avatarUrl={m.user.avatarUrl} size="sm" />
                      <div className="min-w-0">
                        <div className="font-semibold text-slate-900 dark:text-slate-100 truncate flex items-center gap-1.5">
                          <span>{m.user.name}</span>
                          {isSelf && (
                            <span className="text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-500 px-1.5 py-0.2 rounded font-normal">
                              Anda
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-400 truncate">{m.user.email}</div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {isAdmin && !isSelf ? (
                        <select
                          value={m.role}
                          onChange={(e) => handleUpdateRole(m.id, e.target.value as Role)}
                          className="text-[11px] font-semibold px-2 py-1 rounded bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 focus:outline-none"
                        >
                          <option value="ADMIN">ADMIN</option>
                          <option value="MEMBER">MEMBER</option>
                          <option value="VIEWER">VIEWER</option>
                        </select>
                      ) : (
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase tracking-wider ${
                            m.role === 'ADMIN'
                              ? 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800'
                              : m.role === 'VIEWER'
                              ? 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700'
                              : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800'
                          }`}
                        >
                          {m.role}
                        </span>
                      )}

                      {(isAdmin || isSelf) && (
                        <button
                          type="button"
                          onClick={() => handleRemoveMember(m.id, m.user.name)}
                          className="p-1 rounded text-slate-400 hover:text-rose-600 transition-colors"
                          title={isSelf ? 'Keluar dari workspace' : 'Keluarkan anggota'}
                        >
                          <UserX className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
