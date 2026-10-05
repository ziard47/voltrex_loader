/**
 * Curated high-performance public BitTorrent trackers and helper utilities
 */
export const POPULAR_TRACKERS = [
  'udp://tracker.opentrackr.org:1337/announce',
  'udp://open.stealth.si:80/announce',
  'udp://tracker.torrent.eu.org:451/announce',
  'udp://tracker.moeking.me:6969/announce',
  'udp://explodie.org:6969/announce',
  'udp://opentracker.i2p.rocks:6969/announce',
  'udp://tracker.dler.org:6969/announce',
  'wss://tracker.openwebtorrent.com',
  'wss://tracker.btorrent.xyz'
];

/**
 * Parse string or array of tracker URLs, separating by newline, comma, or semicolon
 * and filtering for valid BitTorrent tracker protocols (udp, http, https, ws, wss).
 */
export function parseTrackersInput(input) {
  if (!input) return [];
  if (Array.isArray(input)) {
    return input
      .flatMap((s) => String(s || '').split(/[\r\n,;]+/))
      .map((s) => s.trim())
      .filter((s) => s.length > 0 && /^(udp|http|https|ws|wss):\/\//i.test(s));
  }
  return String(input)
    .split(/[\r\n,;]+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0 && /^(udp|http|https|ws|wss):\/\//i.test(s));
}
