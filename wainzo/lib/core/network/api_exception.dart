/// Every failure the UI can be asked to render, in one closed set.
///
/// Repositories translate transport and parsing problems into these so a screen
/// never has to know whether it is talking to HTTP, a mock, or a cache.
sealed class WainzoException implements Exception {
  const WainzoException(this.message, [this.cause]);

  /// Safe to show a person. Never contains a URL, a token or a stack trace.
  final String message;
  final Object? cause;

  @override
  String toString() => '$runtimeType: $message';
}

final class NetworkException extends WainzoException {
  const NetworkException([
    super.message =
        'You appear to be offline. Check your connection and try again.',
    super.cause,
  ]);
}

final class TimeoutException extends WainzoException {
  const TimeoutException([super.message = 'That took too long. Try again.']);
}

final class ServerException extends WainzoException {
  const ServerException(
    this.statusCode, [
    super.message = 'Something went wrong on our end.',
  ]);

  final int statusCode;
}

final class UnauthorizedException extends WainzoException {
  const UnauthorizedException([super.message = 'Please sign in again.']);
}

final class NotFoundException extends WainzoException {
  const NotFoundException([super.message = "That isn't here any more."]);
}

/// The request was understood and refused — a validation error, a moderation
/// rejection, a username already taken.
final class RejectedException extends WainzoException {
  const RejectedException(super.message);
}

final class ParseException extends WainzoException {
  const ParseException([
    super.message = "We couldn't read that response.",
    super.cause,
  ]);
}
