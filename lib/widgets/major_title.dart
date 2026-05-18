import 'package:flutter/material.dart';

Widget majorTitle(
    {required title,
    required Color color,
    required size,
    FontWeight fontWeight = FontWeight.bold}) {
  return Text(
    "$title",
    style: TextStyle(
      color: color,
      fontWeight: fontWeight,
      // fontSize: size ?? 16,
    ),
  );
}
