import 'package:flutter/material.dart';

import '../utils/colors.dart';

Widget textBtn({
  String? text = "Select",
  Function? onPressed,
  double? vPadding = 10,
  double? hPadding = 10,
  double? fontSize = 16.0,
  double? radius = 5.0,
  Color? color,
  Color? bgColor,
}) {
  return InkWell(
    onTap: () {
      onPressed!();
    },
    child: Container(
      decoration: BoxDecoration(
          color: bgColor ?? AppColors.lightDeepPurple,
          borderRadius: BorderRadius.circular(radius ?? 5)),
      padding: EdgeInsets.symmetric(
          horizontal: hPadding ?? 10, vertical: vPadding ?? 10),
      child: Text(
        text ?? "Select",
        style: TextStyle(
          color: color ?? Colors.black,
          fontSize: fontSize,
        ),
      ),
    ),
  );
}
