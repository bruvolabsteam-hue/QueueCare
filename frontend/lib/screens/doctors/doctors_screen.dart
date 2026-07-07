import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

class DoctorsScreen extends ConsumerStatefulWidget {
  const DoctorsScreen({Key? key}) : super(key: key);

  @override
  ConsumerState<DoctorsScreen> createState() => _DoctorsScreenState();
}

class _DoctorsScreenState extends ConsumerState<DoctorsScreen> {
  // Mock data for UI layout
  final List<Map<String, dynamic>> _doctors = [
    {
      'id': '1',
      'name': 'Dr. Sarah Smith',
      'specialty': 'Cardiology',
      'status': 'Available',
      'patientsInQueue': 4,
      'imageUrl': 'https://i.pravatar.cc/150?img=1'
    },
    {
      'id': '2',
      'name': 'Dr. John Doe',
      'specialty': 'General Practice',
      'status': 'Consulting',
      'patientsInQueue': 8,
      'imageUrl': 'https://i.pravatar.cc/150?img=11'
    },
    {
      'id': '3',
      'name': 'Dr. Emily Chen',
      'specialty': 'Pediatrics',
      'status': 'Late Arrival',
      'patientsInQueue': 2,
      'imageUrl': 'https://i.pravatar.cc/150?img=5'
    },
    {
      'id': '4',
      'name': 'Dr. Michael Brown',
      'specialty': 'Orthopedics',
      'status': 'Offline',
      'patientsInQueue': 0,
      'imageUrl': 'https://i.pravatar.cc/150?img=8'
    },
  ];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      appBar: AppBar(
        title: const Text('Doctor Availability', style: TextStyle(color: Color(0xFF0F172A), fontWeight: FontWeight.bold)),
        backgroundColor: Colors.transparent,
        elevation: 0,
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh, color: Color(0xFF475569)),
            onPressed: () {},
          ),
          const SizedBox(width: 8),
        ],
      ),
      body: Padding(
        padding: const EdgeInsets.all(24.0),
        child: GridView.builder(
          gridDelegate: const SliverGridDelegateWithMaxCrossAxisExtent(
            maxCrossAxisExtent: 400,
            crossAxisSpacing: 24,
            mainAxisSpacing: 24,
            childAspectRatio: 0.85,
          ),
          itemCount: _doctors.length,
          itemBuilder: (context, index) {
            final doc = _doctors[index];
            return _DoctorCard(
              name: doc['name'],
              specialty: doc['specialty'],
              status: doc['status'],
              patientsInQueue: doc['patientsInQueue'],
              imageUrl: doc['imageUrl'],
              onStatusChanged: (newStatus) {
                setState(() {
                  _doctors[index]['status'] = newStatus;
                });
              },
            );
          },
        ),
      ),
    );
  }
}

class _DoctorCard extends StatelessWidget {
  final String name;
  final String specialty;
  final String status;
  final int patientsInQueue;
  final String imageUrl;
  final ValueChanged<String> onStatusChanged;

  const _DoctorCard({
    required this.name,
    required this.specialty,
    required this.status,
    required this.patientsInQueue,
    required this.imageUrl,
    required this.onStatusChanged,
  });

  Color _getStatusColor(String currentStatus) {
    switch (currentStatus) {
      case 'Available':
        return const Color(0xFF10B981); // Emerald
      case 'Consulting':
        return const Color(0xFF3B82F6); // Blue
      case 'Late Arrival':
        return const Color(0xFFF59E0B); // Amber
      case 'Offline':
      default:
        return const Color(0xFF94A3B8); // Slate
    }
  }

  @override
  Widget build(BuildContext context) {
    final statusColor = _getStatusColor(status);

    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(24),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.04),
            blurRadius: 24,
            offset: const Offset(0, 8),
          ),
        ],
      ),
      child: Column(
        children: [
          // Top section with gradient
          Container(
            height: 80,
            decoration: BoxDecoration(
              gradient: LinearGradient(
                colors: [statusColor.withOpacity(0.2), statusColor.withOpacity(0.05)],
                begin: Alignment.topCenter,
                end: Alignment.bottomCenter,
              ),
              borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
            ),
            child: Stack(
              clipBehavior: Clip.none,
              alignment: Alignment.center,
              children: [
                Positioned(
                  bottom: -30,
                  child: Container(
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      border: Border.all(color: Colors.white, width: 4),
                      boxShadow: [
                        BoxShadow(
                          color: statusColor.withOpacity(0.3),
                          blurRadius: 12,
                          offset: const Offset(0, 4),
                        ),
                      ],
                    ),
                    child: CircleAvatar(
                      radius: 30,
                      backgroundImage: NetworkImage(imageUrl),
                      backgroundColor: Colors.grey[200],
                    ),
                  ),
                ),
                Positioned(
                  bottom: -25,
                  right: 120, // rough positioning for the badge
                  child: Container(
                    width: 14,
                    height: 14,
                    decoration: BoxDecoration(
                      color: statusColor,
                      shape: BoxShape.circle,
                      border: Border.all(color: Colors.white, width: 2),
                    ),
                  ),
                )
              ],
            ),
          ),
          const SizedBox(height: 40),
          // Doctor Info
          Text(
            name,
            style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: Color(0xFF0F172A)),
          ),
          const SizedBox(height: 4),
          Text(
            specialty,
            style: const TextStyle(color: Color(0xFF64748B), fontWeight: FontWeight.w500),
          ),
          const SizedBox(height: 16),
          // Queue Info
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
            decoration: BoxDecoration(
              color: const Color(0xFFF8FAFC),
              borderRadius: BorderRadius.circular(12),
            ),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                const Icon(Icons.people_alt_outlined, size: 16, color: Color(0xFF475569)),
                const SizedBox(width: 8),
                Text(
                  '$patientsInQueue waiting',
                  style: const TextStyle(fontWeight: FontWeight.bold, color: Color(0xFF475569)),
                ),
              ],
            ),
          ),
          const Spacer(),
          // Status Dropdown
          Padding(
            padding: const EdgeInsets.all(16.0),
            child: Container(
              width: double.infinity,
              padding: const EdgeInsets.symmetric(horizontal: 16),
              decoration: BoxDecoration(
                border: Border.all(color: statusColor.withOpacity(0.3)),
                borderRadius: BorderRadius.circular(16),
                color: statusColor.withOpacity(0.05),
              ),
              child: DropdownButtonHideUnderline(
                child: DropdownButton<String>(
                  isExpanded: true,
                  value: status,
                  icon: Icon(Icons.keyboard_arrow_down, color: statusColor),
                  style: TextStyle(fontWeight: FontWeight.bold, color: statusColor, fontSize: 15),
                  items: ['Available', 'Consulting', 'Late Arrival', 'Offline', 'Emergency Leave']
                      .map((String value) {
                    return DropdownMenuItem<String>(
                      value: value,
                      child: Text(value),
                    );
                  }).toList(),
                  onChanged: (val) {
                    if (val != null) onStatusChanged(val);
                  },
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
