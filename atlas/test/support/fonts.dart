import 'dart:io';

import 'package:flutter/services.dart';

/// Loads the app's real typefaces into the test renderer.
///
/// `flutter test` draws every string in a placeholder box font, which is fine
/// for layout assertions and useless for looking at a screen. This registers
/// Inter, Instrument Serif and the Material icon set from disk so a captured
/// frame is the product rather than a wireframe of it.
Future<void> loadAppFonts() async {
  const Map<String, List<String>> families = <String, List<String>>{
    'Inter': <String>[
      'assets/fonts/Inter_400Regular.ttf',
      'assets/fonts/Inter_500Medium.ttf',
      'assets/fonts/Inter_600SemiBold.ttf',
      'assets/fonts/Inter_700Bold.ttf',
    ],
    'InstrumentSerif': <String>['assets/fonts/InstrumentSerif_400Regular.ttf'],
  };

  for (final MapEntry<String, List<String>> family in families.entries) {
    final FontLoader loader = FontLoader(family.key);
    for (final String path in family.value) {
      loader.addFont(_read(path));
    }
    await loader.load();
  }

  // Flags are emoji, which no interface typeface carries. Without this every
  // flag in a captured frame is an empty box.
  for (final String path in <String>[
    '/usr/share/fonts/truetype/noto/NotoColorEmoji.ttf',
    '/System/Library/Fonts/Apple Color Emoji.ttc',
  ]) {
    final File emoji = File(path);
    if (emoji.existsSync()) {
      final FontLoader loader = FontLoader('Noto Color Emoji')
        ..addFont(_readFile(emoji));
      await loader.load();
      break;
    }
  }

  // Icons come from the SDK's cache rather than the project.
  final String? root = Platform.environment['FLUTTER_ROOT'];
  final File icons = File(
    '${root ?? '/opt/flutter'}/bin/cache/artifacts/material_fonts/'
    'MaterialIcons-Regular.otf',
  );
  if (icons.existsSync()) {
    final FontLoader loader = FontLoader('MaterialIcons')
      ..addFont(_readFile(icons));
    await loader.load();
  }
}

Future<ByteData> _read(String path) => _readFile(File(path));

Future<ByteData> _readFile(File file) async {
  final Uint8List bytes = await file.readAsBytes();
  return ByteData.view(bytes.buffer);
}
