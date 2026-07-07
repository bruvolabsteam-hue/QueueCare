import 'package:flutter/material.dart';

/// Medical-themed color palette for OmniCare AI
/// Uses Teal/Cyan as primary with complementary medical colors
class AppColors {
  AppColors._();

  // ─── Primary Palette ────────────────────────────────────────────────
  static const Color primary = Color(0xFF0097A7);
  static const Color primaryLight = Color(0xFF56C8D8);
  static const Color primaryDark = Color(0xFF006978);
  static const Color primaryContainer = Color(0xFFB2EBF2);
  static const Color onPrimaryContainer = Color(0xFF002022);

  // ─── Secondary Palette ──────────────────────────────────────────────
  static const Color secondary = Color(0xFF00BCD4);
  static const Color secondaryLight = Color(0xFF62EFFF);
  static const Color secondaryDark = Color(0xFF008BA3);
  static const Color secondaryContainer = Color(0xFFCEF8FF);
  static const Color onSecondaryContainer = Color(0xFF001F24);

  // ─── Accent / Tertiary ─────────────────────────────────────────────
  static const Color accent = Color(0xFF26A69A);
  static const Color accentLight = Color(0xFF64D8CB);
  static const Color accentDark = Color(0xFF00766C);

  // ─── Semantic Colors ───────────────────────────────────────────────
  static const Color success = Color(0xFF4CAF50);
  static const Color successLight = Color(0xFFE8F5E9);
  static const Color successDark = Color(0xFF2E7D32);

  static const Color warning = Color(0xFFFFA726);
  static const Color warningLight = Color(0xFFFFF3E0);
  static const Color warningDark = Color(0xFFF57C00);

  static const Color error = Color(0xFFEF5350);
  static const Color errorLight = Color(0xFFFFEBEE);
  static const Color errorDark = Color(0xFFC62828);

  static const Color info = Color(0xFF42A5F5);
  static const Color infoLight = Color(0xFFE3F2FD);
  static const Color infoDark = Color(0xFF1565C0);

  // ─── Light Theme Surface Colors ─────────────────────────────────────
  static const Color backgroundLight = Color(0xFFF5F9FA);
  static const Color surfaceLight = Color(0xFFFFFFFF);
  static const Color surfaceVariantLight = Color(0xFFF0F4F5);
  static const Color cardLight = Color(0xFFFFFFFF);
  static const Color dividerLight = Color(0xFFE0E6E8);
  static const Color shimmerBaseLight = Color(0xFFE0E0E0);
  static const Color shimmerHighlightLight = Color(0xFFF5F5F5);

  // ─── Dark Theme Surface Colors ──────────────────────────────────────
  static const Color backgroundDark = Color(0xFF0F1A1C);
  static const Color surfaceDark = Color(0xFF1A2C2E);
  static const Color surfaceVariantDark = Color(0xFF243638);
  static const Color cardDark = Color(0xFF1E3032);
  static const Color dividerDark = Color(0xFF2E4446);
  static const Color shimmerBaseDark = Color(0xFF2A3C3E);
  static const Color shimmerHighlightDark = Color(0xFF344A4C);

  // ─── Text Colors ───────────────────────────────────────────────────
  static const Color textPrimaryLight = Color(0xFF1A2C2E);
  static const Color textSecondaryLight = Color(0xFF5A6E70);
  static const Color textTertiaryLight = Color(0xFF8A9A9C);
  static const Color textDisabledLight = Color(0xFFBCC8CA);

  static const Color textPrimaryDark = Color(0xFFE8F0F0);
  static const Color textSecondaryDark = Color(0xFFAABCBE);
  static const Color textTertiaryDark = Color(0xFF7A8E90);
  static const Color textDisabledDark = Color(0xFF4A5C5E);

  // ─── Status-specific Colors ─────────────────────────────────────────
  static const Color doctorAvailable = Color(0xFF4CAF50);
  static const Color doctorBusy = Color(0xFFFFA726);
  static const Color doctorOffline = Color(0xFF9E9E9E);
  static const Color doctorBreak = Color(0xFF42A5F5);

  static const Color appointmentScheduled = Color(0xFF42A5F5);
  static const Color appointmentConfirmed = Color(0xFF26A69A);
  static const Color appointmentCompleted = Color(0xFF4CAF50);
  static const Color appointmentCancelled = Color(0xFFEF5350);
  static const Color appointmentNoShow = Color(0xFF9E9E9E);

  static const Color tokenWaiting = Color(0xFF42A5F5);
  static const Color tokenInProgress = Color(0xFFFFA726);
  static const Color tokenCompleted = Color(0xFF4CAF50);
  static const Color tokenSkipped = Color(0xFF9E9E9E);
  static const Color tokenEmergency = Color(0xFFEF5350);

  // ─── Gradient Definitions ──────────────────────────────────────────
  static const LinearGradient primaryGradient = LinearGradient(
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
    colors: [primary, secondary],
  );

  static const LinearGradient accentGradient = LinearGradient(
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
    colors: [accent, primary],
  );

  static const LinearGradient darkGradient = LinearGradient(
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
    colors: [Color(0xFF0D2B2E), Color(0xFF1A3C3E)],
  );

  static const LinearGradient cardGradientLight = LinearGradient(
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
    colors: [Color(0xFFFFFFFF), Color(0xFFF5FAFB)],
  );

  static const LinearGradient cardGradientDark = LinearGradient(
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
    colors: [Color(0xFF1E3032), Color(0xFF243638)],
  );

  static const LinearGradient splashGradient = LinearGradient(
    begin: Alignment.topCenter,
    end: Alignment.bottomCenter,
    colors: [Color(0xFF006978), Color(0xFF0097A7), Color(0xFF00BCD4)],
  );
}
