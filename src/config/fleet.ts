export interface FleetVehicle {
  id: string;
  cheNumber: string;       // SCK No (Chassis / CHE)
  vehicleNumber: string;   // LY No (Prime Mover / Tractor License)
  operator: 'SCK Logistics' | 'SDR LINK' | 'E3 Logistics';
  status: 'ACTIVE' | 'MAINTENANCE' | 'IN_TRANSIT';
  assignedDriver?: {
    driverCode: string;
    driverName: string;
    mobile: string;
  };
}

export const SCK_FLEET: FleetVehicle[] = [
  // ─── SCK LOGISTICS MAIN FLEET (10 Vehicles) ───
  {
    id: 'fl-100',
    cheNumber: 'SCK 100',
    vehicleNumber: 'LY 5234',
    operator: 'SCK Logistics',
    status: 'ACTIVE',
    assignedDriver: { driverCode: 'DRV-00001', driverName: 'Kamal Perera', mobile: '+94 77 123 4567' },
  },
  {
    id: 'fl-101',
    cheNumber: 'SCK 101',
    vehicleNumber: 'LY 5235',
    operator: 'SCK Logistics',
    status: 'ACTIVE',
    assignedDriver: { driverCode: 'DRV-00002', driverName: 'Saman Silva', mobile: '+94 71 987 6543' },
  },
  {
    id: 'fl-102',
    cheNumber: 'SCK 102',
    vehicleNumber: 'LY 5236',
    operator: 'SCK Logistics',
    status: 'ACTIVE',
    assignedDriver: { driverCode: 'DRV-00003', driverName: 'Ruwan Fernando', mobile: '+94 76 555 4321' },
  },
  {
    id: 'fl-103',
    cheNumber: 'SCK 103',
    vehicleNumber: 'LY 5237',
    operator: 'SCK Logistics',
    status: 'ACTIVE',
    assignedDriver: { driverCode: 'DRV-00004', driverName: 'Nuwan Bandara', mobile: '+94 70 333 2211' },
  },
  {
    id: 'fl-104',
    cheNumber: 'SCK 104',
    vehicleNumber: 'LY 5238',
    operator: 'SCK Logistics',
    status: 'ACTIVE',
    assignedDriver: { driverCode: 'DRV-00005', driverName: 'Amal Jayasuriya', mobile: '+94 72 444 8899' },
  },
  {
    id: 'fl-105',
    cheNumber: 'SCK 105',
    vehicleNumber: 'LY 5665',
    operator: 'SCK Logistics',
    status: 'ACTIVE',
    assignedDriver: { driverCode: 'DRV-00006', driverName: 'Sunil Wickramasinghe', mobile: '+94 77 222 1100' },
  },
  {
    id: 'fl-106',
    cheNumber: 'SCK 106',
    vehicleNumber: 'LY 5708',
    operator: 'SCK Logistics',
    status: 'ACTIVE',
    assignedDriver: { driverCode: 'DRV-00007', driverName: 'Chaminda Vaas', mobile: '+94 75 888 7766' },
  },
  {
    id: 'fl-107',
    cheNumber: 'SCK 107',
    vehicleNumber: 'LY 5711',
    operator: 'SCK Logistics',
    status: 'ACTIVE',
    assignedDriver: { driverCode: 'DRV-00008', driverName: 'Kasun Rajitha', mobile: '+94 78 999 1234' },
  },
  {
    id: 'fl-108',
    cheNumber: 'SCK 108',
    vehicleNumber: 'LY 5717',
    operator: 'SCK Logistics',
    status: 'ACTIVE',
    assignedDriver: { driverCode: 'DRV-00009', driverName: 'Dinesh Chandimal', mobile: '+94 71 444 5566' },
  },
  {
    id: 'fl-109',
    cheNumber: 'SCK 109',
    vehicleNumber: 'LY 5721',
    operator: 'SCK Logistics',
    status: 'ACTIVE',
    assignedDriver: { driverCode: 'DRV-00010', driverName: 'Mahela Jayawardene', mobile: '+94 76 111 2233' },
  },

  // ─── SDR LINK FLEET (6 Vehicles) ───
  {
    id: 'fl-115',
    cheNumber: 'SCK 115',
    vehicleNumber: 'LY 6528',
    operator: 'SDR LINK',
    status: 'ACTIVE',
    assignedDriver: { driverCode: 'DRV-00011', driverName: 'Roshan Mahanama', mobile: '+94 77 333 4455' },
  },
  {
    id: 'fl-117',
    cheNumber: 'SCK 117',
    vehicleNumber: 'LY 6529',
    operator: 'SDR LINK',
    status: 'ACTIVE',
    assignedDriver: { driverCode: 'DRV-00012', driverName: 'Marvan Atapattu', mobile: '+94 71 666 7788' },
  },
  {
    id: 'fl-122',
    cheNumber: 'SCK 122',
    vehicleNumber: 'LY 5596',
    operator: 'SDR LINK',
    status: 'ACTIVE',
    assignedDriver: { driverCode: 'DRV-00013', driverName: 'Lasith Malinga', mobile: '+94 70 888 9900' },
  },
  {
    id: 'fl-119',
    cheNumber: 'SCK 119',
    vehicleNumber: 'LY 6530',
    operator: 'SDR LINK',
    status: 'ACTIVE',
    assignedDriver: { driverCode: 'DRV-00014', driverName: 'Rangana Herath', mobile: '+94 75 111 4477' },
  },
  {
    id: 'fl-120',
    cheNumber: 'SCK 120',
    vehicleNumber: 'LY 6531',
    operator: 'SDR LINK',
    status: 'ACTIVE',
    assignedDriver: { driverCode: 'DRV-00015', driverName: 'Aravinda de Silva', mobile: '+94 72 555 8822' },
  },
  {
    id: 'fl-121',
    cheNumber: 'SCK 121',
    vehicleNumber: 'LY 6532',
    operator: 'SDR LINK',
    status: 'ACTIVE',
    assignedDriver: { driverCode: 'DRV-00016', driverName: 'Sanath Jayasuriya', mobile: '+94 77 777 8899' },
  },

  // ─── E3 LOGISTICS FLEET (3 Vehicles) ───
  {
    id: 'fl-123',
    cheNumber: 'SCK 123',
    vehicleNumber: 'LY 5597',
    operator: 'E3 Logistics',
    status: 'ACTIVE',
    assignedDriver: { driverCode: 'DRV-00017', driverName: 'Kumar Sangakkara', mobile: '+94 71 222 3344' },
  },
  {
    id: 'fl-124',
    cheNumber: 'SCK 124',
    vehicleNumber: 'LY 5598',
    operator: 'E3 Logistics',
    status: 'ACTIVE',
    assignedDriver: { driverCode: 'DRV-00018', driverName: 'Tilakaratne Dilshan', mobile: '+94 76 888 2211' },
  },
  {
    id: 'fl-125',
    cheNumber: 'SCK 125',
    vehicleNumber: 'LY 5600',
    operator: 'E3 Logistics',
    status: 'ACTIVE',
    assignedDriver: { driverCode: 'DRV-00019', driverName: 'Muttiah Muralitharan', mobile: '+94 70 999 4433' },
  },
];

