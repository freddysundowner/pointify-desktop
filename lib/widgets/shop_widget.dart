import 'package:flutter/material.dart';

import 'major_title.dart';

Widget shopWidget({
  required controller,
  required name,
}) {
  return Column(
    crossAxisAlignment: CrossAxisAlignment.start,
    children: [
      const SizedBox(height: 10),
      majorTitle(title: "$name", color: Colors.black, size: 16.0),
      const SizedBox(height: 5),
      TextFormField(
        controller: controller,
        keyboardType: TextInputType.text,
        decoration: InputDecoration(
          contentPadding: const EdgeInsets.all(20),
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
