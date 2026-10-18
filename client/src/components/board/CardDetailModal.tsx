import React, { useState, useEffect } from 'react';
import { Card, Priority, User, WorkspaceMember, Subtask, Label, Attachment } from '../../types';
import { api } from '../../services/api';
import { useAuthStore } from '../../store/useAuthStore';
import { useToastStore } from '../../store/useToastStore';
import { Avatar } from '../common/Avatar';
import {
  X,
  Trash2,
  Calendar,
  User as UserIcon,
  Tag,
  MessageSquare,
  Send,
  AlertCircle,
  Clock,
  CheckSquare,
  Square,
  Plus,
  Paperclip,
  ExternalLink,
  Check,
  UploadCloud,
  FileUp,
  FileText,
  Image as ImageIcon,
  Download,
  Loader2,
} from 'lucide-react';

interface CardDetailModalProps {
  card: Card;
  members: WorkspaceMember[];
  onClose: () => void;
  onCardUpdated: () => void;
}

const PRESET_LABEL_COLORS = [
  { name: 'Red', hex: '#ef4444' },
  { name: 'Amber', hex: '#f59e0b' },
  { name: 'Emerald', hex: '#10b981' },
  { name: 'Blue', hex: '#3b82f6' },
  { name: 'Purple', hex: '#8b5cf6' },
  { name: 'Pink', hex: '#ec4899' },
];

export const CardDetailModal: React.FC<CardDetailModalProps> = ({
  card,
  members,
  onClose,
  onCardUpdated,
}) => {
  const { user } = useAuthStore();
  const { addToast } = useToastStore();

  const [title, setTitle] = useState(card.title);
  const [description, setDescription] = useState(card.description || '');
  const [priority, setPriority] = useState<Priority>(card.priority);
  const [dueDate, setDueDate] = useState<string>(
    card.dueDate ? new Date(card.dueDate).toISOString().split('T')[0] : ''
  );
  const [assigneeId, setAssigneeId] = useState<string>(card.assigneeId || '');

  // Subtasks State
  const [subtasks, setSubtasks] = useState<Subtask[]>(card.subtasks || []);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');
  const [isAddingSubtask, setIsAddingSubtask] = useState(false);

  // Labels State
  const [labels, setLabels] = useState<Label[]>(card.labels || []);
  const [isAddingLabel, setIsAddingLabel] = useState(false);
  const [newLabelName, setNewLabelName] = useState('');
  const [newLabelColor, setNewLabelColor] = useState('#3b82f6');

  // Attachments State & File Upload
  const [attachments, setAttachments] = useState<Attachment[]>(card.attachments || []);
  const [isAddingAttachment, setIsAddingAttachment] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);

  // Comments State
  const [newComment, setNewComment] = useState('');
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Sync state if card prop changes
  useEffect(() => {
    setTitle(card.title);
    setDescription(card.description || '');
    setPriority(card.priority);
    setDueDate(card.dueDate ? new Date(card.dueDate).toISOString().split('T')[0] : '');
    setAssigneeId(card.assigneeId || '');
    setSubtasks(card.subtasks || []);
    setLabels(card.labels || []);
    setAttachments(card.attachments || []);
  }, [card]);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const handleSaveDetails = async () => {
    setIsSaving(true);
    try {
      await api.patch(`/cards/${card.id}`, {
        title,
        description,
        priority,
        dueDate: dueDate ? new Date(dueDate).toISOString() : null,
        assigneeId: assigneeId || null,
      });
      addToast('Perubahan kartu berhasil disimpan!', 'success');
      onCardUpdated();
    } catch (err: any) {
      addToast(err.response?.data?.error || 'Gagal menyimpan perubahan', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  // Subtask Handlers
  const handleAddSubtask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubtaskTitle.trim()) return;

    try {
      const res = await api.post(`/cards/${card.id}/subtasks`, {
        title: newSubtaskTitle.trim(),
      });
      setSubtasks([...subtasks, res.data.subtask]);
      setNewSubtaskTitle('');
      setIsAddingSubtask(false);
      onCardUpdated();
    } catch (err: any) {
      addToast(err.response?.data?.error || 'Gagal membuat sub-tugas', 'error');
    }
  };

  const handleToggleSubtask = async (subtaskId: string, currentStatus: boolean) => {
    // Optimistic UI update
    setSubtasks(
      subtasks.map((s) => (s.id === subtaskId ? { ...s, completed: !currentStatus } : s))
    );

    try {
      await api.patch(`/cards/subtasks/${subtaskId}`, {
        completed: !currentStatus,
      });
      onCardUpdated();
    } catch (err: any) {
      // Revert on error
      setSubtasks(
        subtasks.map((s) => (s.id === subtaskId ? { ...s, completed: currentStatus } : s))
      );
      addToast(err.response?.data?.error || 'Gagal memperbarui status sub-tugas', 'error');
    }
  };

  const handleDeleteSubtask = async (subtaskId: string) => {
    setSubtasks(subtasks.filter((s) => s.id !== subtaskId));
    try {
      await api.delete(`/cards/subtasks/${subtaskId}`);
      onCardUpdated();
    } catch (err: any) {
      addToast(err.response?.data?.error || 'Gagal menghapus sub-tugas', 'error');
    }
  };

  // Label Handlers
  const handleAddLabel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLabelName.trim()) return;

    try {
      const res = await api.post(`/cards/${card.id}/labels`, {
        name: newLabelName.trim(),
        color: newLabelColor,
      });
      setLabels([...labels, res.data.label]);
      setNewLabelName('');
      setIsAddingLabel(false);
      onCardUpdated();
    } catch (err: any) {
      addToast(err.response?.data?.error || 'Gagal menambahkan label', 'error');
    }
  };

  const handleDeleteLabel = async (labelId: string) => {
    setLabels(labels.filter((l) => l.id !== labelId));
    try {
      await api.delete(`/cards/labels/${labelId}`);
      onCardUpdated();
    } catch (err: any) {
      addToast(err.response?.data?.error || 'Gagal menghapus label', 'error');
    }
  };

  // File Upload Handlers
  const handleFileUpload = async (file: File) => {
    if (!file) return;
    if (file.size > 25 * 1024 * 1024) {
      addToast('Ukuran file maksimal 25 MB', 'error');
      return;
    }

    setIsUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await api.post(`/cards/${card.id}/attachments/upload`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      setAttachments((prev) => [...prev, res.data.attachment]);
      setIsAddingAttachment(false);
      onCardUpdated();
      addToast(`File "${file.name}" berhasil diunggah!`, 'success');
    } catch (err: any) {
      addToast(err.response?.data?.error || 'Gagal mengunggah file', 'error');
    } finally {
      setIsUploading(false);
    }
  };

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  const formatFileSize = (bytes?: number | null) => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const isImageAttachment = (fileName: string, mimeType?: string | null) => {
    const ext = fileName.split('.').pop()?.toLowerCase();
    return ['png', 'jpg', 'jpeg', 'jfif', 'pjpeg', 'pjp', 'gif', 'svg', 'webp', 'bmp', 'avif', 'ico'].includes(ext || '') || !!mimeType?.startsWith('image/');
  };

  const getFileIcon = (fileName: string, mimeType?: string | null) => {
    if (isImageAttachment(fileName, mimeType)) {
      return <ImageIcon className="w-4 h-4 text-emerald-500 shrink-0" />;
    }
    const ext = fileName.split('.').pop()?.toLowerCase();
    if (['pdf', 'doc', 'docx', 'txt', 'rtf'].includes(ext || '')) {
      return <FileText className="w-4 h-4 text-blue-500 shrink-0" />;
    }
    return <Paperclip className="w-4 h-4 text-indigo-500 shrink-0" />;
  };

  const handleDeleteAttachment = async (attachmentId: string) => {
    setAttachments(attachments.filter((a) => a.id !== attachmentId));
    try {
      await api.delete(`/cards/attachments/${attachmentId}`);
      onCardUpdated();
    } catch (err: any) {
      addToast(err.response?.data?.error || 'Gagal menghapus lampiran', 'error');
    }
  };

  // Comment Handlers
  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    setIsSubmittingComment(true);
    try {
      await api.post(`/cards/${card.id}/comments`, {
        content: newComment.trim(),
      });
      setNewComment('');
      addToast('Komentar berhasil ditambahkan', 'success');
      onCardUpdated();
    } catch (err: any) {
      addToast(err.response?.data?.error || 'Gagal mengirim komentar', 'error');
    } finally {
      setIsSubmittingComment(false);
    }
  };

  const handleDeleteCard = async () => {
    if (!window.confirm(`Yakin ingin menghapus kartu "${card.title}"?`)) return;
    try {
      await api.delete(`/cards/${card.id}`);
      addToast('Kartu berhasil dihapus', 'success');
      onCardUpdated();
      onClose();
    } catch (err: any) {
      addToast(err.response?.data?.error || 'Gagal menghapus kartu', 'error');
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    try {
      await api.delete(`/comments/${commentId}`);
      addToast('Komentar dihapus', 'success');
      onCardUpdated();
    } catch (err: any) {
      addToast(err.response?.data?.error || 'Gagal menghapus komentar', 'error');
    }
  };

  // Calculation for subtasks
  const completedCount = subtasks.filter((s) => s.completed).length;
  const progressPercent = subtasks.length > 0 ? Math.round((completedCount / subtasks.length) * 100) : 0;

  // Cover image for modal header preview
  const coverImage = attachments.find((att) => isImageAttachment(att.name, att.type));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden text-slate-800 dark:text-slate-100">
        {/* Cover Preview Banner */}
        {coverImage && (
          <div className="w-full h-44 relative overflow-hidden bg-slate-950 shrink-0 group border-b border-slate-200 dark:border-slate-800">
            <img
              src={coverImage.url}
              alt={coverImage.name}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-black/20" />
            <div className="absolute bottom-3 left-6 flex items-center gap-2">
              <span className="text-[11px] font-medium text-white/95 bg-black/60 backdrop-blur-md px-2.5 py-1 rounded-md flex items-center gap-1.5 shadow-sm">
                <ImageIcon className="w-3.5 h-3.5 text-emerald-400" />
                <span>Foto Sampul: {coverImage.name}</span>
              </span>
            </div>
            <a
              href={coverImage.url}
              target="_blank"
              rel="noopener noreferrer"
              className="absolute top-3 right-14 text-xs bg-black/60 hover:bg-black/80 backdrop-blur-md text-white px-2.5 py-1.5 rounded-lg flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"
              title="Buka gambar di tab baru"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Ukuran Penuh</span>
            </a>
          </div>
        )}

        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/70 dark:bg-slate-900/70">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            <span className="w-2 h-2 rounded-full bg-indigo-600" />
            <span>Rincian Kartu Tugas</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleDeleteCard}
              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
              title="Hapus kartu ini"
            >
              <Trash2 className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200/70 dark:hover:bg-slate-800 transition-colors"
              title="Tutup (Esc)"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Card Title Input */}
          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1">
              Judul Tugas
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={handleSaveDetails}
              className="w-full text-lg font-bold text-slate-900 dark:text-white bg-transparent border-b border-transparent hover:border-slate-300 dark:hover:border-slate-700 focus:border-indigo-600 focus:outline-none transition-colors py-1"
            />
          </div>

          {/* Labels Row */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                <Tag className="w-3.5 h-3.5 text-slate-400" />
                <span>Label & Tag Kategori</span>
              </label>
              <button
                type="button"
                onClick={() => setIsAddingLabel(!isAddingLabel)}
                className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 font-medium"
              >
                <Plus className="w-3 h-3" />
                <span>Tambah Label</span>
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              {labels.map((label) => (
                <span
                  key={label.id}
                  style={{
                    backgroundColor: `${label.color}15`,
                    borderColor: `${label.color}40`,
                    color: label.color,
                  }}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border uppercase tracking-wider"
                >
                  <span>{label.name}</span>
                  <button
                    type="button"
                    onClick={() => handleDeleteLabel(label.id)}
                    className="hover:opacity-75 focus:outline-none"
                    title="Hapus label"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}

              {labels.length === 0 && !isAddingLabel && (
                <span className="text-xs text-slate-400 dark:text-slate-500 italic">
                  Belum ada label. Klik "Tambah Label" untuk memberi tag.
                </span>
              )}
            </div>

            {/* Add Label Form Inline */}
            {isAddingLabel && (
              <form onSubmit={handleAddLabel} className="mt-2.5 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex flex-wrap items-center gap-2">
                <input
                  type="text"
                  placeholder="Nama label (contoh: Bug, Feature, Urgent)..."
                  value={newLabelName}
                  onChange={(e) => setNewLabelName(e.target.value)}
                  className="flex-1 min-w-[160px] text-xs px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
                <div className="flex items-center gap-1">
                  {PRESET_LABEL_COLORS.map((c) => (
                    <button
                      key={c.hex}
                      type="button"
                      onClick={() => setNewLabelColor(c.hex)}
                      className={`w-6 h-6 rounded-full border-2 transition-transform ${
                        newLabelColor === c.hex ? 'scale-110 border-indigo-600' : 'border-transparent hover:scale-105'
                      }`}
                      style={{ backgroundColor: c.hex }}
                    />
                  ))}
                </div>
                <button
                  type="submit"
                  className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-medium"
                >
                  Simpan
                </button>
                <button
                  type="button"
                  onClick={() => setIsAddingLabel(false)}
                  className="px-2.5 py-1.5 text-xs text-slate-500 dark:text-slate-400 hover:text-slate-700"
                >
                  Batal
                </button>
              </form>
            )}
          </div>

          {/* Properties Grid: Priority, Due Date, Assignee */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800">
            {/* Priority Selector */}
            <div>
              <label className="flex items-center gap-1.5 text-xs font-medium text-slate-600 dark:text-slate-300 mb-1.5">
                <Tag className="w-3.5 h-3.5 text-slate-400" />
                <span>Prioritas</span>
              </label>
              <select
                value={priority}
                onChange={(e) => {
                  setPriority(e.target.value as Priority);
                }}
                className="w-full text-xs font-semibold px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-slate-800 dark:text-slate-100"
              >
                <option value="LOW">🟢 Low</option>
                <option value="MEDIUM">🟡 Medium</option>
                <option value="HIGH">🟠 High</option>
                <option value="URGENT">🔴 Urgent</option>
              </select>
            </div>

            {/* Due Date Input */}
            <div>
              <label className="flex items-center gap-1.5 text-xs font-medium text-slate-600 dark:text-slate-300 mb-1.5">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                <span>Tenggat Waktu</span>
              </label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => {
                  setDueDate(e.target.value);
                }}
                className="w-full text-xs px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-slate-800 dark:text-slate-100"
              />
            </div>

            {/* Assignee Selector */}
            <div>
              <label className="flex items-center gap-1.5 text-xs font-medium text-slate-600 dark:text-slate-300 mb-1.5">
                <UserIcon className="w-3.5 h-3.5 text-slate-400" />
                <span>Penanggung Jawab</span>
              </label>
              <select
                value={assigneeId}
                onChange={(e) => {
                  setAssigneeId(e.target.value);
                }}
                className="w-full text-xs px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-slate-800 dark:text-slate-100"
              >
                <option value="">-- Belum Ditugaskan --</option>
                {members.map((m) => (
                  <option key={m.userId} value={m.userId}>
                    {m.user.name} ({m.role})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Description Editor */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Deskripsi
              </label>
              <button
                type="button"
                onClick={handleSaveDetails}
                disabled={isSaving}
                className="text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 transition-colors"
              >
                {isSaving ? 'Menyimpan...' : 'Simpan Perubahan'}
              </button>
            </div>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Tambahkan rincian instruksi, catatan teknis, atau referensi tugas ini..."
              className="w-full p-3 text-xs leading-relaxed border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-white dark:bg-slate-900 transition-all text-slate-800 dark:text-slate-100"
            />
          </div>

          {/* Checklist / Subtasks Section with Progress Bar */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <CheckSquare className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-200">
                  Sub-Tugas / Checklist ({completedCount}/{subtasks.length})
                </span>
              </div>
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                {progressPercent}%
              </span>
            </div>

            {/* Progress Bar */}
            <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden mb-3">
              <div
                className={`h-full rounded-full transition-all duration-300 ${
                  progressPercent === 100 ? 'bg-emerald-500' : 'bg-indigo-600 dark:bg-indigo-500'
                }`}
                style={{ width: `${progressPercent}%` }}
              />
            </div>

            {/* Subtask list */}
            <div className="space-y-1.5 mb-2.5">
              {subtasks.map((st) => (
                <div
                  key={st.id}
                  className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/50 group transition-colors"
                >
                  <button
                    type="button"
                    onClick={() => handleToggleSubtask(st.id, st.completed)}
                    className="flex items-center gap-2.5 text-left flex-1 cursor-pointer focus:outline-none"
                  >
                    <div
                      className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${
                        st.completed
                          ? 'bg-indigo-600 border-indigo-600 text-white'
                          : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900'
                      }`}
                    >
                      {st.completed && <Check className="w-3 h-3 stroke-[3]" />}
                    </div>
                    <span
                      className={`text-xs ${
                        st.completed
                          ? 'line-through text-slate-400 dark:text-slate-500'
                          : 'text-slate-800 dark:text-slate-200'
                      }`}
                    >
                      {st.title}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDeleteSubtask(st.id)}
                    className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-rose-600 p-1 rounded transition-opacity"
                    title="Hapus sub-tugas"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>

            {/* Add subtask input */}
            {isAddingSubtask ? (
              <form onSubmit={handleAddSubtask} className="flex items-center gap-2">
                <input
                  type="text"
                  autoFocus
                  placeholder="Ketik poin sub-tugas baru lalu tekan Enter..."
                  value={newSubtaskTitle}
                  onChange={(e) => setNewSubtaskTitle(e.target.value)}
                  className="flex-1 text-xs px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
                <button
                  type="submit"
                  className="px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-medium cursor-pointer"
                >
                  Tambah
                </button>
                <button
                  type="button"
                  onClick={() => setIsAddingSubtask(false)}
                  className="px-2.5 py-2 text-xs text-slate-500 hover:text-slate-700 dark:text-slate-400 cursor-pointer"
                >
                  Batal
                </button>
              </form>
            ) : (
              <button
                type="button"
                onClick={() => setIsAddingSubtask(true)}
                className="inline-flex items-center gap-1.5 text-xs text-indigo-600 dark:text-indigo-400 hover:underline font-medium cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Tambah butir sub-tugas</span>
              </button>
            )}
          </div>

          {/* Attachments Section */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-200">
                <Paperclip className="w-3.5 h-3.5 text-slate-400" />
                <span>Lampiran File ({attachments.length})</span>
              </label>
              <button
                type="button"
                onClick={() => setIsAddingAttachment(!isAddingAttachment)}
                className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 font-medium cursor-pointer"
              >
                <Plus className="w-3 h-3" />
                <span>{isAddingAttachment ? 'Tutup' : 'Unggah File'}</span>
              </button>
            </div>

            {/* List of uploaded attachments */}
            <div className="space-y-2 mb-3">
              {attachments.map((att) => (
                <div
                  key={att.id}
                  className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800 text-xs transition-colors hover:border-slate-300 dark:hover:border-slate-700"
                >
                  <div className="flex items-center gap-2.5 overflow-hidden mr-2">
                    {isImageAttachment(att.name, att.type) ? (
                      <a
                        href={att.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-10 h-10 rounded-lg overflow-hidden shrink-0 border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 group/thumb relative block"
                        title="Klik untuk melihat ukuran penuh"
                      >
                        <img
                          src={att.url}
                          alt={att.name}
                          className="w-full h-full object-cover transition-transform group-hover/thumb:scale-110"
                          loading="lazy"
                        />
                      </a>
                    ) : (
                      <div className="w-10 h-10 rounded-lg shrink-0 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/80 flex items-center justify-center">
                        {getFileIcon(att.name, att.type)}
                      </div>
                    )}
                    <div className="min-w-0">
                      <div className="font-semibold text-slate-800 dark:text-slate-100 truncate" title={att.name}>
                        {att.name}
                      </div>
                      {att.size ? (
                        <div className="text-[10px] text-slate-400 font-mono">
                          {formatFileSize(att.size)}
                        </div>
                      ) : null}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <a
                      href={att.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      download={att.name}
                      className="px-2.5 py-1 rounded-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 text-[11px] font-medium flex items-center gap-1 transition-all"
                    >
                      <Download className="w-3 h-3" />
                      <span>Unduh / Buka</span>
                    </a>
                    <button
                      type="button"
                      onClick={() => handleDeleteAttachment(att.id)}
                      className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                      title="Hapus file"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}

              {attachments.length === 0 && !isAddingAttachment && (
                <div className="text-center py-4 text-xs text-slate-400 dark:text-slate-500 italic">
                  Belum ada file yang diunggah pada kartu ini.
                </div>
              )}
            </div>

            {/* Hidden native file input */}
            <input
              type="file"
              ref={fileInputRef}
              onChange={(e) => {
                if (e.target.files && e.target.files.length > 0) {
                  handleFileUpload(e.target.files[0]);
                }
              }}
              className="hidden"
            />

            {/* Drag & Drop File Upload Box */}
            {isAddingAttachment && (
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDraggingOver(true);
                }}
                onDragLeave={() => setIsDraggingOver(false)}
                onDrop={handleFileDrop}
                className={`p-6 rounded-2xl border-2 border-dashed transition-all text-center flex flex-col items-center justify-center gap-2.5 ${
                  isDraggingOver
                    ? 'border-indigo-600 bg-indigo-50/60 dark:bg-indigo-950/40 scale-[1.01]'
                    : 'border-slate-300 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/40 hover:border-indigo-400 dark:hover:border-indigo-500 hover:bg-slate-50 dark:hover:bg-slate-800/70'
                }`}
              >
                {isUploading ? (
                  <div className="py-4 flex flex-col items-center gap-2">
                    <Loader2 className="w-7 h-7 text-indigo-600 animate-spin" />
                    <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                      Sedang mengunggah file ke server...
                    </span>
                  </div>
                ) : (
                  <>
                    <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                      <UploadCloud className="w-6 h-6 animate-pulse" />
                    </div>

                    <div>
                      <p className="text-xs font-bold text-slate-800 dark:text-slate-100">
                        Seret file ke sini atau klik tombol di bawah
                      </p>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Mendukung Gambar (PNG, JPG), PDF, Dokumen (Word/Excel), ZIP, dll. (Maks. 25 MB)
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="mt-1 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-xs flex items-center gap-1.5 cursor-pointer transition-all"
                    >
                      <FileUp className="w-4 h-4" />
                      <span>Pilih File dari Komputer</span>
                    </button>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Comments Section */}
          <div className="pt-4 border-t border-slate-200 dark:border-slate-800">
            <h5 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3">
              <MessageSquare className="w-3.5 h-3.5" />
              <span>Diskusi & Komentar ({card.comments?.length || 0})</span>
            </h5>

            {/* Comment Form */}
            <form onSubmit={handleAddComment} className="flex gap-2 mb-4">
              <input
                type="text"
                placeholder="Tulis tanggapan atau pembaruan tugas..."
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                className="flex-1 px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-slate-800 dark:text-slate-100 placeholder:text-slate-400"
              />
              <button
                type="submit"
                disabled={isSubmittingComment || !newComment.trim()}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold transition-all disabled:opacity-50 flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Kirim</span>
              </button>
            </form>

            {/* Comments List */}
            <div className="space-y-3">
              {card.comments && card.comments.length > 0 ? (
                card.comments.map((comment) => (
                  <div
                    key={comment.id}
                    className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-800 text-xs space-y-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Avatar
                          name={comment.user.name}
                          avatarUrl={comment.user.avatarUrl}
                          size="xs"
                        />
                        <span className="font-semibold text-slate-800 dark:text-slate-200">{comment.user.name}</span>
                        <span className="text-[10px] text-slate-400 dark:text-slate-500">
                          {new Date(comment.createdAt).toLocaleDateString('id-ID', {
                            dateStyle: 'short',
                            timeStyle: 'short',
                          })}
                        </span>
                      </div>

                      {user?.id === comment.userId && (
                        <button
                          type="button"
                          onClick={() => handleDeleteComment(comment.id)}
                          className="text-slate-400 hover:text-rose-600 p-1"
                          title="Hapus komentar"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                    <p className="text-slate-600 dark:text-slate-300 pl-7 leading-relaxed">{comment.content}</p>
                  </div>
                ))
              ) : (
                <div className="text-center py-4 text-xs text-slate-400 dark:text-slate-500">
                  Belum ada komentar pada kartu ini.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
