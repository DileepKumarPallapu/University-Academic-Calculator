import React, { useState, useMemo } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  CheckCircle2,
  AlertCircle,
  Calendar as CalendarIcon,
  Trash2,
  Edit2,
  CheckSquare,
} from 'lucide-react';
import type { AcademicTask } from '../../types/academicCompanion';

interface InteractiveCalendarViewProps {
  tasks: AcademicTask[];
  onAddTaskForDate: (date: string) => void;
  onEditTask: (task: AcademicTask) => void;
  onDeleteTask: (taskId: string) => void;
  onToggleStatus: (taskId: string) => void;
}

export const InteractiveCalendarView: React.FC<InteractiveCalendarViewProps> = ({
  tasks,
  onAddTaskForDate,
  onEditTask,
  onDeleteTask,
  onToggleStatus,
}) => {
  const today = useMemo(() => new Date(), []);
  const todayDateStr = useMemo(() => {
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(
      today.getDate()
    ).padStart(2, '0')}`;
  }, [today]);

  const [currentYear, setCurrentYear] = useState<number>(today.getFullYear());
  const [currentMonth, setCurrentMonth] = useState<number>(today.getMonth()); // 0-indexed
  const [selectedDate, setSelectedDate] = useState<string>(todayDateStr);

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];

  // Navigate months
  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear((y) => y - 1);
    } else {
      setCurrentMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear((y) => y + 1);
    } else {
      setCurrentMonth((m) => m + 1);
    }
  };

  const handleGoToday = () => {
    setCurrentYear(today.getFullYear());
    setCurrentMonth(today.getMonth());
    setSelectedDate(todayDateStr);
  };

  // Group tasks by dueDate (YYYY-MM-DD)
  const tasksByDate = useMemo(() => {
    const map: Record<string, AcademicTask[]> = {};
    tasks.forEach((t) => {
      if (t.dueDate) {
        if (!map[t.dueDate]) map[t.dueDate] = [];
        map[t.dueDate].push(t);
      }
    });
    return map;
  }, [tasks]);

  // Calendar cells generation
  const calendarCells = useMemo(() => {
    const firstDayOfWeek = new Date(currentYear, currentMonth, 1).getDay(); // 0 = Sun
    const totalDaysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const totalDaysInPrevMonth = new Date(currentYear, currentMonth, 0).getDate();

    const cells: {
      day: number;
      dateStr: string;
      isCurrentMonth: boolean;
      tasks: AcademicTask[];
      hasOverdue: boolean;
    }[] = [];

    // Prev month padding
    for (let i = firstDayOfWeek - 1; i >= 0; i--) {
      const day = totalDaysInPrevMonth - i;
      const prevMonth = currentMonth === 0 ? 11 : currentMonth - 1;
      const prevYear = currentMonth === 0 ? currentYear - 1 : currentYear;
      const dateStr = `${prevYear}-${String(prevMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const dayTasks = tasksByDate[dateStr] || [];
      const hasOverdue = dayTasks.some((t) => t.status !== 'completed' && dateStr < todayDateStr);
      cells.push({ day, dateStr, isCurrentMonth: false, tasks: dayTasks, hasOverdue });
    }

    // Current month days
    for (let day = 1; day <= totalDaysInMonth; day++) {
      const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const dayTasks = tasksByDate[dateStr] || [];
      const hasOverdue = dayTasks.some((t) => t.status !== 'completed' && dateStr < todayDateStr);
      cells.push({ day, dateStr, isCurrentMonth: true, tasks: dayTasks, hasOverdue });
    }

    // Next month padding to fill out 35 or 42 cells
    const remaining = (7 - (cells.length % 7)) % 7;
    for (let day = 1; day <= remaining; day++) {
      const nextMonth = currentMonth === 11 ? 0 : currentMonth + 1;
      const nextYear = currentMonth === 11 ? currentYear + 1 : currentYear;
      const dateStr = `${nextYear}-${String(nextMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const dayTasks = tasksByDate[dateStr] || [];
      const hasOverdue = dayTasks.some((t) => t.status !== 'completed' && dateStr < todayDateStr);
      cells.push({ day, dateStr, isCurrentMonth: false, tasks: dayTasks, hasOverdue });
    }

    return cells;
  }, [currentYear, currentMonth, tasksByDate, todayDateStr]);

  const selectedTasks = useMemo(() => {
    return tasksByDate[selectedDate] || [];
  }, [tasksByDate, selectedDate]);

  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
      {/* Calendar Header */}
      <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 rounded-lg">
            <CalendarIcon className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
              {monthNames[currentMonth]} {currentYear}
            </h2>
            <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-500">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-rose-500"></span> Overdue
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-indigo-500"></span> Pending
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span> Completed
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleGoToday}
            className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-colors"
          >
            Today
          </button>
          <div className="flex items-center border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
            <button
              onClick={handlePrevMonth}
              className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors"
              title="Previous Month"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={handleNextMonth}
              className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors"
              title="Next Month"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Weekday Labels */}
      <div className="grid grid-cols-7 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 text-center text-xs font-bold text-slate-500 dark:text-slate-400 py-2">
        <span>Sun</span>
        <span>Mon</span>
        <span>Tue</span>
        <span>Wed</span>
        <span>Thu</span>
        <span>Fri</span>
        <span>Sat</span>
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 divide-x divide-y divide-slate-100 dark:divide-slate-800/60 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
        {calendarCells.map((cell, idx) => {
          const isToday = cell.dateStr === todayDateStr;
          const isSelected = cell.dateStr === selectedDate;
          const pendingCount = cell.tasks.filter((t) => t.status !== 'completed').length;
          const completedCount = cell.tasks.filter((t) => t.status === 'completed').length;

          return (
            <button
              key={`${cell.dateStr}-${idx}`}
              type="button"
              onClick={() => setSelectedDate(cell.dateStr)}
              className={`min-h-[75px] sm:min-h-[85px] p-1.5 sm:p-2 text-left transition-all relative flex flex-col justify-between ${
                !cell.isCurrentMonth
                  ? 'bg-slate-50/50 dark:bg-slate-900/40 opacity-40'
                  : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'
              } ${isSelected ? 'ring-2 ring-inset ring-indigo-500 bg-indigo-50/30 dark:bg-indigo-950/20' : ''}`}
            >
              <div className="flex items-center justify-between">
                <span
                  className={`text-xs font-bold inline-flex items-center justify-center w-6 h-6 rounded-full ${
                    isToday
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : isSelected
                      ? 'bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300'
                      : 'text-slate-700 dark:text-slate-300'
                  }`}
                >
                  {cell.day}
                </span>

                {cell.hasOverdue && (
                  <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" title="Overdue task!" />
                )}
              </div>

              {/* Task Dots / Badges */}
              {cell.tasks.length > 0 && (
                <div className="mt-1 space-y-1">
                  <div className="hidden sm:block">
                    {cell.tasks.slice(0, 2).map((task) => {
                      const isTaskOverdue = task.status !== 'completed' && task.dueDate < todayDateStr;
                      return (
                        <div
                          key={task.id}
                          className={`truncate text-[10px] px-1 py-0.5 rounded font-medium ${
                            task.status === 'completed'
                              ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 line-through'
                              : isTaskOverdue
                              ? 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400 font-semibold'
                              : 'bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300'
                          }`}
                        >
                          {task.title}
                        </div>
                      );
                    })}
                    {cell.tasks.length > 2 && (
                      <div className="text-[9px] font-semibold text-slate-400 text-right pr-0.5">
                        +{cell.tasks.length - 2} more
                      </div>
                    )}
                  </div>

                  {/* Mobile indicator dots */}
                  <div className="sm:hidden flex items-center gap-1 justify-center">
                    {pendingCount > 0 && (
                      <span className={`w-1.5 h-1.5 rounded-full ${cell.hasOverdue ? 'bg-rose-500' : 'bg-indigo-500'}`} />
                    )}
                    {completedCount > 0 && (
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    )}
                  </div>
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Selected Day Inspector Panel */}
      <div className="p-4 sm:p-5 bg-slate-50/70 dark:bg-slate-800/40">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                Selected Day Overview
              </span>
              {selectedDate === todayDateStr && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300">
                  Today
                </span>
              )}
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white mt-0.5">
              {new Date(selectedDate + 'T00:00:00').toLocaleDateString(undefined, {
                weekday: 'long',
                month: 'long',
                day: 'numeric',
                year: 'numeric',
              })}
            </h3>
          </div>

          <button
            onClick={() => onAddTaskForDate(selectedDate)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm transition-colors self-start sm:self-center"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Task for this Day
          </button>
        </div>

        {selectedTasks.length === 0 ? (
          <div className="p-6 text-center rounded-xl border border-dashed border-slate-300 dark:border-slate-700 bg-white/60 dark:bg-slate-900/40">
            <CheckSquare className="w-8 h-8 text-slate-400 mx-auto mb-2 opacity-60" />
            <p className="text-xs font-medium text-slate-600 dark:text-slate-400">
              No tasks scheduled for this date.
            </p>
            <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">
              Plan ahead by scheduling preparation milestones or assignment due dates.
            </p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {selectedTasks.map((task) => {
              const isOverdue = task.status !== 'completed' && task.dueDate < todayDateStr;
              return (
                <div
                  key={task.id}
                  className={`p-3.5 rounded-xl border bg-white dark:bg-slate-900 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors ${
                    isOverdue
                      ? 'border-rose-300 dark:border-rose-900/60 bg-rose-50/20'
                      : 'border-slate-200 dark:border-slate-700/80'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <button
                      onClick={() => onToggleStatus(task.id)}
                      className={`mt-0.5 p-1 rounded-md transition-colors ${
                        task.status === 'completed'
                          ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60'
                          : 'text-slate-400 hover:text-indigo-600 bg-slate-100 dark:bg-slate-800'
                      }`}
                      title={task.status === 'completed' ? 'Mark Pending' : 'Mark Completed'}
                    >
                      <CheckCircle2 className="w-4 h-4" />
                    </button>

                    <div>
                      <div className="flex flex-wrap items-center gap-1.5 mb-1">
                        <span
                          className={`text-sm font-semibold ${
                            task.status === 'completed'
                              ? 'line-through text-slate-400 dark:text-slate-500'
                              : 'text-slate-900 dark:text-white'
                          }`}
                        >
                          {task.title}
                        </span>

                        {isOverdue && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-100 dark:bg-rose-950/80 text-rose-700 dark:text-rose-400">
                            <AlertCircle className="w-3 h-3" /> Overdue
                          </span>
                        )}

                        <span
                          className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                            task.priority === 'high'
                              ? 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400'
                              : task.priority === 'medium'
                              ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400'
                              : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                          }`}
                        >
                          {task.priority.toUpperCase()}
                        </span>

                        {task.courseName && (
                          <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
                            {task.courseName}
                          </span>
                        )}
                      </div>

                      {task.notes && (
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                          {task.notes}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 self-end sm:self-center">
                    <button
                      onClick={() => onEditTask(task)}
                      className="p-1.5 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                      title="Edit Task"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => onDeleteTask(task.id)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                      title="Delete Task"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
