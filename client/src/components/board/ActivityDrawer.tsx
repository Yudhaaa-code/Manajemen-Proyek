import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../services/api';
import { ActivityLog } from '../../types';
import { Avatar } from '../common/Avatar';
import {
  X,
  History,
  MoveRight,
  PlusCircle,
  Edit3,
  MessageSquare,
  Layout,
  RefreshCw,
} from 'lucide-react';

interface ActivityDrawerProps {
  boardId: string;
  isOpen: boolean;
  onClose: () => void;
}

export const ActivityDrawer: React.FC<ActivityDrawerProps> = ({
  boardId,
  isOpen,
  onClose,
}) => {
  const { data, isLoading, refetch, isFetching } = useQuery<{ activities: ActivityLog[] }>({
    queryKey: ['activities', boardId],
    queryFn: async () => {
      const res = await api.get(`/boards/${boardId}/activities`);
      return res.data;
    },
    enabled: isOpen && !!boardId,
  });

  if (!isOpen) return null;

  const activities = data?.activities || [];

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'MOVED_CARD':
        return <MoveRight className="w-3.5 h-3.5 text-indigo-500" />;
      case 'CREATED_CARD':
        return <PlusCircle className="w-3.5 h-3.5 text-emerald-500" />;
      case 'UPDATED_CARD':
        return <Edit3 className="w-3.5 h-3.5 text-amber-500" />;
      case 'ADDED_COMMENT':
        return <MessageSquare className="w-3.5 h-3.5 text-violet-500" />;
      case 'CREATED_LIST':
      case 'CREATED_BOARD':
        return <Layout className="w-3.5 h-3.5 text-blue-500" />;
      default:
        return <History className="w-3.5 h-3.5 text-slate-400" />;
    }
  };

  const formatTimeAgo = (dateStr: string) => {
    const diff = (Date.now() - new Date(dateStr).getTime()) / 1000;
    if (diff < 60) return 'Baru saja';
    if (diff < 3600) return `${Math.floor(diff / 60)} menit lalu`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} jam lalu`;
    return new Date(dateStr).toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden animate-fade-in">
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity"
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-sm bg-white dark:bg-slate-900 shadow-2xl border-l border-slate-200 dark:border-slate-800 flex flex-col animate-slide-in text-slate-800 dark:text-slate-100">
          {/* Header */}
          <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/70 dark:bg-slate-900/80">
            <div className="flex items-center gap-2">
              <History className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">Riwayat Aktivitas Papan</h3>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => refetch()}
                disabled={isFetching}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/70 transition-colors"
                title="Segarkan aktivitas"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? 'animate-spin' : ''}`} />
              </button>
              <button
                type="button"
                onClick={onClose}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/70 transition-colors"
                title="Tutup drawer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* List of Activities */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="animate-pulse flex items-start gap-3">
                    <div className="w-7 h-7 rounded-full bg-slate-200 shrink-0" />
                    <div className="flex-1 space-y-1.5">
                      <div className="h-3 bg-slate-200 rounded w-3/4" />
                      <div className="h-2 bg-slate-100 rounded w-1/2" />
                    </div>
                  </div>
                ))}
              </div>
            ) : activities.length === 0 ? (
              <div className="text-center py-12 text-xs text-slate-400">
                Belum ada aktivitas tercatat pada board ini.
              </div>
            ) : (
              activities.map((act) => (
                <div key={act.id} className="flex items-start gap-3 text-xs leading-relaxed group">
                  <Avatar
                    name={act.user.name}
                    avatarUrl={act.user.avatarUrl}
                    size="sm"
                    className="mt-0.5"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="font-semibold text-slate-900 dark:text-slate-100 truncate">
                        {act.user.name}
                      </span>
                      <span className="shrink-0 p-0.5 bg-slate-100 dark:bg-slate-800 rounded">
                        {getActionIcon(act.action)}
                      </span>
                    </div>

                    <p className="text-slate-600 dark:text-slate-300 mt-0.5 whitespace-pre-wrap break-words font-normal">
                      {act.details || act.action}
                    </p>

                    <span className="text-[10px] text-slate-400 dark:text-slate-500 block mt-1 font-mono">
                      {formatTimeAgo(act.createdAt)}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
