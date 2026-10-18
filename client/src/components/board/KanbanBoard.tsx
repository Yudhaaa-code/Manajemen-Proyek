import React, { useState } from 'react';
import {
  DragDropContext,
  Droppable,
  DropResult,
} from '@hello-pangea/dnd';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Board, Card, List, Priority, WorkspaceMember } from '../../types';
import { CardItem } from './CardItem';
import { CardDetailModal } from './CardDetailModal';
import { api } from '../../services/api';
import { useToastStore } from '../../store/useToastStore';
import {
  Plus,
  MoreHorizontal,
  Trash2,
  Check,
  X,
  Sparkles,
} from 'lucide-react';

interface KanbanBoardProps {
  board: Board;
  searchQuery: string;
  selectedPriority: Priority | 'ALL';
  members: WorkspaceMember[];
  isLoading: boolean;
}

export const KanbanBoard: React.FC<KanbanBoardProps> = ({
  board,
  searchQuery,
  selectedPriority,
  members,
  isLoading,
}) => {
  const queryClient = useQueryClient();
  const { addToast } = useToastStore();

  const [selectedCard, setSelectedCard] = useState<Card | null>(null);

  // New list inline form
  const [isAddingList, setIsAddingList] = useState(false);
  const [newListTitle, setNewListTitle] = useState('');

  // New card inline forms per list: { [listId]: string }
  const [activeNewCardListId, setActiveNewCardListId] = useState<string | null>(null);
  const [newCardTitle, setNewCardTitle] = useState('');

  // Editing list title: { [listId]: string }
  const [editingListId, setEditingListId] = useState<string | null>(null);
  const [editingListTitle, setEditingListTitle] = useState('');

  // Optimistic Move Card Mutation
  const moveCardMutation = useMutation({
    mutationFn: async ({
      cardId,
      targetListId,
      prevPosition,
      nextPosition,
    }: {
      cardId: string;
      targetListId: string;
      prevPosition?: number | null;
      nextPosition?: number | null;
    }) => {
      const res = await api.patch(`/cards/${cardId}/move`, {
        targetListId,
        prevPosition,
        nextPosition,
      });
      return res.data;
    },
    onMutate: async ({ cardId, targetListId, prevPosition, nextPosition }) => {
      // 1. Batalkan refetch berjalan agar tidak menimpa state optimis
      await queryClient.cancelQueries({ queryKey: ['board', board.id] });

      // 2. Snapshot state sebelumnya
      const previousBoard = queryClient.getQueryData<{ board: Board }>(['board', board.id]);

      // 3. Hitung estimasi posisi floating point di sisi client
      let estimatedPos: number;
      const prev = prevPosition !== undefined && prevPosition !== null ? Number(prevPosition) : null;
      const next = nextPosition !== undefined && nextPosition !== null ? Number(nextPosition) : null;

      if (prev === null && next === null) estimatedPos = 1000.0;
      else if (prev !== null && next === null) estimatedPos = prev + 1000.0;
      else if (prev === null && next !== null) estimatedPos = next / 2.0;
      else estimatedPos = (prev! + next!) / 2.0;

      // 4. Update data cache secara optimis
      if (previousBoard?.board?.lists) {
        let movedCard: Card | null = null;

        // Cari kartu yang dipindahkan
        for (const list of previousBoard.board.lists) {
          const found = list.cards.find((c) => c.id === cardId);
          if (found) {
            movedCard = { ...found, listId: targetListId, position: estimatedPos };
            break;
          }
        }

        if (movedCard) {
          const newLists = previousBoard.board.lists.map((list) => {
            // Hapus kartu dari list asal
            const filteredCards = list.cards.filter((c) => c.id !== cardId);

            // Jika ini list tujuan, sisipkan kartu baru lalu urutkan berdasarkan posisi
            if (list.id === targetListId) {
              const updatedCards = [...filteredCards, movedCard!].sort(
                (a, b) => a.position - b.position
              );
              return { ...list, cards: updatedCards };
            }

            return { ...list, cards: filteredCards };
          });

          queryClient.setQueryData(['board', board.id], {
            board: {
              ...previousBoard.board,
              lists: newLists,
            },
          });
        }
      }

      return { previousBoard };
    },
    onError: (err: any, _vars, context) => {
      // Rollback ke state sebelumnya jika terjadi error
      if (context?.previousBoard) {
        queryClient.setQueryData(['board', board.id], context.previousBoard);
      }
      addToast(err.response?.data?.error || 'Gagal memindahkan kartu', 'error');
    },
    onSettled: () => {
      // Sinkronkan kembali dengan data backend
      queryClient.invalidateQueries({ queryKey: ['board', board.id] });
      queryClient.invalidateQueries({ queryKey: ['activities', board.id] });
    },
  });

  const onDragEnd = (result: DropResult) => {
    const { source, destination, draggableId } = result;

    if (!destination) return;
    if (
      source.droppableId === destination.droppableId &&
      source.index === destination.index
    ) {
      return;
    }

    const lists = board.lists || [];
    const sourceList = lists.find((l) => l.id === source.droppableId);
    const targetList = lists.find((l) => l.id === destination.droppableId);

    if (!sourceList || !targetList) return;

    // Dapatkan kartu di list tujuan (tanpa kartu yang sedang digeser jika dalam list yang sama)
    const targetCards = [...targetList.cards];
    if (source.droppableId === destination.droppableId) {
      targetCards.splice(source.index, 1);
    }

    // Tentukan prevPosition dan nextPosition berdasarkan destination.index
    const prevCard = destination.index > 0 ? targetCards[destination.index - 1] : null;
    const nextCard = destination.index < targetCards.length ? targetCards[destination.index] : null;

    const prevPos = prevCard ? prevCard.position : null;
    const nextPos = nextCard ? nextCard.position : null;

    moveCardMutation.mutate({
      cardId: draggableId,
      targetListId: destination.droppableId,
      prevPosition: prevPos,
      nextPosition: nextPos,
    });
  };

  const handleCreateList = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newListTitle.trim()) return;

    try {
      await api.post('/lists', {
        title: newListTitle.trim(),
        boardId: board.id,
      });
      setNewListTitle('');
      setIsAddingList(false);
      queryClient.invalidateQueries({ queryKey: ['board', board.id] });
      addToast('Daftar kolom baru berhasil dibuat!', 'success');
    } catch (err: any) {
      addToast(err.response?.data?.error || 'Gagal membuat daftar', 'error');
    }
  };

  const handleCreateCard = async (listId: string) => {
    if (!newCardTitle.trim()) return;

    try {
      await api.post('/cards', {
        title: newCardTitle.trim(),
        listId,
      });
      setNewCardTitle('');
      setActiveNewCardListId(null);
      queryClient.invalidateQueries({ queryKey: ['board', board.id] });
      addToast('Kartu baru berhasil ditambahkan!', 'success');
    } catch (err: any) {
      addToast(err.response?.data?.error || 'Gagal menambahkan kartu', 'error');
    }
  };

  const handleUpdateListTitle = async (listId: string) => {
    if (!editingListTitle.trim()) {
      setEditingListId(null);
      return;
    }
    try {
      await api.patch(`/lists/${listId}`, {
        title: editingListTitle.trim(),
      });
      setEditingListId(null);
      queryClient.invalidateQueries({ queryKey: ['board', board.id] });
      addToast('Nama kolom diperbarui', 'success');
    } catch (err: any) {
      addToast(err.response?.data?.error || 'Gagal memperbarui nama kolom', 'error');
    }
  };

  const handleDeleteList = async (listId: string, listTitle: string) => {
    if (!window.confirm(`Hapus kolom "${listTitle}" beserta seluruh kartunya?`)) return;
    try {
      await api.delete(`/lists/${listId}`);
      queryClient.invalidateQueries({ queryKey: ['board', board.id] });
      addToast(`Kolom "${listTitle}" berhasil dihapus`, 'success');
    } catch (err: any) {
      addToast(err.response?.data?.error || 'Gagal menghapus kolom', 'error');
    }
  };

  // Filter Cards Function
  const filterCards = (cards: Card[]) => {
    return cards.filter((card) => {
      // Filter prioritas
      if (selectedPriority !== 'ALL' && card.priority !== selectedPriority) {
        return false;
      }
      // Filter pencarian teks
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const titleMatch = card.title.toLowerCase().includes(q);
        const descMatch = card.description?.toLowerCase().includes(q) || false;
        if (!titleMatch && !descMatch) return false;
      }
      return true;
    });
  };

  // Skeleton Loader View
  if (isLoading) {
    return (
      <div className="flex-1 p-6 flex gap-5 overflow-x-auto">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="w-80 shrink-0 bg-slate-100/90 rounded-2xl p-4 border border-slate-200 animate-pulse flex flex-col gap-3"
          >
            <div className="h-5 bg-slate-200 rounded w-1/3 mb-2" />
            <div className="h-24 bg-white rounded-xl border border-slate-200" />
            <div className="h-20 bg-white rounded-xl border border-slate-200" />
            <div className="h-16 bg-white rounded-xl border border-slate-200" />
          </div>
        ))}
      </div>
    );
  }

  const lists = board.lists || [];

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-slate-50/50 dark:bg-slate-950">
      <DragDropContext onDragEnd={onDragEnd}>
        <div className="flex-1 p-6 flex items-start gap-5 overflow-x-auto overflow-y-hidden">
          {lists.map((list) => {
            const filteredCards = filterCards(list.cards);

            return (
              <div
                key={list.id}
                className="w-80 max-h-full flex flex-col shrink-0 bg-slate-100/80 dark:bg-slate-900/60 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs"
              >
                {/* List Header */}
                <div className="p-3.5 flex items-center justify-between border-b border-slate-200/60 dark:border-slate-800">
                  <div className="flex items-center gap-2 flex-1 min-w-0 mr-2">
                    {editingListId === list.id ? (
                      <div className="flex items-center gap-1.5 w-full">
                        <input
                          type="text"
                          value={editingListTitle}
                          onChange={(e) => setEditingListTitle(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleUpdateListTitle(list.id);
                            if (e.key === 'Escape') setEditingListId(null);
                          }}
                          autoFocus
                          className="w-full text-xs font-semibold px-2 py-1 bg-white border border-indigo-500 rounded focus:outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => handleUpdateListTitle(list.id)}
                          className="p-1 text-emerald-600 hover:bg-emerald-50 rounded"
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <h3
                        onClick={() => {
                          setEditingListId(list.id);
                          setEditingListTitle(list.title);
                        }}
                        className="font-bold text-xs uppercase tracking-wider text-slate-700 dark:text-slate-200 truncate cursor-pointer hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                        title="Klik untuk mengubah nama daftar"
                      >
                        {list.title}
                      </h3>
                    )}

                    <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-slate-200/80 dark:bg-slate-800 text-slate-600 dark:text-slate-400 shrink-0">
                      {filteredCards.length}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleDeleteList(list.id, list.title)}
                    className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-slate-200/70 transition-colors"
                    title="Hapus kolom"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Cards Container (Droppable) */}
                <Droppable droppableId={list.id}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className={`flex-1 p-2.5 overflow-y-auto min-h-[140px] transition-colors rounded-b-2xl ${
                        snapshot.isDraggingOver ? 'bg-indigo-50/40 ring-1 ring-indigo-300' : ''
                      }`}
                    >
                      {filteredCards.map((card, idx) => (
                        <CardItem
                          key={card.id}
                          card={card}
                          index={idx}
                          onClick={() => setSelectedCard(card)}
                        />
                      ))}
                      {provided.placeholder}

                      {filteredCards.length === 0 && (
                        <div className="py-8 text-center text-xs text-slate-400 dark:text-slate-500 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl my-1">
                          Belum ada kartu
                        </div>
                      )}
                    </div>
                  )}
                </Droppable>

                {/* List Footer: Add Card */}
                <div className="p-2.5 pt-0">
                  {activeNewCardListId === list.id ? (
                    <div className="bg-white dark:bg-slate-900 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm animate-fade-in space-y-2">
                      <textarea
                        rows={2}
                        value={newCardTitle}
                        onChange={(e) => setNewCardTitle(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            handleCreateCard(list.id);
                          }
                          if (e.key === 'Escape') setActiveNewCardListId(null);
                        }}
                        placeholder="Ketik judul kartu..."
                        autoFocus
                        className="w-full text-xs p-1.5 focus:outline-none resize-none bg-transparent text-slate-800 dark:text-slate-100 placeholder:text-slate-400"
                      />
                      <div className="flex items-center justify-between">
                        <button
                          type="button"
                          onClick={() => handleCreateCard(list.id)}
                          disabled={!newCardTitle.trim()}
                          className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-medium shadow-xs disabled:opacity-50 cursor-pointer"
                        >
                          Tambah Kartu
                        </button>
                        <button
                          type="button"
                          onClick={() => setActiveNewCardListId(null)}
                          className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setActiveNewCardListId(list.id);
                        setNewCardTitle('');
                      }}
                      className="w-full py-2 px-3 rounded-xl border border-transparent hover:border-slate-200 dark:hover:border-slate-800 hover:bg-white dark:hover:bg-slate-900 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 text-xs font-medium flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Tambah Kartu</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}

          {/* Add Column Button / Form */}
          <div className="w-72 shrink-0">
            {isAddingList ? (
              <form
                onSubmit={handleCreateList}
                className="bg-white dark:bg-slate-900 p-3 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-2.5 animate-fade-in"
              >
                <input
                  type="text"
                  required
                  value={newListTitle}
                  onChange={(e) => setNewListTitle(e.target.value)}
                  placeholder="Nama kolom baru..."
                  autoFocus
                  className="w-full px-3 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
                <div className="flex items-center gap-2">
                  <button
                    type="submit"
                    className="flex-1 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-medium shadow-xs cursor-pointer"
                  >
                    Buat Kolom
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsAddingList(false)}
                    className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </form>
            ) : (
              <button
                type="button"
                onClick={() => setIsAddingList(true)}
                className="w-full py-3 px-4 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-800 hover:border-indigo-400 dark:hover:border-indigo-500 hover:bg-indigo-50/30 dark:hover:bg-indigo-950/20 text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Tambah Kolom Baru</span>
              </button>
            )}
          </div>
        </div>
      </DragDropContext>

      {/* Card Detail Modal */}
      {selectedCard && (
        <CardDetailModal
          card={selectedCard}
          members={members}
          onClose={() => setSelectedCard(null)}
          onCardUpdated={() => {
            queryClient.invalidateQueries({ queryKey: ['board', board.id] });
            // Re-fetch card data to keep modal synchronized
            api.get(`/boards/${board.id}`).then((res) => {
              if (res.data?.board?.lists) {
                for (const l of res.data.board.lists) {
                  const updated = l.cards.find((c: Card) => c.id === selectedCard.id);
                  if (updated) {
                    setSelectedCard(updated);
                    break;
                  }
                }
              }
            });
          }}
        />
      )}
    </div>
  );
};
