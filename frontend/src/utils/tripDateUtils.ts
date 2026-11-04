/**
 * SMART ITT - Trip Date & Time Utilities
 * Timezone: Asia/Colombo (Sri Lanka Standard Time, UTC+05:30)
 * Formats Start Date/Time and End Date/Time consistently across Driver, Supervisor & Admin.
 */

const TIMEZONE = 'Asia/Colombo';

export function formatDateTimeColombo(dateOrIso?: string | Date | null): string {
  if (!dateOrIso) return '-';
  try {
    const d = typeof dateOrIso === 'string' ? new Date(dateOrIso) : dateOrIso;
    if (isNaN(d.getTime())) return '-';

    const datePart = d.toLocaleDateString('en-GB', {
      timeZone: TIMEZONE,
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }); // e.g. "05 Nov 2026"

    const timePart = d.toLocaleTimeString('en-US', {
      timeZone: TIMEZONE,
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    }); // e.g. "02:30 PM"

    return `${datePart}, ${timePart}`;
  } catch {
    return typeof dateOrIso === 'string' ? dateOrIso : '-';
  }
}

export function formatDateColombo(dateOrIso?: string | Date | null): string {
  if (!dateOrIso) return '-';
  try {
    const d = typeof dateOrIso === 'string' ? new Date(dateOrIso) : dateOrIso;
    if (isNaN(d.getTime())) return '-';

    return d.toLocaleDateString('en-GB', {
      timeZone: TIMEZONE,
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return '-';
  }
}

export function formatTimeColombo(dateOrIso?: string | Date | null): string {
  if (!dateOrIso) return '-';
  try {
    // If format is like "08:35"
    if (typeof dateOrIso === 'string' && /^\d{1,2}:\d{2}$/.test(dateOrIso)) {
      const [h, m] = dateOrIso.split(':').map(Number);
      const ampm = h >= 12 ? 'PM' : 'AM';
      const h12 = h % 12 || 12;
      return `${String(h12).padStart(2, '0')}:${String(m).padStart(2, '0')} ${ampm}`;
    }

    const d = typeof dateOrIso === 'string' ? new Date(dateOrIso) : dateOrIso;
    if (isNaN(d.getTime())) return '-';

    return d.toLocaleTimeString('en-US', {
      timeZone: TIMEZONE,
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  } catch {
    return '-';
  }
}

export function formatDurationText(
  durationMinutes?: number | null,
  startIso?: string | null,
  endIso?: string | null
): string {
  let minutes: number | null = durationMinutes ?? null;

  if (minutes == null && startIso && endIso) {
    try {
      const s = new Date(startIso).getTime();
      const e = new Date(endIso).getTime();
      const diff = e - s;
      if (diff >= 0) {
        minutes = Math.round(diff / (1000 * 60));
      }
    } catch {}
  }

  if (minutes == null) {
    return 'In progress';
  }

  if (minutes < 60) {
    return `${minutes}m`;
  }
  const hrs = Math.floor(minutes / 60);
  const rem = minutes % 60;
  return rem > 0 ? `${hrs}h ${rem}m` : `${hrs}h`;
}

export interface TripTimingInfo {
  startDate: string;
  startTime: string;
  startFull: string;
  endDate: string;
  endTime: string;
  endFull: string;
  duration: string;
  statusBadge: string;
  statusColor: string;
  isCompleted: boolean;
  isPending: boolean;
  isInProgress: boolean;
}

export function getTripTimingDetails(trip: any): TripTimingInfo {
  const isCompleted = trip.status === 'COMPLETED' || trip.status === 'APPROVED' || trip.status === 'SUPERVISOR_CONFIRMED';
  const isPending = trip.status === 'PENDING_APPROVAL' || trip.status === 'PENDING_SUPERVISOR_CONFIRMATION';
  const isInProgress = trip.status === 'IN_PROGRESS' || trip.status === 'ARRIVED';
  const isRejected = trip.status === 'REJECTED' || trip.status === 'SUPERVISOR_REJECTED';

  let statusColor = '#173B70';
  if (isCompleted) {
    statusColor = '#173B70';
  } else if (isPending) {
    statusColor = '#173B70';
  } else if (isRejected) {
    statusColor = '#173B70';
  } else {
    statusColor = '#173B70';
  }

  // 1. Started Date & Time
  const startRaw = trip.startTime || trip.createdAt;
  const startDate = formatDateColombo(startRaw);
  const startTime = formatTimeColombo(startRaw || trip.dispatchTime || trip.operationTime);
  const startFull = startRaw ? formatDateTimeColombo(startRaw) : '-';

  // 2. End Date & Time
  const endRaw = trip.endTime || trip.dischargedAt;
  let endDate = '-';
  let endTime = '-';
  let endFull = '-';
  let statusBadge = trip.status || 'UNKNOWN';

  if (isCompleted) {
    endDate = formatDateColombo(endRaw);
    endTime = formatTimeColombo(endRaw);
    endFull = endRaw ? formatDateTimeColombo(endRaw) : `${startDate}, ${startTime}`;
    statusBadge = trip.status === 'SUPERVISOR_CONFIRMED' || trip.status === 'APPROVED' ? 'CONFIRMED' : 'COMPLETED';
  } else if (isPending) {
    endDate = formatDateColombo(endRaw);
    endTime = endRaw ? formatTimeColombo(endRaw) : 'Awaiting Confirmation';
    endFull = endRaw ? formatDateTimeColombo(endRaw) : 'Awaiting Confirmation';
    statusBadge = 'PENDING CONFIRMATION';
  } else if (isRejected) {
    endDate = formatDateColombo(endRaw);
    endTime = formatTimeColombo(endRaw);
    endFull = endRaw ? formatDateTimeColombo(endRaw) : '-';
    statusBadge = 'REJECTED';
  } else {
    endDate = 'In Transit';
    endTime = 'Live';
    endFull = 'In progress';
    statusBadge = 'IN PROGRESS';
  }

  // 3. Duration
  const duration = isCompleted || isRejected
    ? formatDurationText(trip.durationMinutes, startRaw, endRaw)
    : 'In progress';

  return {
    startDate,
    startTime,
    startFull,
    endDate,
    endTime,
    endFull,
    duration,
    statusBadge,
    statusColor,
    isCompleted,
    isPending,
    isInProgress,
  };
}
