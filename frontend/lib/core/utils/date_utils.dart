import 'package:intl/intl.dart';

/// Date and time formatting utilities for OmniCare AI
class AppDateUtils {
  AppDateUtils._();

  static final DateFormat _dateFormat = DateFormat('MMM dd, yyyy');
  static final DateFormat _shortDateFormat = DateFormat('MMM dd');
  static final DateFormat _timeFormat = DateFormat('hh:mm a');
  static final DateFormat _time24Format = DateFormat('HH:mm');
  static final DateFormat _dateTimeFormat = DateFormat('MMM dd, yyyy • hh:mm a');
  static final DateFormat _dayFormat = DateFormat('EEEE');
  static final DateFormat _monthYearFormat = DateFormat('MMMM yyyy');
  static final DateFormat _isoFormat = DateFormat('yyyy-MM-dd');

  /// Format date as "Jan 15, 2024"
  static String formatDate(DateTime? date) {
    if (date == null) return '—';
    return _dateFormat.format(date);
  }

  /// Format date as "Jan 15"
  static String formatShortDate(DateTime? date) {
    if (date == null) return '—';
    return _shortDateFormat.format(date);
  }

  /// Format time as "02:30 PM"
  static String formatTime(DateTime? date) {
    if (date == null) return '—';
    return _timeFormat.format(date);
  }

  /// Format time as "14:30"
  static String formatTime24(DateTime? date) {
    if (date == null) return '—';
    return _time24Format.format(date);
  }

  /// Format time from string "14:30:00" to "02:30 PM"
  static String formatTimeString(String? time) {
    if (time == null || time.isEmpty) return '—';
    try {
      final parts = time.split(':');
      final hour = int.parse(parts[0]);
      final minute = int.parse(parts[1]);
      final dt = DateTime(2024, 1, 1, hour, minute);
      return _timeFormat.format(dt);
    } catch (_) {
      return time;
    }
  }

  /// Format as "Jan 15, 2024 • 02:30 PM"
  static String formatDateTime(DateTime? date) {
    if (date == null) return '—';
    return _dateTimeFormat.format(date);
  }

  /// Format as "Monday"
  static String formatDay(DateTime? date) {
    if (date == null) return '—';
    return _dayFormat.format(date);
  }

  /// Format as "January 2024"
  static String formatMonthYear(DateTime? date) {
    if (date == null) return '—';
    return _monthYearFormat.format(date);
  }

  /// Format as ISO "2024-01-15"
  static String formatIso(DateTime? date) {
    if (date == null) return '';
    return _isoFormat.format(date);
  }

  /// Returns relative time string like "2 hours ago", "just now"
  static String timeAgo(DateTime? date) {
    if (date == null) return '—';
    final now = DateTime.now();
    final diff = now.difference(date);

    if (diff.inSeconds < 30) return 'just now';
    if (diff.inSeconds < 60) return '${diff.inSeconds}s ago';
    if (diff.inMinutes < 60) return '${diff.inMinutes}m ago';
    if (diff.inHours < 24) return '${diff.inHours}h ago';
    if (diff.inDays < 7) return '${diff.inDays}d ago';
    if (diff.inDays < 30) return '${(diff.inDays / 7).floor()}w ago';
    if (diff.inDays < 365) return '${(diff.inDays / 30).floor()}mo ago';
    return '${(diff.inDays / 365).floor()}y ago';
  }

  /// Format duration in seconds to "HH:MM:SS" or "MM:SS"
  static String formatDuration(int? seconds) {
    if (seconds == null || seconds <= 0) return '00:00';
    final hours = seconds ~/ 3600;
    final minutes = (seconds % 3600) ~/ 60;
    final secs = seconds % 60;
    if (hours > 0) {
      return '${hours.toString().padLeft(2, '0')}:${minutes.toString().padLeft(2, '0')}:${secs.toString().padLeft(2, '0')}';
    }
    return '${minutes.toString().padLeft(2, '0')}:${secs.toString().padLeft(2, '0')}';
  }

  /// Format duration in seconds to human-readable "1h 23m" or "5m 30s"
  static String formatDurationHuman(int? seconds) {
    if (seconds == null || seconds <= 0) return '0s';
    final hours = seconds ~/ 3600;
    final minutes = (seconds % 3600) ~/ 60;
    final secs = seconds % 60;
    if (hours > 0) return '${hours}h ${minutes}m';
    if (minutes > 0) return '${minutes}m ${secs}s';
    return '${secs}s';
  }

  /// Format minutes to human-readable "~15 min" or "~1h 30min"
  static String formatMinutes(int? minutes) {
    if (minutes == null || minutes <= 0) return '< 1 min';
    if (minutes < 60) return '~$minutes min';
    final hours = minutes ~/ 60;
    final mins = minutes % 60;
    if (mins == 0) return '~${hours}h';
    return '~${hours}h ${mins}min';
  }

  /// Check if date is today
  static bool isToday(DateTime? date) {
    if (date == null) return false;
    final now = DateTime.now();
    return date.year == now.year &&
        date.month == now.month &&
        date.day == now.day;
  }

  /// Check if date is yesterday
  static bool isYesterday(DateTime? date) {
    if (date == null) return false;
    final yesterday = DateTime.now().subtract(const Duration(days: 1));
    return date.year == yesterday.year &&
        date.month == yesterday.month &&
        date.day == yesterday.day;
  }

  /// Get greeting based on time of day
  static String getGreeting() {
    final hour = DateTime.now().hour;
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  }
}
