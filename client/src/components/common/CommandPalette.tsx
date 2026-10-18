import React, { useState, useEffect, useRef } from 'react';
import { Card, Board } from '../../types';
import { api } from '../../services/api';
import { Search, Calendar, Tag, User, ArrowRight, X } from 'lucide-react';
import { Avatar } from './Avatar';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  boards: Board[];
  workspaceId?: string;
  onSelectCard: (card: Card) => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  isOpen,
  onClose,
  boards,
  workspaceId,
  onSelectCard,
}) => {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [remoteCards, setRemoteCards] = useState<{ card: Card; boardTitle: string; listTitle: string }[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  // Collect all cards across provided boards (e.g. currentBoard)
  const allCards: { card: Card; boardTitle: string; listTitle: string }[] = [];
  boards.forEach((board) => {
    board.lists?.forEach((list) => {
      list.cards?.forEach((card) => {
        allCards.push({ card, boardTitle: board.title, listTitle: list.title });
      });
    });
  });

  // Filter local cards instantly
  const localFiltered = query.trim()
    ? allCards.filter(
        (item) =>
          item.card.title.toLowerCase().includes(query.toLowerCase()) ||
          item.card.description?.toLowerCase().includes(query.toLowerCase()) ||
          item.card.assignee?.name.toLowerCase().includes(query.toLowerCase()) ||
          item.card.labels?.some((l) => l.name.toLowerCase().includes(query.toLowerCase())) ||
          item.listTitle.toLowerCase().includes(query.toLowerCase()) ||
          item.boardTitle.toLowerCase().includes(query.toLowerCase())
      )
    : allCards.slice(0, 8); // show first 8 recent if empty query

  // Remote search across workspace for cards from other boards
  useEffect(() => {
    if (!isOpen || !workspaceId || !query.trim()) {
      setRemoteCards([]);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const res = await api.get(`/workspaces/${workspaceId}/search?q=${encodeURIComponent(query.trim())}`);
        if (res.data?.cards) {
          const formatted = res.data.cards.map((c: any) => ({
            card: c,
            boardTitle: c.list?.board?.title || 'Papan',
            listTitle: c.list?.title || 'Daftar',
          }));
          setRemoteCards(formatted);
        }
      } catch (err) {
        // Fallback gracefully
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [isOpen, workspaceId, query]);

  // Merge local & remote (avoid duplicates)
  const localIds = new Set(localFiltered.map((i) => i.card.id));
  const filtered = query.trim()
    ? [...localFiltered, ...remoteCards.filter((r) => !localIds.has(r.card.id))]
    : localFiltered;

  // Reset index when query changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  // Auto focus input on open
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setQuery('');
    }
  }, [isOpen]);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev < filtered.length - 1 ? prev + 1 : 0));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : filtered.length - 1));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (filtered[selectedIndex]) {
          onSelectCard(filtered[selectedIndex].card);
          onClose();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, filtered, selectedIndex, onSelectCard, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 p-4 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[70vh]">
        {/* Search Input Bar */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-slate-100 dark:border-slate-800">
          <Search className="w-5 h-5 text-slate-400" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Cari tugas, deskripsi, label, atau nama anggota... (Gunakan panah ↑↓ & Enter)"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="flex-1 text-sm bg-transparent border-none text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <kbd className="hidden sm:inline-block px-2 py-0.5 text-[10px] font-semibold text-slate-400 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded">
            ESC
          </kbd>
        </div>

        {/* Results List */}
        <div className="flex-1 overflow-y-auto p-2 divide-y divide-slate-50 dark:divide-slate-800/50">
          {filtered.length > 0 ? (
            filtered.map((item, idx) => {
              const isSelected = idx === selectedIndex;
              return (
                <div
                  key={item.card.id}
                  onClick={() => {
                    onSelectCard(item.card);
                    onClose();
                  }}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`flex items-center justify-between p-3 rounded-xl cursor-pointer transition-colors ${
                    isSelected
                      ? 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-900 dark:text-indigo-200'
                      : 'hover:bg-slate-50 dark:hover:bg-slate-800/40 text-slate-800 dark:text-slate-200'
                  }`}
                >
                  <div className="flex-1 min-w-0 pr-3">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
                        {item.boardTitle} &bull; {item.listTitle}
                      </span>
                      {item.card.priority === 'URGENT' && (
                        <span className="text-[10px] font-semibold text-rose-600 bg-rose-50 dark:bg-rose-950/40 px-1.5 py-0.5 rounded">
                          Urgent
                        </span>
                      )}
                    </div>
                    <div className="text-xs font-semibold truncate">{item.card.title}</div>
                    {item.card.description && (
                      <div className="text-[11px] text-slate-400 truncate mt-0.5">
                        {item.card.description}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {item.card.assignee && (
                      <Avatar
                        name={item.card.assignee.name}
                        avatarUrl={item.card.assignee.avatarUrl}
                        size="xs"
                      />
                    )}
                    <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                  </div>
                </div>
              );
            })
          ) : (
            <div className="p-8 text-center text-xs text-slate-400 dark:text-slate-500">
              Tidak ada tugas yang cocok dengan kata kunci "{query}".
            </div>
          )}
        </div>

        {/* Footer info */}
        <div className="px-4 py-2.5 bg-slate-50 dark:bg-slate-900/80 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
          <span>Menavigasi: <strong>↑ ↓</strong></span>
          <span>Buka Kartu: <strong>Enter</strong></span>
        </div>
      </div>
    </div>
  );
};
