# OmniCare AI Clinic Management - System Overview

The OmniCare AI Clinic Management system is a comprehensive, multi-tenant solution designed to automate clinic operations, manage queues efficiently, and handle patient communications through an AI-powered Receptionist.

## High-Level Architecture

The platform is split into three main components:

### 1. Backend (Python/FastAPI)
The core intelligence and database layer of the system.
- **Location**: `backend/`
- **Key File**: `backend/main.py`
- **Features**: 
  - Exposes REST APIs for Auth, Patients, Appointments, and the AI Receptionist.
  - Connects to the database and handles all business logic.
  - Implements multi-tenancy (managing multiple clinics).

### 2. Clinic/Admin Dashboard (Next.js)
The web interface for clinic administrators and doctors to manage operations.
- **Location**: `super_admin_web/`
- **Key File**: `super_admin_web/src/app/page.tsx` (and others in `src/`)
- **Features**: 
  - Manage live queues and appointments.
  - View patient history and system configurations.

### 3. Patient/Doctor App (Flutter)
A cross-platform mobile application used by end-users.
- **Location**: `frontend/`
- **Key File**: `frontend/lib/main.dart`
- **Features**: 
  - Native mobile experience for interacting with the clinic system.
