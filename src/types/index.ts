export type TerminalCode = 'CICT' | 'CWIT' | 'ECT' | 'JCT' | 'UCT' | 'SAGT';

export interface TerminalInfo {
  code: TerminalCode;
  name: string;
  fullName: string;
  color: string;
  active: boolean;
  totalTripsToday: number;
  inboundTrips: number;
  outboundTrips: number;
  teuHandledToday: number;
  avgDwellMinutes: number;
  congestionLevel: 'LOW' | 'NORMAL' | 'ELEVATED' | 'HIGH';
}

export type FleetOperator = 'SCK Logistics' | 'SDR LINK' | 'E3 Logistics';

export interface FleetVehicle {
  id: string;
  cheNumber: string;         // Port Container Handling Equipment No (SCK 100 - SCK 125)
  vehicleNumber: string;     // Prime Mover Tractor License (LY 5234...)
  operator: FleetOperator;
  trailerSize: '40FT' | '2x20FT' | string;
  status: 'ACTIVE' | 'MAINTENANCE' | 'IN_TRANSIT' | 'INACTIVE';
  driverCode?: string;
  driverName?: string;
  driverMobile?: string;
  fuelLevel?: number;        // percentage
  mileageKm?: number;
  lastServiceDate?: string;
  engineStatus?: 'RUNNING' | 'IDLE' | 'OFF';
  hitchStatus?: 'EMPTY' | 'LOADED_40FT' | 'LOADED_2x20FT';
  currentLocation?: string;
  tyreWearScore?: number; // e.g. 96%
  licenseIssuedDate?: string; // YYYY-MM-DD (updated by admin)
  licenseExpiryDate?: string; // YYYY-MM-DD (valid for 1 year from issued date)
  daysUntilExpiry?: number;
  renewalDue?: boolean; // triggers when within 30 days
  licenseStatus?: 'VALID' | 'RENEWAL_DUE' | 'EXPIRED';
}

export type AccountStatus = 'ACTIVE' | 'SUSPENDED' | 'DEACTIVATED';
export type DriverShiftStatus = 'ON_DUTY' | 'IN_TRANSIT' | 'ON_BREAK' | 'OFF_DUTY';

export interface DriverRecord {
  id: string;
  driverCode: string;        // DRV-00001
  fullName: string;
  employeeId: string;
  nic: string;
  mobileNumber: string;
  email: string;
  address: string;
  licenseNumber: string;
  licenseExpiryDate: string;
  dateOfBirth?: string;
  emergencyContactName: string;
  emergencyContactNumber: string;
  vehicleNumber: string;
  cheNumber: string;
  operator: FleetOperator;
  status: AccountStatus;
  shiftStatus?: DriverShiftStatus;
  currentLocation?: string;
  speedKmh?: number;
  dailyTarget?: number;
  todayTrips?: number;
  medicalCleared?: boolean;
  portPassValid?: boolean;
  profilePhoto?: string;
  tripsCompleted: number;
  activeTrips: number;
  rating: number;
  totalEarnedAllowance: number;
  joinedDate: string;
}

export interface SupervisorRecord {
  id: string;
  employeeId: string;        // e.g. SUP001
  fullName: string;
  email: string;
  mobileNumber: string;
  nic: string;
  assignedTerminal: TerminalCode;
  gateStation: string;       // e.g. 'Gate 1 In/Out Control'
  shift: 'MORNING' | 'EVENING' | 'NIGHT';
  status: 'ON_DUTY' | 'ON_BREAK' | 'OFF_DUTY';
  approvalsToday: number;
  rejectionsToday: number;
  avgResponseSeconds: number;
  photoUrl: string;
}

export type ContainerSize = '20FT' | '40FT';
export type ContainerCargoType = 'DRY' | 'REEFER' | 'HAZARDOUS' | 'EMPTY';

export interface ContainerItem {
  id: string;
  containerNumber: string;   // e.g. MSCU7829103
  size: ContainerSize;
  cargoType: ContainerCargoType;
  vesselName?: string;
  voyageNo?: string;
  weightTonnes?: number;
  sealNumber?: string;
  checkDigitValid: boolean;
  expectedCheckDigit?: number;
  actualCheckDigit?: number;
  unloadedAt?: string;
  baySlot?: string;
}

export type TripStatus = 'PENDING_APPROVAL' | 'APPROVED' | 'IN_PROGRESS' | 'COMPLETED' | 'REJECTED';

export interface IttTrip {
  id: string;
  tripNumber: string;        // TRP-2026-0012
  driverId: string;
  driverName: string;
  driverCode: string;
  driverPhone: string;
  vehicleNumber: string;
  cheNumber: string;
  operator: FleetOperator;
  sourceTerminal: TerminalCode;
  destinationTerminal: TerminalCode;
  status: TripStatus;
  containers: ContainerItem[];
  createdAt: string;
  gateOutTime?: string;
  arrivedTime?: string;
  gateInTime?: string;
  approvedBy?: string;
  approvedAt?: string;
  rejectionReason?: string;
  notes?: string;
}

export interface BroadcastAlert {
  id: string;
  type: 'DISPATCH' | 'SAFETY' | 'OPERATIONS' | 'MAINTENANCE';
  priority: 'CRITICAL' | 'HIGH' | 'NORMAL';
  title: string;
  message: string;
  timestamp: string;
  author: string;
  targetTerminals: string[];
}

export interface DashboardStats {
  totalTripsToday: number;
  activeTrips: number;
  tripsPendingApproval: number;
  completedTripsToday: number;
  approvedTrips: number;
  rejectedTrips: number;
  totalContainersTransportedToday: number;
  totalTeuToday: number;
  registeredDrivers: number;
  activeDrivers: number;
  totalVehicles: number;
  activeVehicles: number;
  terminalWiseTrips: Record<string, number>;
}
