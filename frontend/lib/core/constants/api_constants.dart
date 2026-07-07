/// API Constants for OmniCare AI backend endpoints
class ApiConstants {
  ApiConstants._();

  // ─── Base URL ──────────────────────────────────────────────────────
  static const String baseUrl = 'http://localhost:3000/api';
  static const String wsUrl = 'ws://localhost:3000';

  // ─── Auth ──────────────────────────────────────────────────────────
  static const String login = '/auth/login';
  static const String refreshToken = '/auth/refresh';
  static const String logout = '/auth/logout';
  static const String me = '/auth/me';

  // ─── Clinics ───────────────────────────────────────────────────────
  static const String clinics = '/clinics';
  static String clinicById(String id) => '/clinics/$id';
  static String toggleClinic(String id) => '/clinics/$id/toggle';

  // ─── Doctors ───────────────────────────────────────────────────────
  static const String doctors = '/doctors';
  static String doctorById(String id) => '/doctors/$id';
  static String doctorStatus(String id) => '/doctors/$id/status';

  // ─── Patients ──────────────────────────────────────────────────────
  static const String patients = '/patients';
  static String patientById(String id) => '/patients/$id';
  static const String patientSearch = '/patients/search';

  // ─── Appointments ──────────────────────────────────────────────────
  static const String appointments = '/appointments';
  static const String todayAppointments = '/appointments/today';
  static String appointmentById(String id) => '/appointments/$id';
  static String cancelAppointment(String id) => '/appointments/$id/cancel';

  // ─── Queue / Tokens ────────────────────────────────────────────────
  static const String tokens = '/tokens';
  static String tokenById(String id) => '/tokens/$id';
  static const String generateToken = '/tokens/generate';
  static const String callNext = '/tokens/call-next';
  static String completeToken(String id) => '/tokens/$id/complete';
  static String skipToken(String id) => '/tokens/$id/skip';
  static const String currentToken = '/tokens/current';
  static const String emergencyInsert = '/tokens/emergency';

  // ─── Walk-In ───────────────────────────────────────────────────────
  static const String walkIn = '/walkin/register';

  // ─── Dashboard ─────────────────────────────────────────────────────
  static const String dashboardSummary = '/dashboard/summary';

  // ─── AI Receptionist ───────────────────────────────────────────────
  static const String aiIncomingCall = '/ai-receptionist/incoming-call';
  static const String aiProcessIntent = '/ai-receptionist/process-intent';
  static const String aiBookAppointment = '/ai-receptionist/book-appointment';
  static const String aiQueueStatus = '/ai-receptionist/queue-status';
  static const String aiDoctorAvailability = '/ai-receptionist/doctor-availability';
  static const String aiConversations = '/ai-receptionist/conversations';
  static String aiConversation(String id) => '/ai-receptionist/conversations/$id';
  static const String aiStats = '/ai-receptionist/stats';

  // ─── Call Logs ─────────────────────────────────────────────────────
  static const String callLogs = '/call-logs';
  static String callLogById(String id) => '/call-logs/$id';

  // ─── Reminders ─────────────────────────────────────────────────────
  static const String reminders = '/reminders';
  static String reminderById(String id) => '/reminders/$id';
  static String cancelReminder(String id) => '/reminders/$id/cancel';
  static String resendReminder(String id) => '/reminders/$id/resend';
  static const String reminderConfig = '/reminders/config';

  // ─── WhatsApp ──────────────────────────────────────────────────────
  static const String whatsappSend = '/whatsapp/send';
  static const String whatsappSendTemplate = '/whatsapp/send-template';
  static const String whatsappMessages = '/whatsapp/messages';
  static String whatsappMessage(String id) => '/whatsapp/messages/$id';
  static const String whatsappTemplates = '/whatsapp/templates';

  // ─── Queue Predictions / Consultation Tracking ─────────────────────
  static const String consultationStart = '/consultations/start';
  static const String consultationEnd = '/consultations/end';
  static const String activeConsultations = '/consultations/active';
  static const String consultationHistory = '/consultations/history';
  static String doctorQueueTimeline(String doctorId) =>
      '/queue-predictions/doctor/$doctorId/timeline';
  static String patientPrediction(String tokenId) =>
      '/queue-predictions/patient/$tokenId';
  static const String queueOverview = '/queue-predictions/overview';
  static const String recalculate = '/queue-predictions/recalculate';
  static const String predictionAccuracy = '/queue-predictions/accuracy';
  static String doctorAvgDuration(String doctorId) =>
      '/queue-predictions/doctor/$doctorId/avg-duration';
  static String reportDoctorDelay(String doctorId) =>
      '/queue-predictions/doctor/$doctorId/delay';
  static const String arrivalReminders = '/queue-predictions/arrival-reminders';

  // ─── Storage Keys ──────────────────────────────────────────────────
  static const String accessTokenKey = 'access_token';
  static const String refreshTokenKey = 'refresh_token';
  static const String userKey = 'user_data';
  static const String themeKey = 'theme_mode';
  static const String languageKey = 'language_code';
}
