import React from 'react';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import InputAdornment from '@mui/material/InputAdornment';
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
  Settings
} from 'lucide-react';
import Logo from './Logo';
import { formatSpeed } from '../utils/formatters';

export default function TopBar({
  onAddClick,
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
    <header className="glass-panel border-b border-[#8E1616]/30 px-4 py-2.5 flex items-center justify-between gap-2.5 select-none shrink-0 min-h-[56px] overflow-hidden bg-[#1D1616]">
      {/* Left: Logo, Brand & Sidebar Toggle */}
      <div className="flex items-center gap-2.5 shrink-0">
        <Tooltip title={isSidebarCollapsed ? "Expand Sidebar" : "Collapse Sidebar"} arrow>
          <IconButton
            size="small"
            onClick={onToggleSidebar}
            className="!text-[#b8a5a5] hover:!text-[#EEEEEE] hover:!bg-[#2e2020] !p-1.5"
          >
            {isSidebarCollapsed ? <PanelLeftOpen className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
          </IconButton>
        </Tooltip>

        {/* Custom Logo Icon */}
        <Logo size={34} />

        {/* Single Application Name: Voltrex Loader */}
        <div className="hidden sm:block">
          <div className="flex items-center gap-1.5">
            <span className="font-bold text-sm tracking-wide text-[#EEEEEE]">
              VOLTREX <span className="text-[#D84040]">LOADER</span>
            </span>
          </div>
          <div className="text-[11px] text-[#b8a5a5] leading-none mt-0.5">
            {activeCount} active transfer{activeCount === 1 ? '' : 's'}
          </div>
        </div>
      </div>

      {/* Center: Global Actions Toolbar */}
      <div className="flex items-center gap-1.5 shrink-0">
        <Button
          variant="contained"
          startIcon={<Plus className="w-4 h-4" />}
          onClick={onAddClick}
          className="shadow-md shadow-[#8E1616]/40 !bg-[#D84040] hover:!bg-[#8E1616] !text-[#EEEEEE] !text-xs !py-1.5 !px-3.5 font-semibold whitespace-nowrap transition-colors"
        >
          <span>Add URL</span>
        </Button>

        <div className="h-5 w-[1px] bg-[#8E1616]/40 mx-1 hidden sm:block" />

        <Tooltip title="Resume all transfers" arrow>
          <span>
            <Button
              variant="outlined"
              size="small"
              startIcon={<Play className="w-3.5 h-3.5" />}
              onClick={onResumeAll}
              className="!border-emerald-500/30 !text-emerald-400 hover:!bg-emerald-500/10 !text-xs !py-1 !px-2.5 whitespace-nowrap"
            >
              <span className="hidden md:inline">Resume All</span>
              <span className="md:hidden">Resume</span>
            </Button>
          </span>
        </Tooltip>

        <Tooltip title="Pause all active downloads" arrow>
          <span>
            <Button
              variant="outlined"
              size="small"
              startIcon={<Pause className="w-3.5 h-3.5" />}
              onClick={onPauseAll}
              className="!border-amber-500/30 !text-amber-400 hover:!bg-amber-500/10 !text-xs !py-1 !px-2.5 whitespace-nowrap"
            >
              <span className="hidden md:inline">Pause All</span>
              <span className="md:hidden">Pause</span>
            </Button>
          </span>
        </Tooltip>

        <Tooltip title="Stop all transfers" arrow>
          <span>
            <Button
              variant="outlined"
              size="small"
              startIcon={<Square className="w-3.5 h-3.5" />}
              onClick={onStopAll}
              className="!border-[#D84040]/40 !text-[#D84040] hover:!bg-[#8E1616]/20 !text-xs !py-1 !px-2.5 whitespace-nowrap"
            >
              <span className="hidden md:inline">Stop All</span>
              <span className="md:hidden">Stop</span>
            </Button>
          </span>
        </Tooltip>

        <Tooltip title="Clear finished & cancelled downloads from list" arrow>
          <span>
            <Button
              variant="text"
              size="small"
              startIcon={<Trash2 className="w-3.5 h-3.5" />}
              onClick={onClearCompleted}
              className="!text-[#b8a5a5] hover:!text-[#EEEEEE] !text-xs !py-1 !px-2 whitespace-nowrap hidden lg:inline-flex"
            >
              Clear Finished
            </Button>
          </span>
        </Tooltip>
      </div>

      {/* Right: Global Speed & Search Filter */}
      <div className="flex items-center gap-2 shrink-0">
        {/* Speed meter badge */}
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#140e0e] border border-[#8E1616]/40">
          <Activity className={`w-3.5 h-3.5 ${totalSpeed > 0 ? 'text-[#D84040] animate-pulse' : 'text-[#8E1616]'}`} />
          <div className="flex flex-col">
            <span className="text-[9px] uppercase font-semibold text-[#b8a5a5] leading-tight hidden sm:block">Speed</span>
            <span className="font-mono-stat text-xs font-semibold text-[#EEEEEE] leading-tight whitespace-nowrap">
              {formatSpeed(totalSpeed)}
            </span>
          </div>
        </div>

        {/* Search Input */}
        <TextField
          size="small"
          placeholder="Filter..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Search className="w-3.5 h-3.5 text-[#b8a5a5]" />
              </InputAdornment>
            ),
            className: '!bg-[#140e0e] !text-xs !text-[#EEEEEE] !rounded-lg border border-[#8E1616]/30'
          }}
          sx={{
            width: { xs: 100, sm: 130, md: 170 },
            '& .MuiInputBase-input': { py: '4px', fontSize: '0.75rem' }
          }}
        />

        {/* Settings Toggle Button */}
        <Tooltip title={currentView === 'settings' ? 'Back to Downloads' : 'Preferences & Settings'} arrow>
          <IconButton
            size="small"
            onClick={() => onViewChange?.(currentView === 'settings' ? 'downloads' : 'settings')}
            className={`!p-1.5 rounded-lg border transition-colors ${
              currentView === 'settings'
                ? '!bg-[#8E1616]/40 !border-[#D84040]/60 !text-[#D84040]'
                : '!border-[#8E1616]/30 !text-[#b8a5a5] hover:!text-[#EEEEEE] hover:!bg-[#2e2020]'
            }`}
          >
            <Settings className="w-4 h-4" />
          </IconButton>
        </Tooltip>
      </div>
    </header>
  );
}
