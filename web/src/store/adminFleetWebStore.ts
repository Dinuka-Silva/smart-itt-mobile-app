import { adminWebService } from '../services/adminWebService';

export interface WebVehicle {
  id: string;
  vehicleNumber: string;
  chassisNumber: string;
  cheNumber: string;
  operator: string;
  trailerSize: string;
  status: string;
  driverName?: string | null;
  driverCode?: string | null;
  driverMobile?: string | null;
  licenseStatus: string;
  daysUntilExpiry: number;
  licenseIssuedDate: string;
  licenseExpiryDate: string;
  portPassNumber: string;
  portPassExpiryDate: string;
  portPassStatus: string;
  portPassDaysUntilExpiry: number;
  totalTrips: number;
}

export interface WebDriver {
  id: string;
  driverCode: string;
  fullName: string;
  employeeId: string;
  mobileNumber: string;
  nic: string;
  status: string;
  vehicleNumber?: string;
  chassisNumber?: string;
  cheNumber?: string;
  licenseNumber: string;
  licenseExpiryDate: string;
  portPassNumber: string;
  portPassExpiryDate: string;
  portPassStatus: string;
  portPassDaysLeft: number;
  address?: string;
  email?: string;
  emergencyContactName?: string;
  emergencyContactNumber?: string;
  totalTrips: number;
}

const INITIAL_VEHICLES: WebVehicle[] = [
  { id: 'v-1', vehicleNumber: 'LY-6439', chassisNumber: 'SCK 100', cheNumber: 'SCK 100', operator: 'SCK Logistics', trailerSize: '40FT', status: 'ACTIVE', driverName: 'Kamal Perera', driverCode: 'DRV-00001', driverMobile: '0779876543', licenseStatus: 'RENEWAL_DUE', daysUntilExpiry: 18, licenseIssuedDate: '2025-11-15', licenseExpiryDate: '2026-11-15', portPassNumber: 'SLPA-VPP-100', portPassExpiryDate: '2026-11-10', portPassStatus: 'RENEWAL_DUE', portPassDaysUntilExpiry: 14, totalTrips: 45 },
  { id: 'v-2', vehicleNumber: 'LY-6434', chassisNumber: 'SCK 101', cheNumber: 'SCK 101', operator: 'SCK Logistics', trailerSize: '40FT', status: 'ACTIVE', driverName: 'Sunil Shantha', driverCode: 'DRV-00002', driverMobile: '0779876544', licenseStatus: 'VALID', daysUntilExpiry: 210, licenseIssuedDate: '2026-05-20', licenseExpiryDate: '2027-05-20', portPassNumber: 'SLPA-VPP-101', portPassExpiryDate: '2027-04-15', portPassStatus: 'VALID', portPassDaysUntilExpiry: 170, totalTrips: 38 },
  { id: 'v-3', vehicleNumber: 'LY-6435', chassisNumber: 'SCK 102', cheNumber: 'SCK 102', operator: 'SCK Logistics', trailerSize: '40FT', status: 'ACTIVE', driverName: 'Anura Kumara', driverCode: 'DRV-00003', driverMobile: '0779876545', licenseStatus: 'VALID', daysUntilExpiry: 195, licenseIssuedDate: '2026-05-05', licenseExpiryDate: '2027-05-05', portPassNumber: 'SLPA-VPP-102', portPassExpiryDate: '2027-05-10', portPassStatus: 'VALID', portPassDaysUntilExpiry: 195, totalTrips: 41 },
  { id: 'v-4', vehicleNumber: 'LY-6431', chassisNumber: 'SCK 103', cheNumber: 'SCK 103', operator: 'SCK Logistics', trailerSize: '40FT', status: 'ACTIVE', driverName: 'Chaminda Vass', driverCode: 'DRV-00004', driverMobile: '0779876546', licenseStatus: 'VALID', daysUntilExpiry: 240, licenseIssuedDate: '2026-06-20', licenseExpiryDate: '2027-06-20', portPassNumber: 'SLPA-VPP-103', portPassExpiryDate: '2027-06-01', portPassStatus: 'VALID', portPassDaysUntilExpiry: 217, totalTrips: 52 },
  { id: 'v-5', vehicleNumber: 'LY-6427', chassisNumber: 'SCK 104', cheNumber: 'SCK 104', operator: 'SCK Logistics', trailerSize: '40FT', status: 'ACTIVE', driverName: 'Roshan Mahanama', driverCode: 'DRV-00005', driverMobile: '0779876547', licenseStatus: 'VALID', daysUntilExpiry: 175, licenseIssuedDate: '2026-04-15', licenseExpiryDate: '2027-04-15', portPassNumber: 'SLPA-VPP-104', portPassExpiryDate: '2027-03-25', portPassStatus: 'VALID', portPassDaysUntilExpiry: 149, totalTrips: 33 },
  { id: 'v-6', vehicleNumber: 'LY-5665', chassisNumber: 'SCK 105', cheNumber: 'SCK 105', operator: 'SCK Logistics', trailerSize: '40FT', status: 'ACTIVE', driverName: 'Sanath Jayasuriya', driverCode: 'DRV-00006', driverMobile: '0779876548', licenseStatus: 'VALID', daysUntilExpiry: 310, licenseIssuedDate: '2026-08-30', licenseExpiryDate: '2027-08-30', portPassNumber: 'SLPA-VPP-105', portPassExpiryDate: '2027-08-15', portPassStatus: 'VALID', portPassDaysUntilExpiry: 292, totalTrips: 60 },
  { id: 'v-7', vehicleNumber: 'LY-5708', chassisNumber: 'SCK 106', cheNumber: 'SCK 106', operator: 'SCK Logistics', trailerSize: '40FT', status: 'ACTIVE', driverName: 'Mahela Jayawardene', driverCode: 'DRV-00007', driverMobile: '0779876549', licenseStatus: 'VALID', daysUntilExpiry: 220, licenseIssuedDate: '2026-06-01', licenseExpiryDate: '2027-06-01', portPassNumber: 'SLPA-VPP-106', portPassExpiryDate: '2027-05-20', portPassStatus: 'VALID', portPassDaysUntilExpiry: 205, totalTrips: 48 },
  { id: 'v-8', vehicleNumber: 'LY-5711', chassisNumber: 'SCK 107', cheNumber: 'SCK 107', operator: 'SCK Logistics', trailerSize: '40FT', status: 'ACTIVE', driverName: 'Kumar Sangakkara', driverCode: 'DRV-00008', driverMobile: '0779876550', licenseStatus: 'VALID', daysUntilExpiry: 180, licenseIssuedDate: '2026-04-20', licenseExpiryDate: '2027-04-20', portPassNumber: 'SLPA-VPP-107', portPassExpiryDate: '2027-04-05', portPassStatus: 'VALID', portPassDaysUntilExpiry: 160, totalTrips: 55 },
  { id: 'v-9', vehicleNumber: 'LY-5717', chassisNumber: 'SCK 108', cheNumber: 'SCK 108', operator: 'SCK Logistics', trailerSize: '40FT', status: 'ACTIVE', driverName: 'Lasith Malinga', driverCode: 'DRV-00009', driverMobile: '0779876551', licenseStatus: 'VALID', daysUntilExpiry: 290, licenseIssuedDate: '2026-08-10', licenseExpiryDate: '2027-08-10', portPassNumber: 'SLPA-VPP-108', portPassExpiryDate: '2027-07-28', portPassStatus: 'VALID', portPassDaysUntilExpiry: 274, totalTrips: 44 },
  { id: 'v-10', vehicleNumber: 'LY-5721', chassisNumber: 'SCK 109', cheNumber: 'SCK 109', operator: 'SCK Logistics', trailerSize: '40FT', status: 'ACTIVE', driverName: 'Muttiah Muralitharan', driverCode: 'DRV-00010', driverMobile: '0779876552', licenseStatus: 'VALID', daysUntilExpiry: 320, licenseIssuedDate: '2026-09-12', licenseExpiryDate: '2027-09-12', portPassNumber: 'SLPA-VPP-109', portPassExpiryDate: '2027-09-01', portPassStatus: 'VALID', portPassDaysUntilExpiry: 309, totalTrips: 65 },
  { id: 'v-11', vehicleNumber: 'LY-6426', chassisNumber: 'SCK 110', cheNumber: 'SCK 110', operator: 'SCK Logistics', trailerSize: '40FT', status: 'ACTIVE', driverName: 'Nuwan Kulasekara', driverCode: 'DRV-00011', driverMobile: '0779876553', licenseStatus: 'VALID', daysUntilExpiry: 260, licenseIssuedDate: '2026-07-15', licenseExpiryDate: '2027-07-15', portPassNumber: 'SLPA-VPP-110', portPassExpiryDate: '2027-06-30', portPassStatus: 'VALID', portPassDaysUntilExpiry: 246, totalTrips: 37 },
  { id: 'v-12', vehicleNumber: 'LY-6428', chassisNumber: 'SCK 111', cheNumber: 'SCK 111', operator: 'SCK Logistics', trailerSize: '40FT', status: 'ACTIVE', driverName: 'Rangana Herath', driverCode: 'DRV-00012', driverMobile: '0779876554', licenseStatus: 'VALID', daysUntilExpiry: 150, licenseIssuedDate: '2026-03-20', licenseExpiryDate: '2027-03-20', portPassNumber: 'SLPA-VPP-111', portPassExpiryDate: '2027-03-10', portPassStatus: 'VALID', portPassDaysUntilExpiry: 134, totalTrips: 34 },
  { id: 'v-13', vehicleNumber: 'LY-6438', chassisNumber: 'SCK 112', cheNumber: 'SCK 112', operator: 'SCK Logistics', trailerSize: '40FT', status: 'ACTIVE', driverName: 'Tillakaratne Dilshan', driverCode: 'DRV-00013', driverMobile: '0779876555', licenseStatus: 'VALID', daysUntilExpiry: 200, licenseIssuedDate: '2026-05-10', licenseExpiryDate: '2027-05-10', portPassNumber: 'SLPA-VPP-112', portPassExpiryDate: '2027-04-25', portPassStatus: 'VALID', portPassDaysUntilExpiry: 180, totalTrips: 49 },
  { id: 'v-14', vehicleNumber: 'LY-6429', chassisNumber: 'SCK 113', cheNumber: 'SCK 113', operator: 'SCK Logistics', trailerSize: '40FT', status: 'ACTIVE', driverName: 'Aravinda de Silva', driverCode: 'DRV-00014', driverMobile: '0779876556', licenseStatus: 'VALID', daysUntilExpiry: 275, licenseIssuedDate: '2026-07-28', licenseExpiryDate: '2027-07-28', portPassNumber: 'SLPA-VPP-113', portPassExpiryDate: '2027-07-15', portPassStatus: 'VALID', portPassDaysUntilExpiry: 261, totalTrips: 58 },
  { id: 'v-15', vehicleNumber: 'LY-6433', chassisNumber: 'SCK 114', cheNumber: 'SCK 114', operator: 'SCK Logistics', trailerSize: '40FT', status: 'ACTIVE', driverName: 'Arjuna Ranatunga', driverCode: 'DRV-00015', driverMobile: '0779876557', licenseStatus: 'VALID', daysUntilExpiry: 340, licenseIssuedDate: '2026-10-01', licenseExpiryDate: '2027-10-01', portPassNumber: 'SLPA-VPP-114', portPassExpiryDate: '2027-09-18', portPassStatus: 'VALID', portPassDaysUntilExpiry: 326, totalTrips: 51 },
  { id: 'v-17', vehicleNumber: 'LY-5654', chassisNumber: 'SCK 126', cheNumber: 'SCK 126', operator: 'SCK Logistics', trailerSize: '40FT', status: 'MAINTENANCE', driverName: 'Upul Tharanga', driverCode: 'DRV-00016', driverMobile: '0779876558', licenseStatus: 'VALID', daysUntilExpiry: 130, licenseIssuedDate: '2026-03-01', licenseExpiryDate: '2027-03-01', portPassNumber: 'SLPA-VPP-126', portPassExpiryDate: '2027-05-15', portPassStatus: 'VALID', portPassDaysUntilExpiry: 200, totalTrips: 39 },
  { id: 'v-18', vehicleNumber: 'LY-2147', chassisNumber: 'SCK 127', cheNumber: 'SCK 127', operator: 'SCK Logistics', trailerSize: '40FT', status: 'ACTIVE', driverName: 'Marvan Atapattu', driverCode: 'DRV-00017', driverMobile: '0779876559', licenseStatus: 'VALID', daysUntilExpiry: 215, licenseIssuedDate: '2026-05-25', licenseExpiryDate: '2027-05-25', portPassNumber: 'SLPA-VPP-127', portPassExpiryDate: '2027-06-20', portPassStatus: 'VALID', portPassDaysUntilExpiry: 236, totalTrips: 42 },

  // SDR LINK Fleet (SCK 115, 117, 119, 120, 121)
  { id: 'v-19', vehicleNumber: 'LY-6528', chassisNumber: 'SCK 115', cheNumber: 'SCK 115', operator: 'SDR LINK', trailerSize: '40FT', status: 'ACTIVE', driverName: 'Angelo Mathews', driverCode: 'DRV-00018', driverMobile: '0779876560', licenseStatus: 'RENEWAL_DUE', daysUntilExpiry: 18, licenseIssuedDate: '2025-11-15', licenseExpiryDate: '2026-11-15', portPassNumber: 'SLPA-VPP-115', portPassExpiryDate: '2026-11-18', portPassStatus: 'RENEWAL_DUE', portPassDaysUntilExpiry: 22, totalTrips: 47 },
  { id: 'v-20', vehicleNumber: 'LY-6529', chassisNumber: 'SCK 117', cheNumber: 'SCK 117', operator: 'SDR LINK', trailerSize: '40FT', status: 'ACTIVE', driverName: 'Dinesh Chandimal', driverCode: 'DRV-00019', driverMobile: '0779876561', licenseStatus: 'VALID', daysUntilExpiry: 230, licenseIssuedDate: '2026-06-12', licenseExpiryDate: '2027-06-12', portPassNumber: 'SLPA-VPP-117', portPassExpiryDate: '2027-05-30', portPassStatus: 'VALID', portPassDaysUntilExpiry: 215, totalTrips: 36 },
  { id: 'v-21', vehicleNumber: 'LY-6530', chassisNumber: 'SCK 119', cheNumber: 'SCK 119', operator: 'SDR LINK', trailerSize: '40FT', status: 'ACTIVE', driverName: 'Kusal Perera', driverCode: 'DRV-00020', driverMobile: '0779876562', licenseStatus: 'VALID', daysUntilExpiry: 185, licenseIssuedDate: '2026-04-28', licenseExpiryDate: '2027-04-28', portPassNumber: 'SLPA-VPP-119', portPassExpiryDate: '2027-04-20', portPassStatus: 'VALID', portPassDaysUntilExpiry: 175, totalTrips: 35 },
  { id: 'v-22', vehicleNumber: 'LY-6531', chassisNumber: 'SCK 120', cheNumber: 'SCK 120', operator: 'SDR LINK', trailerSize: '40FT', status: 'MAINTENANCE', driverName: 'Wanindu Hasaranga', driverCode: 'DRV-00021', driverMobile: '0779876563', licenseStatus: 'VALID', daysUntilExpiry: 160, licenseIssuedDate: '2026-04-02', licenseExpiryDate: '2027-04-02', portPassNumber: 'SLPA-VPP-120', portPassExpiryDate: '2027-03-28', portPassStatus: 'VALID', portPassDaysUntilExpiry: 152, totalTrips: 29 },
  { id: 'v-23', vehicleNumber: 'LY-6532', chassisNumber: 'SCK 121', cheNumber: 'SCK 121', operator: 'SDR LINK', trailerSize: '40FT', status: 'ACTIVE', driverName: 'Dasun Shanaka', driverCode: 'DRV-00022', driverMobile: '0779876564', licenseStatus: 'VALID', daysUntilExpiry: 270, licenseIssuedDate: '2026-07-22', licenseExpiryDate: '2027-07-22', portPassNumber: 'SLPA-VPP-121', portPassExpiryDate: '2027-07-10', portPassStatus: 'VALID', portPassDaysUntilExpiry: 256, totalTrips: 31 },
];

const INITIAL_DRIVERS: WebDriver[] = [
  { id: 'd-1', driverCode: 'DRV-00001', fullName: 'Kamal Perera', employeeId: 'DRV001', mobileNumber: '0779876543', nic: '198512345678', status: 'ACTIVE', vehicleNumber: 'LY-6439', chassisNumber: 'SCK 100', cheNumber: 'SCK 100', licenseNumber: 'LIC-001234', licenseExpiryDate: '2028-12-31', portPassNumber: 'SLPA-DPP-001', portPassExpiryDate: '2026-11-06', portPassStatus: 'RENEWAL_DUE', portPassDaysLeft: 10, address: 'No. 45, Harbour View Road, Colombo 15', email: 'driver@smartitt.lk', emergencyContactName: 'Sunil Perera (Brother)', emergencyContactNumber: '0771122334', totalTrips: 18 },
  { id: 'd-2', driverCode: 'DRV-00002', fullName: 'Sunil Shantha', employeeId: 'DRV002', mobileNumber: '0779876544', nic: '198612345679', status: 'ACTIVE', vehicleNumber: 'LY-6434', chassisNumber: 'SCK 101', cheNumber: 'SCK 101', licenseNumber: 'LIC-001235', licenseExpiryDate: '2027-11-20', portPassNumber: 'SLPA-DPP-002', portPassExpiryDate: '2027-05-18', portPassStatus: 'VALID', portPassDaysLeft: 203, address: 'No. 12, Port Access Rd, Peliyagoda', email: 'sunil.drv@smartitt.lk', emergencyContactName: 'M. Shantha (Wife)', emergencyContactNumber: '0772233445', totalTrips: 14 },
  { id: 'd-3', driverCode: 'DRV-00003', fullName: 'Anura Kumara', employeeId: 'DRV003', mobileNumber: '0779876545', nic: '198712345680', status: 'ACTIVE', vehicleNumber: 'LY-6435', chassisNumber: 'SCK 102', cheNumber: 'SCK 102', licenseNumber: 'LIC-001236', licenseExpiryDate: '2029-05-15', portPassNumber: 'SLPA-DPP-003', portPassExpiryDate: '2027-06-25', portPassStatus: 'VALID', portPassDaysLeft: 241, address: 'No. 88, Kandy Road, Kelaniya', email: 'anura.drv@smartitt.lk', emergencyContactName: 'K. Kumara (Father)', emergencyContactNumber: '0773344556', totalTrips: 16 },
  { id: 'd-4', driverCode: 'DRV-00004', fullName: 'Chaminda Vass', employeeId: 'DRV004', mobileNumber: '0779876546', nic: '198812345681', status: 'ACTIVE', vehicleNumber: 'LY-6431', chassisNumber: 'SCK 103', cheNumber: 'SCK 103', licenseNumber: 'LIC-001237', licenseExpiryDate: '2028-08-10', portPassNumber: 'SLPA-DPP-004', portPassExpiryDate: '2027-07-12', portPassStatus: 'VALID', portPassDaysLeft: 258, address: 'No. 05, Mattakkuliya Centre Rd, Colombo 15', email: 'chaminda.drv@smartitt.lk', emergencyContactName: 'C. Vass (Father)', emergencyContactNumber: '0774455667', totalTrips: 22 },
  { id: 'd-5', driverCode: 'DRV-00005', fullName: 'Roshan Mahanama', employeeId: 'DRV005', mobileNumber: '0779876547', nic: '198912345682', status: 'ACTIVE', vehicleNumber: 'LY-6427', chassisNumber: 'SCK 104', cheNumber: 'SCK 104', licenseNumber: 'LIC-001238', licenseExpiryDate: '2027-09-30', portPassNumber: 'SLPA-DPP-005', portPassExpiryDate: '2027-04-18', portPassStatus: 'VALID', portPassDaysLeft: 173, address: 'No. 32, Bloemendhal Road, Kotahena', email: 'roshan.drv@smartitt.lk', emergencyContactName: 'S. Mahanama (Mother)', emergencyContactNumber: '0775566778', totalTrips: 11 },
  { id: 'd-6', driverCode: 'DRV-00006', fullName: 'Sanath Jayasuriya', employeeId: 'DRV006', mobileNumber: '0779876548', nic: '198412345683', status: 'ACTIVE', vehicleNumber: 'LY-5665', chassisNumber: 'SCK 105', cheNumber: 'SCK 105', licenseNumber: 'LIC-001239', licenseExpiryDate: '2028-04-18', portPassNumber: 'SLPA-DPP-006', portPassExpiryDate: '2027-08-30', portPassStatus: 'VALID', portPassDaysLeft: 307, address: 'No. 19, Sea Beach Rd, Modara', email: 'sanath.drv@smartitt.lk', emergencyContactName: 'D. Jayasuriya (Sister)', emergencyContactNumber: '0776677889', totalTrips: 25 },
  { id: 'd-7', driverCode: 'DRV-00007', fullName: 'Mahela Jayawardene', employeeId: 'DRV007', mobileNumber: '0779876549', nic: '198512345684', status: 'ACTIVE', vehicleNumber: 'LY-5708', chassisNumber: 'SCK 106', cheNumber: 'SCK 106', licenseNumber: 'LIC-001240', licenseExpiryDate: '2029-01-12', portPassNumber: 'SLPA-DPP-007', portPassExpiryDate: '2027-06-15', portPassStatus: 'VALID', portPassDaysLeft: 231, address: 'No. 74, Baseline Road, Dematagoda', email: 'mahela.drv@smartitt.lk', emergencyContactName: 'N. Jayawardene (Brother)', emergencyContactNumber: '0777788990', totalTrips: 19 },
  { id: 'd-8', driverCode: 'DRV-00008', fullName: 'Kumar Sangakkara', employeeId: 'DRV008', mobileNumber: '0779876550', nic: '198612345685', status: 'ACTIVE', vehicleNumber: 'LY-5711', chassisNumber: 'SCK 107', cheNumber: 'SCK 107', licenseNumber: 'LIC-001241', licenseExpiryDate: '2027-12-05', portPassNumber: 'SLPA-DPP-008', portPassExpiryDate: '2027-05-14', portPassStatus: 'VALID', portPassDaysLeft: 199, address: 'No. 40, Negombo Road, Wattala', email: 'kumar.drv@smartitt.lk', emergencyContactName: 'K. Sangakkara (Father)', emergencyContactNumber: '0778899001', totalTrips: 21 },
  { id: 'd-9', driverCode: 'DRV-00009', fullName: 'Lasith Malinga', employeeId: 'DRV009', mobileNumber: '0779876551', nic: '198712345686', status: 'ACTIVE', vehicleNumber: 'LY-5717', chassisNumber: 'SCK 108', cheNumber: 'SCK 108', licenseNumber: 'LIC-001242', licenseExpiryDate: '2028-03-25', portPassNumber: 'SLPA-DPP-009', portPassExpiryDate: '2027-08-11', portPassStatus: 'VALID', portPassDaysLeft: 288, address: 'No. 15, Aluthmawatha Road, Colombo 15', email: 'lasith.drv@smartitt.lk', emergencyContactName: 'T. Malinga (Wife)', emergencyContactNumber: '0779900112', totalTrips: 17 },
  { id: 'd-10', driverCode: 'DRV-00010', fullName: 'Muttiah Muralitharan', employeeId: 'DRV010', mobileNumber: '0779876552', nic: '198312345687', status: 'ACTIVE', vehicleNumber: 'LY-5721', chassisNumber: 'SCK 109', cheNumber: 'SCK 109', licenseNumber: 'LIC-001243', licenseExpiryDate: '2026-12-31', portPassNumber: 'SLPA-DPP-010', portPassExpiryDate: '2027-09-09', portPassStatus: 'VALID', portPassDaysLeft: 317, address: 'No. 102, Reclamation Road, Colombo 11', email: 'murali.drv@smartitt.lk', emergencyContactName: 'M. Muralitharan (Brother)', emergencyContactNumber: '0711122334', totalTrips: 30 },
  { id: 'd-11', driverCode: 'DRV-00011', fullName: 'Nuwan Kulasekara', employeeId: 'DRV011', mobileNumber: '0779876553', nic: '198612345688', status: 'ACTIVE', vehicleNumber: 'LY-6426', chassisNumber: 'SCK 110', cheNumber: 'SCK 110', licenseNumber: 'LIC-001244', licenseExpiryDate: '2028-06-14', portPassNumber: 'SLPA-DPP-011', portPassExpiryDate: '2027-07-04', portPassStatus: 'VALID', portPassDaysLeft: 250, address: 'No. 28, Stace Road, Grandpass', email: 'nuwan.drv@smartitt.lk', emergencyContactName: 'P. Kulasekara (Wife)', emergencyContactNumber: '0712233445', totalTrips: 15 },
  { id: 'd-12', driverCode: 'DRV-00012', fullName: 'Rangana Herath', employeeId: 'DRV012', mobileNumber: '0779876554', nic: '198512345689', status: 'ACTIVE', vehicleNumber: 'LY-6428', chassisNumber: 'SCK 111', cheNumber: 'SCK 111', licenseNumber: 'LIC-001245', licenseExpiryDate: '2027-10-10', portPassNumber: 'SLPA-DPP-012', portPassExpiryDate: '2027-03-29', portPassStatus: 'VALID', portPassDaysLeft: 153, address: 'No. 53, Ferguson Road, Mattakkuliya', email: 'rangana.drv@smartitt.lk', emergencyContactName: 'H. Herath (Sister)', emergencyContactNumber: '0713344556', totalTrips: 13 },
  { id: 'd-13', driverCode: 'DRV-00013', fullName: 'Tillakaratne Dilshan', employeeId: 'DRV013', mobileNumber: '0779876555', nic: '198412345690', status: 'ACTIVE', vehicleNumber: 'LY-6438', chassisNumber: 'SCK 112', cheNumber: 'SCK 112', licenseNumber: 'LIC-001246', licenseExpiryDate: '2028-09-09', portPassNumber: 'SLPA-DPP-013', portPassExpiryDate: '2027-04-20', portPassStatus: 'VALID', portPassDaysLeft: 175, address: 'No. 67, New Chetty Street, Colombo 13', email: 'dilshan.drv@smartitt.lk', emergencyContactName: 'T. Dilshan (Brother)', emergencyContactNumber: '0714455667', totalTrips: 20 },
  { id: 'd-14', driverCode: 'DRV-00014', fullName: 'Aravinda de Silva', employeeId: 'DRV014', mobileNumber: '0779876556', nic: '198212345691', status: 'ACTIVE', vehicleNumber: 'LY-6429', chassisNumber: 'SCK 113', cheNumber: 'SCK 113', licenseNumber: 'LIC-001247', licenseExpiryDate: '2029-03-31', portPassNumber: 'SLPA-DPP-014', portPassExpiryDate: '2027-07-22', portPassStatus: 'VALID', portPassDaysLeft: 268, address: 'No. 90, Layards Broadway, Grandpass', email: 'aravinda.drv@smartitt.lk', emergencyContactName: 'A. De Silva (Father)', emergencyContactNumber: '0715566778', totalTrips: 27 },
  { id: 'd-15', driverCode: 'DRV-00015', fullName: 'Arjuna Ranatunga', employeeId: 'DRV015', mobileNumber: '0779876557', nic: '198112345692', status: 'ACTIVE', vehicleNumber: 'LY-6433', chassisNumber: 'SCK 114', cheNumber: 'SCK 114', licenseNumber: 'LIC-001248', licenseExpiryDate: '2027-04-05', portPassNumber: 'SLPA-DPP-015', portPassExpiryDate: '2027-09-15', portPassStatus: 'VALID', portPassDaysLeft: 323, address: 'No. 14, Armour Street, Colombo 12', email: 'arjuna.drv@smartitt.lk', emergencyContactName: 'D. Ranatunga (Brother)', emergencyContactNumber: '0716677889', totalTrips: 24 },
  { id: 'd-16', driverCode: 'DRV-00016', fullName: 'Upul Tharanga', employeeId: 'DRV016', mobileNumber: '0779876558', nic: '198712345693', status: 'ACTIVE', vehicleNumber: 'LY-5654', chassisNumber: 'SCK 126', cheNumber: 'SCK 126', licenseNumber: 'LIC-001249', licenseExpiryDate: '2028-11-19', portPassNumber: 'SLPA-DPP-016', portPassExpiryDate: '2027-05-18', portPassStatus: 'VALID', portPassDaysLeft: 203, address: 'No. 37, College Street, Kotahena', email: 'upul.drv@smartitt.lk', emergencyContactName: 'U. Tharanga (Father)', emergencyContactNumber: '0717788990', totalTrips: 16 },
  { id: 'd-17', driverCode: 'DRV-00017', fullName: 'Marvan Atapattu', employeeId: 'DRV017', mobileNumber: '0779876559', nic: '198312345694', status: 'ACTIVE', vehicleNumber: 'LY-2147', chassisNumber: 'SCK 127', cheNumber: 'SCK 127', licenseNumber: 'LIC-001250', licenseExpiryDate: '2029-08-22', portPassNumber: 'SLPA-DPP-017', portPassExpiryDate: '2027-06-22', portPassStatus: 'VALID', portPassDaysLeft: 238, address: 'No. 49, Sri Ramanathan Road, Colombo 13', email: 'marvan.drv@smartitt.lk', emergencyContactName: 'M. Atapattu (Wife)', emergencyContactNumber: '0718899001', totalTrips: 18 },
  { id: 'd-18', driverCode: 'DRV-00018', fullName: 'Angelo Mathews', employeeId: 'DRV018', mobileNumber: '0779876560', nic: '198712345695', status: 'ACTIVE', vehicleNumber: 'LY-6528', chassisNumber: 'SCK 115', cheNumber: 'SCK 115', licenseNumber: 'LIC-001251', licenseExpiryDate: '2028-02-14', portPassNumber: 'SLPA-DPP-018', portPassExpiryDate: '2027-02-10', portPassStatus: 'VALID', portPassDaysLeft: 106, address: 'No. 82, Wasala Road, Kotahena', email: 'angelo.drv@smartitt.lk', emergencyContactName: 'T. Mathews (Father)', emergencyContactNumber: '0721122334', totalTrips: 19 },
  { id: 'd-19', driverCode: 'DRV-00019', fullName: 'Dinesh Chandimal', employeeId: 'DRV019', mobileNumber: '0779876561', nic: '198912345696', status: 'ACTIVE', vehicleNumber: 'LY-6529', chassisNumber: 'SCK 117', cheNumber: 'SCK 117', licenseNumber: 'LIC-001252', licenseExpiryDate: '2027-07-28', portPassNumber: 'SLPA-DPP-019', portPassExpiryDate: '2027-05-28', portPassStatus: 'VALID', portPassDaysLeft: 213, address: 'No. 11, Green Path, Colombo 03', email: 'chandimal.drv@smartitt.lk', emergencyContactName: 'D. Chandimal (Wife)', emergencyContactNumber: '0722233445', totalTrips: 15 },
  { id: 'd-20', driverCode: 'DRV-00020', fullName: 'Kusal Perera', employeeId: 'DRV020', mobileNumber: '0779876562', nic: '199012345697', status: 'ACTIVE', vehicleNumber: 'LY-6530', chassisNumber: 'SCK 119', cheNumber: 'SCK 119', licenseNumber: 'LIC-001253', licenseExpiryDate: '2029-04-10', portPassNumber: 'SLPA-DPP-020', portPassExpiryDate: '2027-04-14', portPassStatus: 'VALID', portPassDaysLeft: 169, address: 'No. 23, Hekitta Road, Wattala', email: 'kusal.drv@smartitt.lk', emergencyContactName: 'S. Perera (Brother)', emergencyContactNumber: '0723344556', totalTrips: 14 },
  { id: 'd-21', driverCode: 'DRV-00021', fullName: 'Wanindu Hasaranga', employeeId: 'DRV021', mobileNumber: '0779876563', nic: '199712345698', status: 'ACTIVE', vehicleNumber: 'LY-6531', chassisNumber: 'SCK 120', cheNumber: 'SCK 120', licenseNumber: 'LIC-001254', licenseExpiryDate: '2028-10-30', portPassNumber: 'SLPA-DPP-021', portPassExpiryDate: '2027-03-31', portPassStatus: 'VALID', portPassDaysLeft: 155, address: 'No. 56, Church Road, Mattakkuliya', email: 'wanindu.drv@smartitt.lk', emergencyContactName: 'W. Hasaranga (Brother)', emergencyContactNumber: '0724455667', totalTrips: 12 },
  { id: 'd-22', driverCode: 'DRV-00022', fullName: 'Dasun Shanaka', employeeId: 'DRV022', mobileNumber: '0779876564', nic: '199112345699', status: 'ACTIVE', vehicleNumber: 'LY-6532', chassisNumber: 'SCK 121', cheNumber: 'SCK 121', licenseNumber: 'LIC-001255', licenseExpiryDate: '2029-01-20', portPassNumber: 'SLPA-DPP-022', portPassExpiryDate: '2027-07-16', portPassStatus: 'VALID', portPassDaysLeft: 262, address: 'No. 71, Modara Street, Colombo 15', email: 'dasun.drv@smartitt.lk', emergencyContactName: 'D. Shanaka (Father)', emergencyContactNumber: '0725566778', totalTrips: 11 },
  { id: 'd-23', driverCode: 'DRV-00023', fullName: 'Kusal Mendis', employeeId: 'DRV023', mobileNumber: '0779876565', nic: '199312345677', status: 'ACTIVE', vehicleNumber: undefined, chassisNumber: undefined, cheNumber: undefined, licenseNumber: 'LIC-001256', licenseExpiryDate: '2029-02-15', portPassNumber: 'SLPA-DPP-023', portPassExpiryDate: '2026-11-06', portPassStatus: 'RENEWAL_DUE', portPassDaysLeft: 10, address: 'No. 18, Bloemendhal Road, Colombo 13', email: 'kusal.mendis@smartitt.lk', emergencyContactName: 'P. Mendis (Father)', emergencyContactNumber: '0779911223', totalTrips: 20 },
];

class AdminFleetWebStore {
  private vehicles: WebVehicle[] = [...INITIAL_VEHICLES];
  private drivers: WebDriver[] = [...INITIAL_DRIVERS];

  async getVehicles(search?: string, operator?: string, status?: string): Promise<WebVehicle[]> {
    try {
      const remote = await adminWebService.getVehicles(search, operator, status);
      if (Array.isArray(remote) && remote.length > 0) {
        const filteredRemote = remote.filter((r: any) => r.vehicleNumber !== 'LY-5650');
        const remotePlates = new Set(filteredRemote.map((r: any) => (r.vehicleNumber || '').toUpperCase()));
        const localNew = this.vehicles.filter(v => !remotePlates.has(v.vehicleNumber.toUpperCase()) && v.vehicleNumber !== 'LY-5650');
        this.vehicles = [...localNew, ...filteredRemote.map((r: any) => ({
          id: r.id || `v-${r.vehicleNumber}`,
          vehicleNumber: r.vehicleNumber,
          chassisNumber: r.chassisNumber || r.cheNumber || 'SCK 100',
          cheNumber: r.cheNumber || r.chassisNumber || 'SCK 100',
          operator: r.operator || 'SCK Logistics',
          trailerSize: r.trailerSize || '40FT',
          status: r.status || 'ACTIVE',
          driverName: r.assignedDriverName || r.driverName || null,
          driverCode: r.assignedDriverCode || r.driverCode || null,
          driverMobile: r.assignedDriverMobile || r.driverMobile || null,
          licenseStatus: r.licenseStatus || 'VALID',
          daysUntilExpiry: r.daysUntilExpiry ?? 180,
          licenseIssuedDate: r.licenseIssuedDate || '2026-01-01',
          licenseExpiryDate: r.licenseExpiryDate || '2027-01-01',
          portPassNumber: r.portPassNumber || `SLPA-VPP-${r.chassisNumber || '100'}`,
          portPassExpiryDate: r.portPassExpiryDate || '2027-06-30',
          portPassStatus: r.portPassStatus || 'VALID',
          portPassDaysUntilExpiry: r.portPassDaysUntilExpiry ?? 200,
          totalTrips: r.totalTrips ?? 0,
        }))];
      }
    } catch (e) {
      // Offline fallback
    }

    this.vehicles = this.vehicles.filter(v => v.vehicleNumber !== 'LY-5650');
    let filtered = [...this.vehicles];
    if (operator && operator !== 'ALL') {
      filtered = filtered.filter(v => v.operator === operator);
    }
    if (status && status !== 'ALL') {
      filtered = filtered.filter(v => v.status === status);
    }
    if (search && search.trim()) {
      const q = search.trim().toLowerCase();
      filtered = filtered.filter(v =>
        v.vehicleNumber.toLowerCase().includes(q) ||
        v.chassisNumber.toLowerCase().includes(q) ||
        v.operator.toLowerCase().includes(q) ||
        (v.driverName && v.driverName.toLowerCase().includes(q))
      );
    }
    return filtered;
  }

  getAllVehiclesList(): WebVehicle[] {
    return [...this.vehicles];
  }

  getAllDriversList(): WebDriver[] {
    return [...this.drivers];
  }

  async addVehicle(data: {
    vehicleNumber: string;
    chassisNumber: string;
    operator: string;
    trailerSize?: string;
    portPassNumber?: string;
    portPassExpiryDate?: string;
    status?: string;
  }): Promise<WebVehicle> {
    const formattedPlate = data.vehicleNumber.trim().toUpperCase();
    const formattedChassis = data.chassisNumber.trim().toUpperCase();
    const operator = data.operator.trim();
    const trailerSize = data.trailerSize?.trim() || '40FT';
    const portPassNumber = data.portPassNumber?.trim() || `SLPA-VPP-${formattedChassis.replace(/[^A-Za-z0-9]/g, '')}`;
    const portPassExpiryDate = data.portPassExpiryDate || '2027-10-31';
    const status = data.status || 'ACTIVE';

    try {
      await adminWebService.createVehicle({
        vehicleNumber: formattedPlate,
        chassisNumber: formattedChassis,
        operator,
        trailerSize,
        portPassNumber,
        portPassExpiryDate,
        status,
      });
    } catch (e) {
      console.log('[AdminFleetWebStore] Backend offline, saving vehicle locally');
    }

    const newVehicle: WebVehicle = {
      id: `v-${Date.now()}`,
      vehicleNumber: formattedPlate,
      chassisNumber: formattedChassis,
      cheNumber: formattedChassis,
      operator,
      trailerSize,
      status,
      driverName: null,
      driverCode: null,
      driverMobile: null,
      licenseStatus: 'VALID',
      daysUntilExpiry: 365,
      licenseIssuedDate: new Date().toISOString().split('T')[0],
      licenseExpiryDate: '2027-10-31',
      portPassNumber,
      portPassExpiryDate,
      portPassStatus: 'VALID',
      portPassDaysUntilExpiry: 365,
      totalTrips: 0,
    };

    this.vehicles = [newVehicle, ...this.vehicles];
    return newVehicle;
  }

  async updateVehicleStatus(id: string, status: 'ACTIVE' | 'MAINTENANCE'): Promise<WebVehicle | null> {
    const idx = this.vehicles.findIndex(v => v.id === id || v.vehicleNumber === id);
    if (idx !== -1) {
      this.vehicles[idx] = {
        ...this.vehicles[idx],
        status,
      };
      try {
        await adminWebService.updateVehicle(id, { status });
      } catch (e) {
        console.log('[AdminFleetWebStore] Remote update vehicle status failed, local updated');
      }
      return this.vehicles[idx];
    }
    return null;
  }

  async assignDriverToVehicle(vehicleId: string, driverId: string | null): Promise<WebVehicle | null> {
    const idx = this.vehicles.findIndex(v => v.id === vehicleId || v.vehicleNumber === vehicleId);
    if (idx !== -1) {
      let driverName: string | null = null;
      let driverCode: string | null = null;
      let driverMobile: string | null = null;

      if (driverId) {
        const d = this.drivers.find(drv => drv.id === driverId || drv.driverCode === driverId);
        if (d) {
          driverName = d.fullName;
          driverCode = d.driverCode;
          driverMobile = d.mobileNumber;
          d.vehicleNumber = this.vehicles[idx].vehicleNumber;
          d.chassisNumber = this.vehicles[idx].chassisNumber;
          d.cheNumber = this.vehicles[idx].chassisNumber;
        }
      } else {
        const existingDriver = this.drivers.find(d => d.vehicleNumber === this.vehicles[idx].vehicleNumber);
        if (existingDriver) {
          existingDriver.vehicleNumber = undefined;
          existingDriver.chassisNumber = undefined;
          existingDriver.cheNumber = undefined;
        }
      }

      this.vehicles[idx] = {
        ...this.vehicles[idx],
        driverName,
        driverCode,
        driverMobile,
      };

      try {
        await adminWebService.updateVehicle(vehicleId, { assignedDriverId: driverId });
      } catch (e) {
        console.log('[AdminFleetWebStore] Remote driver assignment failed, local updated');
      }
      return this.vehicles[idx];
    }
    return null;
  }

  async getDrivers(search?: string, status?: string): Promise<WebDriver[]> {
    try {
      const remote = await adminWebService.getDrivers(search, status);
      if (Array.isArray(remote) && remote.length > 0) {
        const remoteCodes = new Set(remote.map((r: any) => (r.driverCode || '').toUpperCase()));
        const localNew = this.drivers.filter(d => !remoteCodes.has(d.driverCode.toUpperCase()));
        this.drivers = [...localNew, ...remote.map((r: any) => ({
          id: r.id || `d-${r.driverCode}`,
          driverCode: r.driverCode,
          fullName: r.fullName,
          employeeId: r.employeeId,
          mobileNumber: r.mobileNumber,
          nic: r.nic,
          status: r.status || 'ACTIVE',
          vehicleNumber: r.vehicleNumber,
          chassisNumber: r.chassisNumber || r.cheNumber,
          cheNumber: r.cheNumber || r.chassisNumber,
          licenseNumber: r.licenseNumber || r.drivingLicenceNumber || 'LIC-000000',
          licenseExpiryDate: r.licenseExpiryDate || '2028-12-31',
          portPassNumber: r.portPassNumber || `SLPA-DPP-${r.driverCode.slice(-3)}`,
          portPassExpiryDate: r.portPassExpiryDate || '2027-06-30',
          portPassStatus: r.portPassStatus || 'VALID',
          portPassDaysLeft: r.portPassDaysLeft ?? 240,
          address: r.address || '',
          email: r.email || '',
          emergencyContactName: r.emergencyContactName || '',
          emergencyContactNumber: r.emergencyContactNumber || '',
          totalTrips: r.totalTrips ?? 0,
        }))];
      }
    } catch (e) {
      // Offline fallback
    }

    let filtered = [...this.drivers];
    if (status && status !== 'ALL') {
      filtered = filtered.filter(d => d.status === status);
    }
    if (search && search.trim()) {
      const q = search.trim().toLowerCase();
      filtered = filtered.filter(d =>
        d.fullName.toLowerCase().includes(q) ||
        d.driverCode.toLowerCase().includes(q) ||
        d.employeeId.toLowerCase().includes(q) ||
        d.mobileNumber.includes(q) ||
        (d.vehicleNumber && d.vehicleNumber.toLowerCase().includes(q))
      );
    }
    return filtered;
  }

  async addDriver(data: {
    fullName: string;
    employeeId: string;
    nic: string;
    mobileNumber: string;
    drivingLicenceNumber: string;
    vehicleNumber?: string;
    chassisNumber?: string;
    password?: string;
    address?: string;
    email?: string;
  }): Promise<WebDriver> {
    const nextIndex = this.drivers.length + 1;
    const driverCode = `DRV-${String(nextIndex).padStart(5, '0')}`;
    const codeSuffix = String(nextIndex).padStart(3, '0');

    try {
      await adminWebService.createDriver({
        fullName: data.fullName.trim(),
        employeeId: data.employeeId.trim().toUpperCase(),
        nic: data.nic.trim(),
        mobileNumber: data.mobileNumber.trim(),
        drivingLicenceNumber: data.drivingLicenceNumber.trim().toUpperCase(),
        vehicleNumber: data.vehicleNumber ? data.vehicleNumber.trim().toUpperCase() : '',
        chassisNumber: data.chassisNumber ? data.chassisNumber.trim().toUpperCase() : '',
        password: data.password || 'driver',
        driverCode,
      });
    } catch (e) {
      console.log('[AdminFleetWebStore] Backend offline, saving driver locally');
    }

    const newDriver: WebDriver = {
      id: `d-${Date.now()}`,
      driverCode,
      fullName: data.fullName.trim(),
      employeeId: data.employeeId.trim().toUpperCase(),
      mobileNumber: data.mobileNumber.trim(),
      nic: data.nic.trim(),
      status: 'ACTIVE',
      vehicleNumber: data.vehicleNumber?.trim().toUpperCase() || 'UNASSIGNED',
      chassisNumber: data.chassisNumber?.trim().toUpperCase() || 'UNASSIGNED',
      cheNumber: data.chassisNumber?.trim().toUpperCase() || 'UNASSIGNED',
      licenseNumber: data.drivingLicenceNumber.trim().toUpperCase(),
      licenseExpiryDate: '2029-12-31',
      portPassNumber: `SLPA-DPP-${codeSuffix}`,
      portPassExpiryDate: '2027-10-31',
      portPassStatus: 'VALID',
      portPassDaysLeft: 365,
      address: data.address || 'Port Access Road, Colombo',
      email: data.email || `${data.employeeId.toLowerCase()}@smartitt.lk`,
      emergencyContactName: 'Next of Kin',
      emergencyContactNumber: data.mobileNumber,
      totalTrips: 0,
    };

    this.drivers = [newDriver, ...this.drivers];

    // Link vehicle if assigned
    if (data.vehicleNumber && data.vehicleNumber.trim().toUpperCase() !== 'UNASSIGNED') {
      const vPlate = data.vehicleNumber.trim().toUpperCase();
      const vIdx = this.vehicles.findIndex(v => v.vehicleNumber.toUpperCase() === vPlate);
      if (vIdx !== -1) {
        this.vehicles[vIdx] = {
          ...this.vehicles[vIdx],
          driverName: newDriver.fullName,
          driverCode: newDriver.driverCode,
          driverMobile: newDriver.mobileNumber,
        };
      }
    }

    return newDriver;
  }

  async updateDriverStatus(driverId: string, status: string, reason?: string) {
    try {
      await adminWebService.updateDriverStatus(driverId, status, reason);
    } catch (e) {}
    const idx = this.drivers.findIndex(d => d.id === driverId || d.driverCode === driverId);
    if (idx !== -1) {
      this.drivers[idx] = { ...this.drivers[idx], status };
    }
  }

  async updateVehicle(vehicleId: string, updates: Partial<WebVehicle>) {
    try {
      await adminWebService.updateVehicle(vehicleId, updates);
    } catch (e) {}
    const idx = this.vehicles.findIndex(v => v.id === vehicleId || v.vehicleNumber === vehicleId);
    if (idx !== -1) {
      this.vehicles[idx] = { ...this.vehicles[idx], ...updates };
    }
  }
}

export const adminFleetWebStore = new AdminFleetWebStore();
