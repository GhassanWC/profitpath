/// Small formatting helpers. Deliberately hand-rolled rather than pulling in a
/// localisation package the MVP does not otherwise need.
abstract final class Format {
  /// `12400` -> `12.4K`. Used for post counts, never for a metric the product
  /// wants people to optimise against.
  static String compact(int value) {
    if (value < 0) return '-${compact(-value)}';
    if (value < 1000) return '$value';
    if (value < 1000000) {
      final double k = value / 1000;
      return k < 10 ? '${_oneDecimal(k)}K' : '${k.round()}K';
    }
    final double m = value / 1000000;
    return m < 10 ? '${_oneDecimal(m)}M' : '${m.round()}M';
  }

  static String _oneDecimal(double v) {
    final String s = v.toStringAsFixed(1);
    return s.endsWith('.0') ? s.substring(0, s.length - 2) : s;
  }

  /// `Duration(seconds: 95)` -> `1:35`.
  static String clock(Duration d) {
    final int total = d.inSeconds.clamp(0, 359999);
    final int minutes = total ~/ 60;
    final int seconds = total % 60;
    if (minutes < 60) {
      return '$minutes:${seconds.toString().padLeft(2, '0')}';
    }
    final int hours = minutes ~/ 60;
    return '$hours:${(minutes % 60).toString().padLeft(2, '0')}:'
        '${seconds.toString().padLeft(2, '0')}';
  }

  /// `Duration(seconds: 35)` -> `35-second`. Reads inside an AI preview
  /// sentence: "This 35-second video shows...".
  static String spokenLength(Duration d) {
    if (d.inSeconds < 60) return '${d.inSeconds}-second';
    final int minutes = (d.inSeconds / 60).round();
    return '$minutes-minute';
  }

  /// Short relative time: `now`, `4m`, `3h`, `2d`, `6w`, `1y`.
  static String relative(DateTime then, {DateTime? now}) {
    final Duration d = (now ?? DateTime.now()).difference(then);
    if (d.inSeconds < 45) return 'now';
    if (d.inMinutes < 60) return '${d.inMinutes}m';
    if (d.inHours < 24) return '${d.inHours}h';
    if (d.inDays < 7) return '${d.inDays}d';
    if (d.inDays < 365) return '${(d.inDays / 7).floor()}w';
    return '${(d.inDays / 365).floor()}y';
  }

  /// Joins a list the way a sentence would: `a, b and c`.
  static String list(Iterable<String> parts) {
    final List<String> items = parts.toList(growable: false);
    if (items.isEmpty) return '';
    if (items.length == 1) return items.single;
    return '${items.sublist(0, items.length - 1).join(', ')} and ${items.last}';
  }
}
