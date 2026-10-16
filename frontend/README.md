# SMART ITT — SCK Logistics Mobile Application

Official cross-platform mobile application for **SCK Logistics (Pvt) Ltd** powering Inter-Terminal Transportation (ITT) operations across all 6 container terminals at the **Port of Colombo** (CICT, CWIT, ECT, JCT, UCT, SAGT).

Developed with **React Native**, **Expo SDK 57**, **Expo Router**, and **TypeScript**.

---

## 🚀 Key Features

### 🚛 Driver Operations Cockpit
- **Live Mission State Machine**: Start mission, load containers, obtain supervisor gate pass, in-transit GPS telematics, and destination in-gate discharge.
- **ISO 6346 Modulus-11 Validator**: Real-time check-digit calculation and container number verification.
- **Chassis Hitch Capacity Enforcer**: Automatic restriction to 1× 40FT or up to 2× 20FT container payloads.
- **Incentive & Allowance Tracker**: Real-time counter calculating driver earnings at **LKR 2,500 per completed trip**.
- **Driver Profile & Dossier**: Displays driver code (`DRV-00001`+), national ID (NIC), heavy vehicle license expiration, and safety honors.

### 🛡️ Supervisor Gate Operations
- **Terminal Gate Clearance Queue**: Review and digitally approve origin gate-out and destination gate-in passes.
- **Physical Inspection Hold**: Flag cargo defects, broken seals, or chassis weight discrepancies with direct driver alerts.
- **Shift & Gate Station Roster**: Terminal allocation across CICT, CWIT, ECT, JCT, UCT, and SAGT.
- **Approval Velocity Telematics**: Real-time tracking of gate dwell time and supervisor response speeds.

---

## 🛠️ Technology Stack

| Layer | Technology |
|---|---|
| **Framework** | React Native 0.86 / React 19 / Expo SDK 57 |
| **Routing** | Expo Router v57 (File-based navigation) |
| **Language** | TypeScript 6.0 |
| **State Management** | Zustand & TanStack Query |
| **Offline Cache** | Expo SQLite & SecureStore |
| **UI & Icons** | @expo/vector-icons, React Native SVG |
| **Backend Integration** | Spring Boot 3.2 REST API (`/api/v1`) |

---

## 📦 Project Structure

```text
├── app/                          # Expo Router File-Based Navigation
│   ├── (auth)/                   # Driver & Supervisor authentication
│   │   ├── login.tsx             # SCK Logistics portal login
│   │   └── register.tsx          # Driver registration
│   ├── (driver)/                 # Driver operations workspace
│   │   ├── (tabs)/               # Cockpit, missions, telemetry, profile
│   │   └── trips/                # New trip & container load workflow
│   ├── (supervisor)/             # Terminal supervisor workspace
│   │   ├── (tabs)/               # Gate approvals, drivers, reports
│   │   └── _layout.tsx
│   └── index.tsx                 # Root router & role redirector
├── assets/                       # SCK Logistics logo, icons, splash
├── src/
│   ├── components/               # Reusable UI widgets & cards
│   ├── config/                   # API base URL, fleet configuration
│   ├── hooks/                    # Responsive layout & safe area hooks
│   ├── services/                 # REST API services (trips, drivers, dashboard)
│   ├── store/                    # Zustand auth and offline stores
│   ├── theme/                    # Maritime cyber color tokens & spacing
│   └── types/                    # Domain data types
├── app.json                      # Expo application manifest
└── package.json
```

---

## ⚡ Quick Start

### 1. Prerequisites
- **Node.js** v20+
- **npm** or **yarn**
- **Expo Go** app installed on iOS or Android (or Android Studio / Xcode emulator)

### 2. Install Dependencies
```bash
npm install
```

### 3. Start Development Server
```bash
npx expo start
```

- Press `a` for Android emulator
- Press `i` for iOS simulator
- Press `w` for Web preview
- Scan the QR code with your mobile camera using **Expo Go**

---

## 🔐 Credentials & API Configuration

Configure the backend API URL in [`src/config/api.ts`](./src/config/api.ts):
```typescript
export const API_BASE_URL = 'http://<YOUR_LAN_IP>:8080/api/v1';
```

Default demo credentials:
- **Driver**: `driver@smartitt.lk` / `driver` (Driver Code: `DRV-00001`, CHE: `SCK 100`)
- **Supervisor**: `supervisor@smartitt.lk` / `supervisor` (Supervisor ID: `SUP001`, Station: `CICT Gate 1`)

---

## 🏢 Organization

Maintained by **[SCK ITT PROJECT](https://github.com/SCK-ITT-PROJECT)**.  
*Port & Terminal Telematics · SCK Logistics (Pvt) Ltd · Port of Colombo*
