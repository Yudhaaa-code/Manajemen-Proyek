import React, { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from './services/api';
import { getSocket, joinBoard, leaveBoard } from './services/socket';
import { useAuthStore } from './store/useAuthStore';
import { useToastStore } from './store/useToastStore';
import { Board, Priority, Workspace, Card } from './types';
import { AuthPage } from './components/auth/AuthPage';
import { Sidebar } from './components/layout/Sidebar';
import { BoardHeader } from './components/board/BoardHeader';
import { KanbanBoard } from './components/board/KanbanBoard';
import { CalendarView } from './components/board/CalendarView';
import { ActivityDrawer } from './components/board/ActivityDrawer';
import { CardDetailModal } from './components/board/CardDetailModal';
import { CommandPalette } from './components/common/CommandPalette';
import { ToastContainer } from './components/common/ToastContainer';
import { useThemeStore } from './store/useThemeStore';

export const App: React.FC = () => {
  const queryClient = useQueryClient();
  const { isAuthenticated, isHydrated, hydrate } = useAuthStore();
  const { addToast } = useToastStore();
  const { isDark } = useThemeStore();

  const [activeWorkspace, setActiveWorkspace] = useState<Workspace | null>(null);
  const [activeBoardId, setActiveBoardId] = useState<string | null>(() => {
    return localStorage.getItem('linear_active_board_id') || null;
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPriority, setSelectedPriority] = useState<Priority | 'ALL'>('ALL');
  const [isActivityDrawerOpen, setIsActivityDrawerOpen] = useState(false);
  const [isSocketConnected, setIsSocketConnected] = useState(false);

  // Synchronize activeBoardId to localStorage
  useEffect(() => {
    if (activeBoardId) {
      localStorage.setItem('linear_active_board_id', activeBoardId);
    }
  }, [activeBoardId]);

  // New features: View Switcher, Command Palette, and Global Card Modal
  const [currentView, setCurrentView] = useState<'kanban' | 'calendar'>('kanban');
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [selectedCardForModal, setSelectedCardForModal] = useState<Card | null>(null);

  // 1. Hydrate authentication
  useEffect(() => {
    hydrate();
  }, [hydrate]);

  // 2. Fetch User Workspaces
  const {
    data: workspacesData,
    refetch: refetchWorkspaces,
    isLoading: isWorkspacesLoading,
  } = useQuery<{ workspaces: Workspace[] }>({
    queryKey: ['workspaces'],
    queryFn: async () => {
      const res = await api.get('/workspaces');
      return res.data;
    },
    enabled: isAuthenticated,
  });

  const workspaces = workspacesData?.workspaces || [];

  // Update active workspace if none selected
  useEffect(() => {
    if (workspaces.length > 0 && !activeWorkspace) {
      setActiveWorkspace(workspaces[0]);
    } else if (workspaces.length > 0 && activeWorkspace) {
      // Refresh current workspace info
      const found = workspaces.find((w) => w.id === activeWorkspace.id);
      if (found) setActiveWorkspace(found);
    }
  }, [workspaces, activeWorkspace]);

  // Boards in current workspace
  const boards = activeWorkspace?.boards || [];

  // Set active board default
  useEffect(() => {
    if (boards.length > 0 && (!activeBoardId || !boards.some((b) => b.id === activeBoardId))) {
      setActiveBoardId(boards[0].id);
    }
  }, [boards, activeBoardId]);

  // 3. Fetch Active Board Detail with lists and cards
  const {
    data: boardData,
    isLoading: isBoardLoading,
    refetch: refetchBoard,
  } = useQuery<{ board: Board }>({
    queryKey: ['board', activeBoardId],
    queryFn: async () => {
      const res = await api.get(`/boards/${activeBoardId}`);
      return res.data;
    },
    enabled: isAuthenticated && !!activeBoardId,
  });

  const currentBoard = boardData?.board;

  // 4. Real-time Socket.io Sync
  useEffect(() => {
    if (!isAuthenticated || !activeBoardId) return;

    const socket = getSocket();

    const onConnect = () => setIsSocketConnected(true);
    const onDisconnect = () => setIsSocketConnected(false);

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);

    if (socket.connected) {
      setIsSocketConnected(true);
    }

    // Join room
    joinBoard(activeBoardId);

    // Event listener for board changes
    const handleBoardUpdated = (payload: any) => {
      queryClient.invalidateQueries({ queryKey: ['board', activeBoardId] });
      queryClient.invalidateQueries({ queryKey: ['activities', activeBoardId] });
      refetchWorkspaces();
    };

    socket.on('board-updated', handleBoardUpdated);

    return () => {
      leaveBoard(activeBoardId);
      socket.off('board-updated', handleBoardUpdated);
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
    };
  }, [isAuthenticated, activeBoardId, queryClient, refetchWorkspaces]);

  // 5. Global Keyboard Shortcut for Command Palette (Ctrl + K or Cmd + K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsCommandPaletteOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // 6. Handle Invite Link Auto-Join from URL parameter (?inviteToken=...)
  useEffect(() => {
    if (!isAuthenticated) return;
    const params = new URLSearchParams(window.location.search);
    const inviteToken = params.get('inviteToken');
    if (inviteToken) {
      api
        .post('/workspaces/join-invite', { token: inviteToken })
        .then((res) => {
          addToast(res.data.message || 'Berhasil bergabung dengan ruang kerja tim!', 'success');
          refetchWorkspaces();
          window.history.replaceState({}, document.title, window.location.pathname);
        })
        .catch((err) => {
          addToast(err.response?.data?.error || 'Gagal menerima undangan', 'error');
          window.history.replaceState({}, document.title, window.location.pathname);
        });
    }
  }, [isAuthenticated, addToast, refetchWorkspaces]);

  // If not hydrated yet, show minimal loader
  if (!isHydrated) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // If unauthenticated, render AuthPage
  if (!isAuthenticated) {
    return (
      <>
        <AuthPage />
        <ToastContainer />
      </>
    );
  }

  return (
    <div className={`h-screen w-screen flex overflow-hidden font-sans ${isDark ? 'dark bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'}`}>
      {/* Collapsible Sidebar */}
      <Sidebar
        workspaces={workspaces}
        activeWorkspace={activeWorkspace}
        onSelectWorkspace={(ws) => {
          setActiveWorkspace(ws);
          if (ws.boards && ws.boards.length > 0) {
            setActiveBoardId(ws.boards[0].id);
          } else {
            setActiveBoardId(null);
          }
        }}
        boards={boards}
        activeBoardId={activeBoardId}
        onSelectBoard={(id) => setActiveBoardId(id)}
        onRefreshData={() => {
          refetchWorkspaces();
          if (activeBoardId) refetchBoard();
        }}
      />

      {/* Main Board View Area */}
      <main className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        {currentBoard ? (
          <>
            <BoardHeader
              board={currentBoard}
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              selectedPriority={selectedPriority}
              onPrioritySelect={setSelectedPriority}
              onToggleActivityDrawer={() => setIsActivityDrawerOpen(!isActivityDrawerOpen)}
              isSocketConnected={isSocketConnected}
              currentView={currentView}
              onViewChange={setCurrentView}
              onOpenCommandPalette={() => setIsCommandPaletteOpen(true)}
            />

            {/* Switch between Kanban Board and Calendar View */}
            {currentView === 'kanban' ? (
              <KanbanBoard
                board={currentBoard}
                searchQuery={searchQuery}
                selectedPriority={selectedPriority}
                members={currentBoard.workspace?.members || []}
                isLoading={isBoardLoading}
              />
            ) : (
              <CalendarView
                board={currentBoard}
                onCardClick={(card) => setSelectedCardForModal(card)}
              />
            )}

            <ActivityDrawer
              boardId={currentBoard.id}
              isOpen={isActivityDrawerOpen}
              onClose={() => setIsActivityDrawerOpen(false)}
            />
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center p-8 text-center bg-slate-50 dark:bg-slate-950">
            <div className="max-w-md">
              <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950 border border-indigo-200 dark:border-indigo-800 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto mb-4">
                <span className="font-bold text-xl">📋</span>
              </div>
              <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">Tidak Ada Papan yang Dipilih</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Pilih salah satu papan dari bilah samping (sidebar) atau buat papan baru untuk memulai.
              </p>
            </div>
          </div>
        )}
      </main>

      {/* Global Card Detail Modal (from Calendar View or Command Palette) */}
      {selectedCardForModal && currentBoard && (
        <CardDetailModal
          card={selectedCardForModal}
          members={currentBoard.workspace?.members || []}
          onClose={() => setSelectedCardForModal(null)}
          onCardUpdated={() => {
            refetchBoard();
            refetchWorkspaces();
          }}
        />
      )}

      {/* Global Command Palette (Ctrl + K) */}
      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        boards={currentBoard ? [currentBoard] : []}
        workspaceId={activeWorkspace?.id}
        onSelectCard={(card) => setSelectedCardForModal(card)}
      />

      {/* Global Corner Toast Notifications */}
      <ToastContainer />
    </div>
  );
};
