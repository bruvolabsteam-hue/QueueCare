import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../data/repositories/appointment_repository.dart';
import '../../data/models/appointment.dart';

final appointmentRepositoryProvider = Provider((ref) => AppointmentRepository());

final queueProvider = FutureProvider<List<Appointment>>((ref) async {
  final repo = ref.read(appointmentRepositoryProvider);
  return await repo.getLiveQueue();
});

class QueueManagementScreen extends ConsumerStatefulWidget {
  const QueueManagementScreen({Key? key}) : super(key: key);

  @override
  ConsumerState<QueueManagementScreen> createState() => _QueueManagementScreenState();
}

class _QueueManagementScreenState extends ConsumerState<QueueManagementScreen> {
  @override
  Widget build(BuildContext context) {
    // Two column layout for tablet, stacked for mobile
    final isDesktop = MediaQuery.of(context).size.width > 900;

    return Scaffold(
      backgroundColor: const Color(0xFFF1F5F9), // Slate 100
      appBar: AppBar(
        title: const Text('Live Queue Management', style: TextStyle(color: Color(0xFF0F172A), fontWeight: FontWeight.bold)),
        backgroundColor: Colors.white,
        elevation: 0,
        actions: [
          Padding(
            padding: const EdgeInsets.only(right: 16.0),
            child: Center(
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                decoration: BoxDecoration(
                  color: const Color(0xFFECFDF5), // Emerald 50
                  borderRadius: BorderRadius.circular(20),
                  border: Border.all(color: const Color(0xFF10B981).withOpacity(0.3)),
                ),
                child: const Row(
                  children: [
                    Icon(Icons.circle, color: Color(0xFF10B981), size: 10),
                    SizedBox(width: 6),
                    Text('Queue Active', style: TextStyle(color: Color(0xFF065F46), fontWeight: FontWeight.bold)),
                  ],
                ),
              ),
            ),
          ),
        ],
      ),
      body: Padding(
        padding: const EdgeInsets.all(16.0),
        child: isDesktop
            ? Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Expanded(flex: 3, child: _WaitingListColumn()),
                  const SizedBox(width: 24),
                  Expanded(flex: 2, child: _ConsultingColumn()),
                ],
              )
            : Column(
                children: [
                  Expanded(child: _WaitingListColumn()),
                  const SizedBox(height: 16),
                  Expanded(child: _ConsultingColumn()),
                ],
              ),
      ),
    );
  }
}

class _WaitingListColumn extends ConsumerWidget {
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final queueAsync = ref.watch(queueProvider);

    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        boxShadow: [
          BoxShadow(color: Colors.black.withOpacity(0.03), blurRadius: 10, offset: const Offset(0, 4)),
        ],
      ),
      child: queueAsync.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (err, stack) => Center(child: Text('Error: $err')),
        data: (queue) {
          final waitingQueue = queue.where((a) => a.status != 'Consulting').toList();
          return Column(
            children: [
              Padding(
                padding: const EdgeInsets.all(20.0),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Text('Waiting List', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
                    Text('${waitingQueue.length} Patients', style: TextStyle(color: Colors.grey[500], fontWeight: FontWeight.w600)),
                  ],
                ),
              ),
              const Divider(height: 1),
              Expanded(
                child: ListView.separated(
                  padding: const EdgeInsets.all(16),
                  itemCount: waitingQueue.length,
                  separatorBuilder: (context, index) => const SizedBox(height: 12),
                  itemBuilder: (context, index) {
                    final appointment = waitingQueue[index];
                    bool isEmergency = appointment.isEmergency;

                    return Container(
                      padding: const EdgeInsets.all(16),
                      decoration: BoxDecoration(
                        color: isEmergency ? const Color(0xFFFEF2F2) : Colors.white,
                        border: Border.all(
                          color: isEmergency ? const Color(0xFFFCA5A5) : const Color(0xFFE2E8F0),
                        ),
                        borderRadius: BorderRadius.circular(16),
                      ),
                      child: Row(
                        children: [
                          Container(
                            width: 60,
                            height: 60,
                            decoration: BoxDecoration(
                              color: isEmergency ? const Color(0xFFEF4444) : const Color(0xFFF8FAFC),
                              borderRadius: BorderRadius.circular(12),
                            ),
                            child: Center(
                              child: Text(
                                appointment.queueNumber ?? 'W-${index+1}',
                                style: TextStyle(
                                  fontSize: 18,
                                  fontWeight: FontWeight.bold,
                                  color: isEmergency ? Colors.white : const Color(0xFF475569),
                                ),
                              ),
                            ),
                          ),
                          const SizedBox(width: 16),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  isEmergency ? 'Emergency Walk-in' : 'Patient ${appointment.patientId.substring(0,4)}',
                                  style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
                                ),
                                const SizedBox(height: 4),
                                Row(
                                  children: [
                                    _PriorityBadge(
                                      label: isEmergency ? 'Priority 1' : 'Priority 2',
                                      color: isEmergency ? Colors.red : Colors.green,
                                    ),
                                    const SizedBox(width: 8),
                                    Text('Status: ${appointment.status}', style: TextStyle(color: Colors.grey[500], fontSize: 12)),
                                  ],
                                ),
                              ],
                            ),
                          ),
                          IconButton(
                            onPressed: () {},
                            icon: const Icon(Icons.more_vert),
                            color: Colors.grey[400],
                          ),
                        ],
                      ),
                    );
                  },
                ),
              ),
            ],
          );
        },
      ),
    );
  }
}

class _ConsultingColumn extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          colors: [Color(0xFF0F172A), Color(0xFF1E293B)],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(20),
        boxShadow: [
          BoxShadow(color: const Color(0xFF0F172A).withOpacity(0.2), blurRadius: 15, offset: const Offset(0, 8)),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          const Padding(
            padding: EdgeInsets.all(20.0),
            child: Text('Currently Consulting', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: Colors.white)),
          ),
          const Divider(height: 1, color: Colors.white24),
          Expanded(
            child: Padding(
              padding: const EdgeInsets.all(20.0),
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Container(
                    width: 120,
                    height: 120,
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      border: Border.all(color: const Color(0xFF14B8A6), width: 4),
                    ),
                    child: const Center(
                      child: Text('A-0', style: TextStyle(fontSize: 40, fontWeight: FontWeight.bold, color: Colors.white)),
                    ),
                  ),
                  const SizedBox(height: 24),
                  const Text('John Doe', style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold, color: Colors.white)),
                  const SizedBox(height: 8),
                  Text('Dr. Smith • Room 102', style: TextStyle(fontSize: 16, color: Colors.grey[400])),
                  
                  const Spacer(),
                  
                  ElevatedButton.icon(
                    onPressed: () {},
                    icon: const Icon(Icons.arrow_forward),
                    label: const Text('Call Next Patient', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFF14B8A6),
                      foregroundColor: Colors.white,
                      padding: const EdgeInsets.symmetric(vertical: 16, horizontal: 32),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                      elevation: 0,
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _PriorityBadge extends StatelessWidget {
  final String label;
  final MaterialColor color;

  const _PriorityBadge({required this.label, required this.color});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
      decoration: BoxDecoration(
        color: color.shade50,
        borderRadius: BorderRadius.circular(6),
        border: Border.all(color: color.shade200),
      ),
      child: Text(
        label,
        style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: color.shade700),
      ),
    );
  }
}
