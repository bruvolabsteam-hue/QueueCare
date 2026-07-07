import 'package:dio/dio.dart';
import '../../core/network/api_client.dart';
import '../models/patient.dart';

class PatientRepository {
  final Dio _dio = apiClient.dio;

  Future<Patient> createPatient(Patient patient) async {
    final response = await _dio.post('/patients/', data: patient.toJson());
    return Patient.fromJson(response.data);
  }

  Future<List<Patient>> getPatients() async {
    final response = await _dio.get('/patients/');
    final List<dynamic> data = response.data;
    return data.map((e) => Patient.fromJson(e)).toList();
  }
}
