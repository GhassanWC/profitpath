enum NotificationKind {
  /// Someone watched a post all the way through. On Wainzo this matters more
  /// than a like, so it gets its own kind.
  watched,
  liked,
  commented,
  saved,
  shared,
  followed,

  /// The AI finished analysing a post the creator left processing.
  analysisReady,

  /// Moderation acted on something.
  moderation,

  /// A post reached a country it had not reached before.
  reach;

  static NotificationKind fromName(String? raw) =>
      NotificationKind.values.firstWhere(
        (NotificationKind k) => k.name == raw,
        orElse: () => NotificationKind.reach,
      );
}

final class AppNotification {
  const AppNotification({
    required this.id,
    required this.kind,
    required this.title,
    required this.createdAt,
    this.body = '',
    this.actorId,
    this.actorName,
    this.actorImageUrl,
    this.postId,
    this.countryCode,
    this.read = false,
  });

  factory AppNotification.fromJson(Map<String, dynamic> json) =>
      AppNotification(
        id: json['id'] as String,
        kind: NotificationKind.fromName(json['kind'] as String?),
        title: json['title'] as String,
        body: json['body'] as String? ?? '',
        actorId: json['actorId'] as String?,
        actorName: json['actorName'] as String?,
        actorImageUrl: json['actorImage'] as String?,
        postId: json['postId'] as String?,
        countryCode: (json['countryCode'] as String?)?.toUpperCase(),
        read: json['read'] as bool? ?? false,
        createdAt: DateTime.parse(json['createdAt'] as String),
      );

  final String id;
  final NotificationKind kind;
  final String title;
  final String body;
  final String? actorId;
  final String? actorName;
  final String? actorImageUrl;
  final String? postId;
  final String? countryCode;
  final bool read;
  final DateTime createdAt;

  AppNotification copyWith({bool? read}) => AppNotification(
    id: id,
    kind: kind,
    title: title,
    body: body,
    actorId: actorId,
    actorName: actorName,
    actorImageUrl: actorImageUrl,
    postId: postId,
    countryCode: countryCode,
    read: read ?? this.read,
    createdAt: createdAt,
  );

  Map<String, dynamic> toJson() => <String, dynamic>{
    'id': id,
    'kind': kind.name,
    'title': title,
    'body': body,
    if (actorId != null) 'actorId': actorId,
    if (actorName != null) 'actorName': actorName,
    if (actorImageUrl != null) 'actorImage': actorImageUrl,
    if (postId != null) 'postId': postId,
    if (countryCode != null) 'countryCode': countryCode,
    'read': read,
    'createdAt': createdAt.toIso8601String(),
  };
}
