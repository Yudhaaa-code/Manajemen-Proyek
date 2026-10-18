import React from 'react';
import { Draggable } from '@hello-pangea/dnd';
import { Card, Priority } from '../../types';
import { Avatar } from '../common/Avatar';
import {
  Calendar,
  MessageSquare,
  AlertTriangle,
  CheckSquare,
  Paperclip,
} from 'lucide-react';

interface CardItemProps {
  card: Card;
  index: number;
  onClick: () => void;
}

export const CardItem: React.FC<CardItemProps> = ({ card, index, onClick }) => {
  // Priority semantic badge colors
  const getPriorityBadge = (priority: Priority) => {
    switch (priority) {
      case 'URGENT':
        return {
          bg: 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-900/50 text-rose-700 dark:text-rose-400',
          dot: 'bg-rose-500',
          label: 'Urgent',
        };
      case 'HIGH':
        return {
          bg: 'bg-orange-50 dark:bg-orange-950/40 border-orange-200 dark:border-orange-900/50 text-orange-700 dark:text-orange-400',
          dot: 'bg-orange-500',
          label: 'High',
        };
      case 'MEDIUM':
        return {
          bg: 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-900/50 text-amber-700 dark:text-amber-400',
          dot: 'bg-amber-500',
          label: 'Medium',
        };
      case 'LOW':
      default:
        return {
          bg: 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-900/50 text-emerald-700 dark:text-emerald-400',
          dot: 'bg-emerald-500',
          label: 'Low',
        };
    }
  };

  const priorityBadge = getPriorityBadge(card.priority);

  // Format Due Date
  const formatDueDate = (dateStr?: string | null) => {
    if (!dateStr) return null;
    const date = new Date(dateStr);
    const today = new Date();
    const isPast = date < today && date.toDateString() !== today.toDateString();
    const isToday = date.toDateString() === today.toDateString();

    const formatted = date.toLocaleDateString('id-ID', {
      month: 'short',
      day: 'numeric',
    });

    return {
      text: isToday ? 'Hari ini' : formatted,
      isOverdue: isPast,
    };
  };

  const dueDateInfo = formatDueDate(card.dueDate);

  // Subtask progress
  const totalSubtasks = card.subtasks?.length || 0;
  const completedSubtasks = card.subtasks?.filter((s) => s.completed).length || 0;
  const allSubtasksDone = totalSubtasks > 0 && completedSubtasks === totalSubtasks;

  // Helper to check for image attachment
  const isImageAttachment = (att: { name: string; url: string; mimeType?: string | null }) => {
    if (att.mimeType && att.mimeType.startsWith('image/')) return true;
    const imageExtensions = ['.png', '.jpg', '.jpeg', '.jfif', '.pjpeg', '.pjp', '.gif', '.webp', '.svg', '.bmp', '.avif', '.ico'];
    const nameLower = (att.name || '').toLowerCase();
    const urlLower = (att.url || '').toLowerCase();
    return imageExtensions.some((ext) => nameLower.endsWith(ext) || urlLower.split('?')[0].endsWith(ext));
  };

  const coverAttachment = card.attachments?.find(isImageAttachment);

  return (
    <Draggable draggableId={card.id} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          onClick={onClick}
          className={`group bg-white dark:bg-slate-900 rounded-xl mb-2.5 border transition-all duration-150 select-none cursor-pointer overflow-hidden ${
            snapshot.isDragging
              ? 'rotate-2 shadow-2xl ring-2 ring-indigo-500/50 border-indigo-400 dark:border-indigo-500 z-40 bg-white/95 dark:bg-slate-900/95 scale-[1.02]'
              : 'border-slate-200/90 dark:border-slate-800 shadow-xs hover:border-slate-300 dark:hover:border-slate-700 hover:shadow-sm'
          }`}
        >
          {/* Cover Image Preview (if image attachment exists) */}
          {coverAttachment && (
            <div className="w-full h-36 relative overflow-hidden bg-slate-100 dark:bg-slate-800/80 border-b border-slate-100 dark:border-slate-800">
              <img
                src={coverAttachment.url}
                alt={coverAttachment.name}
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                loading="lazy"
                onError={(e) => {
                  (e.currentTarget.parentElement as HTMLElement).style.display = 'none';
                }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/15 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          )}

          <div className="p-3.5">
            {/* Priority Badge & Top Icons */}
          <div className="flex items-center justify-between gap-2 mb-2">
            <span
              className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-semibold border ${priorityBadge.bg}`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${priorityBadge.dot}`} />
              {priorityBadge.label}
            </span>

            <div className="flex items-center gap-2">
              {card.attachments && card.attachments.length > 0 && (
                <span className="flex items-center gap-0.5 text-[10px] text-slate-400 dark:text-slate-500">
                  <Paperclip className="w-3 h-3" />
                  <span>{card.attachments.length}</span>
                </span>
              )}

              {card.comments && card.comments.length > 0 && (
                <span className="flex items-center gap-1 text-[11px] text-slate-400 dark:text-slate-500 group-hover:text-slate-600 dark:group-hover:text-slate-300 transition-colors">
                  <MessageSquare className="w-3 h-3" />
                  <span>{card.comments.length}</span>
                </span>
              )}
            </div>
          </div>

          {/* Labels if available */}
          {card.labels && card.labels.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-2">
              {card.labels.map((label) => (
                <span
                  key={label.id}
                  style={{ backgroundColor: `${label.color}15`, borderColor: `${label.color}40`, color: label.color }}
                  className="px-2 py-0.5 rounded text-[10px] font-semibold border uppercase tracking-wider"
                >
                  {label.name}
                </span>
              ))}
            </div>
          )}

          {/* Card Title */}
          <h4 className="text-xs font-semibold text-slate-900 dark:text-slate-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 leading-snug transition-colors line-clamp-2">
            {card.title}
          </h4>

          {/* Truncated Description */}
          {card.description && (
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 line-clamp-2 leading-relaxed font-normal">
              {card.description}
            </p>
          )}

          {/* Subtasks Progress Bar (if any subtasks exist) */}
          {totalSubtasks > 0 && (
            <div className="mt-2.5 pt-2 border-t border-slate-100 dark:border-slate-800/80">
              <div className="flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400 mb-1">
                <span className={`inline-flex items-center gap-1 font-medium ${allSubtasksDone ? 'text-emerald-600 dark:text-emerald-400' : ''}`}>
                  <CheckSquare className="w-3 h-3" />
                  <span>Sub-tugas</span>
                </span>
                <span className={`font-semibold ${allSubtasksDone ? 'text-emerald-600 dark:text-emerald-400' : ''}`}>
                  {completedSubtasks}/{totalSubtasks}
                </span>
              </div>
              <div className="w-full h-1 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-300 rounded-full ${
                    allSubtasksDone ? 'bg-emerald-500' : 'bg-indigo-600 dark:bg-indigo-500'
                  }`}
                  style={{ width: `${(completedSubtasks / totalSubtasks) * 100}%` }}
                />
              </div>
            </div>
          )}

          {/* Footer: Due date & Assignee */}
          <div className="flex items-center justify-between pt-2.5 mt-2 border-t border-slate-100 dark:border-slate-800">
            {dueDateInfo ? (
              <div
                className={`flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded ${
                  dueDateInfo.isOverdue
                    ? 'text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 font-semibold border border-rose-200 dark:border-rose-900/40'
                    : 'text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800'
                }`}
                title={dueDateInfo.isOverdue ? 'Tenggat waktu terlewat!' : 'Tenggat waktu'}
              >
                {dueDateInfo.isOverdue ? (
                  <AlertTriangle className="w-3 h-3 text-rose-500 animate-pulse" />
                ) : (
                  <Calendar className="w-3 h-3" />
                )}
                <span>{dueDateInfo.text}</span>
              </div>
            ) : (
              <div />
            )}

            {card.assignee ? (
              <Avatar
                name={card.assignee.name}
                avatarUrl={card.assignee.avatarUrl}
                size="xs"
              />
            ) : (
              <div className="w-5 h-5 rounded-full border border-dashed border-slate-300 dark:border-slate-700 flex items-center justify-center text-slate-300 dark:text-slate-600 text-[9px]">
                ?
              </div>
            )}
          </div>
        </div>
      </div>
    )}
  </Draggable>
  );
};
