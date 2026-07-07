/// Base API exception class for all network-related errors
class ApiException implements Exception {
  final String message;
  final int? statusCode;
  final dynamic data;

  const ApiException({
    required this.message,
    this.statusCode,
    this.data,
  });

  @override
  String toString() => 'ApiException($statusCode): $message';
}

/// Thrown when a network error occurs (no connection, timeout, etc.)
class NetworkException extends ApiException {
  const NetworkException({
    super.message = 'Network error. Please check your internet connection.',
    super.statusCode,
    super.data,
  });

  @override
  String toString() => 'NetworkException: $message';
}

/// Thrown when the user is not authenticated (401)
class UnauthorizedException extends ApiException {
  const UnauthorizedException({
    super.message = 'Session expired. Please login again.',
    super.statusCode = 401,
    super.data,
  });

  @override
  String toString() => 'UnauthorizedException: $message';
}

/// Thrown when a requested resource is not found (404)
class NotFoundException extends ApiException {
  const NotFoundException({
    super.message = 'The requested resource was not found.',
    super.statusCode = 404,
    super.data,
  });

  @override
  String toString() => 'NotFoundException: $message';
}

/// Thrown when the server returns a validation error (422)
class ValidationException extends ApiException {
  final Map<String, List<String>>? errors;

  const ValidationException({
    super.message = 'Validation error. Please check your input.',
    super.statusCode = 422,
    super.data,
    this.errors,
  });

  @override
  String toString() => 'ValidationException: $message';
}

/// Thrown when the user does not have permission (403)
class ForbiddenException extends ApiException {
  const ForbiddenException({
    super.message = 'You do not have permission to perform this action.',
    super.statusCode = 403,
    super.data,
  });

  @override
  String toString() => 'ForbiddenException: $message';
}

/// Thrown when the server encounters an internal error (500)
class ServerException extends ApiException {
  const ServerException({
    super.message = 'Server error. Please try again later.',
    super.statusCode = 500,
    super.data,
  });

  @override
  String toString() => 'ServerException: $message';
}
