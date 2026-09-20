import 'dart:async';
import 'dart:convert';

import 'package:shared_preferences/shared_preferences.dart';

import '../../core/network/api_exception.dart';
import '../../models/user.dart';
import 'auth_service.dart';

/// An auth service with no server behind it.
///
/// It keeps the session on the device so the app restarts signed in, validates
/// the things a real backend would reject, and returns a believable session for
/// the Google and Apple paths without linking either SDK. Nothing here is a
/// security control — it is a stand-in for one, and it is only ever selected
/// when the app is configured for the mock backend.
final class MockAuthService implements AuthService {
  MockAuthService({SharedPreferencesAsync? preferences, AtlasUser? seedUser})
    : _preferences = preferences ?? SharedPreferencesAsync(),
      _seedUser = seedUser;

  static const String _storageKey = 'atlas.session';

  final SharedPreferencesAsync _preferences;
  final AtlasUser? _seedUser;
  final StreamController<AuthSession?> _changes =
      StreamController<AuthSession?>.broadcast();

  AuthSession? _session;

  @override
  AuthSession? get session => _session;

  @override
  Stream<AuthSession?> get changes => _changes.stream;

  @override
  Future<AuthSession?> restore() async {
    final String? raw = await _preferences.getString(_storageKey);
    if (raw == null) return null;
    try {
      _session = AuthSession.fromJson(jsonDecode(raw) as Map<String, dynamic>);
    } on Object {
      // A session we cannot read is a session we do not have.
      await _preferences.remove(_storageKey);
      return null;
    }
    _changes.add(_session);
    return _session;
  }

  @override
  Future<AuthSession> signInWithEmail({
    required String email,
    required String password,
  }) async {
    await Future<void>.delayed(const Duration(milliseconds: 650));
    if (!_looksLikeEmail(email)) {
      throw const RejectedException("That doesn't look like an email address.");
    }
    if (password.length < 8) {
      throw const RejectedException('Passwords are at least 8 characters.');
    }
    final AtlasUser user = _seedUser ?? _userFromEmail(email);
    return _establish(user, AuthProvider.password);
  }

  @override
  Future<AuthSession> registerWithEmail({
    required String email,
    required String password,
    required String username,
    required String displayName,
    String? country,
  }) async {
    await Future<void>.delayed(const Duration(milliseconds: 800));
    if (!_looksLikeEmail(email)) {
      throw const RejectedException("That doesn't look like an email address.");
    }
    if (password.length < 8) {
      throw const RejectedException('Passwords are at least 8 characters.');
    }
    if (!RegExp(r'^[a-z0-9_.]{3,20}$').hasMatch(username)) {
      throw const RejectedException(
        'Usernames are 3–20 characters: lower-case letters, numbers, dots and underscores.',
      );
    }
    final AtlasUser user = AtlasUser(
      id: 'u_${DateTime.now().microsecondsSinceEpoch}',
      username: username,
      displayName: displayName.trim().isEmpty ? username : displayName.trim(),
      country: country,
      createdAt: DateTime.now(),
    );
    return _establish(user, AuthProvider.password);
  }

  @override
  Future<AuthSession> signInWithGoogle() async {
    await Future<void>.delayed(const Duration(milliseconds: 700));
    return _establish(
      _seedUser ??
          AtlasUser(
            id: 'u_google_demo',
            username: 'atlas.explorer',
            displayName: 'Atlas Explorer',
            createdAt: DateTime.now(),
          ),
      AuthProvider.google,
    );
  }

  @override
  Future<AuthSession> signInWithApple() async {
    await Future<void>.delayed(const Duration(milliseconds: 700));
    // Apple hands back a name only on first authorisation, and often a private
    // relay address. The stand-in reproduces that: no display name, so the code
    // downstream has to cope the way it will in production.
    return _establish(
      _seedUser ??
          AtlasUser(
            id: 'u_apple_demo',
            username: 'atlas.explorer',
            displayName: 'Atlas Explorer',
            createdAt: DateTime.now(),
          ),
      AuthProvider.apple,
    );
  }

  @override
  Future<void> sendPasswordReset(String email) async {
    await Future<void>.delayed(const Duration(milliseconds: 400));
    if (!_looksLikeEmail(email)) {
      throw const RejectedException("That doesn't look like an email address.");
    }
  }

  @override
  Future<void> signOut() async {
    _session = null;
    await _preferences.remove(_storageKey);
    _changes.add(null);
  }

  @override
  Future<void> deleteAccount() async {
    await Future<void>.delayed(const Duration(milliseconds: 500));
    await signOut();
  }

  @override
  Future<String?> token() async => _session?.token;

  /// Replaces the signed-in user, e.g. after a profile edit.
  Future<void> updateUser(AtlasUser user) async {
    final AuthSession? current = _session;
    if (current == null) return;
    _session = current.withUser(user);
    await _preferences.setString(_storageKey, jsonEncode(_session!.toJson()));
    _changes.add(_session);
  }

  Future<AuthSession> _establish(AtlasUser user, AuthProvider provider) async {
    final AuthSession session = AuthSession(
      user: user,
      token: 'mock-${provider.name}-${user.id}',
      provider: provider,
      expiresAt: DateTime.now().add(const Duration(days: 30)),
    );
    _session = session;
    await _preferences.setString(_storageKey, jsonEncode(session.toJson()));
    _changes.add(session);
    return session;
  }

  AtlasUser _userFromEmail(String email) {
    final String handle = email
        .split('@')
        .first
        .replaceAll(RegExp(r'[^a-z0-9_.]'), '');
    return AtlasUser(
      id: 'u_${handle.hashCode.abs()}',
      username: handle.isEmpty ? 'explorer' : handle,
      displayName: handle.isEmpty ? 'Explorer' : handle,
      createdAt: DateTime.now(),
    );
  }

  bool _looksLikeEmail(String value) =>
      RegExp(r'^[^@\s]+@[^@\s]+\.[^@\s]+$').hasMatch(value.trim());

  void dispose() => _changes.close();
}
