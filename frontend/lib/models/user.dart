import 'package:equatable/equatable.dart';

enum UserRole {
  superAdmin('super_admin', 'Super Admin'),
  clinicAdmin('clinic_admin', 'Clinic Admin'),
  receptionist('receptionist', 'Receptionist'),
  doctor('doctor', 'Doctor');

  final String value;
  final String label;
  const UserRole(this.value, this.label);

  static UserRole fromString(String? value) {
    return UserRole.values.firstWhere(
      (e) => e.value == value || e.name == value,
      orElse: () => UserRole.receptionist,
    );
  }
}

class User extends Equatable {
  final String id;
  final String? clinicId;
  final UserRole role;
  final String name;
  final String email;
  final bool isActive;
  final DateTime? createdAt;

  const User({
    required this.id,
    this.clinicId,
    required this.role,
    required this.name,
    required this.email,
    this.isActive = true,
    this.createdAt,
  });

  factory User.fromJson(Map<String, dynamic> json) {
    return User(
      id: json['id']?.toString() ?? '',
      clinicId: json['clinicId']?.toString() ?? json['clinic_id']?.toString(),
      role: UserRole.fromString(json['role'] as String?),
      name: json['name'] as String? ?? '',
      email: json['email'] as String? ?? '',
      isActive: json['isActive'] as bool? ?? json['is_active'] as bool? ?? true,
      createdAt: json['createdAt'] != null
          ? DateTime.tryParse(json['createdAt'].toString())
          : json['created_at'] != null
              ? DateTime.tryParse(json['created_at'].toString())
              : null,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'clinicId': clinicId,
      'role': role.value,
      'name': name,
      'email': email,
      'isActive': isActive,
      'createdAt': createdAt?.toIso8601String(),
    };
  }

  User copyWith({
    String? id,
    String? clinicId,
    UserRole? role,
    String? name,
    String? email,
    bool? isActive,
    DateTime? createdAt,
  }) {
    return User(
      id: id ?? this.id,
      clinicId: clinicId ?? this.clinicId,
      role: role ?? this.role,
      name: name ?? this.name,
      email: email ?? this.email,
      isActive: isActive ?? this.isActive,
      createdAt: createdAt ?? this.createdAt,
    );
  }

  bool get isSuperAdmin => role == UserRole.superAdmin;
  bool get isClinicAdmin => role == UserRole.clinicAdmin;
  bool get isReceptionist => role == UserRole.receptionist;
  bool get isDoctor => role == UserRole.doctor;

  @override
  List<Object?> get props => [id, clinicId, role, name, email, isActive, createdAt];
}
