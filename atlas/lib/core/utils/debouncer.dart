import 'dart:async';

/// Coalesces bursts — search keystrokes, map pan settling — into one call.
final class Debouncer {
  Debouncer({this.delay = const Duration(milliseconds: 220)});

  final Duration delay;
  Timer? _timer;

  void run(void Function() action) {
    _timer?.cancel();
    _timer = Timer(delay, action);
  }

  void cancel() => _timer?.cancel();

  void dispose() => cancel();
}
