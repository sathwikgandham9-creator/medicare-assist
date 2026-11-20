# MediCare Assist 💊
### Adaptive Medicine Reminder & Adherence-Monitoring System for the Elderly and Caregivers

MediCare Assist is an intelligent, accessible web application designed to bridge the gap between elderly patients and their caregivers. Unlike traditional static alarm apps, MediCare Assist features an **Adaptive Alert Engine** that analyzes patient adherence behavior over time, escalates unconfirmed doses through a progressive response ladder, and alerts caregivers in real time via Server-Sent Events (SSE).

---

## 🌟 Key Features

### 1. Adaptive Alert Engine (Core Differentiator)
- **4-Stage Escalation Ladder for Unconfirmed Doses:**
  - **Level 1 (Scheduled Time):** Gentle notification + pleasant soft harmonic chime.
  - **Level 2 (+5 min):** Repeat notification, louder dual-tone chime, and device vibration.
  - **Level 3 (+10 min):** Full-screen urgent alert with alternating siren and repeating voice read-aloud (every 2 min).
  - **Level 4 (+20 min, or +10 min for critical medicines):** Real-time alert dispatched to caregiver dashboard via SSE.
  - **Grace Period (default 30 min):** Dose marked as `MISSED` and caregiver notified immediately.
- **Behavior-Based Adaptation (14-Day Rolling Analytics):**
  - **Miss-Prone Slots:** If a time slot has 3+ misses in 7 days, the system pre-reminds 15 minutes earlier and begins at Escalation Level 2.
  - **Schedule Shift Insights:** If the user routinely takes medication 25–40 minutes late, the system suggests a 1-tap schedule adjustment.
  - **Repeated Miss Protection:** 2 consecutive missed doses of the same medicine trigger an immediate emergency caregiver warning.
  - **Gentle Mode Reset:** When a user achieves 95%+ compliance over 7 days, alarms relax back to gentle chimes to prevent alarm fatigue.
  - **Snooze Limiter:** Maximum 3 snoozes allowed per dose before auto-escalating.

---

### 2. Elderly-Friendly Design & Accessibility
- **Large Typography & Touch Targets:** Base 20px+ font size, buttons at least 64px tall, high-contrast borders.
- **Maximum 4 Big Navigation Tabs:**
  1. **Today:** Grouped doses (Morning, Afternoon, Evening, Night) with live status badges.
  2. **My Medicines:** Visual list of prescriptions with SVG pill illustrations and stock counts.
  3. **History:** Simple, color-coded log of taken and missed doses.
  4. **Help & Settings:** Accessibility toggles, caregiver link code, and emergency contacts.
- **Multilingual Support:** Full native translations in **English**, **हिंदी (Hindi)**, and **తెలుగు (Telugu)**.
- **Accessibility Modes:** Text size (Normal / Large / Extra Large), High-Contrast Dark Mode, and Web Speech voice read-aloud.
- **Persistent Emergency SOS Button:** 1-tap call to caregiver phone (`tel:`) and instant broadcast to the caregiver dashboard.

---

### 3. Visual Medicine Setup Wizard (1 Question per Screen)
- **Step 1: Visual Pill Picker:**
  - 8 pill shapes: Round, Oval, Capsule, Two-Tone Capsule, Square, Diamond, Half-Moon, Heart-shaped.
  - 10 pill colors: White, Yellow, Pink, Blue, Green, Orange, Red, Brown, Black, Purple.
  - 6 non-tablet forms: Syrup bottle, Injection, Inhaler, Eye drops, Ointment tube, Powder sachet.
  - Device camera photo capture / upload option.
- **Step 2: Medicine Name:** Autocomplete from ~100 common medications + Web Speech voice input.
- **Step 3: Dosage Strength & Stepper:** Strength (e.g. 500 mg) and dose quantity stepper (1 tablet, 5 ml, etc.).
- **Step 4: Reminder Times:** Preset cards (Morning 8am, Afternoon 1pm, Evening 6pm, Night 9pm) + custom picker.
- **Step 5: Frequency:** Every day, Specific days, Every other day, or As-needed (PRN).
- **Step 6: Duration:** Ongoing maintenance or fixed course of days.
- **Step 7: Food Instructions:** Before food, With food, After food, Empty stomach + doctor notes.
- **Step 8: Critical Medicine Flag:** Fast escalation for life-critical medications (heart, diabetes, blood pressure).
- **Step 9: Stock & Refill Warning:** Tablet inventory tracking with threshold notifications.
- **Step 10: Confirmation:** Large preview summary card.

---

### 4. Comprehensive Caregiver Dashboard
- **Overview Briefing:** Daily progress (e.g. "Today: 5 of 6 taken, 1 missed"), adherence score gauge, risk level badge (Low/Medium/High), and low-stock alerts.
- **Live Alerts Feed (SSE):** Real-time push feed with acoustic chime on critical alerts and 1-click acknowledge buttons.
- **Patient Switcher:** Effortlessly switch between multiple linked elderly relatives.
- **Adherence & Behavioral Analytics:**
  - 7/30-day compliance area trend chart (Recharts).
  - Time-of-day missed doses heatmap/bar chart.
  - Per-medicine compliance comparison.
  - Outcome breakdown pie chart (Taken vs Snoozed vs Missed).
  - Behavioral pattern diagnostics.
  - Adaptive insights cards with 1-click recommendation apply.
- **Medication Calendar & Report Export:**
  - Month calendar view with green/amber/red day indicators.
  - Export data as CSV spreadsheet.
  - Export professional PDF Doctor Report formatted for clinical appointments.
- **Demo Mode Controls:**
  - Time acceleration (1x, 60x, 600x).
  - 1-click "Simulate Missed Dose" (runs escalation ladder to Missed in seconds).
  - 1-click "Trigger Due Reminder".
  - 1-click "Reset Demo Data" (re-seeds 3 weeks of realistic data).

---

## 🛠️ Tech Stack

- **Frontend:** React 18, Vite, TypeScript, Tailwind CSS, React Router v6, Lucide React, Recharts, jsPDF, Canvas Confetti.
- **PWA:** Installable Web App Manifest, Service Worker offline cache, and offline response synchronization queue.
- **Backend:** Node.js (v20+ / v24+), Express, native `node:sqlite` (zero C++ compilation dependencies), JWT authentication, bcryptjs, `node-cron`.
- **Real-Time Communication:** Server-Sent Events (SSE) stream for instant caregiver alerts.
- **Audio & Speech:** Synthesized Web Audio API alarms (no external audio files required) and Web Speech Synthesis API.

---

## 🚀 Quick Start (Single Command)

### Prerequisites
- Node.js v20.x or v24.x
- npm v10+

### Installation & Run
```bash
# 1. Install dependencies
npm run install:all

# 2. Run both Backend & Frontend concurrently with one command:
npm run dev
```

The application will start:
- **Client (Frontend):** `http://localhost:5173`
- **Server (Backend API & SSE):** `http://localhost:5000`

---

## 🔑 Demo Login Credentials

The database comes pre-seeded with 3 weeks of realistic history, 6 medications, low-stock warnings, and missed-dose evening patterns:

| Role | Email | Password | Details |
|---|---|---|---|
| **Caregiver** | `caregiver@medicare.com` | `password123` | Dr. Priya Sharma (Caregiver) |
| **Elderly User** | `grandma@medicare.com` | `password123` | Margaret Miller (Grandma) |

*Tip: Quick 1-click login buttons are available right on the login screen.*

---

## 🧪 Running Automated End-to-End Tests
You can run the full in-process E2E test suite covering logins, today's schedule, dose responses, SOS events, caregiver analytics, demo simulations, and alerts:

```bash
npm --prefix server run test:e2e
```

---

## 📂 Project Structure

```
d:\MediCare Assist\
├── package.json               # Root scripts (dev, build, seed, install:all)
├── README.md                  # Complete documentation
│
├── server/                    # Node.js + Express + SQLite Backend
│   ├── src/
│   │   ├── config.ts          # Environment variables & constants
│   │   ├── index.ts           # Express server entry point & SSE stream
│   │   ├── sse.ts             # Server-Sent Events real-time broker
│   │   ├── db/
│   │   │   ├── db.ts          # SQLite database schema & connection
│   │   │   └── seed.ts        # 3-week seed script with realistic history
│   │   ├── services/
│   │   │   ├── adaptiveEngine.ts # 4-level escalation ladder & 14-day analytics
│   │   │   └── scheduler.ts   # Node-cron scheduler with demo acceleration
│   │   ├── middleware/
│   │   │   └── auth.ts        # JWT validation & role permissions
│   │   ├── routes/
│   │   │   ├── auth.ts        # Signup, login, 6-digit link codes
│   │   │   ├── medicines.ts   # Prescription CRUD & stock refills
│   │   │   ├── doses.ts       # Today doses, respond taken/snooze/skip, history
│   │   │   ├── alerts.ts      # Live alerts feed, SOS emergency trigger
│   │   │   ├── caregiver.ts   # Dashboard metrics, analytics, insights, PDF export
│   │   │   └── demo.ts        # Acceleration controls & missed dose simulator
│   │   └── test_e2e.ts        # Complete automated integration test suite
│   ├── tsconfig.json
│   └── package.json
│
└── client/                    # React + Vite + TypeScript Frontend
    ├── public/
    │   ├── manifest.json      # PWA Manifest
    │   ├── pill-logo.svg      # SVG Logo & PWA Icon
    │   └── sw.js              # Service Worker offline caching
    ├── src/
    │   ├── App.tsx            # Routes, layout & protected route guards
    │   ├── main.tsx           # Entry point & PWA registration
    │   ├── index.css          # Tailwind, typography & high-contrast themes
    │   ├── types/index.ts     # TypeScript data models
    │   ├── context/
    │   │   ├── AuthContext.tsx         # User authentication & patient switcher
    │   │   ├── AccessibilityContext.tsx # Language (EN/HI/TE), text size, high-contrast
    │   │   └── ReminderContext.tsx     # Smart reminder scheduler & audio/speech triggers
    │   ├── services/
    │   │   ├── api.ts         # Fetch API client with offline response queue
    │   │   ├── sound.ts       # Synthesized Web Audio alarm generator
    │   │   └── speech.ts      # Web Speech Synthesis reminder reader
    │   ├── utils/
    │   │   └── translations.ts # EN, HI, TE dictionary
    │   ├── components/
    │   │   ├── PillIllustration.tsx # Pure SVG 8 shapes + 6 forms + colors + photo
    │   │   ├── Header.tsx           # App header, language selector, high-contrast toggle
    │   │   ├── ElderlyNavBar.tsx    # 4 big touch-friendly navigation tabs
    │   │   ├── CaregiverNav.tsx     # Caregiver navigation bar with live alert badge
    │   │   ├── ReminderModal.tsx    # Full-screen smart reminder popup with large buttons
    │   │   ├── SosButton.tsx        # Persistent Emergency SOS button
    │   │   └── OfflineBanner.tsx    # Offline and notification permission banners
    │   └── pages/
    │       ├── Login.tsx            # Login with 1-click demo buttons
    │       ├── Register.tsx         # Account registration
    │       ├── elderly/
    │       │   ├── TodayDoses.tsx   # Morning/Afternoon/Evening/Night grouped doses
    │       │   ├── MyMedicines.tsx  # My prescriptions & stock refill
    │       │   ├── MedicineWizard.tsx # 10-step guided prescription wizard
    │       │   ├── History.tsx      # Simple dose history
    │       │   └── HelpAccessibility.tsx # Accessibility controls & caregiver linking
    │       └── caregiver/
    │           ├── Dashboard.tsx    # Overview, adherence score, risk level
    │           ├── AlertsFeed.tsx   # Live SSE feed with acknowledge actions
    │           ├── Patients.tsx     # Patient switcher & 6-digit link code
    │           ├── Medicines.tsx    # Remote medicine management
    │           ├── History.tsx      # Calendar view, CSV & Doctor PDF export
    │           ├── Analytics.tsx    # Recharts charts, patterns & adaptive insights
    │           └── Settings.tsx     # Escalation thresholds & Demo mode simulator
    ├── tsconfig.json
    ├── vite.config.ts
    └── tailwind.config.js
```

