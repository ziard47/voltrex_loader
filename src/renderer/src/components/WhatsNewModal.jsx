import React from 'react';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import {
  Sparkles,
  Monitor,
  ZoomIn,
  CheckCircle2,
  TableProperties,
  ArrowRight,
  X,
  Layers
} from 'lucide-react';
import Logo from './Logo';

export default function WhatsNewModal({ open, onClose, version = '1.1.1' }) {
  const highlights = [
    {
      icon: Monitor,
      title: 'Enhanced 1360x768 & Small Screen Display Scaling',
      description:
        'Voltrex Loader now dynamically adapts its window dimensions to your display work area. No more cut-off bottoms, hidden taskbars, or off-screen buttons.',
      badge: 'Display'
    },
    {
      icon: ZoomIn,
      title: 'Display Scale & UI Zoom Controls',
      description:
        'Automatic zoom scaling on compact screens, with a dedicated zoom selector in Settings (75% to 125%) and keyboard shortcuts (Ctrl + / - / 0).',
      badge: 'Controls'
    },
    {
      icon: Layers,
      title: 'Scrollable Modals with Pinned Actions',
      description:
        'Single and batch download dialogs now feature scrollable viewports with permanently pinned action buttons (Download Now, Add Paused, Cancel).',
      badge: 'UX'
    },
    {
      icon: TableProperties,
      title: 'Responsive Table Scrolling & Compact TopBar',
      description:
        'Horizontal table scrolling prevents rightmost columns (Speed, ETA, Status) from ever getting truncated. Refined, responsive TopBar queue controls.',
      badge: 'Layout'
    }
  ];

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        className: '!bg-[#1D1616] !border !border-[#8E1616]/60 !rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col'
      }}
    >
      {/* Header */}
      <DialogTitle className="!px-5 !py-4 flex items-center justify-between border-b border-[#8E1616]/35 bg-[#140e0e] shrink-0">
        <div className="flex items-center gap-3">
          <div className="relative">
            <Logo size={32} />
            <span className="absolute -bottom-1 -right-1 flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#D84040] opacity-75" />
              <span className="relative inline-flex rounded-full h-3 w-3 bg-[#D84040]" />
            </span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-[#EEEEEE] leading-tight">
                What's New in Voltrex Loader
              </h3>
              <Chip
                label={`v${version}`}
                size="small"
                className="!bg-[#8E1616]/40 !text-[#D84040] !border !border-[#D84040]/40 font-bold !text-[11px] !h-5"
              />
            </div>
            <p className="text-xs text-[#b8a5a5] mt-0.5">
              Exciting improvements and responsiveness updates in this release.
            </p>
          </div>
        </div>

        <Tooltip title="Close" arrow>
          <IconButton
            size="small"
            onClick={onClose}
            className="!text-[#b8a5a5] hover:!text-[#EEEEEE] hover:!bg-[#2e1d1d] !p-1.5"
          >
            <X className="w-4 h-4" />
          </IconButton>
        </Tooltip>
      </DialogTitle>

      {/* Highlights Content */}
      <DialogContent className="!px-5 !py-4 space-y-3 bg-[#1D1616] overflow-y-auto flex-1 min-h-0">
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-[#8E1616]/15 border border-[#D84040]/30 text-xs text-[#EEEEEE]">
          <Sparkles className="w-4 h-4 text-[#D84040] shrink-0" />
          <span>
            Voltrex Loader has been upgraded to <strong>v{version}</strong> with major display scaling and responsiveness enhancements!
          </span>
        </div>

        <div className="space-y-2.5 pt-1">
          {highlights.map((item, index) => {
            const Icon = item.icon;
            return (
              <div
                key={index}
                className="p-3 rounded-xl bg-[#140e0e]/80 border border-[#8E1616]/30 hover:border-[#D84040]/40 transition-all flex items-start gap-3"
              >
                <div className="w-8 h-8 rounded-lg bg-[#8E1616]/25 border border-[#D84040]/30 flex items-center justify-center shrink-0 mt-0.5 text-[#D84040]">
                  <Icon className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-0.5">
                    <h4 className="text-xs font-semibold text-[#EEEEEE]">
                      {item.title}
                    </h4>
                    <span className="text-[10px] font-semibold text-[#b8a5a5] bg-[#1D1616] px-1.5 py-0.2 rounded border border-[#8E1616]/30 shrink-0">
                      {item.badge}
                    </span>
                  </div>
                  <p className="text-[11px] text-[#b8a5a5] leading-relaxed">
                    {item.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </DialogContent>

      {/* Actions */}
      <DialogActions className="!px-5 !py-3.5 border-t border-[#8E1616]/35 bg-[#140e0e] flex items-center justify-between gap-2 shrink-0">
        <div className="flex items-center gap-1.5 text-[11px] text-[#b8a5a5]">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
          <span>You're running the latest release</span>
        </div>

        <Button
          variant="contained"
          size="small"
          onClick={onClose}
          endIcon={<ArrowRight className="w-3.5 h-3.5" />}
          className="btn-theme-primary !text-white !text-xs !py-1.5 !px-4 font-semibold whitespace-nowrap !rounded-lg"
        >
          Got it, Continue
        </Button>
      </DialogActions>
    </Dialog>
  );
}
