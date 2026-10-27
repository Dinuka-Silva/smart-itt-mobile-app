/**
 * SMART ITT - Trip Date & Time Utilities
 * Formats Start Date/Time and End Date/Time consistently across Driver & Supervisor interfaces.
 */

export function formatTripDate(isoStr?: string, fallbackDate?: string): string {
  if (isoStr) {
    try {
      const d = new Date(isoStr);
      if (!isNaN(d.getTime())) {
        return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      }
    } catch {}
  }
  if (fallbackDate) return fallbackDate;
  return new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function formatTripTime(timeOrIso?: string, fallbackTime?: string): string {
  if (!timeOrIso) return fallbackTime || '08:30 AM';

  // If already in "HH:MM" format (e.g. "08:35" or "14:20")
  if (/^\d{1,2}:\d{2}$/.test(timeOrIso)) {
    const [h, m] = timeOrIso.split(':').map(Number);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const h12 = h % 12 || 12;
    return `${String(h12).padStart(2, '0')}:${String(m).padStart(2, '0')} ${ampm}`;
  }

  try {
    const d = new Date(timeOrIso);
    if (!isNaN(d.getTime())) {
      return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
    }
  } catch {}

  return timeOrIso;
}

export function getTripDuration(startIso?: string, endIso?: string): string | null {
  if (!startIso || !endIso) return null;
  try {
    const s = new Date(startIso).getTime();
    const e = new Date(endIso).getTime();
    const diff = e - s;
    if (diff > 0) {
      const totalMins = Math.round(diff / (1000 * 60));
      if (totalMins < 60) return `${totalMins}m`;
      const hrs = Math.floor(totalMins / 60);
      const rem = totalMins % 60;
      return rem > 0 ? `${hrs}h ${rem}m` : `${hrs}h`;
    }
  } catch {}
  return null;
}

export interface TripTimingInfo {
  startDate: string;
  startTime: string;
  startFull: string;
  endDate: string;
  endTime: string;
  endFull: string;
  duration: string | null;
  statusBadge: string;
  statusColor: string;
  isCompleted: boolean;
  isPending: boolean;
  isInProgress: boolean;
}

export function getTripTimingDetails(trip: any): TripTimingInfo {
  const isCompleted = trip.status === 'COMPLETED' || trip.status === 'APPROVED';
  const isPending = trip.status === 'PENDING_APPROVAL';
  const isInProgress = trip.status === 'IN_PROGRESS' || trip.status === 'ARRIVED';

  // 1. Started Date & Time
  const startRaw = trip.startTime || trip.createdAt;
  const startDate = formatTripDate(startRaw, trip.operationDate);
  const startTime = formatTripTime(startRaw || trip.dispatchTime || trip.operationTime);
  const startFull = `${startDate} · ${startTime}`;

  // 2. End Date & Time
  const endRaw = trip.endTime || trip.dischargedAt;
  let endDate = '';
  let endTime = '';
  let endFull = '';
  let statusBadge = '';
  let statusColor = '#00e5ff';

  if (isCompleted) {
    endDate = formatTripDate(endRaw, startDate);
    endTime = formatTripTime(endRaw || trip.operationTime);
    endFull = `${endDate} · ${endTime}`;
    statusBadge = 'COMPLETED';
    statusColor = '#22ef7e';
  } else if (isPending) {
    endDate = formatTripDate(endRaw, startDate);
    endTime = endRaw ? formatTripTime(endRaw) : 'Awaiting Sign-off';
    endFull = `${endDate} · ${endTime}`;
    statusBadge = 'DELIVERED (PENDING SIGN-OFF)';
    statusColor = '#feb300';
  } else {
    endDate = 'IN TRANSIT';
    endTime = 'Live Transit';
    endFull = 'In Progress (Active Transit)';
    statusBadge = 'LIVE TRANSIT';
    statusColor = '#00e5ff';
  }

  // 3. Duration
  const duration = isCompleted ? getTripDuration(startRaw, endRaw) : null;

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
