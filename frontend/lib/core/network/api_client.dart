import 'package:dio/dio.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:flutter/foundation.dart';

class ApiClient {
  final Dio dio;
  final FlutterSecureStorage secureStorage = const FlutterSecureStorage();
  
  // Use 10.0.2.2 for Android Emulator, localhost for iOS/Web
  static const String baseUrl = 'http://localhost:8000/api/v1';

  ApiClient()
      : dio = Dio(BaseOptions(
          baseUrl: baseUrl,
          connectTimeout: const Duration(seconds: 10),
          receiveTimeout: const Duration(seconds: 10),
          responseType: ResponseType.json,
        )) {
    
    // Add Interceptors
    dio.interceptors.add(InterceptorsWrapper(
      onRequest: (options, handler) async {
        // Inject Bearer token
        final token = await secureStorage.read(key: 'access_token');
        if (token != null) {
          options.headers['Authorization'] = 'Bearer $token';
        }
        return handler.next(options);
      },
      onError: (DioException e, handler) async {
        // Handle 401 Unauthorized (e.g. token expired)
        if (e.response?.statusCode == 401) {
          // Implement Refresh Token Logic here if needed
          debugPrint('HTTP 401: Token expired or invalid.');
        }
        return handler.next(e);
      },
    ));

    // Logging Interceptor for Debugging
    if (kDebugMode) {
      dio.interceptors.add(LogInterceptor(
        request: true,
        requestHeader: true,
        requestBody: true,
        responseHeader: false,
        responseBody: true,
        error: true,
      ));
    }
  }
}

// Global instance for easy access
final ApiClient apiClient = ApiClient();
