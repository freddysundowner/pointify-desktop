import 'package:flutter/material.dart';

bool isSmallScreen(context) => MediaQuery.of(context).size.width < 768;


class ResponsiveWidget extends StatelessWidget {
  final Widget largeScreen;

  final Widget smallScreen;

  const ResponsiveWidget({
    Key? key,
    required this.largeScreen,
    required this.smallScreen,
  }) : super(key: key);

  static bool isTabletScreen(BuildContext context) =>
      MediaQuery.of(context).size.width < 1200 &&
      MediaQuery.of(context).size.width >= 768;

  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(builder: (context, constrains) {
      double width = constrains.maxWidth;
      if (width <= 768) {
        return smallScreen;
      } else {
        return largeScreen;
      }
    });
  }
}
