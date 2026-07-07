class Appointment {
  final String id;
  final String patientId;
  final String doctorId;
  final String status;
  final DateTime startTime;
  final DateTime? endTime;
  final String? queueNumber;
  final bool isEmergency;

  Appointment({
    required this.id,
    required this.patientId,
    required this.doctorId,
    required this.status,
    required this.startTime,
    this.endTime,
    this.queueNumber,
    this.isEmergency = false,
  });

  factory Appointment.fromJson(Map<String, dynamic> json) {
    return Appointment(
      id: json['id'] as String,
      patientId: json['patient_id'] as String,
      doctorId: json['doctor_id'] as String,
      status: json['status'] as String,
      startTime: DateTime.parse(json['start_time'] as String),
      endTime: json['end_time'] != null ? DateTime.parse(json['end_time'] as String) : null,
      queueNumber: json['queue_number'] as String?,
      isEmergency: json['is_emergency'] as bool? ?? false,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'patient_id': patientId,
      'doctor_id': doctorId,
      'start_time': startTime.toIso8601String(),
      'is_emergency': isEmergency,
    };
  }
}
