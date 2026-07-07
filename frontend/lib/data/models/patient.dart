class Patient {
  final String id;
  final String name;
  final String phone;
  final int? age;
  final String? gender;
  final bool isDeleted;

  Patient({
    required this.id,
    required this.name,
    required this.phone,
    this.age,
    this.gender,
    this.isDeleted = false,
  });

  factory Patient.fromJson(Map<String, dynamic> json) {
    return Patient(
      id: json['id'] as String,
      name: json['name'] as String,
      phone: json['phone'] as String,
      age: json['age'] as int?,
      gender: json['gender'] as String?,
      isDeleted: json['is_deleted'] as bool? ?? false,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'name': name,
      'phone': phone,
      'age': age,
      'gender': gender,
    };
  }
}
