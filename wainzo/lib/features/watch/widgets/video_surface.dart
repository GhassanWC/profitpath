import 'dart:async';

import 'package:flutter/material.dart';
import 'package:video_player/video_player.dart';

import '../../../core/theme/wainzo_colors.dart';
import '../../../core/theme/wainzo_tokens.dart';
import '../../../core/theme/wainzo_typography.dart';
import '../../../core/utils/formatters.dart';
import '../../../core/widgets/wainzo_button.dart';
import '../../../core/widgets/state_views.dart';

/// The video itself, with as little on top of it as the job allows.
///
/// Controls fade out after a couple of seconds and come back on a tap. What
/// stays is the progress bar, because how much is left is the one thing a
/// person genuinely needs while watching.
///
/// Two sources are handled the same way: a bundled asset (what the prototype's
/// posts use) and a URL (what a post from a backend carries). Everything else
/// about the screen is identical either way.
class VideoSurface extends StatefulWidget {
  const VideoSurface({
    required this.source,
    super.key,
    this.onProgress,
    this.onCompleted,
    this.autoPlay = true,
  });

  /// An `assets/...` path or an absolute URL.
  final String source;

  /// Fires with the fraction watched, roughly twice a second. The watch screen
  /// keeps the last value so it can report an abandoned watch accurately.
  final ValueChanged<double>? onProgress;

  final VoidCallback? onCompleted;
  final bool autoPlay;

  @override
  State<VideoSurface> createState() => _VideoSurfaceState();
}

class _VideoSurfaceState extends State<VideoSurface> {
  VideoPlayerController? _controller;
  Object? _error;
  bool _controlsVisible = true;
  bool _completed = false;
  Timer? _hideTimer;

  @override
  void initState() {
    super.initState();
    unawaited(_open());
  }

  @override
  void dispose() {
    _hideTimer?.cancel();
    _controller?.removeListener(_onTick);
    unawaited(_controller?.dispose());
    super.dispose();
  }

  Future<void> _open() async {
    final VideoPlayerController controller = widget.source.startsWith('http')
        ? VideoPlayerController.networkUrl(Uri.parse(widget.source))
        : VideoPlayerController.asset(widget.source);
    try {
      await controller.initialize();
      if (!mounted) {
        await controller.dispose();
        return;
      }
      controller.addListener(_onTick);
      setState(() => _controller = controller);
      if (widget.autoPlay) {
        await controller.play();
        _scheduleHide();
      }
    } on Object catch (error) {
      await controller.dispose();
      if (mounted) setState(() => _error = error);
    }
  }

  void _onTick() {
    final VideoPlayerController? controller = _controller;
    if (controller == null || !controller.value.isInitialized) return;
    final Duration total = controller.value.duration;
    if (total.inMilliseconds <= 0) return;

    final double fraction =
        (controller.value.position.inMilliseconds / total.inMilliseconds).clamp(
          0.0,
          1.0,
        );
    widget.onProgress?.call(fraction);

    if (!_completed && fraction > 0.985) {
      _completed = true;
      widget.onCompleted?.call();
      _show();
    }
    if (mounted) setState(() {});
  }

  void _scheduleHide() {
    _hideTimer?.cancel();
    _hideTimer = Timer(const Duration(milliseconds: 2400), () {
      if (mounted && (_controller?.value.isPlaying ?? false)) {
        setState(() => _controlsVisible = false);
      }
    });
  }

  void _show() {
    setState(() => _controlsVisible = true);
    _scheduleHide();
  }

  void _toggleControls() {
    if (_controlsVisible) {
      setState(() => _controlsVisible = false);
      _hideTimer?.cancel();
    } else {
      _show();
    }
  }

  Future<void> _togglePlay() async {
    final VideoPlayerController? controller = _controller;
    if (controller == null) return;
    if (controller.value.isPlaying) {
      await controller.pause();
      setState(() => _controlsVisible = true);
      _hideTimer?.cancel();
    } else {
      if (_completed) {
        _completed = false;
        await controller.seekTo(Duration.zero);
      }
      await controller.play();
      _scheduleHide();
    }
  }

  @override
  Widget build(BuildContext context) {
    final Object? error = _error;
    if (error != null) {
      return WainzoErrorView(
        error: error,
        onRetry: () {
          setState(() => _error = null);
          unawaited(_open());
        },
      );
    }

    final VideoPlayerController? controller = _controller;
    if (controller == null || !controller.value.isInitialized) {
      return const WainzoLoading(label: 'Loading');
    }

    final VideoPlayerValue value = controller.value;

    return GestureDetector(
      onTap: _toggleControls,
      behavior: HitTestBehavior.opaque,
      child: Stack(
        fit: StackFit.expand,
        children: <Widget>[
          Center(
            child: AspectRatio(
              aspectRatio: value.aspectRatio,
              child: VideoPlayer(controller),
            ),
          ),
          AnimatedOpacity(
            opacity: _controlsVisible ? 1 : 0,
            duration: Motion.base,
            child: IgnorePointer(
              ignoring: !_controlsVisible,
              child: Stack(
                fit: StackFit.expand,
                children: <Widget>[
                  const DecoratedBox(
                    decoration: BoxDecoration(
                      gradient: LinearGradient(
                        begin: Alignment.topCenter,
                        end: Alignment.bottomCenter,
                        colors: <Color>[
                          Color(0x99000000),
                          Color(0x00000000),
                          Color(0xB3000000),
                        ],
                        stops: <double>[0, 0.4, 1],
                      ),
                    ),
                  ),
                  Center(
                    child: WainzoIconButton(
                      icon: _completed
                          ? Icons.replay_rounded
                          : value.isPlaying
                          ? Icons.pause_rounded
                          : Icons.play_arrow_rounded,
                      tooltip: value.isPlaying ? 'Pause' : 'Play',
                      onPressed: _togglePlay,
                      size: 64,
                    ),
                  ),
                  Positioned(
                    right: Insets.lg,
                    top: Insets.lg,
                    child: WainzoIconButton(
                      icon: value.volume == 0
                          ? Icons.volume_off_rounded
                          : Icons.volume_up_rounded,
                      tooltip: value.volume == 0 ? 'Unmute' : 'Mute',
                      size: 38,
                      onPressed: () {
                        unawaited(
                          controller.setVolume(value.volume == 0 ? 1 : 0),
                        );
                        _show();
                      },
                    ),
                  ),
                ],
              ),
            ),
          ),
          Positioned(
            left: 0,
            right: 0,
            bottom: 0,
            child: _Scrubber(controller: controller, onInteract: _show),
          ),
        ],
      ),
    );
  }
}

/// The progress bar. Draggable, and thin enough not to be furniture.
class _Scrubber extends StatefulWidget {
  const _Scrubber({required this.controller, required this.onInteract});

  final VideoPlayerController controller;
  final VoidCallback onInteract;

  @override
  State<_Scrubber> createState() => _ScrubberState();
}

class _ScrubberState extends State<_Scrubber> {
  double? _dragFraction;

  @override
  Widget build(BuildContext context) {
    final VideoPlayerValue value = widget.controller.value;
    final int totalMs = value.duration.inMilliseconds;
    final double played =
        _dragFraction ??
        (totalMs <= 0
            ? 0
            : (value.position.inMilliseconds / totalMs).clamp(0.0, 1.0));

    return Padding(
      padding: const EdgeInsets.fromLTRB(Insets.lg, 0, Insets.lg, Insets.lg),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: <Widget>[
          LayoutBuilder(
            builder: (BuildContext context, BoxConstraints constraints) =>
                GestureDetector(
                  behavior: HitTestBehavior.opaque,
                  onHorizontalDragStart: (DragStartDetails d) => _seekTo(
                    d.localPosition.dx / constraints.maxWidth,
                    commit: false,
                  ),
                  onHorizontalDragUpdate: (DragUpdateDetails d) => _seekTo(
                    d.localPosition.dx / constraints.maxWidth,
                    commit: false,
                  ),
                  onHorizontalDragEnd: (_) => _commit(),
                  onTapDown: (TapDownDetails d) => _seekTo(
                    d.localPosition.dx / constraints.maxWidth,
                    commit: true,
                  ),
                  child: SizedBox(
                    height: 28,
                    child: Center(
                      child: ClipRRect(
                        borderRadius: BorderRadius.circular(Radii.pill),
                        child: LinearProgressIndicator(
                          value: played,
                          minHeight: 3,
                          backgroundColor: WainzoColors.hairlineStrong,
                          valueColor: const AlwaysStoppedAnimation<Color>(
                            WainzoColors.accent,
                          ),
                        ),
                      ),
                    ),
                  ),
                ),
          ),
          Row(
            children: <Widget>[
              Text(
                Format.clock(value.position),
                style: WainzoTypography.overline.copyWith(
                  color: WainzoColors.ink,
                ),
              ),
              const Spacer(),
              Text(
                Format.clock(value.duration),
                style: WainzoTypography.overline,
              ),
            ],
          ),
        ],
      ),
    );
  }

  void _seekTo(double fraction, {required bool commit}) {
    widget.onInteract();
    final double clamped = fraction.clamp(0.0, 1.0);
    setState(() => _dragFraction = clamped);
    if (commit) _commit();
  }

  void _commit() {
    final double? fraction = _dragFraction;
    if (fraction == null) return;
    final Duration target = widget.controller.value.duration * fraction;
    unawaited(widget.controller.seekTo(target));
    setState(() => _dragFraction = null);
  }
}
