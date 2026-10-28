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

/**
 * Formats a raw date or time string into a clean, human-readable 12-hour time (e.g. "08:15 AM").
 */
export function formatTripTime(val?: any): string {
  if (!val) return '';
  if (typeof val !== 'string') {
    if (val instanceof Date && !isNaN(val.getTime())) {
      return val.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
    }
    return '';
  }

  const trimmed = val.trim();
  if (!trimmed) return '';

  // If already formatted like "10:14 AM" or "08:15 PM"
  if (/^\d{1,2}:\d{2}\s*(?:AM|PM)$/i.test(trimmed)) {
    return trimmed.toUpperCase();
  }

  // If time string like "08:15" or "14:30"
  const timeMatch = trimmed.match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);
  if (timeMatch) {
    let hours = parseInt(timeMatch[1], 10);
    const mins = timeMatch[2];
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12 || 12;
    const padHour = hours < 10 ? `0${hours}` : `${hours}`;
    return `${padHour}:${mins} ${ampm}`;
  }

  // Try parsing as ISO date
  const d = new Date(trimmed);
  if (!isNaN(d.getTime())) {
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
  }

  return trimmed;
}

/**
 * Returns a Javascript Date object representing the time or ISO string.
 */
export function parseTripDateTime(val?: any, baseDate?: Date): Date | null {
  if (!val) return null;
  if (val instanceof Date) return isNaN(val.getTime()) ? null : val;
  if (typeof val !== 'string') return null;

  const trimmed = val.trim();
  if (!trimmed) return null;

  // If ISO date
  if (trimmed.includes('T') || (trimmed.includes('-') && trimmed.length >= 10)) {
    const d = new Date(trimmed);
    if (!isNaN(d.getTime())) return d;
  }

  // If HH:mm or HH:mm AM/PM
  const match = trimmed.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i);
  if (match) {
    let hours = parseInt(match[1], 10);
    const mins = parseInt(match[2], 10);
    const ampm = match[3]?.toUpperCase();
    if (ampm === 'PM' && hours < 12) hours += 12;
    if (ampm === 'AM' && hours === 12) hours = 0;

    const res = baseDate ? new Date(baseDate) : new Date();
    res.setHours(hours, mins, 0, 0);
    return res;
  }

  const fallback = new Date(trimmed);
  return isNaN(fallback.getTime()) ? null : fallback;
}

/**
 * Calculates human-readable duration between start and end.
 * If end is not provided, computes elapsed time from start to now.
 */
export function formatDurationBetween(startVal?: any, endVal?: any): { minutes: number; formatted: string; isElapsed: boolean } {
  const startDate = parseTripDateTime(startVal);
  if (!startDate) {
    return { minutes: 0, formatted: 'N/A', isElapsed: false };
  }

  const isOngoing = !endVal;
  const endDate = isOngoing ? new Date() : (parseTripDateTime(endVal) || new Date());
  let diffMs = endDate.getTime() - startDate.getTime();

  // If time crossed midnight or slight clock skew
  if (diffMs < 0) {
    diffMs = Math.abs(diffMs);
  }

  const minutes = Math.floor(diffMs / (60 * 1000));

  let formatted = '';
  if (minutes < 1) {
    formatted = '< 1 min';
  } else if (minutes < 60) {
    formatted = `${minutes} min${minutes > 1 ? 's' : ''}`;
  } else {
    const hrs = Math.floor(minutes / 60);
    const remMins = minutes % 60;
    formatted = `${hrs}h ${remMins > 0 ? `${remMins}m` : ''}`.trim();
  }

  if (isOngoing) {
    formatted = `${formatted} (In Transit)`;
  }

  return { minutes, formatted, isElapsed: isOngoing };
}

/**
 * Returns complete operational timing info for a trip:
 * - Load time (when driver loaded container at origin)
 * - Discharge time (when container(s) were discharged)
 * - Time spent (total transit / turnaround duration)
 */
export function getTripTimingInfo(trip: any) {
  if (!trip) {
    return {
      loadTime: '--:--',
      dispatchTime: '',
      dischargeTime: 'Pending Discharge',
      timeSpent: 'N/A',
      rawMinutes: 0,
      isDischarged: false,
      isCompleted: false,
    };
  }

  // 1. Loading Time (operationTime, startTime, createdAt, or fallback)
  const rawLoad = trip.operationTime || trip.startTime || trip.time || trip.createdAt;
  const loadTime = formatTripTime(rawLoad) || '08:00 AM';

  // 2. Dispatch / Gate-out Time
  const dispatchTime = formatTripTime(trip.dispatchTime);

  // 3. Discharge Time
  // Check if containers have unloadedAt, or trip.dischargedAt, or trip.endTime
  let rawDischarge: any = trip.dischargedAt || trip.endTime;
  let allContainersDischarged = false;

  if (trip.containers && Array.isArray(trip.containers) && trip.containers.length > 0) {
    const unloadedDates = trip.containers
      .map((c: any) => c.unloadedAt)
      .filter(Boolean);
    if (unloadedDates.length > 0) {
      rawDischarge = unloadedDates[unloadedDates.length - 1];
      allContainersDischarged = unloadedDates.length === trip.containers.length;
    }
  }

  const isCompleted = trip.status === 'COMPLETED' || trip.status === 'APPROVED';
  const isDischarged = allContainersDischarged || !!trip.dischargedAt || isCompleted;

  const dischargeTime = isDischarged
    ? (formatTripTime(rawDischarge) || 'Discharged')
    : 'Awaiting Discharge (In Transit)';

  // 4. Calculate Time Spent
  const duration = formatDurationBetween(rawLoad, isDischarged ? rawDischarge : undefined);

  return {
    loadTime,
    dispatchTime,
    dischargeTime,
    timeSpent: duration.formatted,
    rawMinutes: duration.minutes,
    isDischarged,
    isCompleted,
  };
}

/**
 * Returns timing info for an individual container within a trip:
 * - Container load time
 * - Container discharge time
 * - Container discharge terminal
 * - Time spent from load to discharge for this specific container
 */
export function getContainerTimingInfo(container: any, trip: any, index: number = 0) {
  const tripTiming = getTripTimingInfo(trip);

  const rawLoad = container?.loadedAt || trip?.operationTime || trip?.startTime || trip?.createdAt;
  const loadTime = formatTripTime(rawLoad) || tripTiming.loadTime;

  const destTerm = container?.destTerminal || container?.unloadedTerminal || getTripDischargeTerminal(trip);
  const isDischarged = container?.status === 'DISCHARGED' || (tripTiming.isCompleted && container?.status !== 'IN_TRANSIT');

  const rawDischarge = container?.unloadedAt || (isDischarged ? (trip?.dischargedAt || trip?.endTime) : undefined);
  const dischargeTime = isDischarged && rawDischarge
    ? formatTripTime(rawDischarge)
    : isDischarged
    ? tripTiming.dischargeTime
    : `In Transit (to ${destTerm})`;

  const duration = formatDurationBetween(rawLoad, isDischarged && rawDischarge ? rawDischarge : undefined);

  return {
    containerNumber: container?.containerNumber || `Container #${index + 1}`,
    size: container?.size || '20FT',
    destTerminal: destTerm,
    sourceTerminal: trip?.sourceTerminal || 'CICT',
    loadTime,
    dischargeTime,
    timeSpent: duration.formatted,
    rawMinutes: duration.minutes,
    isDischarged,
    status: isDischarged ? 'DISCHARGED' : 'IN_TRANSIT',
  };
}
