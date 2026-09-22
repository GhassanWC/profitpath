import 'package:image_picker/image_picker.dart';

import '../../core/network/api_exception.dart';
import '../../models/post.dart';

/// A piece of media the creator chose, before it is a post.
final class PickedMedia {
  const PickedMedia({
    required this.path,
    required this.type,
    this.duration,
    this.mimeType,
  });

  /// A local file path. Uploading is the data layer's job, not this service's.
  final String path;
  final MediaType type;
  final Duration? duration;
  final String? mimeType;
}

enum MediaSource { camera, gallery }

/// Camera and library access, behind an interface.
///
/// Two reasons it is an interface: a widget test should not need a device
/// camera, and the permission story belongs in one place. Permissions are
/// requested by the platform on first use, which is why the composer asks for
/// nothing until the moment a person taps "take a video" — the app never asks
/// for the camera, the library or the microphone at launch.
abstract interface class MediaService {
  Future<PickedMedia?> pickVideo({MediaSource source = MediaSource.gallery});

  Future<PickedMedia?> pickImage({MediaSource source = MediaSource.gallery});
}

final class ImagePickerMediaService implements MediaService {
  ImagePickerMediaService({ImagePicker? picker})
    : _picker = picker ?? ImagePicker();

  final ImagePicker _picker;

  /// Long videos are a moderation and a bandwidth problem, and a preview-led
  /// product does not need them. Enforced again server side.
  static const Duration maxVideoDuration = Duration(minutes: 3);

  @override
  Future<PickedMedia?> pickVideo({
    MediaSource source = MediaSource.gallery,
  }) async {
    final XFile? file = await _guard(
      () => _picker.pickVideo(
        source: source == MediaSource.camera
            ? ImageSource.camera
            : ImageSource.gallery,
        maxDuration: maxVideoDuration,
      ),
    );
    if (file == null) return null;
    return PickedMedia(
      path: file.path,
      type: MediaType.video,
      mimeType: file.mimeType,
    );
  }

  @override
  Future<PickedMedia?> pickImage({
    MediaSource source = MediaSource.gallery,
  }) async {
    final XFile? file = await _guard(
      () => _picker.pickImage(
        source: source == MediaSource.camera
            ? ImageSource.camera
            : ImageSource.gallery,
        maxWidth: 2160,
        imageQuality: 88,
      ),
    );
    if (file == null) return null;
    return PickedMedia(
      path: file.path,
      type: MediaType.image,
      mimeType: file.mimeType,
    );
  }

  /// A denied permission is a normal outcome, not a crash. It surfaces as a
  /// message the composer can show next to the button the person just pressed.
  Future<XFile?> _guard(Future<XFile?> Function() action) async {
    try {
      return await action();
    } on Object catch (error) {
      final String message = error.toString().toLowerCase();
      if (message.contains('denied') || message.contains('permission')) {
        throw const RejectedException(
          'Wainzo needs access to your camera or photos for this. You can turn it on in Settings.',
        );
      }
      throw RejectedException(
        "That file couldn't be opened. Try another one. ($error)",
      );
    }
  }
}
