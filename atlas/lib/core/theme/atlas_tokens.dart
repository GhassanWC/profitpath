import 'package:flutter/animation.dart';

/// Spacing, rounding and motion.
///
/// Every dimension in the app comes from here so that a screen can be retuned
/// in one place, and so that nothing is hard-coded against one phone size.
abstract final class Insets {
  static const double xs = 4;
  static const double sm = 8;
  static const double md = 12;
  static const double lg = 16;
  static const double xl = 24;
  static const double xxl = 32;
  static const double xxxl = 48;

  /// The side gutter every screen shares.
  static const double gutter = 20;
}

/// Rounding steps with the shape's own footprint, and a shape nested inside
/// another steps down a tier so the ring of space around it stays even. Full
/// rounding is for things that are pills by nature — never for a card.
abstract final class Radii {
  static const double xs = 6;
  static const double sm = 10;
  static const double md = 14;
  static const double lg = 20;
  static const double xl = 28;
  static const double pill = 999;
}

/// Motion. Skip has to feel like nothing happened; watch has to feel like the
/// card opened. Those two numbers are the whole feel of the product.
abstract final class Motion {
  /// Instant feedback: a press, a chip toggling.
  static const Duration fast = Duration(milliseconds: 120);

  /// Skip. Deliberately shorter than a page transition — the next card is
  /// already built and waiting underneath.
  static const Duration skip = Duration(milliseconds: 170);

  /// The default for a state change the eye should follow.
  static const Duration base = Duration(milliseconds: 260);

  /// Watch: the card opening into the player.
  static const Duration watch = Duration(milliseconds: 420);

  /// Flying the map to a country.
  static const Duration flight = Duration(milliseconds: 620);

  static const Curve enter = Curves.easeOutCubic;
  static const Curve exit = Curves.easeInCubic;
  static const Curve emphasis = Curves.easeOutQuint;
}
