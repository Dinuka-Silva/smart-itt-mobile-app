import { create } from 'zustand';

export type MessageCategory = 'ALL' | 'DISPATCH' | 'SUPERVISOR' | 'SAFETY' | 'PAYMENT';
export type MessagePriority = 'URGENT' | 'HIGH' | 'NORMAL' | 'SUCCESS';

export interface MessageReply {
  id: string;
  sender: string;
  text: string;
  time: string;
}

export interface DriverMessage {
  id: string;
  category: 'DISPATCH' | 'SUPERVISOR' | 'SAFETY' | 'PAYMENT';
  priority: MessagePriority;
  sender: string;
  senderRole: string;
  title: string;
  message: string;
  time: string;
  timestamp: number;
  read: boolean;
  acknowledged: boolean;
  acknowledgedAt?: string;
  metadata?: {
    tripId?: string;
    tripNumber?: string;
    terminal?: string;
    bay?: string;
    containerNumber?: string;
    allowanceAmount?: string;
    speedLimit?: string;
    actionRequired?: string;
  };
  replies?: MessageReply[];
}

interface DriverMessageState {
  messages: DriverMessage[];
  selectedCategory: MessageCategory;
  searchQuery: string;
  onlyUnread: boolean;
  setSelectedCategory: (cat: MessageCategory) => void;
  setSearchQuery: (query: string) => void;
  setOnlyUnread: (onlyUnread: boolean) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  acknowledgeMessage: (id: string) => void;
  sendQuickReply: (messageId: string, text: string, driverName?: string) => void;
  sendRadioDispatch: (category: 'DISPATCH' | 'SUPERVISOR' | 'SAFETY', text: string, driverName?: string, vehicleNo?: string) => void;
  syncTripsWithMessages: (trips: any[]) => void;
}

const INITIAL_MESSAGES: DriverMessage[] = [
  {
    id: 'msg-001',
    category: 'DISPATCH',
    priority: 'SUCCESS',
    sender: 'Supervisor Nimal Silva',
    senderRole: 'Shift Lead • Central Dispatch Tower',
    title: 'Gate Pass & ITT Mission Approved',
    message: 'Trip ITT-00001 (CICT Bay-7 → JCT Bay-3) has been confirmed and verified. Gate 4 fast-lane clearance authorized. Proceed immediately to container staging bay.',
    time: '5 mins ago',
    timestamp: Date.now() - 5 * 60 * 1000,
    read: false,
    acknowledged: false,
    metadata: {
      tripId: 'TRP-10492',
      tripNumber: 'ITT-00001',
      terminal: 'JCT Bay-3',
      containerNumber: 'MSCU-782910-2 (40ft High Cube)',
      actionRequired: 'Proceed to Gate 4 Fast Lane',
    },
  },
  {
    id: 'msg-002',
    category: 'SUPERVISOR',
    priority: 'HIGH',
    sender: 'Supervisor Nimal Silva',
    senderRole: 'Port Control VHF CH-16',
    title: 'Twist-Lock Check on Dual 20ft Containers',
    message: 'Kamal, please visually inspect physical twist-locks on both front and rear chassis bolster points before exiting CICT Gate 4. Reply when locks are locked and locked.',
    time: '22 mins ago',
    timestamp: Date.now() - 22 * 60 * 1000,
    read: false,
    acknowledged: false,
    metadata: {
      containerNumber: 'MSCU-291048-1 & MSCU-291049-5 (2x20ft)',
      actionRequired: 'Check 4-point Twist Locks',
    },
  },
  {
    id: 'msg-003',
    category: 'SAFETY',
    priority: 'URGENT',
    sender: 'Port Harbour Master (VTS)',
    senderRole: 'Colombo Port Authority Telematics',
    title: 'Gantry Crane Maintenance at SAGT Berth 2',
    message: 'Quayside Gantry Crane #04 undergoing emergency cable tensioning. Maintain minimum 20m safety perimeter. CHE vehicle speed strictly restricted to 20 km/h on Link Road 3.',
    time: '1 hour ago',
    timestamp: Date.now() - 60 * 60 * 1000,
    read: true,
    acknowledged: true,
    acknowledgedAt: '1 hour ago',
    metadata: {
      speedLimit: '20 km/h Enforced',
      actionRequired: 'Observe 20m Safety Perimeter',
      terminal: 'SAGT Berth 2',
    },
  },
  {
    id: 'msg-004',
    category: 'PAYMENT',
    priority: 'NORMAL',
    sender: 'SCK Fleet Finance Desk',
    senderRole: 'Automated Allowance Gateway',
    title: 'ITT Shift Allowance Credited',
    message: 'Driver trip allowance of LKR 2,500 has been verified and credited to your account for completed CICT-to-JCT transport. Daily accumulated total: LKR 5,000.',
    time: '2 hours ago',
    timestamp: Date.now() - 120 * 60 * 1000,
    read: true,
    acknowledged: true,
    metadata: {
      allowanceAmount: 'LKR 2,500.00',
      actionRequired: 'Balance Updated',
    },
  },
  {
    id: 'msg-005',
    category: 'SAFETY',
    priority: 'NORMAL',
    sender: 'Colombo Port Weather Bureau',
    senderRole: 'Coastal Meteorological Radar',
    title: 'Monsoon Wind Gust Advisory (Breakwater)',
    message: 'Wind gusts exceeding 30 knots detected along Breakwater Connecting Bridge. Drivers carrying high-cube containers are advised to reduce speed to 25 km/h.',
    time: '3 hours ago',
    timestamp: Date.now() - 180 * 60 * 1000,
    read: true,
    acknowledged: false,
    metadata: {
      speedLimit: '25 km/h Caution',
      actionRequired: 'Secure high-cube loads',
    },
  },
  {
    id: 'msg-006',
    category: 'DISPATCH',
    priority: 'NORMAL',
    sender: 'CICT Yard Master Bandara',
    senderRole: 'Yard Control Sector G',
    title: 'Priority Turn-Around Slot Granted',
    message: 'Vehicle SCK 100 / LY 5234 allocated priority queue position at CICT Yard G Bay 14. Turn-around window expires at 15:30 hrs.',
    time: '4 hours ago',
    timestamp: Date.now() - 240 * 60 * 1000,
    read: true,
    acknowledged: true,
    metadata: {
      terminal: 'CICT Yard G Bay 14',
      actionRequired: 'Check-in before 15:30',
    },
  },
];

export const useDriverMessageStore = create<DriverMessageState>((set, get) => ({
  messages: INITIAL_MESSAGES,
  selectedCategory: 'ALL',
  searchQuery: '',
  onlyUnread: false,

  setSelectedCategory: (cat) => set({ selectedCategory: cat }),
  setSearchQuery: (query) => set({ searchQuery: query }),
  setOnlyUnread: (onlyUnread) => set({ onlyUnread }),

  markAsRead: (id) => {
    set((state) => ({
      messages: state.messages.map((m) =>
        m.id === id ? { ...m, read: true } : m
      ),
    }));
  },

  markAllAsRead: () => {
    set((state) => ({
      messages: state.messages.map((m) => ({ ...m, read: true })),
    }));
  },

  acknowledgeMessage: (id) => {
    const timeStr = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    set((state) => ({
      messages: state.messages.map((m) =>
        m.id === id ? { ...m, read: true, acknowledged: true, acknowledgedAt: timeStr } : m
      ),
    }));
  },

  sendQuickReply: (messageId, text, driverName = 'Kamal Perera') => {
    const timeStr = 'Just now';
    const newReply: MessageReply = {
      id: `rep-${Date.now()}`,
      sender: `${driverName} (Driver)`,
      text,
      time: timeStr,
    };

    set((state) => ({
      messages: state.messages.map((m) => {
        if (m.id === messageId) {
          const currentReplies = m.replies || [];
          return {
            ...m,
            read: true,
            acknowledged: true,
            replies: [...currentReplies, newReply],
          };
        }
        return m;
      }),
    }));
  },

  sendRadioDispatch: (category, text, driverName = 'Kamal Perera', vehicleNo = 'SCK 100 / LY 5234') => {
    const newMsg: DriverMessage = {
      id: `msg-sent-${Date.now()}`,
      category,
      priority: 'HIGH',
      sender: `${driverName} (${vehicleNo})`,
      senderRole: 'Driver Radio Dispatch Outbound',
      title: `Radio Transmission: ${category}`,
      message: text,
      time: 'Just now',
      timestamp: Date.now(),
      read: true,
      acknowledged: true,
      acknowledgedAt: 'Transmitted',
    };

    set((state) => ({
      messages: [newMsg, ...state.messages],
    }));
  },

  syncTripsWithMessages: (trips) => {
    if (!Array.isArray(trips) || trips.length === 0) return;

    const currentMessages = get().messages;
    const byId = new Map<string, DriverMessage>();
    currentMessages.forEach((m) => byId.set(m.id, m));

    trips.forEach((t) => {
      const tripNum = t.tripNumber || `TRP-${t.id?.slice(0, 6)}`;
      const route = `${t.sourceTerminal || 'CICT'} → ${t.destTerminal || 'JCT'}`;
      const msgId = `trip-sync-${t.id}`;

      if (t.status === 'IN_PROGRESS' || t.status === 'COMPLETED' || t.status === 'APPROVED') {
        if (!byId.has(msgId)) {
          byId.set(msgId, {
            id: msgId,
            category: 'DISPATCH',
            priority: 'SUCCESS',
            sender: 'Supervisor Dispatch',
            senderRole: 'Port Gate & Mission Control',
            title: `Trip ${tripNum} Confirmed & Authorized`,
            message: `Supervisor approved route ${route}. Gate pass active. Proceed to destination terminal.`,
            time: 'Live',
            timestamp: Date.now(),
            read: false,
            acknowledged: false,
            metadata: {
              tripId: t.id,
              tripNumber: tripNum,
              terminal: t.destTerminal,
              containerNumber: t.containers?.map((c: any) => c.containerNumber).join(', ') || 'Containers Assigned',
              actionRequired: 'Proceed with ITT Transfer',
            },
          });
        }
      } else if (t.status === 'REJECTED') {
        const rejId = `trip-rej-${t.id}`;
        if (!byId.has(rejId)) {
          byId.set(rejId, {
            id: rejId,
            category: 'DISPATCH',
            priority: 'URGENT',
            sender: 'Supervisor Dispatch',
            senderRole: 'Port Gate Control',
            title: `Trip ${tripNum} Rejected`,
            message: `Supervisor rejected trip ${tripNum} (${route}). Reason: Document or seal verification needed. Contact supervisor immediately.`,
            time: 'Live',
            timestamp: Date.now(),
            read: false,
            acknowledged: false,
            metadata: {
              tripId: t.id,
              tripNumber: tripNum,
              actionRequired: 'Contact Shift Supervisor',
            },
          });
        }
      }
    });

    const updatedList = Array.from(byId.values()).sort((a, b) => b.timestamp - a.timestamp);
    set({ messages: updatedList });
  },
}));
