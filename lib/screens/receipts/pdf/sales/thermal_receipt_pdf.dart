import 'dart:typed_data';

import 'package:intl/intl.dart';
import 'package:pdf/pdf.dart';
import 'package:pdf/widgets.dart' as pw;

import '../../../../models/salemodel.dart';

Future<Uint8List> generateThermalReceiptPdf(
  SaleModel saleModel,
) async {
  final pdf = pw.Document();

  final totalPaid = saleModel.amountPaid ?? 0;

  pdf.addPage(
    pw.Page(
      pageFormat: PdfPageFormat(
        72 * PdfPageFormat.mm,
        double.infinity,
        marginAll: 0,
      ),
      build: (context) {
        return pw.Container(
          color: PdfColors.white,
          padding: const pw.EdgeInsets.symmetric(
            horizontal: 6,
            vertical: 6,
          ),
          child: pw.Column(
            crossAxisAlignment: pw.CrossAxisAlignment.start,
            children: [
              /// HEADER
              pw.Center(
                child: pw.Text(
                  saleModel.shopId?.name?.toUpperCase() ?? "STORE",
                  textAlign: pw.TextAlign.center,
                  style: pw.TextStyle(
                    fontSize: 11,
                    fontWeight: pw.FontWeight.bold,
                    letterSpacing: 1,
                  ),
                ),
              ),

              if ((saleModel.shopId?.addressReceipt ?? "").isNotEmpty) ...[
                pw.SizedBox(height: 2),
                pw.Center(
                  child: pw.Text(
                    saleModel.shopId?.addressReceipt ?? "",
                    textAlign: pw.TextAlign.center,
                    style: const pw.TextStyle(
                      fontSize: 8,
                    ),
                  ),
                ),
              ],

              if ((saleModel.shopId?.contact ?? "").isNotEmpty) ...[
                pw.SizedBox(height: 2),
                pw.Center(
                  child: pw.Text(
                    "Tel: ${saleModel.shopId?.contact}",
                    textAlign: pw.TextAlign.center,
                    style: const pw.TextStyle(
                      fontSize: 8,
                    ),
                  ),
                ),
              ],

              if (saleModel.shopId?.paybillTill != null) ...[
                pw.SizedBox(height: 2),
                pw.Center(
                  child: pw.Text(
                    saleModel.shopId?.paybillAccount != null
                        ? "PB: ${saleModel.shopId?.paybillTill} ACC: ${saleModel.shopId?.paybillAccount}"
                        : "TILL: ${saleModel.shopId?.paybillTill}",
                    textAlign: pw.TextAlign.center,
                    style: const pw.TextStyle(
                      fontSize: 8,
                    ),
                  ),
                ),
              ],

              _pdfDivider(),

              /// RECEIPT INFO
              _pdfReceiptRow(
                "Receipt:",
                saleModel.receiptNo ?? "",
              ),

              _pdfReceiptRow(
                "Date:",
                saleModel.createdAt == null
                    ? "-"
                    : DateFormat(
                        "dd/MM/yy HH:mm",
                      ).format(
                        DateTime.parse(
                          saleModel.createdAt!,
                        ),
                      ),
              ),

              _pdfReceiptRow(
                "Cashier:",
                saleModel.attendant?.username ?? "-",
              ),

              _pdfReceiptRow(
                "Customer:",
                saleModel.customerId?.name ?? "Walk-in",
              ),

              _pdfReceiptRow(
                "Payment:",
                saleModel.paymentTag?.toUpperCase() ?? "-",
              ),

              _pdfDivider(),

              /// TABLE HEADER
              pw.Row(
                children: [
                  pw.Expanded(
                    flex: 1,
                    child: pw.Text(
                      "QTY",
                      style: pw.TextStyle(
                        fontSize: 8,
                        fontWeight: pw.FontWeight.bold,
                      ),
                    ),
                  ),
                  pw.Expanded(
                    flex: 5,
                    child: pw.Text(
                      "ITEM",
                      style: pw.TextStyle(
                        fontSize: 8,
                        fontWeight: pw.FontWeight.bold,
                      ),
                    ),
                  ),
                  pw.Expanded(
                    flex: 2,
                    child: pw.Text(
                      "AMOUNT",
                      textAlign: pw.TextAlign.right,
                      style: pw.TextStyle(
                        fontSize: 8,
                        fontWeight: pw.FontWeight.bold,
                      ),
                    ),
                  ),
                ],
              ),

              _pdfDivider(),

              /// ITEMS
              ...List.generate(
                saleModel.items?.length ?? 0,
                (index) {
                  final item = saleModel.items![index];

                  return pw.Padding(
                    padding: const pw.EdgeInsets.only(
                      bottom: 2,
                    ),
                    child: pw.Row(
                      crossAxisAlignment: pw.CrossAxisAlignment.start,
                      children: [
                        pw.Expanded(
                          flex: 1,
                          child: pw.Text(
                            "${item.quantity}",
                            style: const pw.TextStyle(
                              fontSize: 8,
                            ),
                          ),
                        ),
                        pw.Expanded(
                          flex: 5,
                          child: pw.Text(
                            item.product?.name ?? "",
                            style: const pw.TextStyle(
                              fontSize: 8,
                            ),
                          ),
                        ),
                        pw.Expanded(
                          flex: 2,
                          child: pw.Text(
                            (item.totalLinePrice ?? 0).toStringAsFixed(
                              2,
                            ),
                            textAlign: pw.TextAlign.right,
                            style: const pw.TextStyle(
                              fontSize: 8,
                            ),
                          ),
                        ),
                      ],
                    ),
                  );
                },
              ),

              _pdfDivider(),

              /// TOTALS
              _pdfAmountRow(
                "Subtotal",
                ((saleModel.totalWithDiscount ?? 0) +
                        (saleModel.totalDiscount ?? 0))
                    .toStringAsFixed(2),
              ),

              _pdfAmountRow(
                "Discount",
                (saleModel.totalDiscount ?? 0).toStringAsFixed(2),
              ),

              _pdfAmountRow(
                "Tax",
                (saleModel.totaltax ?? 0).toStringAsFixed(2),
              ),

              if ((saleModel.extraCharges ?? []).isNotEmpty) ...[
                ...List.generate(
                  saleModel.extraCharges?.length ?? 0,
                  (index) {
                    final charge = saleModel.extraCharges![index];

                    return _pdfAmountRow(
                      charge.name ?? "",
                      (charge.amount ?? 0).toStringAsFixed(
                        2,
                      ),
                    );
                  },
                ),
              ],

              _pdfDivider(),

              _pdfAmountRow(
                "TOTAL",
                (saleModel.totalWithDiscount ?? 0).toStringAsFixed(2),
                bold: true,
                large: true,
              ),

              _pdfDivider(),

              /// PAYMENT SUMMARY
              pw.Text(
                "PAYMENT SUMMARY",
                style: pw.TextStyle(
                  fontSize: 8,
                  fontWeight: pw.FontWeight.bold,
                ),
              ),

              pw.SizedBox(height: 2),

              _pdfAmountRow(
                "Paid",
                totalPaid.toStringAsFixed(
                  2,
                ),
              ),

              _pdfAmountRow(
                "Balance",
                (saleModel.outstandingBalance ?? 0).toStringAsFixed(2),
              ),

              _pdfDivider(),

              pw.SizedBox(height: 3),

              pw.Center(
                child: pw.Text(
                  "Thank you for shopping!",
                  style: const pw.TextStyle(
                    fontSize: 8,
                  ),
                ),
              ),

              pw.SizedBox(height: 2),

              pw.Center(
                child: pw.Text(
                  "Powered by Pointify",
                  style: const pw.TextStyle(
                    fontSize: 7,
                  ),
                ),
              ),

              pw.SizedBox(height: 2),

              pw.Center(
                child: pw.Text(
                  "************************",
                  style: const pw.TextStyle(
                    fontSize: 8,
                    letterSpacing: 1,
                  ),
                ),
              ),
            ],
          ),
        );
      },
    ),
  );

  return pdf.save();
}

pw.Widget _pdfDivider() {
  return pw.Padding(
    padding: const pw.EdgeInsets.symmetric(
      vertical: 2,
    ),
    child: pw.Container(
      width: double.infinity,
      child: pw.Divider(
        thickness: 0.6,
        color: PdfColors.black,
      ),
    ),
  );
}

pw.Widget _pdfReceiptRow(
  String title,
  String value,
) {
  return pw.Padding(
    padding: const pw.EdgeInsets.only(
      bottom: 1,
    ),
    child: pw.Row(
      crossAxisAlignment: pw.CrossAxisAlignment.start,
      children: [
        pw.SizedBox(
          width: 52,
          child: pw.Text(
            title,
            style: pw.TextStyle(
              fontSize: 8,
              fontWeight: pw.FontWeight.bold,
              height: 1,
            ),
          ),
        ),
        pw.Expanded(
          child: pw.Text(
            value,
            style: const pw.TextStyle(
              fontSize: 8,
              height: 1,
            ),
          ),
        ),
      ],
    ),
  );
}

pw.Widget _pdfAmountRow(
  String title,
  String amount, {
  bool bold = false,
  bool large = false,
}) {
  return pw.Padding(
    padding: const pw.EdgeInsets.only(
      bottom: 1,
    ),
    child: pw.Row(
      children: [
        pw.Expanded(
          child: pw.Text(
            title,
            style: pw.TextStyle(
              fontSize: large ? 10 : 8,
              fontWeight: bold ? pw.FontWeight.bold : pw.FontWeight.normal,
            ),
          ),
        ),
        pw.Text(
          amount,
          style: pw.TextStyle(
            fontSize: large ? 10 : 8,
            fontWeight: bold ? pw.FontWeight.bold : pw.FontWeight.normal,
          ),
        ),
      ],
    ),
  );
}
