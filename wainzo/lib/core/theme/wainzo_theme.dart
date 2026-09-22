import 'package:flutter/cupertino.dart' show CupertinoPageTransitionsBuilder;
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import 'wainzo_colors.dart';
import 'wainzo_tokens.dart';
import 'wainzo_typography.dart';

/// Wainzo ships one theme.
///
/// This is a product decision, not an omission: the map and full-bleed media
/// are designed against a near-black ground, and a light variant would change
/// what the map *means* (a lit country on a pale map reads as a stain). The
/// theme is installed as both [ThemeData] slots so a device set to light mode
/// still gets the designed product.
abstract final class WainzoTheme {
  static ThemeData build() {
    const ColorScheme scheme = ColorScheme.dark(
      primary: WainzoColors.accent,
      onPrimary: WainzoColors.onAccent,
      secondary: WainzoColors.accent,
      onSecondary: WainzoColors.onAccent,
      surface: WainzoColors.surface,
      onSurface: WainzoColors.ink,
      error: WainzoColors.danger,
      onError: WainzoColors.onAccent,
      outline: WainzoColors.hairlineStrong,
    );

    final TextTheme text = const TextTheme(
      displayLarge: WainzoTypography.display,
      displayMedium: WainzoTypography.headline,
      headlineMedium: WainzoTypography.headline,
      headlineSmall: WainzoTypography.headlineSmall,
      titleLarge: WainzoTypography.title,
      titleMedium: WainzoTypography.titleSmall,
      bodyLarge: WainzoTypography.body,
      bodyMedium: WainzoTypography.bodyMuted,
      bodySmall: WainzoTypography.caption,
      labelLarge: WainzoTypography.button,
      labelMedium: WainzoTypography.label,
      labelSmall: WainzoTypography.overline,
    ).apply(fontFamily: WainzoTypography.sans);

    return ThemeData(
      useMaterial3: true,
      brightness: Brightness.dark,
      colorScheme: scheme,
      scaffoldBackgroundColor: WainzoColors.ground,
      canvasColor: WainzoColors.ground,
      fontFamily: WainzoTypography.sans,
      textTheme: text,
      splashFactory: InkSparkle.splashFactory,
      // A near-black ground turns a Material shadow into a smudge. Surfaces are
      // told apart by a hairline and a tint instead.
      shadowColor: Colors.transparent,
      dividerTheme: const DividerThemeData(
        color: WainzoColors.hairline,
        thickness: 1,
        space: 1,
      ),
      appBarTheme: const AppBarTheme(
        backgroundColor: Colors.transparent,
        surfaceTintColor: Colors.transparent,
        elevation: 0,
        scrolledUnderElevation: 0,
        centerTitle: false,
        titleTextStyle: WainzoTypography.title,
        iconTheme: IconThemeData(color: WainzoColors.ink, size: 22),
        systemOverlayStyle: SystemUiOverlayStyle(
          statusBarColor: Colors.transparent,
          statusBarIconBrightness: Brightness.light,
          statusBarBrightness: Brightness.dark,
        ),
      ),
      bottomSheetTheme: const BottomSheetThemeData(
        backgroundColor: WainzoColors.surface,
        surfaceTintColor: Colors.transparent,
        modalBackgroundColor: WainzoColors.surface,
        showDragHandle: true,
        dragHandleColor: WainzoColors.hairlineStrong,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.vertical(top: Radius.circular(Radii.xl)),
        ),
      ),
      dialogTheme: const DialogThemeData(
        backgroundColor: WainzoColors.surface,
        surfaceTintColor: Colors.transparent,
        titleTextStyle: WainzoTypography.title,
        contentTextStyle: WainzoTypography.bodyMuted,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.all(Radius.circular(Radii.lg)),
        ),
      ),
      snackBarTheme: const SnackBarThemeData(
        backgroundColor: WainzoColors.surfaceHigh,
        contentTextStyle: WainzoTypography.label,
        behavior: SnackBarBehavior.floating,
        showCloseIcon: false,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.all(Radius.circular(Radii.md)),
        ),
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: WainzoColors.surfaceRaised,
        hintStyle: WainzoTypography.body.copyWith(color: WainzoColors.inkFaint),
        contentPadding: const EdgeInsets.symmetric(
          horizontal: Insets.lg,
          vertical: Insets.lg,
        ),
        border: _fieldBorder(WainzoColors.hairline),
        enabledBorder: _fieldBorder(WainzoColors.hairline),
        focusedBorder: _fieldBorder(WainzoColors.accentEdge),
        errorBorder: _fieldBorder(WainzoColors.danger),
        focusedErrorBorder: _fieldBorder(WainzoColors.danger),
      ),
      iconTheme: const IconThemeData(color: WainzoColors.ink, size: 22),
      progressIndicatorTheme: const ProgressIndicatorThemeData(
        color: WainzoColors.accent,
        linearTrackColor: WainzoColors.surfaceHigh,
        circularTrackColor: Colors.transparent,
      ),
      pageTransitionsTheme: const PageTransitionsTheme(
        builders: <TargetPlatform, PageTransitionsBuilder>{
          TargetPlatform.android: FadeForwardsPageTransitionsBuilder(),
          TargetPlatform.iOS: CupertinoPageTransitionsBuilder(),
        },
      ),
    );
  }

  static OutlineInputBorder _fieldBorder(Color color) => OutlineInputBorder(
    borderRadius: BorderRadius.circular(Radii.md),
    borderSide: BorderSide(color: color),
  );
}
