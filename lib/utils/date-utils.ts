/**
 * Format an ISO date string to a human-readable date
 * e.g. "2026-03-25T10:00:00Z" -> "Mar 25, 2026"
 */
export function formatDate(isoString: string): string {
    if (!isoString) return '';
    return new Date(isoString).toLocaleDateString('en-IN', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
    });
}

/**
 * Format an ISO date string to a human-readable time
 * e.g. "2026-03-25T10:00:00Z" -> "10:00 AM"
 */
export function formatTime(isoString: string): string {
    if (!isoString) return '';
    return new Date(isoString).toLocaleTimeString('en-IN', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
    });
}

/**
 * Format an ISO date string to a short date (e.g. for interview cards)
 * e.g. "2026-03-25T10:00:00Z" -> "Wed, Mar 25"
 */
export function formatShortDate(isoString: string): string {
    if (!isoString) return '';
    const date = new Date(isoString);
    const today = new Date();
    const tomorrow = new Date();
    tomorrow.setDate(today.getDate() + 1);

    if (date.toDateString() === today.toDateString()) return 'Today';
    if (date.toDateString() === tomorrow.toDateString()) return 'Tomorrow';

    return date.toLocaleDateString('en-IN', {
        weekday: 'short',
        month: 'short',
        day: 'numeric'
    });
}
