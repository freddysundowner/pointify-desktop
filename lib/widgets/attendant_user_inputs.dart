import 'package:flutter/material.dart';

import 'major_title.dart';

Widget attendantUserInputs(
    {required name, required controller, bool enabled = true}) {
  return Column(
    crossAxisAlignment: CrossAxisAlignment.start,
    children: [
      majorTitle(title: name, color: Colors.black, size: 14.0),
      const SizedBox(height: 10),
      TextFormField(
        controller: controller,
        enabled: enabled,
        decoration: InputDecoration(
          isDense: true,
          contentPadding: const EdgeInsets.all(15),
          border: OutlineInputBorder(
              borderRadius: BorderRadius.circular(10),
              borderSide: const BorderSide(color: Colors.grey, width: 1)),
          focusedBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(10),
              borderSide: const BorderSide(color: Colors.grey, width: 1)),
        ),
      )
    ],
  );
}
