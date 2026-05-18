import 'dart:io';
import 'dart:math';

import 'package:excel/excel.dart';
import 'package:file_picker/file_picker.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:intl/intl.dart';
import 'package:open_file/open_file.dart';
import 'package:path/path.dart';
import 'package:path_provider/path_provider.dart';
import 'package:pointify/controllers/usercontroller.dart';
import 'package:pointify/main.dart';

import '../controllers/authcontroller.dart';
import '../models/product.dart';

debugPrintMessage(message) {
  if (kDebugMode) {
    print(message);
  }
}

String htmlPrice(amount, {String? currency}) {
  return "${currency ?? userController.currentUser.value?.primaryShop?.currency!.toUpperCase()} $amount";
}

double toDouble(value) {
  if (value is int) {
    return value.roundToDouble();
  }
  if (value is String) {
    return double.parse(value);
  }
  return value;
}

AuthController authController = Get.find<AuthController>();
const _chars = 'AaBbCcDdEeFfGgHhIiJjKkLlMmNnOoPpQqRrSsTtUuVvWwXxYyZz1234567890';
Random _rnd = Random();
bool isInteger(num value) => value is int || value == value.roundToDouble();

List<int> getYears(int year) {
  int currentYear = DateTime.now().year;

  List<int> yearsTilPresent = [];

  while (year <= currentYear) {
    yearsTilPresent.add(year);
    year++;
  }

  return yearsTilPresent;
}

navigate({dynamic page}) {
  return Get.to(() => page);
}

showDate(String date) => Text(
      '${DateFormat("MMM dd yyyy hh:mm a").format(DateTime.parse(date).toLocal())} ',
      style: const TextStyle(fontSize: 11, fontStyle: FontStyle.italic),
    );

getYearlyRecords(Product product,
    {required Function function, required int year}) {
  DateTime now = DateTime(year, 1);
  DateTime firstDayofYear = DateTime(now.year, now.month, 1);
  DateTime now2 = DateTime(year, 12);
  DateTime lastDayofYear = DateTime(now2.year, now2.month + 1, 0);
  function(product, DateFormat("yyy-MM-dd").format(firstDayofYear),
      DateFormat("yyy-MM-dd").format(lastDayofYear));
}

void getMonthlyProductSales(Product product, int i,
    {required Function function, required int year}) {
  DateTime now = DateTime(year, i + 1);
  var lastday =
      DateTime(now.year, now.month + 1, 0).add(const Duration(hours: 24));
  final noww = DateTime(year, i + 1);
  var firstday = DateTime(noww.year, noww.month, 1);

  function(product, DateFormat("yyy-MM-dd").format(firstday),
      DateFormat("yyy-MM-dd").format(lastday));
}

String getRandomString(int length) => String.fromCharCodes(Iterable.generate(
    length, (_) => _chars.codeUnitAt(_rnd.nextInt(_chars.length))));

verifyPermission({required String category, permission, bool group = false}) {
  if (userController.switcheduser.value != null) {
    if (["accounts", "shop", "usage", "support"].contains(category)) {
      return false;
    }
  }
  if (userController.currentUser.value?.usertype == "attendant") {
    List role =
        userController.roles.where((p0) => p0["key"] == category).toList();
    print(role);
    if (role.isEmpty) return false;
    if (group) {
      return role.isNotEmpty;
    }
    List roleValue = role[0]["value"] as List;
    var index = roleValue.indexWhere((element) => element == permission) != -1;
    return index;
  }
  return true;
}

bool switchedUserCheckPermission(
    {required String category, permission, bool group = false}) {
  UserController usercontroller = Get.find<UserController>();
  List role =
      usercontroller.roles.where((p0) => p0["key"] == category).toList();
  List roleValue = role[0]["value"] as List;
  var index = roleValue.indexWhere((element) => element == permission) != -1;
  return index;
}

Future<String?> exportToExcel(List<List<Object?>> data, String filename) async {
  Directory? externalDir = await getExternalStorageDirectory();
  if (externalDir == null) {
    Get.snackbar(
      "Error",
      "Unable to get external storage directory",
    );
    return null;
  }

  var excel = Excel.createExcel();
  var sheet = excel['Sheet1'];

  // Add data to the Excel sheet
  for (var row in data) {
    sheet.appendRow(row);
  }

  // Ensure the directory exists
  var directory = Directory(externalDir.path);
  if (!await directory.exists()) {
    await directory.create(recursive: true);
  }

  // Save the Excel file
  List<int>? encoded = excel.encode();
  if (encoded != null) {
    String filePath = join(externalDir.path,
        '${"${filename}_${DateTime.now().millisecond}"}.xlsx');
    File(filePath)
      ..createSync()
      ..writeAsBytesSync(encoded);
    return filePath;
  } else {
    return null;
  }
}

Future<void> openFile(String filePath) async {
  if (await File(filePath).exists()) {
    await OpenFile.open(filePath);
  }
}

Future<FilePickerResult?> pickExcelFile() async {
  return await FilePicker.platform.pickFiles(
    type: FileType.custom,
    allowedExtensions: ['xlsx', 'xls'],
  );
}

Future<List<List<String>>> readExcel(String path) async {
  // Read the Excel file
  var bytes = File(path).readAsBytesSync();
  var excel = Excel.decodeBytes(bytes);

  List<List<String>> excelData = [];

  // Access the specific sheet by name
  var sheet = excel['Sheet1'];
  print(sheet.rows);

  // Skip the header row
  bool isFirstRow = true;
  for (var row in sheet.rows) {
    // if (isFirstRow) {
    //   isFirstRow = false; // Skip the first row (headers)
    //   continue;
    // }

    // Convert cell values to strings, handling nulls gracefully
    List<String> rowData = row.map((cell) {
      if (cell != null) {
        return cell.value.toString().trim(); // Accessing the cell value
      } else {
        return ''; // Return empty string for null cells
      }
    }).toList();

    excelData.add(rowData);
  }

  return excelData;
}
