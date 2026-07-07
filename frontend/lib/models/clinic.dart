import 'package:equatable/equatable.dart';

class Clinic extends Equatable {
  final String id;
  final String clinicName;
  final String? logoUrl;
  final String? address;
  final String? phone;
  final String? email;
  final bool isActive;
  final DateTime? createdAt;

  const Clinic({
    required this.id,
    required this.clinicName,
    this.logoUrl,
    this.address,
    this.phone,
    this.email,
    this.isActive = true,
    this.createdAt,
  });

  factory Clinic.fromJson(Map<String, dynamic> json) {
    return Clinic(
      id: json['id']?.toString() ?? '',
      clinicName: json['clinicName'] as String? ?? json['clinic_name'] as String? ?? '',
      logoUrl: json['logoUrl'] as String? ?? json['logo_url'] as String?,
      address: json['address'] as String?,
      phone: json['phone'] as String?,
      email: json['email'] as String?,
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
      'clinicName': clinicName,
      'logoUrl': logoUrl,
      'address': address,
      'phone': phone,
      'email': email,
      'isActive': isActive,
      'createdAt': createdAt?.toIso8601String(),
    };
  }

  Clinic copyWith({
    String? id,
    String? clinicName,
    String? logoUrl,
    String? address,
    String? phone,
    String? email,
    bool? isActive,
    DateTime? createdAt,
  }) {
    return Clinic(
      id: id ?? this.id,
      clinicName: clinicName ?? this.clinicName,
      logoUrl: logoUrl ?? this.logoUrl,
      address: address ?? this.address,
      phone: phone ?? this.phone,
      email: email ?? this.email,
      isActive: isActive ?? this.isActive,
      createdAt: createdAt ?? this.createdAt,
    );
  }

  @override
  List<Object?> get props =>
      [id, clinicName, logoUrl, address, phone, email, isActive, createdAt];
}
