/// A person on Wainzo.
final class WainzoUser {
  const WainzoUser({
    required this.id,
    required this.username,
    required this.displayName,
    required this.createdAt,
    this.profileImageUrl,
    this.bio = '',
    this.country,
    this.followersCount = 0,
    this.followingCount = 0,
    this.postsCount = 0,
    this.interests = const <String>[],
    this.languages = const <String>['en'],
  });

  factory WainzoUser.fromJson(Map<String, dynamic> json) => WainzoUser(
    id: json['id'] as String,
    username: json['username'] as String,
    displayName: json['displayName'] as String? ?? json['username'] as String,
    profileImageUrl: json['profileImage'] as String?,
    bio: json['bio'] as String? ?? '',
    country: (json['country'] as String?)?.toUpperCase(),
    followersCount: (json['followersCount'] as num?)?.toInt() ?? 0,
    followingCount: (json['followingCount'] as num?)?.toInt() ?? 0,
    postsCount: (json['postsCount'] as num?)?.toInt() ?? 0,
    interests: (json['interests'] as List<dynamic>? ?? const <dynamic>[])
        .cast<String>()
        .toList(growable: false),
    languages: (json['languages'] as List<dynamic>? ?? const <dynamic>['en'])
        .cast<String>()
        .toList(growable: false),
    createdAt: DateTime.parse(json['createdAt'] as String),
  );

  final String id;

  /// Unique handle, without the leading `@`.
  final String username;
  final String displayName;
  final String? profileImageUrl;
  final String bio;

  /// ISO alpha-2 of where this person is. Used to decide which posts reach
  /// them, so it is a profile field rather than a device location: the app
  /// never needs GPS to work out who should see what.
  final String? country;

  final int followersCount;
  final int followingCount;
  final int postsCount;

  /// Self-declared interests, seeded at sign-up. The learned interest profile
  /// lives separately in `InterestProfile` — this is only the starting point.
  final List<String> interests;
  final List<String> languages;

  final DateTime createdAt;

  String get handle => '@$username';

  /// Two letters for the avatar fallback.
  String get initials {
    final List<String> parts = displayName.trim().split(RegExp(r'\s+'));
    if (parts.isEmpty || parts.first.isEmpty) {
      return username.isEmpty ? '?' : username[0].toUpperCase();
    }
    if (parts.length == 1) return parts.first.substring(0, 1).toUpperCase();
    return (parts.first[0] + parts.last[0]).toUpperCase();
  }

  WainzoUser copyWith({
    String? displayName,
    String? username,
    String? profileImageUrl,
    String? bio,
    String? country,
    int? followersCount,
    int? followingCount,
    int? postsCount,
    List<String>? interests,
    List<String>? languages,
  }) => WainzoUser(
    id: id,
    username: username ?? this.username,
    displayName: displayName ?? this.displayName,
    profileImageUrl: profileImageUrl ?? this.profileImageUrl,
    bio: bio ?? this.bio,
    country: country ?? this.country,
    followersCount: followersCount ?? this.followersCount,
    followingCount: followingCount ?? this.followingCount,
    postsCount: postsCount ?? this.postsCount,
    interests: interests ?? this.interests,
    languages: languages ?? this.languages,
    createdAt: createdAt,
  );

  Map<String, dynamic> toJson() => <String, dynamic>{
    'id': id,
    'username': username,
    'displayName': displayName,
    if (profileImageUrl != null) 'profileImage': profileImageUrl,
    'bio': bio,
    if (country != null) 'country': country,
    'followersCount': followersCount,
    'followingCount': followingCount,
    'postsCount': postsCount,
    'interests': interests,
    'languages': languages,
    'createdAt': createdAt.toIso8601String(),
  };

  @override
  bool operator ==(Object other) => other is WainzoUser && other.id == id;

  @override
  int get hashCode => id.hashCode;
}
