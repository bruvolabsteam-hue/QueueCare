# Appointment & Live Queue Features

The system goes beyond standard booking by offering an intelligent check-in system and a live waiting queue.

## Key Files & Locations

- **Appointments API**: `backend/app/api/v1/appointments.py`
- **Check-in Service**: `backend/app/services/checkin_service.py`

## Key Features & Rules

### 1. Live Queue Management
- **Endpoint**: `GET /api/v1/appointments/queue`
- Clinics can fetch a live, real-time list of today's appointments. 
- Status updates (e.g., "Scheduled" -> "Checked-In" -> "Consulting") keep the queue actively synchronized across the frontend apps and the admin dashboard.

### 2. Intelligent Check-In Rules (`CheckInService`)
When a patient attempts to check-in for their appointment, the system enforces strict rules:
- **Same-Day Requirement**: Check-ins are rejected if the appointment is not scheduled for today.
- **60-Minute Window**: A patient can only check in if their appointment time is within the next 60 minutes.

### 3. Automated Token Generation
Upon a successful check-in, the system automatically inserts the patient into the physical waiting room queue:
- **Token Format**: Generates an incremental token number (e.g., `A-001`).
- **Priority Tiering**: Tokens are assigned a specific priority level. For instance, a pre-booked, checked-in appointment receives Priority 2, while Emergency cases might receive Priority 1, and Walk-Ins receive Priority 3.
- The generated token is linked directly to the patient's check-in record to track their journey from arrival to consultation.
