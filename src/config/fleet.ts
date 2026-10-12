export interface FleetVehicle {
  id: string;
  cheNumber: string;       // SCK No (Chassis / CHE)
  vehicleNumber: string;   // LY No (Prime Mover / Tractor License)
  operator: 'SCK Logistics' | 'SDR LINK' | 'E3 Logistics';
  trailerSize: '40FT' | string; // 40FT standard ITT container chassis
  status: 'ACTIVE' | 'MAINTENANCE' | 'IN_TRANSIT';
  assignedDriver?: {
    driverCode: string;
    driverName: string;
    mobile: string;
  };
}

export const SCK_FLEET: FleetVehicle[] = [
  // ─── 1. SCK LOGISTICS (15 Vehicles: CHE 100 - 114) ───
  {
    id: 'fl-100',
    cheNumber: 'SCK 100',
    vehicleNumber: 'LY 5234',
    operator: 'SCK Logistics',
    trailerSize: '40FT',
    status: 'ACTIVE',
    assignedDriver: { driverCode: 'DRV-00001', driverName: 'Kamal Perera', mobile: '+94 77 123 4567' },
  },
  {
    id: 'fl-101',
    cheNumber: 'SCK 101',
    vehicleNumber: 'LY 5235',
    operator: 'SCK Logistics',
    trailerSize: '40FT',
    status: 'ACTIVE',
    assignedDriver: { driverCode: 'DRV-00002', driverName: 'Saman Silva', mobile: '+94 71 987 6543' },
  },
  {
    id: 'fl-102',
    cheNumber: 'SCK 102',
    vehicleNumber: 'LY 5236',
    operator: 'SCK Logistics',
    trailerSize: '40FT',
    status: 'ACTIVE',
    assignedDriver: { driverCode: 'DRV-00003', driverName: 'Ruwan Fernando', mobile: '+94 76 555 4321' },
  },
  {
    id: 'fl-103',
    cheNumber: 'SCK 103',
    vehicleNumber: 'LY 5237',
    operator: 'SCK Logistics',
    trailerSize: '40FT',
    status: 'ACTIVE',
    assignedDriver: { driverCode: 'DRV-00004', driverName: 'Nuwan Bandara', mobile: '+94 70 333 2211' },
  },
  {
    id: 'fl-104',
    cheNumber: 'SCK 104',
    vehicleNumber: 'LY 5238',
    operator: 'SCK Logistics',
    trailerSize: '40FT',
    status: 'ACTIVE',
    assignedDriver: { driverCode: 'DRV-00005', driverName: 'Amal Jayasuriya', mobile: '+94 72 444 8899' },
  },
  {
    id: 'fl-105',
    cheNumber: 'SCK 105',
    vehicleNumber: 'LY 5665',
    operator: 'SCK Logistics',
    trailerSize: '40FT',
    status: 'ACTIVE',
    assignedDriver: { driverCode: 'DRV-00006', driverName: 'Sunil Wickramasinghe', mobile: '+94 77 222 1100' },
  },
  {
    id: 'fl-106',
    cheNumber: 'SCK 106',
    vehicleNumber: 'LY 5708',
    operator: 'SCK Logistics',
    trailerSize: '40FT',
    status: 'ACTIVE',
    assignedDriver: { driverCode: 'DRV-00007', driverName: 'Chaminda Vaas', mobile: '+94 75 888 7766' },
  },
  {
    id: 'fl-107',
    cheNumber: 'SCK 107',
    vehicleNumber: 'LY 5711',
    operator: 'SCK Logistics',
    trailerSize: '40FT',
    status: 'ACTIVE',
    assignedDriver: { driverCode: 'DRV-00008', driverName: 'Kasun Rajitha', mobile: '+94 78 999 1234' },
  },
  {
    id: 'fl-108',
    cheNumber: 'SCK 108',
    vehicleNumber: 'LY 5717',
    operator: 'SCK Logistics',
    trailerSize: '40FT',
    status: 'ACTIVE',
    assignedDriver: { driverCode: 'DRV-00009', driverName: 'Dinesh Chandimal', mobile: '+94 71 444 5566' },
  },
  {
    id: 'fl-109',
    cheNumber: 'SCK 109',
    vehicleNumber: 'LY 5721',
    operator: 'SCK Logistics',
    trailerSize: '40FT',
    status: 'ACTIVE',
    assignedDriver: { driverCode: 'DRV-00010', driverName: 'Mahela Jayawardene', mobile: '+94 76 111 2233' },
  },
  {
    id: 'fl-110',
    cheNumber: 'SCK 110',
    vehicleNumber: 'LY 6426',
    operator: 'SCK Logistics',
    trailerSize: '40FT',
    status: 'ACTIVE',
    assignedDriver: { driverCode: 'DRV-00011', driverName: 'Upul Tharanga', mobile: '+94 77 444 1122' },
  },
  {
    id: 'fl-111',
    cheNumber: 'SCK 111',
    vehicleNumber: 'LY 6428',
    operator: 'SCK Logistics',
    trailerSize: '40FT',
    status: 'ACTIVE',
    assignedDriver: { driverCode: 'DRV-00012', driverName: 'Dilhara Fernando', mobile: '+94 71 333 9988' },
  },
  {
    id: 'fl-112',
    cheNumber: 'SCK 112',
    vehicleNumber: 'LY 5217',
    operator: 'SCK Logistics',
    trailerSize: '40FT',
    status: 'ACTIVE',
    assignedDriver: { driverCode: 'DRV-00013', driverName: 'Thilan Samaraweera', mobile: '+94 70 222 7766' },
  },
  {
    id: 'fl-113',
    cheNumber: 'SCK 113',
    vehicleNumber: 'LY 6429',
    operator: 'SCK Logistics',
    trailerSize: '40FT',
    status: 'ACTIVE',
    assignedDriver: { driverCode: 'DRV-00014', driverName: 'Farveez Maharoof', mobile: '+94 75 888 3344' },
  },
  {
    id: 'fl-114',
    cheNumber: 'SCK 114',
    vehicleNumber: 'LY 6433',
    operator: 'SCK Logistics',
    trailerSize: '40FT',
    status: 'ACTIVE',
    assignedDriver: { driverCode: 'DRV-00015', driverName: 'Nuwan Kulasekara', mobile: '+94 78 111 5566' },
  },

  // ─── 2. SDR LINK (5 Vehicles: CHE 115, 117, 119, 120, 121) ───
  {
    id: 'fl-115',
    cheNumber: 'SCK 115',
    vehicleNumber: 'LY 6528',
    operator: 'SDR LINK',
    trailerSize: '40FT',
    status: 'ACTIVE',
    assignedDriver: { driverCode: 'DRV-00016', driverName: 'Roshan Mahanama', mobile: '+94 77 333 4455' },
  },
  {
    id: 'fl-117',
    cheNumber: 'SCK 117',
    vehicleNumber: 'LY 6529',
    operator: 'SDR LINK',
    trailerSize: '40FT',
    status: 'ACTIVE',
    assignedDriver: { driverCode: 'DRV-00017', driverName: 'Marvan Atapattu', mobile: '+94 71 666 7788' },
  },
  {
    id: 'fl-119',
    cheNumber: 'SCK 119',
    vehicleNumber: 'LY 6530',
    operator: 'SDR LINK',
    trailerSize: '40FT',
    status: 'ACTIVE',
    assignedDriver: { driverCode: 'DRV-00018', driverName: 'Rangana Herath', mobile: '+94 75 111 4477' },
  },
  {
    id: 'fl-120',
    cheNumber: 'SCK 120',
    vehicleNumber: 'LY 6531',
    operator: 'SDR LINK',
    trailerSize: '40FT',
    status: 'ACTIVE',
    assignedDriver: { driverCode: 'DRV-00019', driverName: 'Aravinda de Silva', mobile: '+94 72 555 8822' },
  },
  {
    id: 'fl-121',
    cheNumber: 'SCK 121',
    vehicleNumber: 'LY 6532',
    operator: 'SDR LINK',
    trailerSize: '40FT',
    status: 'ACTIVE',
    assignedDriver: { driverCode: 'DRV-00020', driverName: 'Sanath Jayasuriya', mobile: '+94 77 777 8899' },
  },

  // ─── 3. E3 LOGISTICS (4 Vehicles: CHE 122, 123, 124, 125) ───
  {
    id: 'fl-122',
    cheNumber: 'SCK 122',
    vehicleNumber: 'LY 5596',
    operator: 'E3 Logistics',
    trailerSize: '40FT',
    status: 'ACTIVE',
    assignedDriver: { driverCode: 'DRV-00021', driverName: 'Lasith Malinga', mobile: '+94 70 888 9900' },
  },
  {
    id: 'fl-123',
    cheNumber: 'SCK 123',
    vehicleNumber: 'LY 5597',
    operator: 'E3 Logistics',
    trailerSize: '40FT',
    status: 'ACTIVE',
    assignedDriver: { driverCode: 'DRV-00022', driverName: 'Kumar Sangakkara', mobile: '+94 71 222 3344' },
  },
  {
    id: 'fl-124',
    cheNumber: 'SCK 124',
    vehicleNumber: 'LY 5598',
    operator: 'E3 Logistics',
    trailerSize: '40FT',
    status: 'ACTIVE',
    assignedDriver: { driverCode: 'DRV-00023', driverName: 'Tilakaratne Dilshan', mobile: '+94 76 888 2211' },
  },
  {
    id: 'fl-125',
    cheNumber: 'SCK 125',
    vehicleNumber: 'LY 5600',
    operator: 'E3 Logistics',
    trailerSize: '40FT',
    status: 'ACTIVE',
    assignedDriver: { driverCode: 'DRV-00024', driverName: 'Muttiah Muralitharan', mobile: '+94 70 999 4433' },
  },
];

export const SCK_FLEET_VEHICLES = SCK_FLEET;

/**
 * Find a vehicle in the fleet by license plate (LY XXXX, LY-XXXX), CHE number (SCK XXX, 100),
 * suffix digits (e.g. 5234), or assigned driver code.
 */
export function findFleetVehicle(input?: string): FleetVehicle | undefined {
  if (!input || !input.trim()) return undefined;
  // Clean all punctuation, hyphens, semicolons, spaces
  const clean = input.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
  if (!clean) return undefined;

  // 1. Direct match on vehicle number (e.g. "LY5234" vs "LY 5234" or "LY-5234")
  let match = SCK_FLEET.find(
    (v) => v.vehicleNumber.replace(/[^A-Za-z0-9]/g, '').toUpperCase() === clean
  );
  if (match) return match;

  // 2. Direct match on CHE / SCK number (e.g. "SCK100", "SCK 100")
  match = SCK_FLEET.find(
    (v) => v.cheNumber.replace(/[^A-Za-z0-9]/g, '').toUpperCase() === clean
  );
  if (match) return match;

  // 3. Pure 3-digit CHE number match (e.g. "100", "115", "125")
  if (/^\d{3}$/.test(clean)) {
    match = SCK_FLEET.find((v) => v.cheNumber.replace(/[^0-9]/g, '') === clean);
    if (match) return match;
  }

  // 4. Suffix match on vehicle plate number (e.g. user entered "5234" or "6528")
  if (clean.length >= 4) {
    match = SCK_FLEET.find(
      (v) => v.vehicleNumber.replace(/[^A-Za-z0-9]/g, '').toUpperCase().endsWith(clean)
    );
    if (match) return match;
  }

  // 5. Substring match on CHE number (e.g. "SCK10")
  if (clean.startsWith('SCK')) {
    match = SCK_FLEET.find((v) =>
      v.cheNumber.replace(/[^A-Za-z0-9]/g, '').toUpperCase().includes(clean)
    );
    if (match) return match;
  }

  // 6. Assigned driver code match (e.g. "DRV-00001")
  match = SCK_FLEET.find(
    (v) =>
      v.assignedDriver?.driverCode.replace(/[^A-Za-z0-9]/g, '').toUpperCase() === clean
  );
  if (match) return match;

  return undefined;
}

/**
 * Reliably resolve the exact CHE number (SCK No) for any vehicle.
 * Prioritizes matching the vehicleNumber against the official SCK fleet.
 * If not found, falls back to checking the fallbackChassis.
 */
export function resolveCheNumber(vehicleNumber?: string, fallbackChassis?: string): string {
  if (vehicleNumber) {
    const match = findFleetVehicle(vehicleNumber);
    if (match) return match.cheNumber;
  }

  if (fallbackChassis) {
    const match = findFleetVehicle(fallbackChassis);
    if (match) return match.cheNumber;
    if (fallbackChassis.toUpperCase().startsWith('SCK')) {
      return fallbackChassis.toUpperCase();
    }
  }

  return fallbackChassis || 'SCK 100';
}

/**
 * Reliably resolve the operator company name for any vehicle.
 */
export function resolveOperator(vehicleNumber?: string, fallbackOperator?: string): string {
  if (vehicleNumber) {
    const match = findFleetVehicle(vehicleNumber);
    if (match) return match.operator;
  }
  return fallbackOperator || 'SCK Logistics';
}

/**
 * Reliably resolve the trailer chassis size (e.g. '40FT') for any vehicle.
 */
export function resolveTrailerSize(vehicleNumber?: string, fallbackSize?: string): string {
  if (vehicleNumber) {
    const match = findFleetVehicle(vehicleNumber);
    if (match) return match.trailerSize;
  }
  return fallbackSize || '40FT';
}

