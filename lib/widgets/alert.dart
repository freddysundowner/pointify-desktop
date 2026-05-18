import 'package:flutter/material.dart';
import 'package:get/get.dart';

import '../utils/colors.dart';

generalAlert(
        {String? title,
        String message = "",
        Function? function,
        Function? negativeCallback,
        bool? closeOnPositiveClick = true,
        String positiveText = "Okay",
        String negativeText = "Cancel"}) =>
    showDialog(
        context: Get.context!,
        builder: (_) {
          return AlertDialog(
            title: Text(title ?? ""),
            content: Text(message),
            actions: [
              TextButton(
                  onPressed: () {
                    Get.back();
                    if (negativeCallback != null) {
                      negativeCallback();
                    }
                  },
                  child: Text(
                    negativeText,
                    style:  TextStyle(color: AppColors.mainColor),
                  )),
              TextButton(
                  onPressed: () {
                    if (closeOnPositiveClick == true) Get.back();
                    if (function != null) function();
                  },
                  child: Text(
                    positiveText,
                    style:  TextStyle(color: AppColors.mainColor),
                  ))
            ],
          );
        });

generateWarningAlert({
  String? title,
  String message = "",
  String positiveText = "Okay",
}) {
  return showDialog(
      context: Get.context!,
      builder: (_) {
        return AlertDialog(
          title: Text(title ?? ""),
          content: Text(message),
          actions: [
            TextButton(
                onPressed: () {
                  Get.back();
                },
                child: Text(
                  positiveText,
                  style:  TextStyle(color: AppColors.mainColor),
                )),
          ],
        );
      });
}
