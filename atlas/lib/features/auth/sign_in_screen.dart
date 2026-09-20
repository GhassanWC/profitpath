import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/theme/atlas_colors.dart';
import '../../core/theme/atlas_tokens.dart';
import '../../core/theme/atlas_typography.dart';
import '../../core/widgets/atlas_button.dart';
import '../../core/widgets/state_views.dart';
import '../../data/geo/world_outlines.dart';
import '../../providers/app_providers.dart';
import '../../providers/session_providers.dart';
import '../../services/auth/auth_service.dart';
import '../map/map_camera.dart';
import '../map/widgets/world_map.dart';

/// The way in.
///
/// Email, Google and Apple, all through [AuthService] — no screen here imports
/// a vendor SDK, which is what lets the app run end to end before any of them
/// is wired up. Sign in with Apple is not optional on iOS: Apple requires it
/// wherever another third-party sign-in is offered.
class SignInScreen extends ConsumerStatefulWidget {
  const SignInScreen({super.key});

  @override
  ConsumerState<SignInScreen> createState() => _SignInScreenState();
}

class _SignInScreenState extends ConsumerState<SignInScreen>
    with SingleTickerProviderStateMixin {
  final TextEditingController _email = TextEditingController();
  final TextEditingController _password = TextEditingController();
  final TextEditingController _username = TextEditingController();

  late final MapCameraController _camera = MapCameraController(vsync: this);
  bool _registering = false;

  @override
  void dispose() {
    _email.dispose();
    _password.dispose();
    _username.dispose();
    _camera.dispose();
    super.dispose();
  }

  AuthController get _auth => ref.read(authControllerProvider.notifier);

  Future<void> _submit() async {
    if (_registering) {
      await _auth.register(
        email: _email.text,
        password: _password.text,
        username: _username.text.trim().toLowerCase(),
        displayName: _username.text.trim(),
      );
    } else {
      await _auth.signInWithEmail(email: _email.text, password: _password.text);
    }
  }

  @override
  Widget build(BuildContext context) {
    final AsyncValue<AuthSession?> session = ref.watch(authControllerProvider);
    final WorldOutlines? outlines = ref.watch(worldOutlinesProvider).value;
    final bool busy = session.isLoading;

    return Scaffold(
      body: Stack(
        children: <Widget>[
          if (outlines != null)
            Positioned(
              top: 0,
              left: 0,
              right: 0,
              height: MediaQuery.sizeOf(context).height * 0.46,
              child: WorldMap(
                outlines: outlines,
                controller: _camera,
                interactive: false,
                showMarkers: false,
                highlighted: const <String>{
                  'OM',
                  'JP',
                  'GB',
                  'BR',
                  'KE',
                  'IN',
                  'KR',
                  'FR',
                },
              ),
            ),
          Positioned.fill(
            child: DecoratedBox(
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  begin: Alignment.topCenter,
                  end: Alignment.bottomCenter,
                  colors: <Color>[
                    AtlasColors.ground.withValues(alpha: 0.2),
                    AtlasColors.ground,
                  ],
                  stops: const <double>[0.18, 0.5],
                ),
              ),
            ),
          ),
          SafeArea(
            child: ListView(
              padding: const EdgeInsets.fromLTRB(
                Insets.xl,
                0,
                Insets.xl,
                Insets.xl,
              ),
              children: <Widget>[
                SizedBox(height: MediaQuery.sizeOf(context).height * 0.28),
                Text('Atlas', style: AtlasTypography.display),
                const SizedBox(height: Insets.sm),
                Text(
                  'Creators choose where their work is seen. The AI explains what it '
                  'is. You decide whether to watch.',
                  style: AtlasTypography.bodyMuted,
                ),
                const SizedBox(height: Insets.xxl),
                if (_registering) ...<Widget>[
                  TextField(
                    controller: _username,
                    textInputAction: TextInputAction.next,
                    decoration: const InputDecoration(hintText: 'Username'),
                  ),
                  const SizedBox(height: Insets.md),
                ],
                TextField(
                  controller: _email,
                  keyboardType: TextInputType.emailAddress,
                  textInputAction: TextInputAction.next,
                  autofillHints: const <String>[AutofillHints.email],
                  decoration: const InputDecoration(hintText: 'Email'),
                ),
                const SizedBox(height: Insets.md),
                TextField(
                  controller: _password,
                  obscureText: true,
                  textInputAction: TextInputAction.done,
                  autofillHints: const <String>[AutofillHints.password],
                  onSubmitted: (_) => _submit(),
                  decoration: const InputDecoration(hintText: 'Password'),
                ),
                if (session.hasError) ...<Widget>[
                  const SizedBox(height: Insets.md),
                  Text(
                    AtlasErrorView.messageFor(session.error!),
                    style: AtlasTypography.caption.copyWith(
                      color: AtlasColors.danger,
                    ),
                  ),
                ],
                const SizedBox(height: Insets.lg),
                AtlasButton(
                  label: _registering ? 'Create account' : 'Sign in',
                  onPressed: _submit,
                  busy: busy,
                  expand: true,
                  size: AtlasButtonSize.large,
                ),
                const SizedBox(height: Insets.md),
                TextButton(
                  onPressed: () => setState(() => _registering = !_registering),
                  child: Text(
                    _registering
                        ? 'I already have an account'
                        : 'I am new here — create an account',
                    style: AtlasTypography.caption,
                  ),
                ),
                const SizedBox(height: Insets.lg),
                const _Divider(),
                const SizedBox(height: Insets.lg),
                AtlasButton(
                  label: 'Continue with Google',
                  onPressed: busy ? null : _auth.signInWithGoogle,
                  kind: AtlasButtonKind.secondary,
                  expand: true,
                  size: AtlasButtonSize.large,
                ),
                const SizedBox(height: Insets.md),
                AtlasButton(
                  label: 'Continue with Apple',
                  onPressed: busy ? null : _auth.signInWithApple,
                  kind: AtlasButtonKind.secondary,
                  expand: true,
                  size: AtlasButtonSize.large,
                ),
                const SizedBox(height: Insets.xl),
                Text(
                  'Atlas never needs your location to work. You choose the country on '
                  'your profile, and that is what decides which posts reach you.',
                  textAlign: TextAlign.center,
                  style: AtlasTypography.caption.copyWith(
                    fontSize: 11.5,
                    color: AtlasColors.inkFaint,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _Divider extends StatelessWidget {
  const _Divider();

  @override
  Widget build(BuildContext context) => Row(
    children: <Widget>[
      const Expanded(child: Divider(color: AtlasColors.hairline)),
      Padding(
        padding: const EdgeInsets.symmetric(horizontal: Insets.md),
        child: Text('OR', style: AtlasTypography.overline),
      ),
      const Expanded(child: Divider(color: AtlasColors.hairline)),
    ],
  );
}
