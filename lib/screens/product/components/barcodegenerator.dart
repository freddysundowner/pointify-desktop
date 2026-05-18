import 'dart:io';

import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:get/get.dart';
import 'package:path_provider/path_provider.dart';
import 'package:pdf/pdf.dart';
import 'package:pdf/widgets.dart' as pw;
import 'package:pointify/utils/colors.dart';
import 'package:pointify/widgets/textbutton.dart';
import 'package:printing/printing.dart';

import '../../../controllers/productcontroller.dart';
import '../../../models/product.dart';

class BarcodeGenerator extends StatelessWidget {
  final Product product; // Replace with your actual product code

  BarcodeGenerator({super.key, required this.product});

  final ProductController productController = Get.find<ProductController>();
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.white,
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0,
        leading: IconButton(
          onPressed: () {
            Get.back();
          },
          icon:  Icon(
            Icons.clear,
            color: AppColors.mainColor,
            size: 30,
          ),
        ),
      ),
      body: Center(
        child: Container(
          margin: const EdgeInsets.symmetric(vertical: 20, horizontal: 20),
          child: Column(
            children: [
              Row(
                children: [
                  const Text("How many barcodes "),
                  Expanded(
                    child: TextFormField(
                      initialValue:
                          productController.barcodeCounts.value.toString(),
                      keyboardType: TextInputType.number,
                      onChanged: (value) {
                        if (value.isEmpty) {
                          productController.barcodeCounts.value = 1;
                        } else {
                          productController.barcodeCounts.value =
                              int.parse(value);
                        }
                      },
                      decoration: InputDecoration(
                        contentPadding: const EdgeInsets.fromLTRB(10, 2, 10, 2),
                        hintText: "How many?",
                        border: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(10),
                        ),
                        focusedBorder: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(10),
                        ),
                      ),
                    ),
                  )
                ],
              ),
              const SizedBox(height: 10),
              Container(
                margin: const EdgeInsets.only(bottom: 20),
                child: textBtn(
                    onPressed: () async {
                      final List<String> barcodeDataList = List.generate(
                          productController.barcodeCounts.value > 18
                              ? 18
                              : productController.barcodeCounts.value,
                          (index) => 'Barcode ${index + 1}');

                      try {
                        final Uint8List pdfBytes =
                            await generatePdf(barcodeDataList);

                        await Printing.directPrintPdf(
                          printer: const Printer(
                              url:
                                  'your_printer_url'), // Replace 'your_printer_url' with the actual printer URL
                          onLayout: (PdfPageFormat format) async => pdfBytes,
                        );
                      } catch (e) {
                        if (kDebugMode) {
                          print('Error printing PDF: $e');
                        }
                      }
                    },
                    text: "Print",
                    color: Colors.white,
                    bgColor: AppColors.mainColor,
                    vPadding: 10,
                    hPadding: 50),
              ),
              Expanded(
                child: Obx(
                  () => GridView.builder(
                      itemCount: productController.barcodeCounts.value,
                      gridDelegate:
                          const SliverGridDelegateWithFixedCrossAxisCount(
                              childAspectRatio: 1.1,
                              crossAxisCount: 3,
                              crossAxisSpacing: 10,
                              mainAxisSpacing: 10),
                      itemBuilder: (context, index) {
                        return Column(
                          children: [
                            pw.BarcodeWidget(
                              barcode: pw.Barcode.code128(escapes: true),
                              data: product.barcode!,
                              drawText: true,
                              // width: 350,
                              height: 80,
                            ) as Widget,
                          ],
                        );
                      }),
                ),
              )
            ],
          ),
        ),
      ),
    );
  }

  Future<Uint8List> generatePdf(List<String> barcodeDataList) async {
    final pdf = pw.Document();

    final barcodeWidgets = barcodeDataList
        .map((barcodeData) => buildBarcode(barcodeData))
        .toList();
    final grid = pw.GridView(
      childAspectRatio: 0.65,
      crossAxisCount: 3,
      crossAxisSpacing: 10,
      mainAxisSpacing: 10,
      children: barcodeWidgets,
    );
    pdf.addPage(pw.Page(
      build: (pw.Context context) {
        return pw.Column(
          children: [
            pw.Text('${product.name}',
                style:
                    pw.TextStyle(fontSize: 20, fontWeight: pw.FontWeight.bold)),
            pw.SizedBox(height: 20),
            grid
          ],
        );
      },
    ));

    final directory = await getTemporaryDirectory();
    final path = '${directory.path}/${product.name}.pdf';

    await File(path).writeAsBytes(await pdf.save());

    return File(path).readAsBytesSync();
  }

  pw.Widget buildBarcode(String data) {
    return pw.Container(
        padding: const pw.EdgeInsets.symmetric(horizontal: 10),
        child: pw.BarcodeWidget(
          barcode: pw.Barcode.code128(escapes: true),
          data: product.barcode ?? product.name!,
          drawText: true,
          height: 80,
        ));
  }
}
