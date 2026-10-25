/**
 * @param {string} chunk
 * @returns {string[]}
 */
export function extractSpeakerNames(chunk) {
  const names = new Set();
  const lines = chunk.split(/\n/);
  for (const line of lines) {
    const m = line.match(/^([A-Za-z][A-Za-z0-9 .'-]{0,40}):\s*/);
    if (m) names.add(m.group(1).trim());
    const vtt = line.match(/^<v\s+([^>]+)>/);
    if (vtt) names.add(vtt[1].trim());
  }
  return [...names];
}

/**
 * @param {string} chunk
 * @param {string} displayName
 */
export function nameAppearsInChunk(chunk, displayName) {
  if (!chunk.trim() || !displayName.trim()) return false;
  const target = displayName.trim().toLowerCase();
  const first = target.split(/\s+/)[0];
  const names = extractSpeakerNames(chunk).map((n) => n.toLowerCase());
  if (names.some((n) => n === target || n.startsWith(first))) return true;
  const lower = chunk.toLowerCase();
  return lower.includes(target) || lower.includes(`${first}:`);
}
