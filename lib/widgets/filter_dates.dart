import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:pointify/controllers/reports_controller.dart';

import '../reports/daterange_picker.dart';
import '../utils/colors.dart';

List<Map<String, dynamic>> filterCards = [
  {
    "title": "Today",
    "key": "today",
  },
  {
    "title": "Yesterday",
    "key": "yesterday",
  },
  {
    "title": "This Week",
    "key": "week",
  },
  {
    "title": "This Month",
    "key": "month",
  },
  {
    "title": "This Year",
    "key": "year",
  },
  {
    "title": "Custom",
    "key": "custom",
  }
];

Widget filterByDates({required Function onFilter}) {
  return SingleChildScrollView(
    scrollDirection: Axis.horizontal,
    child: Padding(
      padding: const EdgeInsets.symmetric(horizontal: 8.0),
      child: Wrap(
          spacing: 15,
          direction: Axis.horizontal,
          clipBehavior: Clip.none,
          children: List.generate(
              filterCards.length,
              (index) => filterCards[index]["key"] == "today"
                  ? filterCard(
                      onFilter: onFilter,
                      title: filterCards[index]["title"],
                      key: filterCards[index]["key"])
                  : filterCard(
                      onFilter: onFilter,
                      title: filterCards[index]["title"],
                      key: filterCards[index]["key"]))),
    ),
  );
}

DateTime startOfDay(DateTime d) => DateTime(d.year, d.month, d.day);

DateTime endOfDay(DateTime d) =>
    DateTime(d.year, d.month, d.day, 23, 59, 59, 999);

Widget filterCard(
    {required Function onFilter, String title = "", String key = ""}) {
  return InkWell(
    onTap: () async {
      final now = DateTime.now();
      late DateTime from;
      late DateTime to;

      switch (key) {
        case "today":
          from = startOfDay(now);
          to = endOfDay(now);
          break;

        case "yesterday":
          final y = now.subtract(const Duration(days: 1));
          from = startOfDay(y);
          to = endOfDay(y);
          break;

        case "week":
          // Monday is 1, Sunday is 7
          final startOfWeek = now.subtract(Duration(days: now.weekday - 1));
          from = startOfDay(startOfWeek);
          to = endOfDay(startOfWeek.add(const Duration(days: 6)));
          break;

        case "month":
          from = DateTime(now.year, now.month, 1);
          to = endOfDay(DateTime(now.year, now.month + 1, 0));
          break;

        case "year":
          from = DateTime(now.year, 1, 1);
          to = endOfDay(DateTime(now.year, 12, 31));
          break;

        case "custom":
          Get.to(() => DateRangerPicker(
                function: (String fromm, String too) {
                  from = startOfDay(DateTime.parse(fromm));
                  to = endOfDay(DateTime.parse(too));
                  Get.back();
                  onFilter(from, to, key);
                },
              ));
          return;

        default:
          return;
      }

      onFilter(from, to, key);
    },
    child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 10),
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(10),
          color: Get.find<ReportsController>().activeFilter.value == key
              ? AppColors.mainColor
              : Colors.white,
          border: Get.find<ReportsController>().activeFilter.value == key
              ? null
              : Border.all(color: AppColors.lightDeepPurple),
          boxShadow: !(Get.find<ReportsController>().activeFilter.value == key)
              ? null
              : const [
                  BoxShadow(
                    color: Colors.grey,
                    offset: Offset(0.0, 0.0), //(x,y)
                    blurRadius: 4.0,
                  ),
                ],
        ),
        child: Text(
          title,
          style: TextStyle(
              color: Get.find<ReportsController>().activeFilter.value == key
                  ? Colors.white
                  : AppColors.mainColor),
        )),
  );
}
