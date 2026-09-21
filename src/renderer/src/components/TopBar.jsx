import React from 'react';
import Button from '@mui/material/Button';
import Tooltip from '@mui/material/Tooltip';
import IconButton from '@mui/material/IconButton';
import {
  Plus,
  Play,
  Pause,
  Square,
  Trash2,
  Search,
  Activity,
  PanelLeftClose,
  PanelLeftOpen,
  Settings,
  Layers,
  X,
  Sun,
  Moon
} from 'lucide-react';
import Logo from './Logo';
import { formatSpeed } from '../utils/formatters';
import { useTheme } from '../context/ThemeContext';

export default function TopBar({
  onAddClick,
  onAddBatchClick,
  onPauseAll,
  onResumeAll,
  onStopAll,
  onClearCompleted,
  searchQuery,
  onSearchChange,
  totalSpeed,
  activeCount,
  isSidebarCollapsed,
  onToggleSidebar,
  currentView,
  onViewChange
}) {
  const { effectiveMode, toggleMode, themeMode } = useTheme();

  return (
    <header className="glass-panel border-b border-[#8E1616]/30 px-2.5 sm:px-4 py-1.5 sm:py-2 flex items-center justify-between gap-2 sm:gap-3 select-none shrink-0 min-h-[50px] sm:min-h-[54px] bg-[#1D1616]/95 backdrop-blur-md">
      {/* Left: Sidebar Toggle, Logo & Brand */}
      <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
        <Tooltip title={isSidebarCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'} arrow>
          <IconButton
            size="small"
            onClick={onToggleSidebar}
            className="!text-slate-600 dark:!text-[#b8a5a5] hover:!text-slate-900 dark:hover:!text-[#EEEEEE] hover:!bg-slate-100 dark:hover:!bg-[#2e2020] !p-1.5 rounded-lg transition-colors"
          >
            {isSidebarCollapsed ? <PanelLeftOpen className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
          </IconButton>
        </Tooltip>

        <Logo size={30} />

        <div className="hidden sm:block">
          <div className="flex items-center gap-1.5 leading-none">
            <span className="font-bold text-xs sm:text-sm tracking-wide text-[#EEEEEE] whitespace-nowrap">
              VOLTREX <span className="text-[#D84040]">LOADER</span>
            </span>
          </div>
          <div className="flex items-center gap-1.5 mt-0.5 sm:mt-1">
            {activeCount > 0 && (
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#D84040] opacity-75" />
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-[#D84040]" />
              </span>
            )}
            <span className="text-[10px] sm:text-[11px] text-[#b8a5a5] leading-none whitespace-nowrap">
              {activeCount} active transfer{activeCount === 1 ? '' : 's'}
            </span>
          </div>
        </div>
      </div>

      {/* Center: Primary Add Actions & Unified Queue Control Pod */}
      <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
        {/* Primary Action: Add URL */}
        <Button
          variant="contained"
          size="small"
          startIcon={<Plus className="w-4 h-4" style={{ color: '#ffffff' }} />}
          onClick={onAddClick}
          className="btn-theme-primary !text-white !text-xs !py-1 !px-2.5 sm:!py-1.5 sm:!px-3.5 font-semibold whitespace-nowrap rounded-lg"
        >
          <span className="hidden sm:inline font-semibold">Add URL</span>
          <span className="sm:hidden font-semibold">Add</span>
        </Button>

        {/* Secondary Action: Batch Download */}
        <Tooltip title="Batch download multiple URLs into a package folder" arrow>
          <Button
            variant="outlined"
            size="small"
            startIcon={<Layers className="w-3.5 h-3.5" style={{ color: 'var(--theme-primary)' }} />}
            onClick={onAddBatchClick}
            className="btn-theme-outlined !text-xs !py-1 !px-2 sm:!py-1.5 sm:!px-3 font-medium whitespace-nowrap rounded-lg"
          >
            <span className="hidden lg:inline">Batch Download</span>
            <span className="lg:hidden">Batch</span>
          </Button>
        </Tooltip>

        <div className="h-4 w-[1px] bg-slate-200 dark:bg-[#8E1616]/30 mx-0.5 hidden xl:block" />

        {/* Streamlined Queue Control Cluster */}
        <div className="flex items-center bg-white dark:bg-[#140e0e] border border-slate-200 dark:border-[#8E1616]/35 rounded-xl p-0.5 gap-0.5 shadow-sm">
          <Tooltip title="Resume all transfers" arrow>
            <button
              type="button"
              onClick={onResumeAll}
              className="flex items-center gap-1 px-1.5 sm:px-2 py-1 rounded-lg text-xs font-medium text-emerald-500 dark:text-emerald-400 hover:text-emerald-600 dark:hover:text-emerald-300 hover:bg-emerald-500/15 active:scale-95 transition-all cursor-pointer"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span className="hidden 2xl:inline text-[11px]">Resume All</span>
            </button>
          </Tooltip>

          <Tooltip title="Pause all active downloads" arrow>
            <button
              type="button"
              onClick={onPauseAll}
              className="flex items-center gap-1 px-1.5 sm:px-2 py-1 rounded-lg text-xs font-medium text-amber-500 dark:text-amber-400 hover:text-amber-600 dark:hover:text-amber-300 hover:bg-amber-500/15 active:scale-95 transition-all cursor-pointer"
            >
              <Pause className="w-3.5 h-3.5 fill-current" />
              <span className="hidden 2xl:inline text-[11px]">Pause All</span>
            </button>
          </Tooltip>

          <Tooltip title="Stop all transfers" arrow>
            <button
              type="button"
              onClick={onStopAll}
              className="flex items-center gap-1 px-1.5 sm:px-2 py-1 rounded-lg text-xs font-medium text-rose-500 dark:text-rose-400 hover:text-rose-600 dark:hover:text-rose-300 hover:bg-rose-500/15 active:scale-95 transition-all cursor-pointer"
            >
              <Square className="w-3.5 h-3.5 fill-current" />
              <span className="hidden 2xl:inline text-[11px]">Stop All</span>
            </button>
          </Tooltip>

          <div className="h-3.5 w-[1px] bg-slate-200 dark:bg-[#8E1616]/30 mx-0.5" />

          <Tooltip title="Clear finished & cancelled downloads" arrow>
            <button
              type="button"
              onClick={onClearCompleted}
              className="flex items-center gap-1 px-1.5 sm:px-2 py-1 rounded-lg text-xs font-medium text-slate-500 dark:text-[#b8a5a5] hover:text-slate-800 dark:hover:text-[#EEEEEE] hover:bg-slate-100 dark:hover:bg-[#2e2020] active:scale-95 transition-all cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span className="hidden 2xl:inline text-[11px]">Clear</span>
            </button>
          </Tooltip>
        </div>
      </div>

      {/* Right: Live Speed Indicator, Responsive Search & Settings */}
      <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
        {/* Realtime Speed Badge */}
        <div
          style={totalSpeed > 0 ? {
            backgroundColor: 'var(--theme-secondary-subtle)',
            borderColor: 'var(--theme-border-accent)'
          } : {}}
          className={`flex items-center gap-1.5 px-2 sm:px-2.5 py-1 rounded-lg border transition-colors ${
            totalSpeed > 0
              ? 'shadow-sm'
              : 'bg-white dark:bg-[#140e0e] border-slate-200 dark:border-[var(--theme-border)] shadow-sm'
          }`}
        >
          <Activity
            style={{ color: 'var(--theme-primary)' }}
            className={`w-3.5 h-3.5 ${totalSpeed > 0 ? 'animate-pulse' : 'opacity-70'}`}
          />
          <div className="flex flex-col">
            <span className="text-[8px] uppercase font-bold tracking-wider text-[#b8a5a5] leading-none hidden xl:block">
              Speed
            </span>
            <span className="font-mono-stat text-[11px] sm:text-xs font-semibold text-[#EEEEEE] leading-tight whitespace-nowrap">
              {formatSpeed(totalSpeed)}
            </span>
          </div>
        </div>

        {/* Search / Filter with Smooth Expand & Clear Button */}
        <div className="relative flex items-center">
          <Search className="w-3.5 h-3.5 text-slate-400 dark:text-[#b8a5a5] absolute left-2 sm:left-2.5 pointer-events-none" />
          <input
            type="text"
            placeholder="Filter..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-20 sm:w-28 md:w-36 focus:w-44 transition-all duration-200 pl-7 sm:pl-8 pr-6 sm:pr-7 py-1 text-xs bg-white dark:bg-[#140e0e] text-slate-800 dark:text-[#EEEEEE] placeholder-slate-400 dark:placeholder-[#8a7676] rounded-lg border border-slate-200 dark:border-[var(--theme-border)] focus:border-[var(--theme-primary)] focus:outline-none shadow-sm"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => onSearchChange('')}
              className="absolute right-1.5 text-slate-400 dark:text-[#b8a5a5] hover:text-slate-700 dark:hover:text-[#EEEEEE] p-0.5 cursor-pointer"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>

        {/* Quick Theme Mode Toggle */}
        <Tooltip
          title={`Theme Mode: ${themeMode === 'system' ? `System (${effectiveMode})` : effectiveMode === 'dark' ? 'Dark' : 'Light'} (Click to toggle)`}
          arrow
        >
          <IconButton
            size="small"
            onClick={toggleMode}
            className="!p-1.5 rounded-lg border !bg-white dark:!bg-[#140e0e] !border-slate-200 dark:!border-[var(--theme-border)] !text-slate-600 dark:!text-[#b8a5a5] hover:!text-slate-900 dark:hover:!text-[#EEEEEE] hover:!bg-slate-100 dark:hover:!bg-[#2e2020] transition-all shadow-sm"
          >
            {effectiveMode === 'dark' ? (
              <Moon className="w-4 h-4 text-amber-300" />
            ) : (
              <Sun className="w-4 h-4 text-amber-500" />
            )}
          </IconButton>
        </Tooltip>

        {/* Settings View Toggle */}
        <Tooltip title={currentView === 'settings' ? 'Back to Downloads' : 'Preferences & Settings'} arrow>
          <IconButton
            size="small"
            onClick={() => onViewChange?.(currentView === 'settings' ? 'downloads' : 'settings')}
            style={currentView === 'settings' ? {
              backgroundColor: 'var(--theme-secondary-subtle)',
              borderColor: 'var(--theme-border-accent)',
              color: 'var(--theme-primary)'
            } : {}}
            className={`!p-1.5 rounded-lg border transition-all shadow-sm ${
              currentView === 'settings'
                ? ''
                : '!bg-white dark:!bg-[#140e0e] !border-slate-200 dark:!border-[var(--theme-border)] !text-slate-600 dark:!text-[#b8a5a5] hover:!text-slate-900 dark:hover:!text-[#EEEEEE] hover:!bg-slate-100 dark:hover:!bg-[#2e2020]'
            }`}
          >
            <Settings className="w-4 h-4" />
          </IconButton>
        </Tooltip>
      </div>
    </header>

  );
}
