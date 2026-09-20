import '../../models/user.dart';

enum AuthProvider {
  password,
  google,
  apple;

  String get label => switch (this) {
    AuthProvider.password => 'Email',
    AuthProvider.google => 'Google',
    AuthProvider.apple => 'Apple',
  };
}

/// A signed-in person plus the credential the transport needs.
final class AuthSession {
  const AuthSession({
    required this.user,
    required this.token,
    required this.provider,
    this.refreshToken,
    this.expiresAt,
  });

  factory AuthSession.fromJson(Map<String, dynamic> json) => AuthSession(
    user: AtlasUser.fromJson(json['user'] as Map<String, dynamic>),
    token: json['token'] as String,
    provider: AuthProvider.values.firstWhere(
      (AuthProvider p) => p.name == json['provider'],
      orElse: () => AuthProvider.password,
    ),
    refreshToken: json['refreshToken'] as String?,
    expiresAt: json['expiresAt'] == null
        ? null
        : DateTime.parse(json['expiresAt'] as String),
  );

  final AtlasUser user;
  final String token;
  final AuthProvider provider;
  final String? refreshToken;
  final DateTime? expiresAt;

  bool get isExpired => expiresAt != null && DateTime.now().isAfter(expiresAt!);

  AuthSession withUser(AtlasUser updated) => AuthSession(
    user: updated,
    token: token,
    provider: provider,
    refreshToken: refreshToken,
    expiresAt: expiresAt,
  );

  Map<String, dynamic> toJson() => <String, dynamic>{
    'user': user.toJson(),
    'token': token,
    'provider': provider.name,
    if (refreshToken != null) 'refreshToken': refreshToken,
    if (expiresAt != null) 'expiresAt': expiresAt!.toIso8601String(),
  };
}

/// Sign-in, behind one interface.
///
/// The three providers the product needs are declared here rather than reached
/// for directly in a screen, so the UI never imports a vendor SDK and the app
/// can run end to end without one. Wiring a real provider means writing one
/// implementation of this interface.
///
/// **Apple's rules, which shape this interface.** An iOS app that offers any
/// third-party sign-in must also offer Sign in with Apple, so [signInWithApple]
/// is not optional on that platform. Apple only returns a person's name and
/// email on the *first* authorisation and returns a relay address when they
/// choose to hide theirs, so an implementation has to persist whatever it gets
/// the first time and must never treat a missing name as an error. See
/// `docs/architecture.md` for the entitlement and capability setup.
abstract interface class AuthService {
  /// The current session, or null. Synchronous so routing can redirect without
  /// a frame of flicker.
  AuthSession? get session;

  /// Emits on every sign-in, sign-out and profile change.
  Stream<AuthSession?> get changes;

  /// Reads a persisted session at startup. Returns null if there is none.
  Future<AuthSession?> restore();

  Future<AuthSession> signInWithEmail({
    required String email,
    required String password,
  });

  Future<AuthSession> registerWithEmail({
    required String email,
    required String password,
    required String username,
    required String displayName,
    String? country,
  });

  Future<AuthSession> signInWithGoogle();

  Future<AuthSession> signInWithApple();

  Future<void> sendPasswordReset(String email);

  Future<void> signOut();

  /// Deletes the account and its content. Offered in the app because an app
  /// that offers account creation has to offer account deletion.
  Future<void> deleteAccount();

  /// The bearer token for [ApiClient], refreshed if needed.
  Future<String?> token();
}
