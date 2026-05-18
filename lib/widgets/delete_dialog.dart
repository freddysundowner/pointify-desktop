import 'package:flutter/material.dart';
import 'package:get/get.dart';

import '../utils/colors.dart';

deleteDialog({required context, required onPressed, String? message}) {
  return showDialog(
      context: context,
      builder: (_) {
        return AlertDialog(
          title: const Text(
            "Confirm Delete",
            style: TextStyle(
              color: Colors.black,
              fontWeight: FontWeight.bold,
            ),
          ),
          content: Text(message ?? "Do you want to delete this item?"),
          actions: [
            TextButton(
              onPressed: () {
                Get.back();
              },
              child: Text(
                "Cancel".toUpperCase(),
                style:  TextStyle(
                  color: AppColors.mainColor,
                  fontWeight: FontWeight.bold,
                ),
              ),
            ),
            TextButton(
              onPressed: () {
                Get.back();
                onPressed();
                Get.back();
              },
              child: Text(
                "Ok Delete".toUpperCase(),
                style:  TextStyle(
                  color: AppColors.mainColor,
                  fontWeight: FontWeight.bold,
                ),
              ),
            ),
          ],
        );
      });
}
