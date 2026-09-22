import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../../../core/theme/wainzo_colors.dart';
import '../../../core/theme/wainzo_tokens.dart';
import '../../../models/post.dart';
import 'ai_preview_card.dart';

/// The stack of preview cards.
///
/// Two things had to be true here. **Skip has to feel like nothing happened** —
/// the next card is already built and laid out underneath, so the decision
/// costs one frame and the animation is just the old card leaving. And **watch
/// has to feel like the card opened**, which is why the watch tap hands the
/// route a hero tag rather than pushing a page that happens to contain a video.
///
/// A left swipe skips too: the fastest possible version of the gesture, for
/// someone going through a lot of previews.
class PreviewDeck extends StatefulWidget {
  const PreviewDeck({
    required this.posts,
    required this.onWatch,
    required this.onSkip,
    super.key,
    this.onExplainPreview,
  });

  /// Head first. Only the first two are ever built.
  final List<Post> posts;

  /// Called with how long the preview was on screen before the decision.
  final void Function(Post post, Duration dwell) onWatch;
  final void Function(Post post, Duration dwell) onSkip;

  final VoidCallback? onExplainPreview;

  @override
  State<PreviewDeck> createState() => _PreviewDeckState();
}

class _PreviewDeckState extends State<PreviewDeck>
    with SingleTickerProviderStateMixin {
  late final AnimationController _exit = AnimationController(
    vsync: this,
    duration: Motion.skip,
  );

  /// The card that is leaving, drawn above the new top card while it goes.
  Post? _outgoing;

  /// Live drag offset for the swipe gesture.
  double _dragX = 0;

  DateTime _shownAt = DateTime.now();
  String? _shownId;

  @override
  void didUpdateWidget(PreviewDeck old) {
    super.didUpdateWidget(old);
    _resetTimerIfNeeded();
  }

  @override
  void initState() {
    super.initState();
    _resetTimerIfNeeded();
  }

  void _resetTimerIfNeeded() {
    final String? id = widget.posts.isEmpty ? null : widget.posts.first.id;
    if (id != _shownId) {
      _shownId = id;
      _shownAt = DateTime.now();
    }
  }

  @override
  void dispose() {
    _exit.dispose();
    super.dispose();
  }

  Duration get _dwell => DateTime.now().difference(_shownAt);

  void _skip(Post post) {
    if (_exit.isAnimating) return;
    HapticFeedback.selectionClick();
    setState(() {
      _outgoing = post;
      _dragX = 0;
    });
    // State first, animation second: the next card is interactive immediately,
    // and the departing one is decoration.
    widget.onSkip(post, _dwell);
    _exit.forward(from: 0).whenComplete(() {
      if (mounted) setState(() => _outgoing = null);
    });
  }

  void _watch(Post post) {
    HapticFeedback.lightImpact();
    widget.onWatch(post, _dwell);
  }

  @override
  Widget build(BuildContext context) {
    final List<Post> posts = widget.posts;
    final Post? top = posts.isEmpty ? null : posts.first;
    final Post? next = posts.length > 1 ? posts[1] : null;

    return Stack(
      children: <Widget>[
        // The card underneath, slightly smaller and dimmed. It is what makes a
        // skip look like a deck rather than a page reload.
        if (next != null)
          Positioned.fill(
            child: IgnorePointer(
              child: Transform.scale(
                scale: 0.955,
                alignment: Alignment.topCenter,
                child: Opacity(
                  opacity: 0.55,
                  child: AiPreviewCard(
                    post: next,
                    onWatch: () {},
                    onSkip: () {},
                  ),
                ),
              ),
            ),
          ),
        if (top != null)
          Positioned.fill(
            child: GestureDetector(
              onHorizontalDragUpdate: (DragUpdateDetails details) => setState(
                () => _dragX = math.min(0, _dragX + details.delta.dx),
              ),
              onHorizontalDragEnd: (DragEndDetails details) {
                final bool flung =
                    details.primaryVelocity != null &&
                    details.primaryVelocity! < -600;
                if (_dragX < -110 || flung) {
                  _skip(top);
                } else {
                  setState(() => _dragX = 0);
                }
              },
              child: AnimatedContainer(
                duration: _dragX == 0 ? Motion.base : Duration.zero,
                curve: Motion.enter,
                transform: Matrix4.translationValues(_dragX, 0, 0)
                  ..rotateZ(_dragX / 2600),
                transformAlignment: Alignment.center,
                child: Stack(
                  fit: StackFit.expand,
                  children: <Widget>[
                    AiPreviewCard(
                      post: top,
                      onWatch: () => _watch(top),
                      onSkip: () => _skip(top),
                      onExplainPreview: widget.onExplainPreview,
                    ),
                    if (_dragX < -20)
                      Positioned(
                        top: Insets.xxl,
                        right: Insets.xl,
                        child: Opacity(
                          opacity: ((-_dragX - 20) / 90).clamp(0.0, 1.0),
                          child: const _SkipStamp(),
                        ),
                      ),
                  ],
                ),
              ),
            ),
          ),
        if (_outgoing != null)
          Positioned.fill(
            child: IgnorePointer(
              child: AnimatedBuilder(
                animation: _exit,
                builder: (BuildContext context, Widget? child) {
                  final double t = Motion.exit.transform(_exit.value);
                  return Transform.translate(
                    offset: Offset(
                      -t * MediaQuery.sizeOf(context).width * 1.1,
                      t * 22,
                    ),
                    child: Transform.rotate(
                      angle: -t * 0.10,
                      child: Opacity(opacity: 1 - t, child: child),
                    ),
                  );
                },
                child: AiPreviewCard(
                  post: _outgoing!,
                  onWatch: () {},
                  onSkip: () {},
                ),
              ),
            ),
          ),
      ],
    );
  }
}

class _SkipStamp extends StatelessWidget {
  const _SkipStamp();

  @override
  Widget build(BuildContext context) => Container(
    padding: const EdgeInsets.symmetric(
      horizontal: Insets.lg,
      vertical: Insets.sm,
    ),
    decoration: BoxDecoration(
      color: WainzoColors.ground.withValues(alpha: 0.8),
      borderRadius: BorderRadius.circular(Radii.pill),
      border: Border.all(color: WainzoColors.hairlineStrong),
    ),
    child: const Row(
      mainAxisSize: MainAxisSize.min,
      children: <Widget>[
        Icon(
          Icons.arrow_forward_rounded,
          size: 15,
          color: WainzoColors.inkMuted,
        ),
        SizedBox(width: 6),
        Text(
          'SKIP',
          style: TextStyle(
            fontFamily: 'Inter',
            fontSize: 11,
            fontWeight: FontWeight.w600,
            letterSpacing: 1.1,
            color: WainzoColors.inkMuted,
          ),
        ),
      ],
    ),
  );
}
