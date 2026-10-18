import React, { useState } from 'react';
import { Workspace, Board } from '../../types';
import { useAuthStore } from '../../store/useAuthStore';
import { useToastStore } from '../../store/useToastStore';
import { api } from '../../services/api';
import { Avatar } from '../common/Avatar';
import {
  Kanban,
  ChevronDown,
  Plus,
  Copy,
  LogOut,
  FolderKanban,
  PanelLeftClose,
  PanelLeftOpen,
  UserPlus,
  Check,
  Shield,
  Users,
} from 'lucide-react';
import { InviteMemberModal } from './InviteMemberModal';
import { useThemeStore } from '../../store/useThemeStore';

interface SidebarProps {
  workspaces: Workspace[];
  activeWorkspace: Workspace | null;
  onSelectWorkspace: (ws: Workspace) => void;
  boards: Board[];
  activeBoardId: string | null;
  onSelectBoard: (boardId: string) => void;
  onRefreshData: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  workspaces,
  activeWorkspace,
  onSelectWorkspace,
  boards,
  activeBoardId,
  onSelectBoard,
  onRefreshData,
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isWorkspaceMenuOpen, setIsWorkspaceMenuOpen] = useState(false);
  const [showNewBoardModal, setShowNewBoardModal] = useState(false);
  const [showNewWorkspaceModal, setShowNewWorkspaceModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);

  // Form states
  const [newBoardTitle, setNewBoardTitle] = useState('');
  const [newBoardDesc, setNewBoardDesc] = useState('');
  const [newWsName, setNewWsName] = useState('');
  const [newWsDesc, setNewWsDesc] = useState('');
  const [inviteCodeInput, setInviteCodeInput] = useState('');
  const [copiedCode, setCopiedCode] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { user, logout } = useAuthStore();
  const { addToast } = useToastStore();
  const { isDark } = useThemeStore();

  const handleCopyInviteCode = () => {
    if (!activeWorkspace?.inviteCode) return;
    navigator.clipboard.writeText(activeWorkspace.inviteCode);
    setCopiedCode(true);
    addToast('Kode undangan ruang kerja disalin ke clipboard!', 'success');
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleCreateBoard = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeWorkspace) return;
    setIsSubmitting(true);
    try {
      const res = await api.post('/boards', {
        title: newBoardTitle,
        description: newBoardDesc,
        workspaceId: activeWorkspace.id,
      });
      addToast(`Board "${newBoardTitle}" berhasil dibuat!`, 'success');
      setShowNewBoardModal(false);
      setNewBoardTitle('');
      setNewBoardDesc('');
      onRefreshData();
      if (res.data?.board?.id) {
        onSelectBoard(res.data.board.id);
      }
    } catch (err: any) {
      addToast(err.response?.data?.error || 'Gagal membuat board', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateWorkspace = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const res = await api.post('/workspaces', {
        name: newWsName,
        description: newWsDesc,
      });
      addToast(`Workspace "${newWsName}" berhasil dibuat!`, 'success');
      setShowNewWorkspaceModal(false);
      setNewWsName('');
      setNewWsDesc('');
      onRefreshData();
      if (res.data?.workspace) {
        onSelectWorkspace(res.data.workspace);
      }
    } catch (err: any) {
      addToast(err.response?.data?.error || 'Gagal membuat workspace', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleJoinWorkspace = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const res = await api.post('/workspaces/join', {
        inviteCode: inviteCodeInput.trim(),
      });
      addToast(res.data?.message || 'Berhasil bergabung!', 'success');
      setShowJoinModal(false);
      setInviteCodeInput('');
      onRefreshData();
    } catch (err: any) {
      addToast(err.response?.data?.error || 'Gagal bergabung dengan kode undangan', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <aside
        className={`h-screen flex flex-col transition-all duration-300 select-none z-30 shrink-0 border-r ${
          isDark
            ? 'bg-slate-900 text-slate-300 border-slate-800'
            : 'bg-white text-slate-700 border-slate-200 shadow-2xs'
        } ${isCollapsed ? 'w-16' : 'w-64'}`}
      >
        {/* Top Header: Workspace Selector */}
        <div className={`h-14 border-b flex items-center justify-between px-3.5 relative ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
          {!isCollapsed ? (
            <div className="relative flex-1 min-w-0 mr-2">
              <button
                type="button"
                onClick={() => setIsWorkspaceMenuOpen(!isWorkspaceMenuOpen)}
                className={`w-full flex items-center justify-between gap-2 p-1.5 rounded-lg transition-colors text-left ${
                  isDark ? 'hover:bg-slate-800/80' : 'hover:bg-slate-100'
                }`}
              >
                <div className="flex items-center gap-2.5 truncate">
                  <div className="w-6 h-6 rounded-md bg-indigo-600 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-sm">
                    {activeWorkspace?.name?.[0]?.toUpperCase() || 'W'}
                  </div>
                  <span className={`font-semibold text-sm truncate ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>
                    {activeWorkspace?.name || 'Pilih Ruang Kerja'}
                  </span>
                </div>
                <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
              </button>

              {/* Dropdown Workspace */}
              {isWorkspaceMenuOpen && (
                <div className={`absolute top-12 left-0 w-64 border rounded-xl shadow-2xl py-1.5 z-50 text-xs ${
                  isDark ? 'bg-slate-900 border-slate-700/80 text-slate-300' : 'bg-white border-slate-200 text-slate-700'
                }`}>
                  <div className="px-3 py-1.5 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                    Daftar Ruang Kerja
                  </div>
                  <div className="max-h-48 overflow-y-auto">
                    {workspaces.map((ws) => (
                      <button
                        key={ws.id}
                        type="button"
                        onClick={() => {
                          onSelectWorkspace(ws);
                          setIsWorkspaceMenuOpen(false);
                        }}
                        className={`w-full text-left px-3 py-2 flex items-center justify-between transition-colors ${
                          activeWorkspace?.id === ws.id
                            ? (isDark ? 'bg-slate-800/90 text-indigo-400 font-medium' : 'bg-indigo-50 text-indigo-600 font-semibold')
                            : (isDark ? 'text-slate-300 hover:bg-slate-800' : 'text-slate-600 hover:bg-slate-100')
                        }`}
                      >
                        <span className="truncate">{ws.name}</span>
                        {activeWorkspace?.id === ws.id && <Check className="w-3.5 h-3.5 text-indigo-400" />}
                      </button>
                    ))}
                  </div>

                  <div className="border-t border-slate-800 my-1" />

                  <button
                    type="button"
                    onClick={() => {
                      setIsWorkspaceMenuOpen(false);
                      setShowNewWorkspaceModal(true);
                    }}
                    className="w-full text-left px-3 py-2 text-indigo-400 hover:bg-slate-800 flex items-center gap-2 transition-colors font-medium"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Buat Ruang Kerja Baru</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setIsWorkspaceMenuOpen(false);
                      setShowInviteModal(true);
                    }}
                    className="w-full text-left px-3 py-2 text-indigo-400 hover:bg-slate-800 flex items-center gap-2 transition-colors font-medium"
                  >
                    <Users className="w-3.5 h-3.5" />
                    <span>Kelola & Undang Anggota Tim</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setIsWorkspaceMenuOpen(false);
                      setShowJoinModal(true);
                    }}
                    className="w-full text-left px-3 py-2 text-slate-300 hover:bg-slate-800 flex items-center gap-2 transition-colors"
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    <span>Gabung via Kode Undangan</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="w-full flex justify-center">
              <div className="w-7 h-7 rounded-md bg-indigo-600 text-white flex items-center justify-center font-bold text-xs shadow-sm">
                {activeWorkspace?.name?.[0]?.toUpperCase() || 'W'}
              </div>
            </div>
          )}

          {/* Collapse Toggle */}
          <button
            type="button"
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors shrink-0"
            title={isCollapsed ? 'Perluas Sidebar' : 'Ciutkan Sidebar'}
          >
            {isCollapsed ? <PanelLeftOpen className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
          </button>
        </div>

        {/* Invite Code Bar (when expanded) */}
        {!isCollapsed && activeWorkspace && (
          <div className={`px-3.5 py-2.5 border-b flex items-center justify-between text-xs ${
            isDark ? 'border-slate-800/80 bg-slate-950/40' : 'border-slate-200 bg-slate-50'
          }`}>
            <div className="truncate mr-2">
              <div className="flex items-center gap-1.5 mb-0.5">
                <span className="text-slate-400 text-[10px]">KODE UNDANGAN</span>
                {activeWorkspace.userRole && (
                  <span className={`text-[9px] px-1.5 py-0.2 rounded font-bold uppercase ${
                    isDark ? 'bg-indigo-500/20 text-indigo-300' : 'bg-indigo-100 text-indigo-700'
                  }`}>
                    {activeWorkspace.userRole}
                  </span>
                )}
              </div>
              <span className={`font-mono text-[11px] font-semibold tracking-wider ${
                isDark ? 'text-indigo-300' : 'text-indigo-600'
              }`}>
                {activeWorkspace.inviteCode}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setShowInviteModal(true)}
                className={`p-1.5 rounded-md transition-colors shrink-0 ${
                  isDark ? 'hover:bg-slate-800 text-indigo-400 hover:text-indigo-300' : 'hover:bg-slate-200/70 text-indigo-600'
                }`}
                title="Kelola & Undang Anggota (Email / Role)"
              >
                <UserPlus className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={handleCopyInviteCode}
                className={`p-1.5 rounded-md transition-colors shrink-0 ${
                  isDark ? 'hover:bg-slate-800 text-slate-400 hover:text-slate-200' : 'hover:bg-slate-200/70 text-slate-500 hover:text-slate-800'
                }`}
                title="Salin kode undangan"
              >
                {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>
        )}

        {/* Middle Navigation: Boards List */}
        <div className="flex-1 overflow-y-auto px-2.5 py-4 space-y-1">
          {!isCollapsed && (
            <div className="flex items-center justify-between px-2 mb-2">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                Papan Kanban
              </span>
              <button
                type="button"
                onClick={() => setShowNewBoardModal(true)}
                className={`p-1 rounded transition-colors ${
                  isDark ? 'hover:bg-slate-800 text-slate-400 hover:text-indigo-400' : 'hover:bg-slate-100 text-slate-500 hover:text-indigo-600'
                }`}
                title="Tambah Papan Baru"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {boards.map((b) => {
            const isActive = b.id === activeBoardId;
            return (
              <button
                key={b.id}
                type="button"
                onClick={() => onSelectBoard(b.id)}
                title={b.title}
                className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm transition-all duration-150 ${
                  isActive
                    ? 'bg-indigo-600 text-white font-medium shadow-sm'
                    : isDark
                      ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/70'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                } ${isCollapsed ? 'justify-center px-0' : ''}`}
              >
                <FolderKanban className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : (isDark ? 'text-slate-400' : 'text-slate-500')}`} />
                {!isCollapsed && <span className="truncate text-left text-xs">{b.title}</span>}
              </button>
            );
          })}

          {boards.length === 0 && !isCollapsed && (
            <div className="px-2 py-4 text-center text-xs text-slate-500">
              Belum ada papan kerja.
              <button
                type="button"
                onClick={() => setShowNewBoardModal(true)}
                className="mt-2 text-indigo-400 hover:text-indigo-300 block w-full underline"
              >
                + Buat papan pertama
              </button>
            </div>
          )}
        </div>

        {/* Bottom Footer: User Profile & Logout */}
        <div className={`border-t p-3 ${isDark ? 'border-slate-800 bg-slate-950/30' : 'border-slate-200 bg-slate-50/70'}`}>
          <div className={`flex items-center gap-2.5 ${isCollapsed ? 'justify-center' : 'justify-between'}`}>
            <div className="flex items-center gap-2.5 min-w-0">
              <Avatar name={user?.name || 'User'} avatarUrl={user?.avatarUrl} size="sm" />
              {!isCollapsed && (
                <div className="min-w-0 text-left">
                  <div className={`text-xs font-semibold truncate ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>{user?.name}</div>
                  <div className="text-[10px] text-slate-400 truncate">{user?.email}</div>
                </div>
              )}
            </div>

            {!isCollapsed && (
              <button
                type="button"
                onClick={logout}
                className={`p-1.5 rounded-lg transition-colors ${
                  isDark ? 'text-slate-400 hover:text-rose-400 hover:bg-slate-800' : 'text-slate-400 hover:text-rose-600 hover:bg-slate-200/70'
                }`}
                title="Keluar dari akun"
              >
                <LogOut className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </aside>

      {/* Modal Buat Board Baru */}
      {showNewBoardModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <h3 className="text-lg font-bold text-slate-900">Buat Papan Kanban Baru</h3>
            <p className="text-xs text-slate-500 mt-1 mb-4">
              Papan baru akan otomatis dilengkapi dengan 3 daftar default: To Do, In Progress, dan Done.
            </p>
            <form onSubmit={handleCreateBoard} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Judul Papan</label>
                <input
                  type="text"
                  required
                  value={newBoardTitle}
                  onChange={(e) => setNewBoardTitle(e.target.value)}
                  placeholder="Contoh: Sprint 25 - Fitur Notifikasi"
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Deskripsi (Opsional)</label>
                <textarea
                  rows={3}
                  value={newBoardDesc}
                  onChange={(e) => setNewBoardDesc(e.target.value)}
                  placeholder="Penjelasan singkat mengenai tujuan papan kerja ini..."
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>
              <div className="flex justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setShowNewBoardModal(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm disabled:opacity-50"
                >
                  {isSubmitting ? 'Menyimpan...' : 'Buat Papan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Buat Workspace Baru */}
      {showNewWorkspaceModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <h3 className="text-lg font-bold text-slate-900">Buat Ruang Kerja Baru</h3>
            <p className="text-xs text-slate-500 mt-1 mb-4">
              Kelola proyek dan undang anggota tim untuk berkolaborasi bersama.
            </p>
            <form onSubmit={handleCreateWorkspace} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Nama Ruang Kerja</label>
                <input
                  type="text"
                  required
                  value={newWsName}
                  onChange={(e) => setNewWsName(e.target.value)}
                  placeholder="Contoh: Marketing & Growth Team"
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Deskripsi (Opsional)</label>
                <textarea
                  rows={2}
                  value={newWsDesc}
                  onChange={(e) => setNewWsDesc(e.target.value)}
                  placeholder="Fokus dan ruang lingkup tim ini..."
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>
              <div className="flex justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setShowNewWorkspaceModal(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm disabled:opacity-50"
                >
                  {isSubmitting ? 'Membuat...' : 'Buat Ruang Kerja'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Gabung Workspace via Invite Code */}
      {showJoinModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <h3 className="text-lg font-bold text-slate-900">Gabung Ruang Kerja</h3>
            <p className="text-xs text-slate-500 mt-1 mb-4">
              Masukkan kode undangan yang diberikan oleh Administrator ruang kerja.
            </p>
            <form onSubmit={handleJoinWorkspace} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Kode Undangan</label>
                <input
                  type="text"
                  required
                  value={inviteCodeInput}
                  onChange={(e) => setInviteCodeInput(e.target.value)}
                  placeholder="Contoh: LINEAR-DEV-2025"
                  className="w-full px-3 py-2 text-sm font-mono uppercase tracking-wider border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>
              <div className="flex justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setShowJoinModal(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm disabled:opacity-50"
                >
                  {isSubmitting ? 'Memeriksa...' : 'Gabung Sekarang'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Modal Undang Anggota & Kelola Role */}
      {showInviteModal && activeWorkspace && (
        <InviteMemberModal
          isOpen={showInviteModal}
          onClose={() => setShowInviteModal(false)}
          workspace={activeWorkspace}
          onRefresh={onRefreshData}
        />
      )}
    </>
  );
};
