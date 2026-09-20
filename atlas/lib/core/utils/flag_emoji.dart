/// Flags are derived, never stored.
///
/// A country's flag is its ISO 3166-1 alpha-2 code written in Unicode regional
/// indicator symbols, so there is no image to ship, no list to maintain, and no
/// way for a flag to drift out of step with the code it belongs to.
String flagEmojiFor(String isoAlpha2) {
  final String code = isoAlpha2.trim().toUpperCase();
  if (code.length != 2) return '';
  const int base = 0x1F1E6; // REGIONAL INDICATOR SYMBOL LETTER A
  final int first = code.codeUnitAt(0);
  final int second = code.codeUnitAt(1);
  if (first < 0x41 || first > 0x5A || second < 0x41 || second > 0x5A) return '';
  return String.fromCharCodes(<int>[
    base + (first - 0x41),
    base + (second - 0x41),
  ]);
}
