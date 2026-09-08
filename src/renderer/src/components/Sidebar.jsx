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
    { id: 'active', label: 'Downloading', icon: PlayCircle, count: counts.active, color: 'text-[#D84040]' },
    { id: 'paused', label: 'Paused', icon: PauseCircle, count: counts.paused, color: 'text-amber-400' },
    { id: 'completed', label: 'Completed', icon: CheckCircle2, count: counts.completed, color: 'text-emerald-400' },
    { id: 'error', label: 'Failed / Cancelled', icon: AlertCircle, count: counts.error, color: 'text-[#D84040]' }
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
        isCollapsed ? 'w-16 p-2 items-center' : 'w-56 lg:w-60 p-3'
      }`}
    >
      <div className="space-y-5 w-full">
        {/* Header / Collapse Toggle */}
        <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'justify-between px-1'} mb-1`}>
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
            <div className="text-[10px] font-semibold tracking-wider uppercase text-[#b8a5a5] mb-1.5 px-2">
              Status
            </div>
          )}
          <div className="space-y-1 w-full">
            {statusFilters.map((item) => {
              const Icon = item.icon;
              const isSelected = selectedCategory === item.id;
              const buttonContent = (
                <button
                  key={item.id}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => onSelectCategory(item.id)}
                  className={`w-full flex items-center ${
                    isCollapsed ? 'justify-center py-2 px-1' : 'justify-between px-2.5 py-1.5'
                  } rounded-lg text-xs font-medium transition-all border outline-none focus:outline-none focus:ring-0 ${
                    isSelected
                      ? '!border-[#D84040]/50 bg-[#8E1616]/25 text-[#EEEEEE] shadow-sm'
                      : 'border-transparent text-[#b8a5a5] hover:bg-[#2d1e1e] hover:text-[#EEEEEE]'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <Icon className={`w-4 h-4 shrink-0 ${item.color}`} />
                    {!isCollapsed && <span className="truncate">{item.label}</span>}
                  </div>
                  {!isCollapsed && (
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded-full shrink-0 font-normal ${
                        isSelected ? 'bg-[#8E1616]/60 text-[#EEEEEE]' : 'bg-[#291b1b] text-[#b8a5a5]'
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
            <div className="text-[10px] font-semibold tracking-wider uppercase text-[#b8a5a5] mb-1.5 px-2">
              Categories
            </div>
          )}
          <div className="space-y-1 w-full">
            {typeFilters.map((item) => {
              const Icon = item.icon;
              const isSelected = selectedType === item.id;
              const buttonContent = (
                <button
                  key={item.id}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => onSelectType(item.id)}
                  className={`w-full flex items-center ${
                    isCollapsed ? 'justify-center py-2 px-1' : 'justify-between px-2.5 py-1.5'
                  } rounded-lg text-xs font-medium transition-all border outline-none focus:outline-none focus:ring-0 ${
                    isSelected
                      ? '!border-[#D84040]/50 bg-[#8E1616]/25 text-[#EEEEEE] shadow-sm'
                      : 'border-transparent text-[#b8a5a5] hover:bg-[#2d1e1e] hover:text-[#EEEEEE]'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <Icon className="w-4 h-4 shrink-0 text-[#b8a5a5]" />
                    {!isCollapsed && <span className="truncate">{item.label}</span>}
                  </div>
                  {!isCollapsed && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[#291b1b] text-[#b8a5a5] shrink-0 font-normal">
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
      <div className="pt-3 border-t border-[#8E1616]/30 w-full mt-auto">
        {isCollapsed ? (
          <Tooltip title="Preferences & Settings" placement="right" arrow>
            <button
              onClick={() => onViewChange?.('settings')}
              className={`w-full flex justify-center py-2 rounded-lg transition-colors ${
                currentView === 'settings'
                  ? 'bg-[#8E1616]/30 text-[#D84040] border border-[#D84040]/40'
                  : 'text-[#b8a5a5] hover:text-[#EEEEEE] hover:bg-[#271a1a]'
              }`}
            >
              <Settings className="w-4 h-4" />
            </button>
          </Tooltip>
        ) : (
          <button
            onClick={() => onViewChange?.('settings')}
            className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              currentView === 'settings'
                ? 'bg-[#8E1616]/30 text-[#EEEEEE] border border-[#D84040]/40 font-semibold'
                : 'text-[#b8a5a5] hover:text-[#EEEEEE] hover:bg-[#271a1a] border border-transparent'
            }`}
          >
            <div className="flex items-center gap-2">
              <Settings className={`w-4 h-4 ${currentView === 'settings' ? 'text-[#D84040]' : 'text-[#b8a5a5]'}`} />
              <span>Settings</span>
            </div>
            {currentView === 'settings' && (
              <span className="w-1.5 h-1.5 rounded-full bg-[#D84040]" />
            )}
          </button>
        )}
      </div>
    </aside>
  );
}
