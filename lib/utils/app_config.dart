import 'package:flutter/material.dart';

class AppConfig {
  static var stripePublishKey;
  static var app_name;
  static var app_logo = "";
  static var mainColor = Colors.deepPurple;
  static var app_slogan;
  static var offline_mode = false;
  static var demo_mode = false;
  static var country_code;
  static var privacy_policy = 'https://pointifypos.com/privacy';
  static var androidLink =
    'https://play.google.com/store/apps/details?id=com.pointify.com';
  static var iosLink = 'https://apps.apple.com/tr/app/pointify-pos/id6456891671';
  // Maps keys must NOT be committed to source. Supply them at build time,
  // e.g. --dart-define=MAPS_ANDROID_KEY=... --dart-define=MAPS_IOS_KEY=...
  // The previous hardcoded key was exposed and must be rotated in Google Cloud.
  static var androidKey = const String.fromEnvironment('MAPS_ANDROID_KEY');
  static var iosKey = const String.fromEnvironment('MAPS_IOS_KEY');
  static var appstoreId = '6456891671';
}