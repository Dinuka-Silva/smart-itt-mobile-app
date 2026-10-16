# SMART ITT — Port Operations & SCK Logistics Supervisory Command Center

Enterprise web application for **SCK Logistics (Pvt) Ltd** and **Port of Colombo** Inter-Terminal Transportation (ITT) operations management.

Built with **React 19**, **TypeScript**, **Vite**, and custom vanilla CSS maritime cyber design tokens.

---

## 🌟 Executive Overview

The **SMART ITT Operations Cockpit** provides real-time supervisory oversight and command control across all 6 container terminals at the **Port of Colombo**:
- **CICT** — Colombo International Container Terminals
- **CWIT** — Colombo West International Terminal
- **ECT** — East Container Terminal (SLPA Deep Water)
- **JCT** — Jaya Container Terminal (SLPA Main)
- **UCT** — Unity Container Terminal
- **SAGT** — South Asia Gateway Terminals

The platform manages the 24 authoritative prime mover fleet, led by **SCK Logistics** (CHE 100–114) and contractor carriers (`SDR LINK` and `E3 Logistics`), handling container transfers with integrated ISO 6346 validation, live driver allowance calculations (**LKR 2,500/trip**), and digital gate pass clearance.

---

## 🚀 Key Modules & Capabilities

### 🛡️ 1. SCK Daily Operations & Supervision
- **Driver Shift Supervision**: Live monitoring of on-duty drivers, speed, corridor geofences, and trip incentives.
- **Driver Operational Dossier**: Instant inspection modal with NIC, heavy driving license details, expiry date, emergency contacts, and historical mission ratings.
- **Gate Clearance Queue**: Real-time review and one-click digital stamping of origin gate-out passes (`PENDING_APPROVAL` ➔ `APPROVED` / `REJECTED`).
- **Terminal Supervisor Stations**: Gate allocation roster across CICT, ECT, JCT, CWIT, SAGT, and UCT with gate response velocity meters.
- **Prime Mover Fleet Management**: Fuel percentage bars, engine telemetry, 40FT tri-axle chassis hitch tracking, and PM maintenance toggles.

### 📊 2. Port Command Overview
- Real-time KPI summary (Total Trips, Completed, Active Telematics, Total TEU Handled).
- 6-Terminal Throughput Grid with dwell time monitoring and congestion indicators.
- Live Port Clock (SLST) and Hybrid Connectivity Engine status (Spring Boot 3.2 live probe or Standalone Simulation).

### 🚛 3. ITT Missions & Trips
- End-to-end trip lifecycle state machine: `PENDING_APPROVAL` ➔ `APPROVED` ➔ `IN_PROGRESS` ➔ `COMPLETED`.
- Multi-criteria terminal, operator, and status filtering.
- Direct modal inspection with full seal, cargo, container, and supervisor audit history.

### 📦 4. ISO 6346 Container Registry & Live Validator
- Modulus-11 ISO 6346 check-digit algorithm implementation.
- Live interactive container calculator with immediate valid/invalid diagnostics.
- Manifest registry covering 20FT, 40FT, reefer, and hazardous container payloads.

### 🏢 5. 6×6 Inter-Terminal Exchange Matrix
- Dynamic origin-to-destination freight exchange matrix mapping transit flow between all 6 Colombo port terminals.

### 📑 6. Reports & Multi-Format Dispatch Export
- Instant print-ready dispatch manifests (PDF format with dedicated print stylesheets).
- Multi-period CSV / Excel export (`Daily Shift`, `Weekly Consolidated`, `Monthly Audit`).

---

## 🛠️ Technology Stack

| Layer | Technology |
|---|---|
| **Framework** | React 19.2 + Vite 8.3 |
| **Language** | TypeScript 6.0 |
| **Styling** | Vanilla CSS with custom maritime cyber design tokens (No Tailwind) |
| **Icons** | Lucide React |
| **Data Engine** | Hybrid REST client (`http://localhost:8080/api/v1`) + LocalStorage telematics engine |
| **Validation** | ISO 6346 Modulus-11 check digit engine |

---

## ⚡ Getting Started

### 1. Prerequisites
- **Node.js** v20+
- **npm** v10+

### 2. Installation
```bash
npm install
```

### 3. Development Server
```bash
npm run dev
```
The application will launch at `http://localhost:5173/`.

### 4. Production Build
```bash
npm run build
```
Generates optimized static assets in the `dist/` directory.

---

## 🏢 Organization & Repository

- **Repository**: [Dinuka-Silva/smart-itt-mobile-app](https://github.com/Dinuka-Silva/smart-itt-mobile-app)
- **Branch**: `web`
- **Maintained for**: **[SCK ITT PROJECT](https://github.com/SCK-ITT-PROJECT)**  
  *Port of Colombo · SCK Logistics (Pvt) Ltd*
