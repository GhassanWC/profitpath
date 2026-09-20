import 'package:flutter/cupertino.dart' show CupertinoPageTransitionsBuilder;
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import 'atlas_colors.dart';
import 'atlas_tokens.dart';
import 'atlas_typography.dart';

/// Atlas ships one theme.
///
/// This is a product decision, not an omission: the map and full-bleed media
/// are designed against a near-black ground, and a light variant would change
/// what the map *means* (a lit country on a pale map reads as a stain). The
/// theme is installed as both [ThemeData] slots so a device set to light mode
/// still gets the designed product.
abstract final class AtlasTheme {
  static ThemeData build() {
    const ColorScheme scheme = ColorScheme.dark(
      primary: AtlasColors.accent,
      onPrimary: AtlasColors.onAccent,
      secondary: AtlasColors.accent,
      onSecondary: AtlasColors.onAccent,
      surface: AtlasColors.surface,
      onSurface: AtlasColors.ink,
      error: AtlasColors.danger,
      onError: AtlasColors.onAccent,
      outline: AtlasColors.hairlineStrong,
    );

    final TextTheme text = const TextTheme(
      displayLarge: AtlasTypography.display,
      displayMedium: AtlasTypography.headline,
      headlineMedium: AtlasTypography.headline,
      headlineSmall: AtlasTypography.headlineSmall,
      titleLarge: AtlasTypography.title,
      titleMedium: AtlasTypography.titleSmall,
      bodyLarge: AtlasTypography.body,
      bodyMedium: AtlasTypography.bodyMuted,
      bodySmall: AtlasTypography.caption,
      labelLarge: AtlasTypography.button,
      labelMedium: AtlasTypography.label,
      labelSmall: AtlasTypography.overline,
    ).apply(fontFamily: AtlasTypography.sans);

    return ThemeData(
      useMaterial3: true,
      brightness: Brightness.dark,
      colorScheme: scheme,
      scaffoldBackgroundColor: AtlasColors.ground,
      canvasColor: AtlasColors.ground,
      fontFamily: AtlasTypography.sans,
      textTheme: text,
      splashFactory: InkSparkle.splashFactory,
      // A near-black ground turns a Material shadow into a smudge. Surfaces are
      // told apart by a hairline and a tint instead.
      shadowColor: Colors.transparent,
      dividerTheme: const DividerThemeData(
        color: AtlasColors.hairline,
        thickness: 1,
        space: 1,
      ),
      appBarTheme: const AppBarTheme(
        backgroundColor: Colors.transparent,
        surfaceTintColor: Colors.transparent,
        elevation: 0,
        scrolledUnderElevation: 0,
        centerTitle: false,
        titleTextStyle: AtlasTypography.title,
        iconTheme: IconThemeData(color: AtlasColors.ink, size: 22),
        systemOverlayStyle: SystemUiOverlayStyle(
          statusBarColor: Colors.transparent,
          statusBarIconBrightness: Brightness.light,
          statusBarBrightness: Brightness.dark,
        ),
      ),
      bottomSheetTheme: const BottomSheetThemeData(
        backgroundColor: AtlasColors.surface,
        surfaceTintColor: Colors.transparent,
        modalBackgroundColor: AtlasColors.surface,
        showDragHandle: true,
        dragHandleColor: AtlasColors.hairlineStrong,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.vertical(top: Radius.circular(Radii.xl)),
        ),
      ),
      dialogTheme: const DialogThemeData(
        backgroundColor: AtlasColors.surface,
        surfaceTintColor: Colors.transparent,
        titleTextStyle: AtlasTypography.title,
        contentTextStyle: AtlasTypography.bodyMuted,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.all(Radius.circular(Radii.lg)),
        ),
      ),
      snackBarTheme: const SnackBarThemeData(
        backgroundColor: AtlasColors.surfaceHigh,
        contentTextStyle: AtlasTypography.label,
        behavior: SnackBarBehavior.floating,
        showCloseIcon: false,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.all(Radius.circular(Radii.md)),
        ),
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: AtlasColors.surfaceRaised,
        hintStyle: AtlasTypography.body.copyWith(color: AtlasColors.inkFaint),
        contentPadding: const EdgeInsets.symmetric(
          horizontal: Insets.lg,
          vertical: Insets.lg,
        ),
        border: _fieldBorder(AtlasColors.hairline),
        enabledBorder: _fieldBorder(AtlasColors.hairline),
        focusedBorder: _fieldBorder(AtlasColors.accentEdge),
        errorBorder: _fieldBorder(AtlasColors.danger),
        focusedErrorBorder: _fieldBorder(AtlasColors.danger),
      ),
      iconTheme: const IconThemeData(color: AtlasColors.ink, size: 22),
      progressIndicatorTheme: const ProgressIndicatorThemeData(
        color: AtlasColors.accent,
        linearTrackColor: AtlasColors.surfaceHigh,
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
