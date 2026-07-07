import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

class WalkInRegistrationScreen extends ConsumerStatefulWidget {
  const WalkInRegistrationScreen({Key? key}) : super(key: key);

  @override
  ConsumerState<WalkInRegistrationScreen> createState() => _WalkInRegistrationScreenState();
}

class _WalkInRegistrationScreenState extends ConsumerState<WalkInRegistrationScreen> {
  bool _isEmergency = false;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      appBar: AppBar(
        title: const Text('New Walk-In Registration', style: TextStyle(color: Color(0xFF0F172A), fontWeight: FontWeight.bold)),
        backgroundColor: Colors.transparent,
        elevation: 0,
      ),
      body: Center(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(24.0),
          child: Container(
            constraints: const BoxConstraints(maxWidth: 600),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(24),
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withOpacity(0.05),
                  blurRadius: 20,
                  offset: const Offset(0, 4),
                ),
              ],
            ),
            padding: const EdgeInsets.all(32.0),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisSize: MainAxisSize.min,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Text('Patient Details', style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold)),
                    _EmergencyToggle(
                      isEmergency: _isEmergency,
                      onChanged: (val) {
                        setState(() {
                          _isEmergency = val;
                        });
                      },
                    ),
                  ],
                ),
                const SizedBox(height: 24),
                
                // Form Fields
                _CustomTextField(label: 'Full Name', hint: 'John Doe', icon: Icons.person_outline),
                const SizedBox(height: 16),
                _CustomTextField(label: 'Phone Number', hint: '+1 234 567 8900', icon: Icons.phone_outlined, keyboardType: TextInputType.phone),
                const SizedBox(height: 16),
                
                Row(
                  children: [
                    Expanded(child: _CustomTextField(label: 'Age', hint: '35', keyboardType: TextInputType.number)),
                    const SizedBox(width: 16),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text('Gender', style: TextStyle(fontSize: 14, fontWeight: FontWeight.w600, color: Color(0xFF475569))),
                          const SizedBox(height: 8),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 12),
                            decoration: BoxDecoration(
                              border: Border.all(color: const Color(0xFFE2E8F0)),
                              borderRadius: BorderRadius.circular(12),
                              color: const Color(0xFFF8FAFC),
                            ),
                            child: DropdownButtonHideUnderline(
                              child: DropdownButton<String>(
                                isExpanded: true,
                                value: 'Male',
                                items: ['Male', 'Female', 'Other'].map((String value) {
                                  return DropdownMenuItem<String>(
                                    value: value,
                                    child: Text(value),
                                  );
                                }).toList(),
                                onChanged: (_) {},
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 24),
                
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text('Assign Doctor', style: TextStyle(fontSize: 14, fontWeight: FontWeight.w600, color: Color(0xFF475569))),
                    const SizedBox(height: 8),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
                      decoration: BoxDecoration(
                        border: Border.all(color: const Color(0xFFE2E8F0)),
                        borderRadius: BorderRadius.circular(12),
                        color: const Color(0xFFF8FAFC),
                      ),
                      child: DropdownButtonHideUnderline(
                        child: DropdownButton<String>(
                          isExpanded: true,
                          value: 'Dr. Smith (Cardiology)',
                          items: ['Dr. Smith (Cardiology)', 'Dr. Jane (General)', 'First Available'].map((String value) {
                            return DropdownMenuItem<String>(
                              value: value,
                              child: Text(value, style: const TextStyle(fontWeight: FontWeight.w500)),
                            );
                          }).toList(),
                          onChanged: (_) {},
                        ),
                      ),
                    ),
                  ],
                ),

                const SizedBox(height: 32),
                
                SizedBox(
                  width: double.infinity,
                  height: 56,
                  child: ElevatedButton(
                    onPressed: () {
                      _showTokenDialog(context, _isEmergency);
                    },
                    style: ElevatedButton.styleFrom(
                      backgroundColor: _isEmergency ? const Color(0xFFEF4444) : const Color(0xFF14B8A6),
                      foregroundColor: Colors.white,
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                      elevation: 0,
                    ),
                    child: Text(
                      _isEmergency ? 'Generate Emergency Token' : 'Generate Queue Token',
                      style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  void _showTokenDialog(BuildContext context, bool isEmergency) {
    showDialog(
      context: context,
      builder: (context) {
        return Dialog(
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(24)),
          child: Padding(
            padding: const EdgeInsets.all(32.0),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                const Icon(Icons.check_circle, color: Color(0xFF10B981), size: 64),
                const SizedBox(height: 16),
                const Text('Registration Successful', style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold)),
                const SizedBox(height: 24),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 32, vertical: 16),
                  decoration: BoxDecoration(
                    color: isEmergency ? const Color(0xFFFEF2F2) : const Color(0xFFF0FDFA),
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(color: isEmergency ? const Color(0xFFFCA5A5) : const Color(0xFF99F6E4)),
                  ),
                  child: Column(
                    children: [
                      Text('Your Token Number', style: TextStyle(color: Colors.grey[600], fontSize: 14)),
                      Text(
                        isEmergency ? 'E-01' : 'W-14',
                        style: TextStyle(
                          fontSize: 48,
                          fontWeight: FontWeight.bold,
                          color: isEmergency ? const Color(0xFFEF4444) : const Color(0xFF0D9488),
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 32),
                SizedBox(
                  width: double.infinity,
                  height: 48,
                  child: ElevatedButton(
                    onPressed: () => Navigator.pop(context),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFF0F172A),
                      foregroundColor: Colors.white,
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                    ),
                    child: const Text('Print Receipt & Close'),
                  ),
                ),
              ],
            ),
          ),
        );
      },
    );
  }
}

class _CustomTextField extends StatelessWidget {
  final String label;
  final String hint;
  final IconData? icon;
  final TextInputType keyboardType;

  const _CustomTextField({
    required this.label,
    required this.hint,
    this.icon,
    this.keyboardType = TextInputType.text,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(label, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w600, color: Color(0xFF475569))),
        const SizedBox(height: 8),
        TextField(
          keyboardType: keyboardType,
          decoration: InputDecoration(
            hintText: hint,
            hintStyle: TextStyle(color: Colors.grey[400]),
            prefixIcon: icon != null ? Icon(icon, color: Colors.grey[400]) : null,
            filled: true,
            fillColor: const Color(0xFFF8FAFC),
            border: OutlineInputBorder(
              borderRadius: BorderRadius.circular(12),
              borderSide: const BorderSide(color: Color(0xFFE2E8F0)),
            ),
            enabledBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(12),
              borderSide: const BorderSide(color: Color(0xFFE2E8F0)),
            ),
            focusedBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(12),
              borderSide: const BorderSide(color: Color(0xFF14B8A6), width: 2),
            ),
          ),
        ),
      ],
    );
  }
}

class _EmergencyToggle extends StatelessWidget {
  final bool isEmergency;
  final ValueChanged<bool> onChanged;

  const _EmergencyToggle({required this.isEmergency, required this.onChanged});

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: () => onChanged(!isEmergency),
      borderRadius: BorderRadius.circular(30),
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 300),
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
        decoration: BoxDecoration(
          color: isEmergency ? const Color(0xFFFEF2F2) : Colors.grey[100],
          borderRadius: BorderRadius.circular(30),
          border: Border.all(color: isEmergency ? const Color(0xFFFCA5A5) : Colors.grey[300]!),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(
              isEmergency ? Icons.warning_rounded : Icons.local_hospital_outlined,
              size: 16,
              color: isEmergency ? const Color(0xFFEF4444) : Colors.grey[600],
            ),
            const SizedBox(width: 6),
            Text(
              'Emergency',
              style: TextStyle(
                fontSize: 12,
                fontWeight: FontWeight.bold,
                color: isEmergency ? const Color(0xFFEF4444) : Colors.grey[600],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
