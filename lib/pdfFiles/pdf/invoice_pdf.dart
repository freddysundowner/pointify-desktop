import 'dart:typed_data';

import 'package:flutter/services.dart' show rootBundle;
import 'package:intl/intl.dart';
import 'package:pdf/pdf.dart';
import 'package:pdf/widgets.dart';
import 'package:pointify/functions/functions.dart';
import 'package:pointify/models/invoice.dart';

Future<Uint8List> invoiceReceipt(Invoice invoice, String type) async {
  final pdf = Document();

  final imageLogo = MemoryImage(
    (await rootBundle.load('assets/images/logo.png')).buffer.asUint8List(),
  );

  final items = invoice.items ?? [];

  final subtotal = items.fold<double>(
    0,
    (sum, item) => sum + ((item.unitPrice ?? 0) * (item.quantity ?? 0)),
  );

  final outstanding = invoice.outstandingBalance ?? 0;
  final total = invoice.totalAmount ?? subtotal;
  final paid = total - outstanding;

  pdf.addPage(
    MultiPage(
      pageFormat: PdfPageFormat.a4,
      margin: const EdgeInsets.all(24),
      build: (context) {
        return [
          // HEADER
          // HEADER
          Container(
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(
              color: PdfColors.grey100,
              borderRadius: BorderRadius.circular(10),
              border: Border.all(
                color: PdfColors.grey300,
                width: 0.8,
              ),
            ),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Expanded(
                  child: Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Container(
                        height: 52,
                        width: 52,
                        padding: const EdgeInsets.all(8),
                        decoration: BoxDecoration(
                          color: PdfColors.white,
                          borderRadius: BorderRadius.circular(10),
                          border: Border.all(
                            color: PdfColors.grey300,
                          ),
                        ),
                        child: Image(imageLogo),
                      ),
                      SizedBox(width: 14),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              invoice.shopId?.name ?? '',
                              style: TextStyle(
                                fontSize: 18,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                            SizedBox(height: 4),
                            Text(
                              invoice.shopId?.location ?? '',
                              style: TextStyle(
                                fontSize: 10,
                                color: PdfColors.grey700,
                              ),
                            ),
                            SizedBox(height: 10),
                            Container(
                              padding: const EdgeInsets.symmetric(
                                horizontal: 10,
                                vertical: 5,
                              ),
                              decoration: BoxDecoration(
                                color: PdfColors.white,
                                borderRadius: BorderRadius.circular(20),
                              ),
                              child: Text(
                                invoice.outstandingBalance! > 0
                                    ? "CREDIT PURCHASE"
                                    : "PAID PURCHASE",
                                style: TextStyle(
                                  fontSize: 8,
                                  fontWeight: FontWeight.bold,
                                  color: invoice.outstandingBalance! > 0
                                      ? PdfColors.red700
                                      : PdfColors.green700,
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
                SizedBox(width: 20),
                Column(
                  crossAxisAlignment: CrossAxisAlignment.end,
                  children: [
                    Text(
                      "INVOICE",
                      style: TextStyle(
                        fontSize: 26,
                        fontWeight: FontWeight.bold,
                        letterSpacing: 1.2,
                      ),
                    ),
                    SizedBox(height: 6),
                    Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 10,
                        vertical: 6,
                      ),
                      decoration: BoxDecoration(
                        color: PdfColors.white,
                        borderRadius: BorderRadius.circular(6),
                        border: Border.all(
                          color: PdfColors.grey300,
                        ),
                      ),
                      child: Text(
                        "Invoice #${invoice.purchaseNo ?? ''}",
                        style: TextStyle(
                          fontSize: 10,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),

          SizedBox(height: 22),

          // INFO SECTION
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    _pdfLabel("Supplier"),
                    SizedBox(height: 4),
                    Text(
                      invoice.supplierId?.name ?? '-',
                      style: TextStyle(
                        fontWeight: FontWeight.bold,
                        fontSize: 12,
                      ),
                    ),
                  ],
                ),
              ),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.end,
                  children: [
                    _pdfInfoRow(
                      "Date",
                      DateFormat("dd MMM yyyy").format(
                        DateTime.parse(invoice.createdAt!).toLocal(),
                      ),
                    ),
                    SizedBox(height: 4),
                    _pdfInfoRow(
                      "Time",
                      DateFormat("hh:mm a").format(
                        DateTime.parse(invoice.createdAt!).toLocal(),
                      ),
                    ),
                    SizedBox(height: 4),
                    _pdfInfoRow(
                      "Served By",
                      invoice.attendantId?.username ?? '',
                    ),
                  ],
                ),
              ),
            ],
          ),

          SizedBox(height: 28),

          // TABLE
          TableHelper.fromTextArray(
            border: null,
            cellAlignment: Alignment.centerLeft,
            headerDecoration: BoxDecoration(
              color: PdfColors.grey200,
            ),
            headerStyle: TextStyle(
              fontWeight: FontWeight.bold,
              fontSize: 11,
            ),
            cellStyle: const TextStyle(
              fontSize: 10,
            ),
            cellPadding: const EdgeInsets.symmetric(
              horizontal: 10,
              vertical: 12,
            ),
            headers: [
              "Qty",
              "Item",
              "Unit Price",
              "Total",
            ],
            data: items.map((e) {
              final lineTotal = (e.quantity ?? 0) * (e.unitPrice ?? 0);

              return [
                "${e.quantity ?? 0}",
                e.product?.name ?? '',
                htmlPrice(e.unitPrice),
                htmlPrice(lineTotal),
              ];
            }).toList(),
          ),

          SizedBox(height: 24),

          // TOTALS
          Align(
            alignment: Alignment.centerRight,
            child: Container(
              width: 220,
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                border: Border.all(
                  color: PdfColors.grey300,
                ),
                borderRadius: BorderRadius.circular(6),
              ),
              child: Column(
                children: [
                  _pdfTotalRow(
                    "Subtotal",
                    htmlPrice(subtotal),
                  ),
                  SizedBox(height: 8),
                  _pdfTotalRow(
                    "Total",
                    htmlPrice(total),
                    bold: true,
                  ),
                  if (paid > 0) ...[
                    SizedBox(height: 8),
                    _pdfTotalRow(
                      "Paid",
                      htmlPrice(paid),
                    ),
                  ],
                  if (outstanding > 0) ...[
                    SizedBox(height: 8),
                    _pdfTotalRow(
                      "Balance",
                      htmlPrice(outstanding),
                      bold: true,
                    ),
                  ],
                ],
              ),
            ),
          ),

          SizedBox(height: 35),

          // FOOTER
          // FOOTER
          SizedBox(height: 40),

          Container(
            padding: const EdgeInsets.symmetric(
              vertical: 18,
              horizontal: 20,
            ),
            decoration: BoxDecoration(
              color: PdfColors.grey100,
              borderRadius: BorderRadius.circular(10),
              border: Border.all(
                color: PdfColors.grey300,
                width: 0.8,
              ),
            ),
            child: Column(
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Text(
                      "Thank you for your business",
                      style: TextStyle(
                        fontSize: 13,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ],
                ),
                SizedBox(height: 8),
                Text(
                  "Goods once sold may not be returned without receipt",
                  style: TextStyle(
                    fontSize: 9,
                    color: PdfColors.grey700,
                  ),
                ),
                SizedBox(height: 12),
                Divider(
                  color: PdfColors.grey400,
                  thickness: 0.6,
                ),
                SizedBox(height: 10),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      "Generated on",
                      style: TextStyle(
                        fontSize: 8,
                        color: PdfColors.grey700,
                      ),
                    ),
                    Text(
                      DateFormat("dd MMM yyyy hh:mm a").format(DateTime.now()),
                      style: TextStyle(
                        fontSize: 8,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ];
      },
    ),
  );

  return pdf.save();
}

Widget _pdfInfoRow(String title, String value) {
  return Row(
    mainAxisAlignment: MainAxisAlignment.end,
    children: [
      Text(
        "$title: ",
        style: TextStyle(
          fontSize: 10,
          color: PdfColors.grey700,
        ),
      ),
      Text(
        value,
        style: TextStyle(
          fontSize: 10,
          fontWeight: FontWeight.bold,
        ),
      ),
    ],
  );
}

Widget _pdfLabel(String text) {
  return Text(
    text.toUpperCase(),
    style: TextStyle(
      fontSize: 9,
      color: PdfColors.grey700,
      fontWeight: FontWeight.bold,
    ),
  );
}

Widget _pdfTotalRow(
  String title,
  String value, {
  bool bold = false,
}) {
  return Row(
    mainAxisAlignment: MainAxisAlignment.spaceBetween,
    children: [
      Text(
        title,
        style: TextStyle(
          fontSize: 10,
          fontWeight: bold ? FontWeight.bold : FontWeight.normal,
        ),
      ),
      Text(
        value,
        style: TextStyle(
          fontSize: 10,
          fontWeight: bold ? FontWeight.bold : FontWeight.normal,
        ),
      ),
    ],
  );
}
