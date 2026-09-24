export function formatBytes(bytes) {
  if (!bytes || bytes <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let i = 0;
  let val = bytes;
  while (val >= 1024 && i < units.length - 1) {
    val /= 1024;
    i++;
  }
  return `${val.toFixed(i === 0 ? 0 : 2)} ${units[i]}`;
}

export function formatSpeed(bytesPerSec) {
  if (!bytesPerSec || bytesPerSec <= 0) return '0 KB/s';
  const units = ['B/s', 'KB/s', 'MB/s', 'GB/s'];
  let i = 0;
  let val = bytesPerSec;
  while (val >= 1024 && i < units.length - 1) {
    val /= 1024;
    i++;
  }
  return `${val.toFixed(i === 0 ? 0 : 2)} ${units[i]}`;
}

export function formatEta(seconds) {
  if (!seconds || seconds <= 0 || !isFinite(seconds)) return '--';
  const d = Math.floor(seconds / (3600 * 24));
  const h = Math.floor((seconds % (3600 * 24)) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);

  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

export const CATEGORY_FOLDERS = {
  compressed: 'Compressed',
  video: 'Videos',
  audio: 'Audio',
  documents: 'Documents',
  programs: 'Programs',
  others: 'Others'
};

export const CATEGORY_LABELS = {
  compressed: 'Compressed',
  video: 'Video',
  audio: 'Audio',
  documents: 'Documents',
  programs: 'Programs',
  others: 'Others'
};

export function getFileCategory(fileName = '', mimeType = '') {
  const name = fileName.toLowerCase();
  const ext = name.split('.').pop() || '';

  if (['zip', 'rar', '7z', 'tar', 'gz', 'bz2', 'xz', 'iso', '7zip', 'tgz', 'z', 'cab'].includes(ext)) {
    return 'compressed';
  }
  if (['mp4', 'mkv', 'avi', 'mov', 'webm', 'flv', 'wmv', 'm4v', '3gp', 'ts'].includes(ext) || mimeType.startsWith('video/')) {
    return 'video';
  }
  if (['mp3', 'flac', 'wav', 'aac', 'ogg', 'm4a', 'wma', 'opus', 'alac', 'aiff'].includes(ext) || mimeType.startsWith('audio/')) {
    return 'audio';
  }
  if (['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt', 'epub', 'md', 'csv', 'rtf', 'odt', 'ods', 'odp'].includes(ext) || mimeType.startsWith('text/') || mimeType.includes('pdf')) {
    return 'documents';
  }
  if (['exe', 'msi', 'deb', 'rpm', 'appimage', 'sh', 'apk', 'dmg', 'pkg', 'bin', 'run'].includes(ext)) {
    return 'programs';
  }
  return 'others';
}
