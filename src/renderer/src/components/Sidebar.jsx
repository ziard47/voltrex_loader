import React from 'react';
import {
  DownloadCloud,
  Layers,
  PlayCircle,
  PauseCircle,
  CheckCircle2,
  AlertCircle,
  FileArchive,
  Film,
  Music,
  FileText,
  Binary,
  FolderOpen,
  Settings,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import Tooltip from '@mui/material/Tooltip';
import IconButton from '@mui/material/IconButton';

export default function Sidebar({
  selectedCategory,
  onSelectCategory,
  selectedType,
  onSelectType,
  counts,
  typeCounts,
  isCollapsed,
  onToggleCollapse,
  currentView,
  onViewChange
}) {
  const statusFilters = [
    { id: 'all', label: 'All Downloads', icon: Layers, count: counts.all, color: 'text-[#EEEEEE]' },
    { id: 'active', label: 'Downloading', icon: PlayCircle, count: counts.active, color: 'text-[var(--theme-primary)]' },
    { id: 'paused', label: 'Paused', icon: PauseCircle, count: counts.paused, color: 'text-amber-400' },
    { id: 'completed', label: 'Completed', icon: CheckCircle2, count: counts.completed, color: 'text-emerald-400' },
    { id: 'error', label: 'Failed / Cancelled', icon: AlertCircle, count: counts.error, color: 'text-rose-500' }
  ];

  const typeFilters = [
    { id: 'all', label: 'All Files', icon: DownloadCloud, count: counts.all },
    { id: 'compressed', label: 'Compressed', icon: FileArchive, count: typeCounts.compressed },
    { id: 'video', label: 'Video', icon: Film, count: typeCounts.video },
    { id: 'audio', label: 'Audio', icon: Music, count: typeCounts.audio },
    { id: 'documents', label: 'Documents', icon: FileText, count: typeCounts.documents },
    { id: 'programs', label: 'Programs', icon: Binary, count: typeCounts.programs },
    { id: 'others', label: 'Others', icon: FolderOpen, count: typeCounts.others }
  ];

  return (
    <aside
      className={`glass-panel border-r border-[#8E1616]/30 flex flex-col justify-between overflow-y-auto select-none transition-all duration-200 shrink-0 bg-[#1D1616] ${
        isCollapsed ? 'w-16 p-2 items-center' : 'w-52 lg:w-56 p-2.5 sm:p-3'
      }`}
    >
      <div className="space-y-3.5 sm:space-y-4 w-full">
        {/* Header / Collapse Toggle */}
        <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'justify-between px-1'} mb-0.5`}>
          {!isCollapsed && (
            <span className="text-[11px] font-bold tracking-wider uppercase text-[#b8a5a5]">
              Filters
            </span>
          )}
          <Tooltip title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"} placement="right" arrow>
            <IconButton
              size="small"
              onClick={onToggleCollapse}
              className="!text-[#b8a5a5] hover:!text-[#EEEEEE] !p-1"
            >
              {isCollapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
            </IconButton>
          </Tooltip>
        </div>

        {/* Status Filters */}
        <div className="w-full">
          {!isCollapsed && (
            <div className="text-[10px] font-semibold tracking-wider uppercase text-[#b8a5a5] mb-1 px-2">
              Status
            </div>
          )}
          <div className="space-y-0.5 sm:space-y-1 w-full">
            {statusFilters.map((item) => {
              const Icon = item.icon;
              const isSelected = selectedCategory === item.id;
              const buttonContent = (
                <button
                  key={item.id}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => onSelectCategory(item.id)}
                  className={`w-full flex items-center ${
                    isCollapsed ? 'justify-center py-1.5 px-1' : 'justify-between px-2.5 py-1 sm:py-1.5'
                  } rounded-lg text-xs font-medium transition-all border outline-none focus:outline-none focus:ring-0 ${
                    isSelected
                      ? '!border-[var(--theme-border-accent)] bg-[var(--theme-secondary-subtle)] text-[var(--theme-primary)] dark:text-[#EEEEEE] font-bold shadow-sm'
                      : 'border-transparent text-slate-700 dark:text-[#b8a5a5] hover:bg-slate-200/60 dark:hover:bg-[#2d1e1e] hover:text-slate-900 dark:hover:text-[#EEEEEE]'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <Icon className={`w-4 h-4 shrink-0 ${isSelected ? 'text-[var(--theme-primary)]' : item.color}`} />
                    {!isCollapsed && <span className="truncate">{item.label}</span>}
                  </div>
                  {!isCollapsed && (
                    <span
                      style={isSelected ? { color: '#ffffff', backgroundColor: 'var(--theme-primary)' } : {}}
                      className={`sidebar-count-chip ${isSelected ? 'chip-selected' : 'chip-unselected'} text-[10px] px-1.5 py-0.5 rounded-full shrink-0 font-bold transition-colors ${
                        isSelected
                          ? '!text-white shadow-sm'
                          : 'bg-black/10 dark:bg-[#291b1b] text-slate-700 dark:text-[#b8a5a5]'
                      }`}
                    >
                      {item.count}
                    </span>
                  )}
                </button>
              );

              return isCollapsed ? (
                <Tooltip
                  key={item.id}
                  title={`${item.label} (${item.count})`}
                  placement="right"
                  arrow
                >
                  {buttonContent}
                </Tooltip>
              ) : (
                buttonContent
              );
            })}
          </div>
        </div>

        {/* Categories */}
        <div className="w-full">
          {!isCollapsed && (
            <div className="text-[10px] font-semibold tracking-wider uppercase text-[#b8a5a5] mb-1 px-2">
              Categories
            </div>
          )}
          <div className="space-y-0.5 sm:space-y-1 w-full">
            {typeFilters.map((item) => {
              const Icon = item.icon;
              const isSelected = selectedType === item.id;
              const buttonContent = (
                <button
                  key={item.id}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => onSelectType(item.id)}
                  className={`w-full flex items-center ${
                    isCollapsed ? 'justify-center py-1.5 px-1' : 'justify-between px-2.5 py-1 sm:py-1.5'
                  } rounded-lg text-xs font-medium transition-all border outline-none focus:outline-none focus:ring-0 ${
                    isSelected
                      ? '!border-[var(--theme-border-accent)] bg-[var(--theme-secondary-subtle)] text-[var(--theme-primary)] dark:text-[#EEEEEE] font-bold shadow-sm'
                      : 'border-transparent text-slate-700 dark:text-[#b8a5a5] hover:bg-slate-200/60 dark:hover:bg-[#2d1e1e] hover:text-slate-900 dark:hover:text-[#EEEEEE]'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <Icon className={`w-4 h-4 shrink-0 ${isSelected ? 'text-[var(--theme-primary)]' : 'text-slate-500 dark:text-[#b8a5a5]'}`} />
                    {!isCollapsed && <span className="truncate">{item.label}</span>}
                  </div>
                  {!isCollapsed && (
                    <span
                      style={isSelected ? { color: '#ffffff', backgroundColor: 'var(--theme-primary)' } : {}}
                      className={`sidebar-count-chip ${isSelected ? 'chip-selected' : 'chip-unselected'} text-[10px] px-1.5 py-0.5 rounded-full shrink-0 font-bold transition-colors ${
                        isSelected
                          ? '!text-white shadow-sm'
                          : 'bg-black/10 dark:bg-[#291b1b] text-slate-700 dark:text-[#b8a5a5]'
                      }`}
                    >
                      {item.count}
                    </span>
                  )}
                </button>
              );

              return isCollapsed ? (
                <Tooltip
                  key={item.id}
                  title={`${item.label} (${item.count})`}
                  placement="right"
                  arrow
                >
                  {buttonContent}
                </Tooltip>
              ) : (
                buttonContent
              );
            })}
          </div>
        </div>
      </div>

      {/* Settings Navigation Button */}
      <div className="pt-2 sm:pt-3 border-t border-[#8E1616]/30 w-full mt-auto">

        {isCollapsed ? (
          <Tooltip title="Preferences & Settings" placement="right" arrow>
            <button
              onClick={() => onViewChange?.('settings')}
              className={`w-full flex justify-center py-2 rounded-lg transition-colors border ${
                currentView === 'settings'
                  ? 'bg-[var(--theme-secondary-subtle)] text-[var(--theme-primary)] border-[var(--theme-border-accent)]'
                  : 'border-transparent text-slate-600 dark:text-[#b8a5a5] hover:text-[var(--theme-primary)] hover:bg-slate-200/60 dark:hover:bg-[#271a1a]'
              }`}
            >
              <Settings className="w-4 h-4" />
            </button>
          </Tooltip>
        ) : (
          <button
            onClick={() => onViewChange?.('settings')}
            className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors border ${
              currentView === 'settings'
                ? 'border-[var(--theme-border-accent)] bg-[var(--theme-secondary-subtle)] text-[var(--theme-primary)] dark:text-[#EEEEEE] font-bold shadow-sm'
                : 'border-transparent text-slate-700 dark:text-[#b8a5a5] hover:text-slate-900 dark:hover:text-[#EEEEEE] hover:bg-slate-200/60 dark:hover:bg-[#271a1a]'
            }`}
          >
            <div className="flex items-center gap-2">
              <Settings className="w-4 h-4" style={{ color: currentView === 'settings' ? 'var(--theme-primary)' : 'var(--theme-text-muted)' }} />
              <span>Settings</span>
            </div>
            {currentView === 'settings' && (
              <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: 'var(--theme-primary)' }} />
            )}
          </button>
        )}
      </div>
    </aside>
  );
}
