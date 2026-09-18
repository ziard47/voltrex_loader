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
  Layers,
  Download,
  X,
  Globe,
  FileCode,
  FolderPlus,
  Plus
} from 'lucide-react';

export default function CaptureBatchPromptModal({
  open,
  onClose,
  incomingData,
  currentSingleData,
  isBatchOpen,
  onAddToBatch,
  onOpenSeparately
}) {
  if (!incomingData) return null;

  const incomingName = incomingData.fileName || 'Incoming file';
  const incomingUrl = incomingData.url || '';
  const currentName = currentSingleData?.fileName || 'Current file';

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="xs"
      fullWidth
      PaperProps={{
        className: '!bg-[#1D1616] !border !border-[#8E1616]/70 !rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col'
      }}
    >
      {/* Header */}
      <DialogTitle className="!px-5 !py-3.5 flex items-center justify-between border-b border-[#8E1616]/35 bg-[#140e0e] shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-[#8E1616]/30 border border-[#D84040]/30 text-[#D84040] flex items-center justify-center">
            <Layers className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-[#EEEEEE] leading-tight">
              New Download Captured
            </h3>
            <span className="text-[11px] text-[#b8a5a5]">
              Another link was sent from browser
            </span>
          </div>
        </div>
        <Tooltip title="Dismiss" arrow>
          <IconButton
            size="small"
            onClick={onClose}
            className="!text-[#b8a5a5] hover:!text-[#EEEEEE] hover:!bg-[#2e1d1d] !p-1.5"
          >
            <X className="w-4 h-4" />
          </IconButton>
        </Tooltip>
      </DialogTitle>

      {/* Content */}
      <DialogContent className="!px-5 !py-3.5 space-y-3 bg-[#1D1616] overflow-y-auto flex-1 min-h-0">
        <p className="text-xs text-[#EEEEEE] leading-relaxed">
          {isBatchOpen ? (
            <>
              Would you like to add this download to your currently open <strong>Batch Download package</strong>?
            </>
          ) : (
            <>
              You have a download window open. Would you like to combine this new link with <strong>{currentName}</strong> into a <strong>Batch Download package</strong>?
            </>
          )}
        </p>

        {/* Incoming Download Card */}
        <div className="p-3 rounded-xl bg-[#140e0e] border border-[#8E1616]/40 space-y-1.5">
          <div className="flex items-center gap-2">
            <Chip
              label="New Link"
              size="small"
              className="!bg-[#8E1616]/30 !text-[#D84040] !border !border-[#D84040]/30 font-semibold !text-[10px] !h-5"
            />
            <span className="text-xs font-semibold text-[#EEEEEE] truncate" title={incomingName}>
              {incomingName}
            </span>
          </div>
          <div className="text-[11px] font-mono text-[#b8a5a5] truncate" title={incomingUrl}>
            {incomingUrl}
          </div>
        </div>
      </DialogContent>

      {/* Actions */}
      <DialogActions className="!px-5 !py-3 border-t border-[#8E1616]/35 bg-[#140e0e] flex items-center justify-between gap-2 shrink-0">
        <Button
          variant="outlined"
          size="small"
          onClick={onClose}
          className="!border-[#8E1616]/40 !text-[#b8a5a5] hover:!text-[#EEEEEE] hover:!bg-[#2e1d1d] !text-xs !py-1.5 !px-3"
        >
          Dismiss
        </Button>

        <div className="flex items-center gap-2">
          {!isBatchOpen && (
            <Button
              variant="outlined"
              size="small"
              onClick={onOpenSeparately}
              className="!border-[#8E1616]/50 !text-[#b8a5a5] hover:!text-[#EEEEEE] hover:!bg-[#2e1d1d] !text-xs !py-1.5 !px-3 whitespace-nowrap"
            >
              Separate
            </Button>
          )}

          <Button
            variant="contained"
            size="small"
            onClick={onAddToBatch}
            startIcon={<Plus className="w-3.5 h-3.5" />}
            className="shadow-md shadow-[#8E1616]/40 !bg-[#D84040] hover:!bg-[#8E1616] !text-[#EEEEEE] !text-xs !py-1.5 !px-4 font-semibold whitespace-nowrap"
          >
            Add to Batch
          </Button>
        </div>
      </DialogActions>
    </Dialog>
  );
}
