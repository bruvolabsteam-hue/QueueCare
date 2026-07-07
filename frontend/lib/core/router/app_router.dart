import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../providers/auth_provider.dart';
import '../../screens/splash/splash_screen.dart';
import '../../screens/auth/login_screen.dart';
import '../../screens/dashboard/dashboard_screen.dart';
import '../../screens/appointments/appointments_screen.dart';
import '../../screens/queue/queue_management_screen.dart';
import '../../screens/queue/patient_queue_status_screen.dart';
import '../../screens/walkin/walkin_registration_screen.dart';
import '../../screens/doctors/doctors_screen.dart';
import '../../screens/settings/settings_screen.dart';
import '../../screens/reports/reports_screen.dart';
import '../../screens/admin/admin_panel_screen.dart';
import '../../screens/ai_receptionist/ai_receptionist_screen.dart';
import '../../screens/ai_receptionist/call_log_screen.dart';
import '../../screens/ai_receptionist/ai_conversation_detail_screen.dart';
import '../../screens/reminders/reminders_screen.dart';
import '../../screens/whatsapp/whatsapp_screen.dart';
import '../../features/reception/screens/checkin_dashboard.dart';

final routerProvider = Provider<GoRouter>((ref) {
  final authState = ref.watch(authProvider);

  return GoRouter(
    initialLocation: '/splash',
    debugLogDiagnostics: false,
    redirect: (context, state) {
      final isAuthenticated = authState is AuthAuthenticated;
      final isLoading = authState is AuthLoading;
      final isSplash = state.matchedLocation == '/splash';
      final isLogin = state.matchedLocation == '/login';
      final isPatientQueue = state.matchedLocation == '/queue-status';

      // Allow splash and patient-facing queue to load without auth
      if (isSplash || isPatientQueue) return null;

      // While checking auth, stay on splash
      if (isLoading) return '/splash';

      // Not authenticated? Go to login
      if (!isAuthenticated && !isLogin) return '/login';

      // Authenticated but on login? Go to dashboard
      if (isAuthenticated && isLogin) return '/dashboard';

      return null;
    },
    routes: [
      GoRoute(
        path: '/splash',
        name: 'splash',
        builder: (context, state) => const SplashScreen(),
      ),
      GoRoute(
        path: '/login',
        name: 'login',
        builder: (context, state) => const LoginScreen(),
      ),
      GoRoute(
        path: '/queue-status',
        name: 'queue-status',
        builder: (context, state) => PatientQueueStatusScreen(
          tokenId: state.uri.queryParameters['tokenId'],
        ),
      ),
      ShellRoute(
        builder: (context, state, child) =>
            _AppShell(state: state, child: child),
        routes: [
          GoRoute(
            path: '/dashboard',
            name: 'dashboard',
            builder: (context, state) => const DashboardScreen(),
          ),
          GoRoute(
            path: '/appointments',
            name: 'appointments',
            builder: (context, state) => const AppointmentsScreen(),
          ),
          GoRoute(
            path: '/queue',
            name: 'queue',
            builder: (context, state) => const QueueManagementScreen(),
          ),
          GoRoute(
            path: '/walkin',
            name: 'walkin',
            builder: (context, state) => const WalkInRegistrationScreen(),
          ),
          GoRoute(
            path: '/doctors',
            name: 'doctors',
            builder: (context, state) => const DoctorsScreen(),
          ),
          GoRoute(
            path: '/settings',
            name: 'settings',
            builder: (context, state) => const SettingsScreen(),
          ),
          GoRoute(
            path: '/reports',
            name: 'reports',
            builder: (context, state) => const ReportsScreen(),
          ),
          GoRoute(
            path: '/admin',
            name: 'admin',
            builder: (context, state) => const AdminPanelScreen(),
          ),
          GoRoute(
            path: '/ai-receptionist',
            name: 'ai-receptionist',
            builder: (context, state) => const AIReceptionistScreen(),
            routes: [
              GoRoute(
                path: 'calls',
                name: 'call-logs',
                builder: (context, state) => const CallLogScreen(),
              ),
              GoRoute(
                path: 'conversation/:id',
                name: 'conversation-detail',
                builder: (context, state) => AIConversationDetailScreen(
                  conversationId: state.pathParameters['id']!,
                ),
              ),
            ],
          ),
          GoRoute(
            path: '/reminders',
            name: 'reminders',
            builder: (context, state) => const RemindersScreen(),
          ),
          GoRoute(
            path: '/whatsapp',
            name: 'whatsapp',
            builder: (context, state) => const WhatsAppScreen(),
          ),
          GoRoute(
            path: '/checkin',
            name: 'checkin',
            builder: (context, state) {
              // Ensure we import this file dynamically or at the top
              // Since we didn't add it to imports, I'll use a relative path
              return const CheckInDashboard();
            },
          ),
        ],
      ),
    ],
    errorBuilder: (context, state) => _ErrorPage(error: state.error),
  );
});

/// Main app shell with responsive NavigationRail (desktop/tablet) and BottomNavigationBar (mobile)
class _AppShell extends StatelessWidget {
  final GoRouterState state;
  final Widget child;

  const _AppShell({required this.state, required this.child});

  int _selectedIndex(String location) {
    if (location.startsWith('/dashboard')) return 0;
    if (location.startsWith('/appointments')) return 1;
    if (location.startsWith('/queue')) return 2;
    if (location.startsWith('/doctors')) return 3;
    if (location.startsWith('/walkin')) return 4;
    if (location.startsWith('/ai-receptionist')) return 5;
    if (location.startsWith('/reminders')) return 6;
    if (location.startsWith('/whatsapp')) return 7;
    if (location.startsWith('/reports')) return 8;
    if (location.startsWith('/admin')) return 9;
    if (location.startsWith('/settings')) return 10;
    return 0;
  }

  static const _destinations = [
    NavigationDestination(
      icon: Icon(Icons.dashboard_outlined),
      selectedIcon: Icon(Icons.dashboard),
      label: 'Dashboard',
    ),
    NavigationDestination(
      icon: Icon(Icons.calendar_month_outlined),
      selectedIcon: Icon(Icons.calendar_month),
      label: 'Appointments',
    ),
    NavigationDestination(
      icon: Icon(Icons.queue_outlined),
      selectedIcon: Icon(Icons.queue),
      label: 'Queue',
    ),
    NavigationDestination(
      icon: Icon(Icons.medical_services_outlined),
      selectedIcon: Icon(Icons.medical_services),
      label: 'Doctors',
    ),
    NavigationDestination(
      icon: Icon(Icons.person_add_outlined),
      selectedIcon: Icon(Icons.person_add),
      label: 'Walk-In',
    ),
  ];

  static const _railDestinations = [
    NavigationRailDestination(
      icon: Icon(Icons.dashboard_outlined),
      selectedIcon: Icon(Icons.dashboard),
      label: Text('Dashboard'),
    ),
    NavigationRailDestination(
      icon: Icon(Icons.calendar_month_outlined),
      selectedIcon: Icon(Icons.calendar_month),
      label: Text('Appointments'),
    ),
    NavigationRailDestination(
      icon: Icon(Icons.queue_outlined),
      selectedIcon: Icon(Icons.queue),
      label: Text('Queue'),
    ),
    NavigationRailDestination(
      icon: Icon(Icons.medical_services_outlined),
      selectedIcon: Icon(Icons.medical_services),
      label: Text('Doctors'),
    ),
    NavigationRailDestination(
      icon: Icon(Icons.person_add_outlined),
      selectedIcon: Icon(Icons.person_add),
      label: Text('Walk-In'),
    ),
    NavigationRailDestination(
      icon: Icon(Icons.smart_toy_outlined),
      selectedIcon: Icon(Icons.smart_toy),
      label: Text('AI'),
    ),
    NavigationRailDestination(
      icon: Icon(Icons.notifications_outlined),
      selectedIcon: Icon(Icons.notifications),
      label: Text('Reminders'),
    ),
    NavigationRailDestination(
      icon: Icon(Icons.chat_outlined),
      selectedIcon: Icon(Icons.chat),
      label: Text('WhatsApp'),
    ),
    NavigationRailDestination(
      icon: Icon(Icons.bar_chart_outlined),
      selectedIcon: Icon(Icons.bar_chart),
      label: Text('Reports'),
    ),
    NavigationRailDestination(
      icon: Icon(Icons.admin_panel_settings_outlined),
      selectedIcon: Icon(Icons.admin_panel_settings),
      label: Text('Admin'),
    ),
    NavigationRailDestination(
      icon: Icon(Icons.settings_outlined),
      selectedIcon: Icon(Icons.settings),
      label: Text('Settings'),
    ),
  ];

  void _onDestinationSelected(BuildContext context, int index) {
    switch (index) {
      case 0:
        context.go('/dashboard');
      case 1:
        context.go('/appointments');
      case 2:
        context.go('/queue');
      case 3:
        context.go('/doctors');
      case 4:
        context.go('/walkin');
      case 5:
        context.go('/ai-receptionist');
      case 6:
        context.go('/reminders');
      case 7:
        context.go('/whatsapp');
      case 8:
        context.go('/reports');
      case 9:
        context.go('/admin');
      case 10:
        context.go('/settings');
    }
  }

  @override
  Widget build(BuildContext context) {
    final width = MediaQuery.of(context).size.width;
    final isDesktop = width >= 1100;
    final isTablet = width >= 768 && width < 1100;
    final isMobile = width < 768;
    final currentIndex = _selectedIndex(state.matchedLocation);

    if (isMobile) {
      return Scaffold(
        body: child,
        bottomNavigationBar: NavigationBar(
          selectedIndex: currentIndex.clamp(0, 4),
          onDestinationSelected: (i) => _onDestinationSelected(context, i),
          destinations: _destinations,
          height: 72,
          animationDuration: const Duration(milliseconds: 400),
        ),
      );
    }

    return Scaffold(
      body: Row(
        children: [
          NavigationRail(
            selectedIndex: currentIndex.clamp(0, _railDestinations.length - 1),
            onDestinationSelected: (i) => _onDestinationSelected(context, i),
            extended: isDesktop,
            minWidth: 72,
            minExtendedWidth: 200,
            destinations: _railDestinations,
            leading: Padding(
              padding: const EdgeInsets.symmetric(vertical: 12),
              child: isDesktop
                  ? Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(Icons.local_hospital,
                            color: Theme.of(context).colorScheme.primary,
                            size: 28),
                        const SizedBox(width: 12),
                        Text(
                          'OmniCare',
                          style:
                              Theme.of(context).textTheme.titleMedium?.copyWith(
                                    color:
                                        Theme.of(context).colorScheme.primary,
                                    fontWeight: FontWeight.w700,
                                  ),
                        ),
                      ],
                    )
                  : Icon(Icons.local_hospital,
                      color: Theme.of(context).colorScheme.primary, size: 28),
            ),
          ),
          if (!isMobile)
            VerticalDivider(
              thickness: 1,
              width: 1,
              color: Theme.of(context).dividerColor,
            ),
          Expanded(child: child),
        ],
      ),
    );
  }
}

/// Error page for unknown routes
class _ErrorPage extends StatelessWidget {
  final Exception? error;

  const _ErrorPage({this.error});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              Icons.error_outline,
              size: 80,
              color: Theme.of(context).colorScheme.error,
            ),
            const SizedBox(height: 24),
            Text(
              'Page Not Found',
              style: Theme.of(context).textTheme.headlineMedium,
            ),
            const SizedBox(height: 12),
            Text(
              'The page you are looking for does not exist.',
              style: Theme.of(context).textTheme.bodyMedium,
            ),
            const SizedBox(height: 24),
            ElevatedButton.icon(
              onPressed: () => context.go('/dashboard'),
              icon: const Icon(Icons.home),
              label: const Text('Go to Dashboard'),
            ),
          ],
        ),
      ),
    );
  }
}
