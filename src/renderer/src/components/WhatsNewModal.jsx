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
  Rocket,
  Palette,
  CheckCircle2,
  ArrowRight,
  X
} from 'lucide-react';
import Logo from './Logo';

export default function WhatsNewModal({ open, onClose, version = '1.1.2' }) {
  const highlights = [
    {
      icon: Rocket,
      title: 'Interactive First-Time Setup Wizard',
      description:
        'A sleek 6-step guided onboarding wizard to configure themes, install the Chromium extension, set download directories, and configure network proxies on fresh installations.',
      badge: 'Onboarding'
    },
    {
      icon: Palette,
      title: 'Dynamic Theme Engine & 8 Curated Palettes',
      description:
        'Full support for System Default, Dark, and Light modes featuring 8 balanced visual presets (Voltrex Crimson, Cyber Neon, Electric Violet, Emerald Matrix, Sunset Amber, Sapphire Blue, Rose Quartz, Midnight Slate).',
      badge: 'Themes'
    },
  ];

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        className:
          '!bg-[var(--theme-bg-card)] !border !border-[var(--theme-border-accent)] !rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col !text-[var(--theme-text-primary)]'
      }}
    >
      {/* Header */}
      <DialogTitle className="!px-5 !py-4 flex items-center justify-between border-b border-[var(--theme-border-accent)] bg-[var(--theme-bg-surface)] shrink-0">
        <div className="flex items-center gap-3">
          <div className="relative">
            <Logo size={32} />
            <span className="absolute -bottom-1 -right-1 flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--theme-primary)] opacity-75" />
              <span className="relative inline-flex rounded-full h-3 w-3 bg-[var(--theme-primary)]" />
            </span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-[var(--theme-text-primary)] leading-tight">
                What's New in Voltrex Loader
              </h3>
              <Chip
                label={`v${version}`}
                size="small"
                className="!bg-[var(--theme-secondary-subtle)] !text-[var(--theme-primary)] !border !border-[var(--theme-border-accent)] font-bold !text-[11px] !h-5"
              />
            </div>
            <p className="text-xs text-[var(--theme-text-muted)] mt-0.5">
              Exciting improvements, setup wizard, and dynamic theming in this release.
            </p>
          </div>
        </div>

        <Tooltip title="Close" arrow>
          <IconButton
            size="small"
            onClick={onClose}
            className="!text-[var(--theme-text-muted)] hover:!text-[var(--theme-primary)] hover:!bg-[var(--theme-secondary-subtle)] !p-1.5"
          >
            <X className="w-4 h-4" />
          </IconButton>
        </Tooltip>
      </DialogTitle>

      {/* Highlights Content */}
      <DialogContent className="!px-5 !py-4 space-y-3 bg-[var(--theme-bg-card)] overflow-y-auto flex-1 min-h-0">
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-[var(--theme-secondary-subtle)] border border-[var(--theme-border-accent)] text-xs text-[var(--theme-text-primary)]">
          <Sparkles className="w-4 h-4 text-[var(--theme-primary)] shrink-0" />
          <span>
            Voltrex Loader has been upgraded to <strong>v{version}</strong> with the new Setup Wizard, full visual theme engine, and contrast polish!
          </span>
        </div>

        <div className="space-y-2.5 pt-1">
          {highlights.map((item, index) => {
            const Icon = item.icon;
            return (
              <div
                key={index}
                className="p-3 rounded-xl bg-[var(--theme-bg-surface)] border border-[var(--theme-border-accent)] hover:border-[var(--theme-primary)] transition-all flex items-start gap-3 shadow-sm"
              >
                <div className="w-8 h-8 rounded-lg bg-[var(--theme-secondary-subtle)] border border-[var(--theme-border-accent)] flex items-center justify-center shrink-0 mt-0.5 text-[var(--theme-primary)]">
                  <Icon className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-0.5">
                    <h4 className="text-xs font-semibold text-[var(--theme-text-primary)]">
                      {item.title}
                    </h4>
                    <span className="text-[10px] font-semibold text-[var(--theme-text-muted)] bg-[var(--theme-bg-card)] px-1.5 py-0.5 rounded border border-[var(--theme-border-accent)] shrink-0">
                      {item.badge}
                    </span>
                  </div>
                  <p className="text-[11px] text-[var(--theme-text-muted)] leading-relaxed">
                    {item.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </DialogContent>

      {/* Actions */}
      <DialogActions className="!px-5 !py-3.5 border-t border-[var(--theme-border-accent)] bg-[var(--theme-bg-surface)] flex items-center justify-between gap-2 shrink-0">
        <div className="flex items-center gap-1.5 text-[11px] text-[var(--theme-text-muted)]">
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
