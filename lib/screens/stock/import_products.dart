import 'package:file_picker/file_picker.dart';
import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:pointify/controllers/productcontroller.dart';
import 'package:pointify/responsive/responsiveness.dart';
import 'package:pointify/screens/stock/stock_transfer.dart';

import '../../controllers/shopcontroller.dart';
import '../../functions/functions.dart';
import '../../utils/colors.dart';
import '../../widgets/alert.dart';
import '../../widgets/major_title.dart';

class ImportProducts extends StatelessWidget {
  ImportProducts({Key? key}) : super(key: key);

  final ProductController productController = Get.find<ProductController>();
  final ShopController shopController = Get.find<ShopController>();

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        leading: IconButton(
          onPressed: () {
            Get.back();
          },
          icon:  Icon(
            Icons.arrow_back,
            color: AppColors.mainColor,
          ),
        ),
        title:  Text(
          "Import Products",
          style: TextStyle(color: AppColors.mainColor),
        ),
        elevation: 0,
        backgroundColor: Colors.white,
      ),
      body: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          const Text(
            "Select Source",
            style: TextStyle(fontSize: 17, fontWeight: FontWeight.bold),
          ),
          const SizedBox(
            height: 10,
          ),
          InkWell(
            splashColor: Colors.transparent,
            onTap: () {
              shopController.getShops();
              Get.to(() => StockTransfer(
                    type: "import",
                  ));
            },
            child: Center(
              child: Container(
                padding: const EdgeInsets.all(10),
                width: isSmallScreen(context) ? double.infinity : 200,
                margin: const EdgeInsets.symmetric(horizontal: 20),
                decoration: BoxDecoration(
                    border: Border.all(width: 3, color: AppColors.mainColor),
                    borderRadius: BorderRadius.circular(40)),
                child: Center(
                    child: majorTitle(
                        title: "From another shop",
                        color: AppColors.mainColor,
                        size: 18.0)),
              ),
            ),
          ),
          const SizedBox(
            height: 10,
          ),
          InkWell(
            splashColor: Colors.transparent,
            onTap: () async {
              FilePickerResult? result = await pickExcelFile();
              if (result != null) {
                List<List<String>>? excelData =
                    await readExcel(result.files.single.path!);
                if (excelData.isNotEmpty) {
                  Get.find<ProductController>().importProducts(excelData);
                } else {
                  generalAlert(
                      message:
                          "No data found or document is of wrong type, make sure its of type xlsx",
                      title: "Error");
                }
              }
            },
            child: Center(
              child: Container(
                padding: const EdgeInsets.all(10),
                width: isSmallScreen(context) ? double.infinity : 200,
                margin: const EdgeInsets.symmetric(horizontal: 20),
                decoration: BoxDecoration(
                    border: Border.all(width: 3, color: AppColors.mainColor),
                    borderRadius: BorderRadius.circular(40),
                    color: AppColors.mainColor),
                child: Center(
                  child: Row(
                    crossAxisAlignment: CrossAxisAlignment.center,
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      const Icon(
                        Icons.receipt_long,
                        color: Colors.white,
                      ),
                      const SizedBox(
                        width: 10,
                      ),
                      majorTitle(
                          title: "From Excel file",
                          color: Colors.white,
                          size: 18.0),
                    ],
                  ),
                ),
              ),
            ),
          ),
          const SizedBox(
            height: 10,
          ),
          const Center(
            child: Text(
              "Download sample excel sheet below and see how to arrange products to import",
              textAlign: TextAlign.center,
            ),
          ),
          const SizedBox(
            height: 10,
          ),
          InkWell(
            onTap: () async {
              String? filePath =
                  await exportToExcel(productController.sampledata, "sample");
              await openFile(filePath!);
            },
            child:  Text(
              "Download sample template",
              style: TextStyle(
                  color: AppColors.mainColor, fontWeight: FontWeight.bold),
            ),
          )
        ],
      ),
    );
  }
}
