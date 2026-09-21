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
  X
} from 'lucide-react';
import Logo from './Logo';
import { formatSpeed } from '../utils/formatters';

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
  return (
    <header className="glass-panel border-b border-[#8E1616]/30 px-2.5 sm:px-4 py-1.5 sm:py-2 flex items-center justify-between gap-2 sm:gap-3 select-none shrink-0 min-h-[50px] sm:min-h-[54px] bg-[#1D1616]/95 backdrop-blur-md">
      {/* Left: Sidebar Toggle, Logo & Brand */}
      <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
        <Tooltip title={isSidebarCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'} arrow>
          <IconButton
            size="small"
            onClick={onToggleSidebar}
            className="!text-[#b8a5a5] hover:!text-[#EEEEEE] hover:!bg-[#2e2020] !p-1.5 rounded-lg transition-colors"
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
          startIcon={<Plus className="w-4 h-4" />}
          onClick={onAddClick}
          className="shadow-md shadow-[#8E1616]/30 !bg-[#D84040] hover:!bg-[#8E1616] !text-[#EEEEEE] !text-xs !py-1 !px-2.5 sm:!py-1.5 sm:!px-3.5 font-semibold whitespace-nowrap transition-all rounded-lg"
        >
          <span className="hidden sm:inline">Add URL</span>
          <span className="sm:hidden">Add</span>
        </Button>

        {/* Secondary Action: Batch Download */}
        <Tooltip title="Batch download multiple URLs into a package folder" arrow>
          <Button
            variant="outlined"
            size="small"
            startIcon={<Layers className="w-3.5 h-3.5 text-[#D84040]" />}
            onClick={onAddBatchClick}
            className="!bg-[#140e0e]/80 hover:!bg-[#2e1c1c] !border !border-[#8E1616]/50 !text-[#EEEEEE] !text-xs !py-1 !px-2 sm:!py-1.5 sm:!px-3 font-medium whitespace-nowrap transition-all rounded-lg"
          >
            <span className="hidden lg:inline">Batch Download</span>
            <span className="lg:hidden">Batch</span>
          </Button>
        </Tooltip>

        <div className="h-4 w-[1px] bg-[#8E1616]/30 mx-0.5 hidden xl:block" />

        {/* Streamlined Queue Control Cluster */}
        <div className="flex items-center bg-[#140e0e] border border-[#8E1616]/35 rounded-xl p-0.5 gap-0.5 shadow-inner">
          <Tooltip title="Resume all transfers" arrow>
            <button
              type="button"
              onClick={onResumeAll}
              className="flex items-center gap-1 px-1.5 sm:px-2 py-1 rounded-lg text-xs font-medium text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/15 active:scale-95 transition-all cursor-pointer"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span className="hidden 2xl:inline text-[11px]">Resume All</span>
            </button>
          </Tooltip>

          <Tooltip title="Pause all active downloads" arrow>
            <button
              type="button"
              onClick={onPauseAll}
              className="flex items-center gap-1 px-1.5 sm:px-2 py-1 rounded-lg text-xs font-medium text-amber-400 hover:text-amber-300 hover:bg-amber-500/15 active:scale-95 transition-all cursor-pointer"
            >
              <Pause className="w-3.5 h-3.5 fill-current" />
              <span className="hidden 2xl:inline text-[11px]">Pause All</span>
            </button>
          </Tooltip>

          <Tooltip title="Stop all transfers" arrow>
            <button
              type="button"
              onClick={onStopAll}
              className="flex items-center gap-1 px-1.5 sm:px-2 py-1 rounded-lg text-xs font-medium text-rose-400 hover:text-rose-300 hover:bg-rose-500/15 active:scale-95 transition-all cursor-pointer"
            >
              <Square className="w-3.5 h-3.5 fill-current" />
              <span className="hidden 2xl:inline text-[11px]">Stop All</span>
            </button>
          </Tooltip>

          <div className="h-3.5 w-[1px] bg-[#8E1616]/30 mx-0.5" />

          <Tooltip title="Clear finished & cancelled downloads" arrow>
            <button
              type="button"
              onClick={onClearCompleted}
              className="flex items-center gap-1 px-1.5 sm:px-2 py-1 rounded-lg text-xs font-medium text-[#b8a5a5] hover:text-[#EEEEEE] hover:bg-[#2e2020] active:scale-95 transition-all cursor-pointer"
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
          className={`flex items-center gap-1.5 px-2 sm:px-2.5 py-1 rounded-lg border transition-colors ${
            totalSpeed > 0
              ? 'bg-[#8E1616]/20 border-[#D84040]/50 shadow-sm shadow-[#D84040]/10'
              : 'bg-[#140e0e] border-[#8E1616]/30'
          }`}
        >
          <Activity
            className={`w-3.5 h-3.5 ${
              totalSpeed > 0 ? 'text-[#D84040] animate-pulse' : 'text-[#8E1616]'
            }`}
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
          <Search className="w-3.5 h-3.5 text-[#b8a5a5] absolute left-2 sm:left-2.5 pointer-events-none" />
          <input
            type="text"
            placeholder="Filter..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-20 sm:w-28 md:w-36 focus:w-44 transition-all duration-200 pl-7 sm:pl-8 pr-6 sm:pr-7 py-1 text-xs bg-[#140e0e] text-[#EEEEEE] placeholder-[#8a7676] rounded-lg border border-[#8E1616]/30 focus:border-[#D84040]/60 focus:outline-none"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => onSearchChange('')}
              className="absolute right-1.5 text-[#b8a5a5] hover:text-[#EEEEEE] p-0.5 cursor-pointer"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>

        {/* Settings View Toggle */}
        <Tooltip title={currentView === 'settings' ? 'Back to Downloads' : 'Preferences & Settings'} arrow>
          <IconButton
            size="small"
            onClick={() => onViewChange?.(currentView === 'settings' ? 'downloads' : 'settings')}
            className={`!p-1.5 rounded-lg border transition-all ${
              currentView === 'settings'
                ? '!bg-[#8E1616]/40 !border-[#D84040]/60 !text-[#D84040] shadow-sm shadow-[#D84040]/20'
                : '!bg-[#140e0e] !border-[#8E1616]/30 !text-[#b8a5a5] hover:!text-[#EEEEEE] hover:!bg-[#2e2020] hover:!border-[#8E1616]/60'
            }`}
          >
            <Settings className="w-4 h-4" />
          </IconButton>
        </Tooltip>
      </div>
    </header>

  );
}
