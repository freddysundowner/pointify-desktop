import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:intl/intl.dart';
import 'package:pointify/controllers/reports_controller.dart';
import 'package:pointify/utils/colors.dart';
import 'package:pointify/widgets/textbutton.dart';

import '../widgets/major_title.dart';

class DateRangerPicker extends StatelessWidget {
  final Function function;
    DateRangerPicker({super.key, required this.function});
  final ReportsController reportsController = Get.find<ReportsController>();
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        titleSpacing: 0,
        backgroundColor: Colors.white,
        elevation: 0.3,
        centerTitle: false,
        leading: IconButton(
          onPressed: () {
            Get.back();
          },
          icon:  Icon(
            Icons.clear,
            color: AppColors.mainColor,
          ),
        ),
        title: majorTitle(
            title: "Select Date Filter",
            color: AppColors.mainColor,
            size: 16.0),
      ),
      body: Container(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 10),
        child: Column(
          children: [
            const SizedBox(
              height: 10,
            ),
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text("Start date"),
                const SizedBox(
                  height: 3,
                ),
                TextFormField(
                  readOnly: true,
                  controller: reportsController.textStartDate,
                  onTap: () async {
                    DateTime? date = await showDatePicker(
                      context: Get.context!,
                      initialDate: DateTime.now(),
                      firstDate: DateTime(1989, 1, 1),
                      lastDate: DateTime.now().add(const Duration(days: 365)),
                    );
                    reportsController.filterStartDate.value =
                        DateFormat("yyyy-MM-dd").format(date!);
                    reportsController.textStartDate.text =
                        reportsController.filterStartDate.value;
                  },
                  style: const TextStyle(color: Colors.black),
                  decoration: InputDecoration(
                    contentPadding: const EdgeInsets.symmetric(
                        vertical: 10, horizontal: 10),
                    suffixIcon: SizedBox(
                      width: 120,
                      child: Row(
                        crossAxisAlignment: CrossAxisAlignment.end,
                        mainAxisAlignment: MainAxisAlignment.end,
                        children: [
                          IconButton(
                              onPressed: () async {
                                reportsController.textStartDate.clear();
                              },
                              icon: const Icon(Icons.date_range)),
                        ],
                      ),
                    ),
                    hintText: DateFormat("dd-MM-yyyy").format(DateTime.now()),
                    hintStyle: const TextStyle(color: Colors.grey),
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(5),
                    ),
                    focusedBorder: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(5),
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(
              height: 20,
            ),
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text("End date"),
                const SizedBox(
                  height: 3,
                ),
                TextFormField(
                  controller: reportsController.textEndDate,
                  style: const TextStyle(color: Colors.black),
                  readOnly: true,
                  onTap: () async {
                    DateTime? date = await showDatePicker(
                      context: Get.context!,
                      initialDate: DateTime.now(),
                      firstDate: DateTime(1989, 1, 1),
                      lastDate: DateTime.now().add(const Duration(days: 365)),
                    );
                    reportsController.filterEndDate.value =
                        DateFormat("yyyy-MM-dd").format(date!);
                    reportsController.textEndDate.text =
                        reportsController.filterEndDate.value;
                  },
                  decoration: InputDecoration(
                    hintStyle: const TextStyle(color: Colors.grey),
                    contentPadding: const EdgeInsets.symmetric(
                        vertical: 10, horizontal: 10),
                    suffixIcon: SizedBox(
                      width: 120,
                      child: Row(
                        crossAxisAlignment: CrossAxisAlignment.end,
                        mainAxisAlignment: MainAxisAlignment.end,
                        children: [
                          IconButton(
                            onPressed: () async {
                              reportsController.textEndDate.clear();
                            },
                            icon: Icon(
                              reportsController.textEndDate.text.isEmpty
                                  ? Icons.date_range
                                  : Icons.clear,
                              color: AppColors.mainColor,
                            ),
                          ),
                        ],
                      ),
                    ),
                    hintText: DateFormat("dd-MM-yyyy").format(DateTime.now()),
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(5),
                    ),
                    focusedBorder: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(5),
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(
              height: 20,
            ),
            textBtn(
              onPressed: () {
                function(
                  reportsController.textStartDate.text,
                  reportsController.textEndDate.text,
                );
              },
              text: "Filter ",
              hPadding: 60,
              bgColor: AppColors.mainColor,
              color: Colors.white,
            )
          ],
        ),
      ),
    );
  }
}
