# ERAOTS — Enterprise Real-Time Attendance & Occupancy Tracking System

A full-stack web application that transforms raw biometric door-access events into actionable workforce intelligence. Built with FastAPI, React, and PostgreSQL.

**Design System:** Vigilant Glass (Bento Grid + Glassmorphism)

## 🏗️ Project Structure

```
ERAOTS-1/
├── docs/                          # Phase I deliverables
│   ├── SRS_Document.md/pdf        # Software Requirements Specification
│   └── ER_Diagram.md/pdf          # Entity-Relationship Diagram
├── UI prototype/                  # Design reference files
│   ├── vigilant_glass_2/          # Light/dark mode design specs
│   └── real_time_dashboard_v2/    # Dashboard UI reference
├── backend/                       # Python FastAPI backend
│   ├── app/
│   │   ├── api/                   # REST API endpoints
│   │   │   ├── auth.py            # Login & JWT authentication
│   │   │   ├── events.py          # Scan events + occupancy (FR1, FR2)
│   │   │   ├── employees.py       # Employee & department CRUD (FR5)
│   │   │   └── schemas.py         # Pydantic request/response schemas
│   │   ├── core/                  # Framework infrastructure
│   │   │   ├── config.py          # Environment settings
│   │   │   ├── database.py        # Async SQLAlchemy engine
│   │   │   ├── security.py        # JWT, bcrypt, API keys
│   │   │   └── dependencies.py    # FastAPI dependency injection
│   │   ├── models/                # Database models (20+ entities)
│   │   │   ├── employee.py        # Employee, Department, Role, UserAccount
│   │   │   ├── events.py          # ScanEvent, OccupancyState, PendingStateTransition
│   │   │   ├── attendance.py      # AttendanceRecord
│   │   │   ├── schedule.py        # Schedule, Leave, Holiday
│   │   │   ├── notifications.py   # Notifications & preferences (actionable)
│   │   │   ├── corrections.py     # Attendance corrections
│   │   │   ├── policies.py        # Configurable business rules
│   │   │   ├── emergency.py       # Emergency evacuation tracking
│   │   │   ├── hardware.py        # Scanner & health monitoring
│   │   │   └── audit.py           # Audit log
│   │   └── main.py                # FastAPI app entry point
│   ├── simulator/                 # Hardware scanner simulator
│   │   └── simulator.py           # Generates fake scan events
│   └── requirements.txt           # Python dependencies
├── frontend/                      # React + Vite frontend
│   └── src/
│       ├── context/               # React context (auth, theme)
│       ├── layouts/               # Premium glassmorphic layout
│       ├── pages/                 # Page components
│       ├── services/              # API client (Axios)
│       └── styles/index.css       # Vigilant Glass design system
├── docker-compose.yml             # PostgreSQL + Redis (optional)
├── .env.example                   # Environment template
└── README.md                      # This file
```

## 🚀 Quick Start

### Prerequisites

- **Python 3.11+** — [Download](https://www.python.org/downloads/)
- **Node.js 18+** — [Download](https://nodejs.org/)
- **PostgreSQL 15+** — [Download](https://www.postgresql.org/download/) or use Docker

### Option A: Docker (PostgreSQL + Redis)

```bash
docker compose up -d
```

### Option B: Local PostgreSQL

1. Install PostgreSQL
2. Create a database named `eraots`
3. Update `.env` with your connection string

### Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv venv

# Activate it
# Windows:
venv\Scripts\activate
# Mac/Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Copy environment config
cp ../.env.example ../.env
# Edit .env with your database credentials

# Seed the database (creates tables + demo data)
python test_seed.py

# Start the backend
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

The API will be available at:
- **API:** http://localhost:8000
- **Swagger Docs:** http://localhost:8000/docs
- **ReDoc:** http://localhost:8000/redoc

### Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Start the dev server
npm run dev
```

The frontend will be available at **http://localhost:5173**

## 🔐 Demo Credentials

| Role | Email | Password |
|------|-------|----------|
| **Admin** | admin@eraots.com | admin123 |
| **Employee** | employee@eraots.com | employee123 |

> The Admin account has full system access. The Employee account demonstrates the limited employee view.

## 🎨 Design System

ERAOTS uses the **Vigilant Glass** design system:

- **Typography:** Manrope (headlines), Inter (body)
- **Colors:** Deep zinc/black, pure white, signal red (#E60000)
- **Effects:** Glassmorphism with backdrop-blur, subtle gradients
- **Layout:** Bento grid system with responsive breakpoints
- **Modes:** Light and dark themes with smooth transitions

Toggle between light/dark mode using the theme switch in the header.

## 🧪 Hardware Simulator

The simulator generates realistic scan events for testing:

```bash
cd backend

# Run a full workday simulation
python -m simulator.simulator --mode workday --scanner-ids <scanner-id-1> <scanner-id-2> --employees 10

# Run continuous random scans
python -m simulator.simulator --mode continuous --scanner-ids <scanner-id-1> --interval 15
```

> **Note:** Find scanner IDs in the Swagger docs after starting the backend, or check the server startup logs.

## 📡 API Overview

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/login` | Authenticate & get JWT token |
| GET | `/api/auth/me` | Get current user info |
| POST | `/api/events/scan` | Submit a scan event (FR1) |
| GET | `/api/events/recent` | Get recent scan events (FR3) |
| GET | `/api/events/occupancy` | Get live occupancy stats (FR2) |
| GET | `/api/events/occupancy/employees` | Get per-employee status |
| GET | `/api/events/pending-transitions` | Get pending 30-second confirmations |
| PUT | `/api/events/pending-transitions/{id}/reject` | Cancel a pending transition |
| PUT | `/api/events/status-override` | Manual status toggle (hierarchy of truth) |
| WS | `/api/events/ws/dashboard` | WebSocket for live updates |
| POST | `/api/employees` | Create employee (FR5) |
| GET | `/api/employees` | List employees |
| PUT | `/api/employees/{id}` | Update employee |
| POST | `/api/departments` | Create department |
| GET | `/api/departments` | List departments |

Full interactive documentation at **http://localhost:8000/docs**

## 🔄 Hybrid Status Tracking

ERAOTS implements a sophisticated hybrid status tracking system:

### Employee States
- `OUTSIDE` — Not in the building
- `ACTIVE` — Inside and at desk
- `IN_MEETING` — Inside but in a meeting
- `ON_BREAK` — On a short break
- `AWAY` — Away for extended period

### Hierarchy of Truth
1. **Biometric Scan OUT** (Ultimate Priority) — Forces status to OUTSIDE
2. **Manual Portal Toggle** (High Priority) — Direct user override
3. **Calendar Sync** (Medium Priority) — 30-second confirmation rule

### The 30-Second Rule
When a calendar meeting starts:
1. System creates a `PendingStateTransition`
2. Employee receives actionable notification with [Cancel] / [Confirm]
3. If ignored for 30 seconds, transition auto-confirms to `IN_MEETING`

## 👥 Team Structure

| Squad | Focus | Members |
|-------|-------|---------|
| Backend | FastAPI, database, business logic | 3 |
| Frontend | React, dashboard, UI/UX | 3 |
| QA & Docs | Testing, documentation | 2 |
| DevOps & Integration | CI/CD, deployment | 2 |
| Lead | Architecture, coordination | 1 |

## 📚 Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | Python 3.11+ / FastAPI |
| Frontend | React 18 / Vite |
| Database | PostgreSQL 15+ / SQLite (dev) |
| Cache | Redis 7+ |
| ORM | SQLAlchemy 2.0 (async) |
| Auth | JWT (python-jose) |
| Charts | Recharts |
| Real-time | WebSocket |
| Design | Vigilant Glass (custom) |

## 📄 License

University project — Industry Reconnaissance Module.
