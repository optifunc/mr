/** Whitespace within a label denotes prose, not a whole-label URL. */
export function labelUrl(text: string): string | undefined {
    const trimmed = text.trim();
    if (!trimmed || /\s/.test(trimmed)) return;
    try { const url = new URL(trimmed); if (['http:', 'https:'].includes(url.protocol) && url.hostname) return url.href; } catch { /* plain label */ }
}
