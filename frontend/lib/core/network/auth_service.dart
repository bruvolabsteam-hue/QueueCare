import 'package:dio/dio.dart';
import 'api_client.dart';

class AuthService {
  final Dio _dio = apiClient.dio;

  Future<bool> login(String email, String password) async {
    try {
      final response = await _dio.post(
        '/auth/login/access-token',
        data: FormData.fromMap({
          'username': email,
          'password': password,
        }),
        options: Options(
          // Auth endpoint accepts form url-encoded data
          contentType: Headers.formUrlEncodedContentType,
        )
      );

      if (response.statusCode == 200) {
        final data = response.data;
        // Save tokens securely
        await apiClient.secureStorage.write(key: 'access_token', value: data['access_token']);
        await apiClient.secureStorage.write(key: 'refresh_token', value: data['refresh_token']);
        return true;
      }
      return false;
    } catch (e) {
      return false;
    }
  }

  Future<void> logout() async {
    await apiClient.secureStorage.delete(key: 'access_token');
    await apiClient.secureStorage.delete(key: 'refresh_token');
  }
}
