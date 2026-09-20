import 'dart:async';
import 'dart:convert';

import 'package:http/http.dart' as http;

import '../config/app_config.dart';
import 'api_exception.dart';

/// A thin JSON transport.
///
/// Its whole job is to turn HTTP into either decoded JSON or an
/// [AtlasException]. It holds no product knowledge, so swapping the backend for
/// a different one — or for a gRPC/Firestore client — means writing new
/// repositories, not touching the UI.
final class ApiClient {
  ApiClient({
    required AppConfig config,
    http.Client? httpClient,
    AuthTokenProvider? tokenProvider,
  }) : _config = config,
       _http = httpClient ?? http.Client(),
       _tokenProvider = tokenProvider;

  final AppConfig _config;
  final http.Client _http;
  final AuthTokenProvider? _tokenProvider;

  Future<Map<String, dynamic>> getJson(
    String path, {
    Map<String, String>? query,
  }) async => _asObject(await _send('GET', path, query: query));

  Future<List<dynamic>> getList(
    String path, {
    Map<String, String>? query,
  }) async => _asList(await _send('GET', path, query: query));

  Future<Map<String, dynamic>> postJson(String path, {Object? body}) async =>
      _asObject(await _send('POST', path, body: body));

  Future<Map<String, dynamic>> patchJson(String path, {Object? body}) async =>
      _asObject(await _send('PATCH', path, body: body));

  Future<void> delete(String path) async => _send('DELETE', path);

  void close() => _http.close();

  Future<Object?> _send(
    String method,
    String path, {
    Map<String, String>? query,
    Object? body,
  }) async {
    final Uri uri = Uri.parse('${_config.apiBaseUrl}$path')
        .replace(queryParameters: query?.isEmpty ?? true ? null : query);

    final http.Request request = http.Request(method, uri)
      ..headers['accept'] = 'application/json';
    final String? token = await _tokenProvider?.call();
    if (token != null && token.isNotEmpty) {
      request.headers['authorization'] = 'Bearer $token';
    }
    if (body != null) {
      request.headers['content-type'] = 'application/json';
      request.body = jsonEncode(body);
    }

    final http.Response response;
    try {
      final http.StreamedResponse streamed = await _http
          .send(request)
          .timeout(_config.requestTimeout);
      response = await http.Response.fromStream(streamed);
    } on TimeoutException {
      throw const TimeoutException();
    } on Object catch (error) {
      throw NetworkException(
        'You appear to be offline. Check your connection and try again.',
        error,
      );
    }

    return _decode(response);
  }

  Object? _decode(http.Response response) {
    final int status = response.statusCode;
    if (status == 401 || status == 403) throw const UnauthorizedException();
    if (status == 404) throw const NotFoundException();
    if (status == 204 || response.body.isEmpty) return null;

    final Object? decoded;
    try {
      decoded = jsonDecode(response.body);
    } on FormatException catch (error) {
      throw ParseException("We couldn't read that response.", error);
    }

    if (status >= 200 && status < 300) return decoded;
    if (status >= 400 && status < 500) {
      final String? detail = decoded is Map<String, dynamic>
          ? decoded['message'] as String?
          : null;
      throw RejectedException(detail ?? 'That request was refused.');
    }
    throw ServerException(status);
  }

  Map<String, dynamic> _asObject(Object? value) => value is Map<String, dynamic>
      ? value
      : throw const ParseException('Expected an object from the server.');

  List<dynamic> _asList(Object? value) => value is List<dynamic>
      ? value
      : throw const ParseException('Expected a list from the server.');
}

/// Supplies the bearer token for authenticated calls. The auth layer owns it;
/// the transport only asks for it.
typedef AuthTokenProvider = Future<String?> Function();
