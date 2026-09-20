import 'dart:async';

import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../models/user.dart';
import '../services/auth/auth_service.dart';
import '../services/auth/mock_auth_service.dart';
import 'app_providers.dart';

/// Who is signed in, and every way that can change.
///
/// Held as an [AsyncValue] so a screen can tell "still restoring the session"
/// apart from "signed out" — the difference between showing a spinner and
/// throwing someone back to the sign-in screen on every cold start.
final AsyncNotifierProvider<AuthController, AuthSession?>
authControllerProvider = AsyncNotifierProvider<AuthController, AuthSession?>(
  AuthController.new,
);

final class AuthController extends AsyncNotifier<AuthSession?> {
  @override
  Future<AuthSession?> build() async {
    final AuthService service = ref.watch(authServiceProvider);
    final StreamSubscription<AuthSession?> subscription = service.changes
        .listen((AuthSession? session) {
          state = AsyncValue<AuthSession?>.data(session);
        });
    ref.onDispose(subscription.cancel);
    return service.restore();
  }

  AuthService get _service => ref.read(authServiceProvider);

  Future<void> signInWithEmail({
    required String email,
    required String password,
  }) => _run(() => _service.signInWithEmail(email: email, password: password));

  Future<void> register({
    required String email,
    required String password,
    required String username,
    required String displayName,
    String? country,
  }) => _run(
    () => _service.registerWithEmail(
      email: email,
      password: password,
      username: username,
      displayName: displayName,
      country: country,
    ),
  );

  Future<void> signInWithGoogle() => _run(_service.signInWithGoogle);

  Future<void> signInWithApple() => _run(_service.signInWithApple);

  Future<void> sendPasswordReset(String email) =>
      _service.sendPasswordReset(email);

  Future<void> signOut() async {
    await _service.signOut();
    state = const AsyncValue<AuthSession?>.data(null);
  }

  Future<void> deleteAccount() async {
    final AtlasUser? user = state.value?.user;
    if (user != null) {
      await ref.read(userRepositoryProvider).deleteAccount(user.id);
    }
    await _service.deleteAccount();
    state = const AsyncValue<AuthSession?>.data(null);
  }

  /// Applies a profile edit locally and to the store.
  Future<void> updateProfile(AtlasUser updated) async {
    await ref.read(userRepositoryProvider).update(updated);
    final AuthService service = _service;
    if (service is MockAuthService) {
      await service.updateUser(updated);
    }
    final AuthSession? current = state.value;
    if (current != null) {
      state = AsyncValue<AuthSession?>.data(current.withUser(updated));
    }
  }

  Future<void> _run(Future<AuthSession> Function() action) async {
    state = const AsyncValue<AuthSession?>.loading();
    state = await AsyncValue.guard<AuthSession?>(action);
  }
}

/// The signed-in person, or null. The single source every screen reads.
final Provider<AtlasUser?> currentUserProvider = Provider<AtlasUser?>(
  (Ref ref) => ref.watch(authControllerProvider).value?.user,
);

/// Where the viewer is, as a country code.
///
/// It comes from their profile, never from GPS. Atlas decides what reaches
/// someone from a country they chose, which means the app can do its whole job
/// without ever asking for location permission.
final Provider<String?> viewerCountryProvider = Provider<String?>(
  (Ref ref) => ref.watch(currentUserProvider)?.country,
);

/// Convenience for the many places that need an id and can assume one.
final Provider<String> viewerIdProvider = Provider<String>(
  (Ref ref) => ref.watch(currentUserProvider)?.id ?? 'anonymous',
);
