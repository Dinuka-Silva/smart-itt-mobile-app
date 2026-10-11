# 🚛 SMART ITT — Inter-Terminal Transportation Management System

<div align="center">

[![Spring Boot](https://img.shields.io/badge/Spring_Boot_3.2-6DB33F?style=for-the-badge&logo=spring-boot&logoColor=white)](https://spring.io/projects/spring-boot)
[![React Native Expo](https://img.shields.io/badge/React_Native_Expo-000020?style=for-the-badge&logo=expo&logoColor=white)](https://expo.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript_5.3-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL_16-4169E1?style=for-the-badge&logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Docker Compose](https://img.shields.io/badge/Docker_Compose-2496ED?style=for-the-badge&logo=docker&logoColor=white)](https://www.docker.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg?style=for-the-badge)](LICENSE)

<br />

**SMART ITT** is an enterprise-grade digital platform engineered for real-time **Inter-Terminal Transportation (ITT)** across modern maritime container terminals (JCT, CICT, SAGT, CWIT). It unifies telematics fleet identification, dual 20ft container logistics, real-time driver telecommunications, supervisor live monitoring, and mission lifecycle archival.

</div>

---

## 🌟 Executive Summary & Core Capabilities

| Capability | Technical Realization |
| :--- | :--- |
| **Instant Vehicle ➔ CHE (SCK No) Lookup** | Real-time vehicle matcher connects any prime mover license (e.g. `LY 5234`) to its Port Container Handling Equipment number (`SCK 100`) and operator. |
| **Complete End-to-End Mission Workflow** | Driver trip creation ➔ Supervisor verification & dispatch ➔ In-Transit telemetry ➔ Terminal arrival ➔ "My Trips" archival storage. |
| **Driver Communications & Message Hub** | Cyber-styled emergency dispatcher broadcasting Safety, Dispatch, Operations, and Maintenance alerts with acoustic radio chatter. |
| **Supervisor Real-Time Monitoring & Reporting** | Live date-wise trip monitoring sheet, visual fleet status, container capacity filters, and driver directory with rich avatar photos. |
| **Production Security Architecture** | Dual-layer auth with JWT Bearer tokens + `X-API-KEY` header guard, externalized environment secrets, and Spring Security filters. |

---

## 📸 System Screenshots & Visual Showcase

### 1. Vehicle Telematics & Automatic CHE No (SCK No) Recognition
When a driver registers and enters a vehicle number, the system automatically detects and displays the **Port CHE No (SCK No)** and **Fleet Operator** in real-time.

<div align="center">
  <table>
    <tr>
      <th width="33%">SCK Logistics (SCK 100)</th>
      <th width="33%">SDR LINK (SCK 115)</th>
      <th width="33%">E3 Logistics (SCK 123)</th>
    </tr>
    <tr>
      <td><img src="docs/screenshots/vehicle_che_sck100.png" alt="SCK 100 Vehicle Match" width="100%"/></td>
      <td><img src="docs/screenshots/vehicle_che_sck115.png" alt="SCK 115 Vehicle Match" width="100%"/></td>
      <td><img src="docs/screenshots/vehicle_che_sck123.png" alt="SCK 123 Vehicle Match" width="100%"/></td>
    </tr>
    <tr>
      <td align="center"><b>Vehicle:</b> <code>LY 5234</code><br/><b>CHE:</b> <code>SCK 100</code></td>
      <td align="center"><b>Vehicle:</b> <code>LY 6528</code><br/><b>CHE:</b> <code>SCK 115</code></td>
      <td align="center"><b>Vehicle:</b> <code>LY 5597</code><br/><b>CHE:</b> <code>SCK 123</code></td>
    </tr>
  </table>
</div>

---

### 2. Driver Communications & Telematics Message Center
Dedicated driver communication hub featuring channel filters (`ALL`, `DISPATCH`, `SAFETY`, `OPERATIONS`, `MAINTENANCE`), priority visual badges, and simulated terminal dispatch audio transmissions.

<div align="center">
  <table>
    <tr>
      <th width="50%">Driver Communications Center</th>
      <th width="50%">Filtered Dispatch Transmissions</th>
    </tr>
    <tr>
      <td><img src="docs/screenshots/driver_messages_hub.png" alt="Driver Messages Hub" width="100%"/></td>
      <td><img src="docs/screenshots/dispatch_filter_selected_1791700652694.png" alt="Dispatch Filtered Messages" width="100%"/></td>
    </tr>
  </table>
</div>

---

### 3. End-to-End ITT Trip Execution Lifecycle
A complete operational trial demonstrating driver submission, supervisor approval, live in-transit tracking, terminal gate-in completion, and local storage in **My Trips**.

<div align="center">
  <table>
    <tr>
      <th width="20%">Step 1: Driver Submit</th>
      <th width="20%">Step 2: Supervisor Confirm</th>
      <th width="20%">Step 3: Trip In-Transit</th>
      <th width="20%">Step 4: Trip Completed</th>
      <th width="20%">Step 5: My Trips Archive</th>
    </tr>
    <tr>
      <td><img src="docs/screenshots/trip_01_submitted.png" alt="Trip Submitted" width="100%"/></td>
      <td><img src="docs/screenshots/trip_02_supervisor_approved.png" alt="Supervisor Approved" width="100%"/></td>
      <td><img src="docs/screenshots/trip_03_in_transit.png" alt="Trip In-Transit" width="100%"/></td>
      <td><img src="docs/screenshots/trip_04_completed.png" alt="Trip Completed" width="100%"/></td>
      <td><img src="docs/screenshots/trip_05_my_trips_archived.png" alt="My Trips Archive" width="100%"/></td>
    </tr>
    <tr>
      <td align="center"><small>Driver logs vehicle & 20ft/40ft container</small></td>
      <td align="center"><small>Supervisor validates & grants terminal dispatch</small></td>
      <td align="center"><small>Prime mover departs terminal origin gate</small></td>
      <td align="center"><small>Gate-in scan and arrival timestamp logged</small></td>
      <td align="center"><small>Trip permanently archived in driver log</small></td>
    </tr>
  </table>
</div>

---

### 3.1 Driver Mission Operations Console (Home Section)
The Driver Home dashboard dynamically guides the operator through each operational milestone without clutter:
- **Awaiting Confirmation**: Pulsing notification banner informing the driver that the trip is queued for supervisor gate pass approval.
- **Supervisor Confirmed (`START THE TRIP NOW`)**: Once approved, highlights a prominent emerald action button to depart the origin gate.
- **Trip In Transit (`ARRIVED AT TERMINAL`)**: Highlights active route and corridor destination with arrival reporting button.
- **Arrived at Terminal (`COMPLETE TRIP & DISCHARGE`)**: Allows the driver to discharge containers and commit the trip into their permanent **My Trips** archive.

<div align="center">
  <img src="docs/screenshots/driver_home_lifecycle_console.png" alt="Driver Mission Operations Console on Home Dashboard" width="85%" style="border-radius: 8px; border: 1px solid #1e293b;" />
  <p><i>Driver Home Section: Live mission details, loaded container breakdown, route telemetry, and dynamic lifecycle action buttons.</i></p>
</div>

---

### 4. Supervisor Command Center & Driver Directory
Supervisors have access to live date-wise reporting tables and an interactive driver roster with high-resolution profile imagery and telematics telemetry.

<div align="center">
  <table>
    <tr>
      <th width="33%">Supervisor Operations Dashboard</th>
      <th width="33%">Date-Wise Dispatch Reports</th>
      <th width="33%">Driver Profile Directory</th>
    </tr>
    <tr>
      <td><img src="docs/screenshots/supervisor_dashboard.png" alt="Supervisor Dashboard" width="100%"/></td>
      <td><img src="docs/screenshots/supervisor_reports_datewise.png" alt="Date-wise Reports" width="100%"/></td>
      <td><img src="docs/screenshots/supervisor_drivers_directory.png" alt="Supervisor Driver Directory" width="100%"/></td>
    </tr>
  </table>
</div>

---

### 4.1 Terminal-Wise Total Trips Panel (Weekly & Monthly Filters)
A consolidated terminal throughput panel providing multi-dimensional traffic analytics across all 6 SLPA terminals (`CICT`, `CWIT`, `ECT`, `JCT`, `UCT`, `SAGT`):
- **Timeframe Filters**: One-tap toggle between **`WEEKLY (7D)`**, **`MONTHLY (30D)`**, **`TODAY`**, and **`ALL TIME`**.
- **Traffic Direction Filters**: Focus on **`Total (Load + Discharge)`**, **`Origin Gate (Out)`**, or **`Discharge Bay (In)`**.
- **Real-Time Terminal Cards**: Displays live trip counts, container TEU totals, inbound/outbound flow ratios, and terminal active beacon indicators.

<div align="center">
  <img src="docs/screenshots/terminal_totals_weekly_monthly_panel.png" alt="Terminal-Wise Consolidated Totals Panel with Weekly and Monthly Filters" width="85%" style="border-radius: 8px; border: 1px solid #1e293b;" />
  <p><i>Supervisor Panel: 6-Terminal throughput breakdown with 7-day rolling weekly and 30-day monthly filter options.</i></p>
</div>

---

### 5. Multi-Format Dispatch Export (Excel & PDF)
Supervisors can instantly export terminal dispatch records, driver performance, and container logs in both Microsoft Excel (`.XLS` / `.CSV`) spreadsheet format and formatted printable PDF documents.

<div align="center">
  <img src="docs/screenshots/export_pdf_excel_buttons.png" alt="Export As Excel and PDF Action Buttons" width="85%" style="border-radius: 8px; border: 1px solid #1e293b;" />
  <p><i>Dual Action Export: <b>EXPORT AS EXCEL (.XLS)</b> in emerald and <b>EXPORT AS PDF</b> in cyan with automated print formatting.</i></p>
</div>

---

## ⚡ Feature Matrix

### 🚛 Driver Portal & Mobile App
- **Real-Time CHE No (SCK No) Lookup**: Auto-matches license plates against fleet database records (`SCK Logistics`, `SDR LINK`, `E3 Logistics`).
- **Interactive Fleet Chip Bar**: 1-tap vehicle picker pre-populating prime mover details and equipment codes.
- **Dual 20ft & 40ft Container Logging**: Supports single 40ft containers or dual 20ft multi-box freight on a single chassis.
- **Trip Status Workflow**: `PENDING_APPROVAL` ➔ `CONFIRMED` ➔ `IN_TRANSIT` ➔ `COMPLETED`.
- **Driver "My Trips" History**: Retains full history of all completed and archived runs with container numbers and timestamps.
- **Driver Message Center**: Radio transmissions, emergency advisories, and weather alerts with visual priority tags.
- **Driver Profile & Identity**: Supports personalized profile photos, emergency contacts, NIC, and employee badge details.

### 👔 Supervisor Terminal Cockpit
- **Live Dispatch Queue**: One-click confirmation, gate pass verification, and trip assignment.
- **Date-Wise Trip Analytics**: Filters trips by date, terminal pair (e.g. `JCT ➔ CICT`, `SAGT ➔ CWIT`), vehicle number, and status.
- **Export as PDF & Excel**: Instant generation of formatted Excel spreadsheets (`.xls`) and printable executive PDF documents.
- **Live Fleet Directory**: Complete list of registered terminal drivers with active status badges and profile avatars.
- **Daily Performance Metrics**: Real-time counter of total transfers, completed runs, pending gate-ins, and active bottlenecks.

### 🛡️ Security & Architecture
- **Stateless Authentication**: High-entropy JWT tokens with BCrypt-hashed credentials.
- **API Key Guard (`X-API-KEY`)**: Enforced for sensitive operations and external integrations via `ApiKeyAuthFilter`.
- **Environment Protection**: Sensitive database credentials externalized to `.env` with comprehensive `.env.example` templates.
- **Database Scalability**: PostgreSQL 16 database with Flyway version-controlled migrations (`V1` through `V5`).

---

## 🗄️ Database Fleet Mapping (Sample)

| Vehicle No | CHE No (SCK No) | Fleet Operator | Max Containers | Chassis Type |
| :--- | :--- | :--- | :---: | :--- |
| `LY 5234` | **SCK 100** | SCK Logistics | 2 x 20ft / 1 x 40ft | Heavy Port Skeletal |
| `LY 5235` | **SCK 101** | SCK Logistics | 2 x 20ft / 1 x 40ft | Heavy Port Skeletal |
| `LY 6528` | **SCK 115** | SDR LINK | 2 x 20ft / 1 x 40ft | Heavy Port Skeletal |
| `LY 6529` | **SCK 117** | SDR LINK | 2 x 20ft / 1 x 40ft | Heavy Port Skeletal |
| `LY 5597` | **SCK 123** | E3 Logistics | 2 x 20ft / 1 x 40ft | Heavy Port Skeletal |
| `LY 5598` | **SCK 124** | E3 Logistics | 2 x 20ft / 1 x 40ft | Heavy Port Skeletal |

---

## 🛠️ Tech Stack & Architecture

```
                        ┌───────────────────────────────┐
                        │    React Native (Expo SDK)    │
                        │    TypeScript + Zustand Store │
                        └──────────────┬────────────────┘
                                       │ REST / JSON (Axios)
                                       │ JWT + X-API-KEY Header
                                       ▼
                        ┌───────────────────────────────┐
                        │      Spring Boot 3.2 API      │
                        │ Spring Security + JPA Hibernate│
                        └──────────────┬────────────────┘
                                       │ JDBC Connection Pool
                                       ▼
                        ┌───────────────────────────────┐
                        │      PostgreSQL 16 Engine     │
                        │    Flyway Migrations (V1-V5)  │
                        └───────────────────────────────┘
```

- **Frontend**: React Native, Expo Router, TypeScript, Zustand, React Native Reanimated, Expo Vector Icons.
- **Backend**: Spring Boot 3.2, Java 21, Spring Data JPA, Spring Security, Flyway, Maven.
- **Database**: PostgreSQL 16.
- **DevOps**: Docker, Docker Compose, Git.

---

## 🚀 Quick Start Guide

### 1. Prerequisites
- [Docker & Docker Compose](https://www.docker.com/products/docker-desktop/)
- [Node.js](https://nodejs.org/) (v18 or higher)
- [Java JDK 21](https://adoptium.net/)

### 2. Configuration Setup
Copy the environment template:
```bash
cp .env.example .env
```

### 3. Launch Backend & Database
```bash
# Start PostgreSQL via Docker Compose
docker-compose up -d postgres

# Start Spring Boot backend
cd backend
./mvnw spring-boot:run
```
*Backend runs at `http://localhost:8080`*

### 4. Launch Frontend (Expo)
```bash
cd frontend
npm install
npm run start
```
*Web dashboard opens at `http://localhost:8081` (or scan the QR code via Expo Go for iOS/Android).*

---

## 👥 Demo Credentials

| Role | Username / ID | Password | Access Rights |
| :--- | :--- | :--- | :--- |
| **Driver** | `driver1` | `password` | Vehicle Registration, Trip Creation, My Trips History, Driver Messages |
| **Supervisor** | `supervisor` | `password` | Mission Approval, Fleet Directory, Date-wise Dispatch Reporting |

---

<div align="center">
  <sub>Engineered for Smart Maritime Terminals. Built with ❤️ for Port Logistics Innovation.</sub>
</div>
