/**
 * Utility functions for formatting and resolving trip discharge / destination terminals.
 * Supports multi-container dual discharge (e.g. 2x 20FT with different terminals)
 * while deduplicating identical discharge terminals so single destinations display cleanly.
 */

export function getTripDischargeTerminal(trip: any): string {
  if (!trip) return 'JCT';

  if (trip.containers && Array.isArray(trip.containers) && trip.containers.length > 0) {
    const list: string[] = [];
    for (const c of trip.containers) {
      const term = (c?.destTerminal || c?.unloadedTerminal || '').trim().toUpperCase();
      if (term) {
        // If a container or trip already had a comma/ampersand separated string, split it
        const parts = term.split(/[\&,]/).map((p: string) => p.trim()).filter(Boolean);
        list.push(...parts);
      }
    }

    if (list.length > 0) {
      const unique = Array.from(new Set(list));
      return unique.join(' & ');
    }
  }

  const rawDest = (trip.destTerminal || '').trim().toUpperCase();
  if (rawDest) {
    const parts = rawDest.split(/[\&,]/).map((p: string) => p.trim()).filter(Boolean);
    const unique = Array.from(new Set(parts));
    return unique.join(' & ');
  }

  return 'JCT';
}

export function getTripRouteDisplay(trip: any): string {
  const origin = (trip?.sourceTerminal || 'CICT').trim().toUpperCase();
  const discharge = getTripDischargeTerminal(trip);
  return `${origin} ➔ ${discharge}`;
}

export function getContainerDischargeTerminal(container: any, trip?: any): string {
  if (container?.destTerminal && container.destTerminal.trim()) {
    return container.destTerminal.trim().toUpperCase();
  }
  if (container?.unloadedTerminal && container.unloadedTerminal.trim()) {
    return container.unloadedTerminal.trim().toUpperCase();
  }
  return getTripDischargeTerminal(trip);
}
