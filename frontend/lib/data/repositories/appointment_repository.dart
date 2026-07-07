import 'package:dio/dio.dart';
import '../../core/network/api_client.dart';
import '../models/appointment.dart';

class AppointmentRepository {
  final Dio _dio = apiClient.dio;

  Future<List<Appointment>> getLiveQueue() async {
    try {
      final response = await _dio.get('/appointments/queue');
      final List<dynamic> data = response.data;
      return data.map((e) => Appointment.fromJson(e)).toList();
    } catch (e) {
      // Return empty list on failure for now
      return [];
    }
  }

  Future<Appointment> updateStatus(String appointmentId, String status) async {
    final response = await _dio.put(
      '/appointments/$appointmentId/status',
      data: {'status': status},
    );
    return Appointment.fromJson(response.data);
  }
}
