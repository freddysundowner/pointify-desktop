import 'package:flutter/material.dart';
import 'package:image_cropper/image_cropper.dart';
import 'package:image_picker/image_picker.dart';

choseImageFromLocalFiles(BuildContext context,
    {CropAspectRatio aspectRatio = const CropAspectRatio(ratioX: 1, ratioY: 1),
    int maxSizeInKB = 1024,
    int minSizeInKB = 5}) async {
  final imgSource = await showDialog(
    builder: (context) {
      return AlertDialog(
        title: const Text("Pick image source"),
        actions: [
          TextButton(
            child: const Text("Camera"),
            onPressed: () {
              Navigator.pop(context, ImageSource.camera);
            },
          ),
          TextButton(
            child: const Text("Gallery"),
            onPressed: () {
              Navigator.pop(context, ImageSource.gallery);
            },
          ),
        ],
      );
    },
    context: context,
  );

  return await choseImageFromLocalFiless(imgSource: imgSource);
}

choseImageFromLocalFiless(
    {CropAspectRatio aspectRatio = const CropAspectRatio(ratioX: 2, ratioY: 3),
    int maxSizeInKB = 1024,
    int minSizeInKB = 5,
    ImageSource? imgSource,
    bool isVideo = false}) async {
  ImagePicker imgPicker = ImagePicker();
  if (imgSource == null) {
    return;
  }
  if (isVideo) {
    XFile? mediaPicked = isVideo
        ? await imgPicker.pickVideo(source: ImageSource.gallery) // For videos
        : await imgPicker.pickImage(
            source: imgSource, imageQuality: 40); // For images

    return mediaPicked?.path;
  }

  XFile? imagePicked = await imgPicker.pickImage(
    source: imgSource,
    imageQuality: 40,
  );

  if (imagePicked != null) {
    final CroppedFile? croppedFile = await ImageCropper().cropImage(
      sourcePath: imagePicked.path,
      aspectRatio: aspectRatio,
      uiSettings: [
        AndroidUiSettings(
          toolbarTitle: 'Crop Image',
          toolbarColor: Colors.black,
          toolbarWidgetColor: Colors.white,
          initAspectRatio: CropAspectRatioPreset.original,
          lockAspectRatio: false,
        ),
        IOSUiSettings(
          title: 'Crop Image',
          aspectRatioLockEnabled: false,
        ),
      ],
    );

    if (croppedFile != null) {
      return croppedFile.path;
    }
  }
}
