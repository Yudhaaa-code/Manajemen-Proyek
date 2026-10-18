import React, { useState } from 'react';
import { Board, Card } from '../../types';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Tag, AlertCircle } from 'lucide-react';
import { Avatar } from '../common/Avatar';

interface CalendarViewProps {
  board: Board;
  onCardClick: (card: Card) => void;
}

export const CalendarView: React.FC<CalendarViewProps> = ({ board, onCardClick }) => {
  const [currentDate, setCurrentDate] = useState(new Date());

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const prevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  // Collect all cards from all lists in this board
  const allCards = board.lists?.flatMap((l) => l.cards) || [];

  // Filter cards that have dueDates
  const cardsWithDueDate = allCards.filter((c) => c.dueDate);
  const cardsWithoutDueDate = allCards.filter((c) => !c.dueDate);

  // Month navigation labels
  const monthName = currentDate.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });

  // Calendar Grid calculations
  const firstDayOfMonth = new Date(year, month, 1);
  const lastDayOfMonth = new Date(year, month + 1, 0);

  // In Indonesia, Monday is day 0 in our grid index
  // JS getDay(): 0 is Sunday, 1 is Monday ... 6 is Saturday
  const startDay = (firstDayOfMonth.getDay() + 6) % 7;
  const daysInMonth = lastDayOfMonth.getDate();

  const daysArray: (number | null)[] = [];
  for (let i = 0; i < startDay; i++) {
    daysArray.push(null);
  }
  for (let d = 1; d <= daysInMonth; d++) {
    daysArray.push(d);
  }

  const today = new Date();
  const isCurrentMonth = today.getFullYear() === year && today.getMonth() === month;

  // Group cards by day (1..31) for the current month
  const cardsByDay: { [day: number]: Card[] } = {};
  cardsWithDueDate.forEach((card) => {
    if (!card.dueDate) return;
    const cardDate = new Date(card.dueDate);
    if (cardDate.getFullYear() === year && cardDate.getMonth() === month) {
      const dayNum = cardDate.getDate();
      if (!cardsByDay[dayNum]) cardsByDay[dayNum] = [];
      cardsByDay[dayNum].push(card);
    }
  });

  const getPriorityBorder = (priority: string) => {
    switch (priority) {
      case 'URGENT':
        return 'border-l-4 border-l-rose-500 bg-rose-50 dark:bg-rose-950/40 text-rose-900 dark:text-rose-200';
      case 'HIGH':
        return 'border-l-4 border-l-orange-500 bg-orange-50 dark:bg-orange-950/40 text-orange-900 dark:text-orange-200';
      case 'MEDIUM':
        return 'border-l-4 border-l-amber-500 bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200';
      default:
        return 'border-l-4 border-l-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200';
    }
  };

  const dayHeaders = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'];

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-50 dark:bg-slate-950 overflow-hidden p-6 text-slate-800 dark:text-slate-100">
      {/* Calendar Top Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-800 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
            <CalendarIcon className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold tracking-tight capitalize text-slate-900 dark:text-white">
              {monthName}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Tampilan jadwal tenggat waktu to-do list tugas
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={goToToday}
            className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            Hari Ini
          </button>
          <div className="flex items-center rounded-lg border border-slate-300 dark:border-slate-700 overflow-hidden bg-white dark:bg-slate-900">
            <button
              type="button"
              onClick={prevMonth}
              className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors"
              title="Bulan sebelumnya"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={nextMonth}
              className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors"
              title="Bulan berikutnya"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Grid & Unscheduled sidebar */}
      <div className="flex-1 flex gap-6 min-h-0 overflow-hidden">
        {/* Calendar Grid */}
        <div className="flex-1 flex flex-col bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
          {/* Day Headers */}
          <div className="grid grid-cols-7 border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/90 text-center py-2.5 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            {dayHeaders.map((dh) => (
              <div key={dh}>{dh}</div>
            ))}
          </div>

          {/* Grid Cells */}
          <div className="flex-1 grid grid-cols-7 auto-rows-fr overflow-y-auto divide-x divide-y divide-slate-100 dark:divide-slate-800">
            {daysArray.map((day, idx) => {
              if (day === null) {
                return (
                  <div
                    key={`empty-${idx}`}
                    className="bg-slate-50/40 dark:bg-slate-950/40 min-h-[90px]"
                  />
                );
              }

              const isTodayCell = isCurrentMonth && today.getDate() === day;
              const cardsThisDay = cardsByDay[day] || [];

              return (
                <div
                  key={`day-${day}`}
                  className={`p-2 min-h-[95px] flex flex-col transition-colors ${
                    isTodayCell
                      ? 'bg-indigo-50/30 dark:bg-indigo-950/20'
                      : 'hover:bg-slate-50/50 dark:hover:bg-slate-800/30'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span
                      className={`text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center ${
                        isTodayCell
                          ? 'bg-indigo-600 text-white shadow-xs'
                          : 'text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      {day}
                    </span>
                    {cardsThisDay.length > 0 && (
                      <span className="text-[10px] text-slate-400 font-medium">
                        {cardsThisDay.length} tugas
                      </span>
                    )}
                  </div>

                  {/* Cards inside day */}
                  <div className="space-y-1 flex-1 overflow-y-auto max-h-[120px]">
                    {cardsThisDay.map((card) => (
                      <div
                        key={card.id}
                        onClick={() => onCardClick(card)}
                        className={`p-1.5 rounded text-[11px] font-medium shadow-2xs hover:shadow-xs cursor-pointer transition-transform hover:scale-[1.01] flex items-center justify-between gap-1 ${getPriorityBorder(
                          card.priority
                        )}`}
                        title={card.title}
                      >
                        <span className="truncate">{card.title}</span>
                        {card.assignee && (
                          <Avatar
                            name={card.assignee.name}
                            avatarUrl={card.assignee.avatarUrl}
                            size="xs"
                          />
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Sidebar: Tasks without due date */}
        <div className="w-72 hidden xl:flex flex-col bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 overflow-hidden">
          <div className="flex items-center gap-2 mb-3 pb-3 border-b border-slate-100 dark:border-slate-800">
            <AlertCircle className="w-4 h-4 text-amber-500" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              Tanpa Tenggat ({cardsWithoutDueDate.length})
            </h3>
          </div>
          <div className="flex-1 overflow-y-auto space-y-2">
            {cardsWithoutDueDate.map((card) => (
              <div
                key={card.id}
                onClick={() => onCardClick(card)}
                className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-indigo-400 dark:hover:border-indigo-500 bg-slate-50/50 dark:bg-slate-800/40 cursor-pointer transition-all"
              >
                <div className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">
                  {card.title}
                </div>
                <div className="flex items-center justify-between mt-1.5 text-[10px] text-slate-400">
                  <span className="uppercase font-semibold tracking-wider">{card.priority}</span>
                  {card.assignee && <span>{card.assignee.name}</span>}
                </div>
              </div>
            ))}
            {cardsWithoutDueDate.length === 0 && (
              <div className="text-center py-8 text-xs text-slate-400">
                Semua tugas telah memiliki tenggat waktu! 🎉
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
