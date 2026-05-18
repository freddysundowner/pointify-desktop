import 'package:flutter/material.dart';

Widget minorTitle({required title, required Color color, double? size}) {
  return Text(
    "$title",
    style: TextStyle(color: color, fontSize: size ?? 14),
  );
}
