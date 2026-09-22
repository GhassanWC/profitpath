final class PostComment {
  const PostComment({
    required this.id,
    required this.postId,
    required this.authorId,
    required this.authorName,
    required this.body,
    required this.createdAt,
    this.authorImageUrl,
    this.authorCountry,
    this.likes = 0,
    this.likedByMe = false,
  });

  factory PostComment.fromJson(Map<String, dynamic> json) => PostComment(
    id: json['id'] as String,
    postId: json['postId'] as String,
    authorId: json['authorId'] as String,
    authorName: json['authorName'] as String,
    authorImageUrl: json['authorImage'] as String?,
    authorCountry: (json['authorCountry'] as String?)?.toUpperCase(),
    body: json['body'] as String,
    likes: (json['likes'] as num?)?.toInt() ?? 0,
    likedByMe: json['likedByMe'] as bool? ?? false,
    createdAt: DateTime.parse(json['createdAt'] as String),
  );

  final String id;
  final String postId;
  final String authorId;
  final String authorName;
  final String? authorImageUrl;
  final String? authorCountry;
  final String body;
  final int likes;
  final bool likedByMe;
  final DateTime createdAt;

  PostComment copyWith({int? likes, bool? likedByMe}) => PostComment(
    id: id,
    postId: postId,
    authorId: authorId,
    authorName: authorName,
    authorImageUrl: authorImageUrl,
    authorCountry: authorCountry,
    body: body,
    likes: likes ?? this.likes,
    likedByMe: likedByMe ?? this.likedByMe,
    createdAt: createdAt,
  );

  Map<String, dynamic> toJson() => <String, dynamic>{
    'id': id,
    'postId': postId,
    'authorId': authorId,
    'authorName': authorName,
    if (authorImageUrl != null) 'authorImage': authorImageUrl,
    if (authorCountry != null) 'authorCountry': authorCountry,
    'body': body,
    'likes': likes,
    'likedByMe': likedByMe,
    'createdAt': createdAt.toIso8601String(),
  };
}
