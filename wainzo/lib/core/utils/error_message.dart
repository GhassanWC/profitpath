import 'package:flutter_riverpod/misc.dart' show ProviderException;

import '../network/api_exception.dart';

/// Turns anything thrown into a sentence a person can act on.
///
/// One implementation, used by every error surface in the app, so the rule is
/// applied consistently: only [WainzoException] carries a message written for
/// people. Everything else — a platform error, a null, a bug — gets a generic
/// line, because showing a raw exception to someone is not an explanation and
/// occasionally leaks something it should not.
String humanMessageFor(Object error) {
  // Riverpod wraps an error rethrown through `ref.watch`, and the wrapping can
  // nest, so unwrap all the way down before looking for our own type.
  Object unwrapped = error;
  while (unwrapped is ProviderException) {
    unwrapped = unwrapped.exception;
  }
  if (unwrapped is WainzoException) return unwrapped.message;
  return 'Something went wrong. Try again.';
}
