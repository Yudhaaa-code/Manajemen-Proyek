import React from 'react';
import { Board, Priority } from '../../types';
import { Avatar } from '../common/Avatar';
import { useThemeStore } from '../../store/useThemeStore';
import {
  Search,
  History,
  Users,
  LayoutGrid,
  Calendar as CalendarIcon,
  Moon,
  Sun,
  Command,
} from 'lucide-react';

interface BoardHeaderProps {
  board: Board;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  selectedPriority: Priority | 'ALL';
  onPrioritySelect: (p: Priority | 'ALL') => void;
  onToggleActivityDrawer: () => void;
  isSocketConnected: boolean;
  currentView?: 'kanban' | 'calendar';
  onViewChange?: (view: 'kanban' | 'calendar') => void;
  onOpenCommandPalette?: () => void;
}

export const BoardHeader: React.FC<BoardHeaderProps> = ({
  board,
  searchQuery,
  onSearchChange,
  selectedPriority,
  onPrioritySelect,
  onToggleActivityDrawer,
  isSocketConnected,
  currentView = 'kanban',
  onViewChange,
  onOpenCommandPalette,
}) => {
  const members = board.workspace?.members || [];
  const { isDark, toggleTheme } = useThemeStore();

  return (
    <header className="border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md px-6 py-3.5 flex flex-col md:flex-row md:items-center md:justify-between gap-3 shrink-0 z-20 text-slate-800 dark:text-slate-100">
      {/* Kiri: Judul Board, View Switcher & Status Realtime */}
      <div className="flex items-center flex-wrap gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
              {board.title}
            </h1>
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
              <span
                className={`w-2 h-2 rounded-full ${
                  isSocketConnected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'
                }`}
              />
              <span>{isSocketConnected ? 'Real-time' : 'Menghubungkan...'}</span>
            </div>
          </div>
          {board.description && (
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 max-w-md truncate">
              {board.description}
            </p>
          )}
        </div>

        {/* View Switcher: Kanban vs Kalender */}
        {onViewChange && (
          <div className="flex items-center p-0.5 bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-xs">
            <button
              type="button"
              onClick={() => onViewChange('kanban')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
                currentView === 'kanban'
                  ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Kanban</span>
            </button>
            <button
              type="button"
              onClick={() => onViewChange('calendar')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
                currentView === 'calendar'
                  ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <CalendarIcon className="w-3.5 h-3.5" />
              <span>Kalender</span>
            </button>
          </div>
        )}
      </div>

      {/* Kanan: Pencarian, Filter Prioritas, Dark Mode, & Aktivitas */}
      <div className="flex items-center flex-wrap gap-2.5">
        {/* Quick Search Button (Ctrl+K) */}
        {onOpenCommandPalette && (
          <button
            type="button"
            onClick={onOpenCommandPalette}
            className="flex items-center gap-2 px-3 py-1.5 text-xs bg-slate-100/90 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:border-slate-300 dark:hover:border-slate-600 transition-all cursor-pointer shadow-2xs"
            title="Cari cepat (Ctrl + K)"
          >
            <Search className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Cari apa saja...</span>
            <kbd className="text-[10px] font-semibold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 px-1.5 py-0.2 rounded text-slate-400">
              Ctrl K
            </kbd>
          </button>
        )}

        {/* Filter Prioritas */}
        <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs">
          <button
            type="button"
            onClick={() => onPrioritySelect('ALL')}
            className={`px-2.5 py-1 rounded-md font-medium transition-all ${
              selectedPriority === 'ALL'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            Semua
          </button>
          <button
            type="button"
            onClick={() => onPrioritySelect('HIGH')}
            className={`px-2.5 py-1 rounded-md font-medium transition-all flex items-center gap-1 ${
              selectedPriority === 'HIGH'
                ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 shadow-xs font-semibold'
                : 'text-slate-500 dark:text-slate-400 hover:text-rose-600'
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
            High
          </button>
          <button
            type="button"
            onClick={() => onPrioritySelect('MEDIUM')}
            className={`px-2.5 py-1 rounded-md font-medium transition-all flex items-center gap-1 ${
              selectedPriority === 'MEDIUM'
                ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 shadow-xs font-semibold'
                : 'text-slate-500 dark:text-slate-400 hover:text-amber-600'
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
            Medium
          </button>
          <button
            type="button"
            onClick={() => onPrioritySelect('LOW')}
            className={`px-2.5 py-1 rounded-md font-medium transition-all flex items-center gap-1 ${
              selectedPriority === 'LOW'
                ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 shadow-xs font-semibold'
                : 'text-slate-500 dark:text-slate-400 hover:text-emerald-600'
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            Low
          </button>
        </div>

        {/* Avatar Stack Anggota */}
        {members.length > 0 && (
          <div className="flex items-center -space-x-1.5 px-1 py-1" title="Anggota ruang kerja">
            {members.slice(0, 4).map((m) => (
              <Avatar
                key={m.userId}
                name={m.user.name}
                avatarUrl={m.user.avatarUrl}
                size="sm"
                className="ring-2 ring-white dark:ring-slate-900"
              />
            ))}
            {members.length > 4 && (
              <div className="w-6 h-6 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 text-[10px] font-bold flex items-center justify-center ring-2 ring-white dark:ring-slate-900">
                +{members.length - 4}
              </div>
            )}
          </div>
        )}

        {/* Toggle Dark / Light Mode */}
        <button
          type="button"
          onClick={toggleTheme}
          className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-750 transition-colors shadow-2xs cursor-pointer"
          title={isDark ? 'Beralih ke Mode Terang' : 'Beralih ke Mode Gelap'}
        >
          {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-600" />}
        </button>

        {/* Slide-over Activity Log Drawer Trigger */}
        <button
          type="button"
          onClick={onToggleActivityDrawer}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors shadow-2xs cursor-pointer"
        >
          <History className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
          <span className="hidden sm:inline">Riwayat</span>
        </button>
      </div>
    </header>
  );
};
