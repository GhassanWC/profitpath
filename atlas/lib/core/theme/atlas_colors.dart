import 'package:flutter/material.dart';

/// The palette.
///
/// Atlas is dark-first because the product is a lit map and full-bleed media:
/// a dark ground lets a country light up and lets a photograph be the brightest
/// thing on the screen. There is exactly one accent — amber, the colour of a
/// place lit up on a night map. It marks the primary action, the active tab and
/// activity on the map, and nothing else. Category colours exist, but only ever
/// appear as a 6px dot.
abstract final class AtlasColors {
  // --- grounds and surfaces -------------------------------------------------

  /// The app background. Cold near-black, so media reads as warm against it.
  static const Color ground = Color(0xFF06080C);

  /// A sheet resting on the ground: cards, sheets, the nav bar.
  static const Color surface = Color(0xFF0D1117);

  /// A surface resting on a surface: input fields, chips, the media well.
  static const Color surfaceRaised = Color(0xFF141A23);

  /// The highest surface — selected chips, hovered rows.
  static const Color surfaceHigh = Color(0xFF1D2530);

  /// Scrim behind modal sheets and the fullscreen player's chrome.
  static const Color scrim = Color(0xCC03050A);

  // --- rules ----------------------------------------------------------------

  /// A surface is told apart from the ground by a hairline and a tint, never a
  /// shadow. Shadows on a near-black ground read as smudges.
  static const Color hairline = Color(0x14FFFFFF);
  static const Color hairlineStrong = Color(0x24FFFFFF);

  // --- ink ------------------------------------------------------------------

  static const Color ink = Color(0xFFF3F6FA);
  static const Color inkMuted = Color(0xFF9AA6B6);
  static const Color inkFaint = Color(0xFF69737F);

  /// Text drawn on top of [accent].
  static const Color onAccent = Color(0xFF130C03);

  // --- accent ---------------------------------------------------------------

  static const Color accent = Color(0xFFFFB35C);
  static const Color accentSoft = Color(0x1FFFB35C);
  static const Color accentEdge = Color(0x52FFB35C);

  // --- map ------------------------------------------------------------------

  static const Color ocean = Color(0xFF070A10);
  static const Color graticule = Color(0x0DFFFFFF);
  static const Color land = Color(0xFF161D28);
  static const Color landStroke = Color(0xFF283242);

  /// A country that has content the viewer is eligible to see.
  static const Color landActive = Color(0xFF223041);

  // --- status ---------------------------------------------------------------

  static const Color positive = Color(0xFF64D9A5);
  static const Color warning = Color(0xFFFFC978);
  static const Color danger = Color(0xFFFF7A6E);

  /// Category dots. Muted on purpose — these are markers, not decoration, and
  /// the map owns the only saturated colour on screen.
  static const List<Color> categorySwatches = <Color>[
    Color(0xFF7FB3FF), // blues
    Color(0xFF9B8CFF),
    Color(0xFFE58FC0),
    Color(0xFFFF9F7A), // warms
    Color(0xFFFFC978),
    Color(0xFFD7D07F),
    Color(0xFF8FD6A8), // greens
    Color(0xFF7FD3C8),
  ];
}
