// sales_by_items.dart

import 'dart:io';

import 'package:flutter/services.dart';
import 'package:intl/intl.dart';
import 'package:open_file/open_file.dart';
import 'package:path_provider/path_provider.dart';
import 'package:pdf/pdf.dart';
import 'package:pdf/widgets.dart' as pw;
import 'package:pointify/models/customer.dart';
import 'package:pointify/models/payment.dart';
import 'package:pointify/models/salemodel.dart';
import 'package:pointify/models/salereturn.dart';

Future<void> downloadSalesItemsPdf(
  List<SaleModel> sales, {
  String? reportTitle,
  String? statusFilter,
  DateTime? startDateFilter,
  DateTime? endDateFilter,
  bool useOutstandingForCredit = false,
  num? walletBalance,
}) async {
  final fonts = await _loadFonts();

  final pdf = pw.Document(
    theme: pw.ThemeData.withFont(
      base: fonts.regular,
      bold: fonts.bold,
    ),
  );

  final shop = sales.isNotEmpty ? sales.first.shopId : null;
  final customer = sales.isNotEmpty ? sales.first.customerId : null;

  final bool hasStatusFilter =
      statusFilter != null && statusFilter.trim().isNotEmpty;

  final bool hasDateFilter = startDateFilter != null || endDateFilter != null;

  final currency = shop?.currency ?? "KES";

  String money(num value) {
    return "$currency ${NumberFormat("#,##0.00").format(value)}";
  }

  num saleReportAmount(SaleModel sale) {
    if (useOutstandingForCredit || statusFilter == "credit") {
      return sale.outstandingBalance ??
          ((sale.totalWithDiscount ?? sale.totalAmount ?? 0) -
              (sale.amountPaid ?? 0));
    }

    return sale.totalWithDiscount ?? sale.totalAmount ?? 0;
  }

  final totalSales = sales.fold<num>(
    0,
    (sum, sale) => sum + saleReportAmount(sale),
  );

  final totalOriginalSales = sales.fold<num>(
    0,
    (sum, sale) => sum + (sale.totalWithDiscount ?? sale.totalAmount ?? 0),
  );

  final totalPaid = sales.fold<num>(
    0,
    (sum, sale) => sum + (sale.amountPaid ?? 0),
  );

  final totalItems = sales.fold<int>(
    0,
    (sum, sale) =>
        sum +
        (sale.items ?? []).fold<int>(
          0,
          (itemSum, item) => itemSum + ((item.quantity ?? 0).toInt()),
        ),
  );

  num paymentTotal(String type) {
    return sales
        .where((sale) => (sale.paymentType ?? "").toLowerCase() == type)
        .fold<num>(
          0,
          (sum, sale) => sum + saleReportAmount(sale),
        );
  }

  final cashTotal = paymentTotal("cash");
  final mpesaTotal = paymentTotal("mpesa");
  final walletTotal = paymentTotal("wallet");
  final bankTotal = sales.fold<num>(
    0,
    (sum, sale) => sum + (sale.banktotal ?? 0),
  );

  final headers = <String>[
    if (!hasDateFilter) "Date",
    "Receipt",
    "Item",
    "Qty",
    "Unit",
    "Total",
    if (useOutstandingForCredit || statusFilter == "credit") "Paid",
    if (useOutstandingForCredit || statusFilter == "credit") "Balance",
    if (!hasStatusFilter) "Payment",
    "Attendant",
  ];

  final rows = sales.expand((sale) {
    final saleTotal = sale.totalWithDiscount ?? sale.totalAmount ?? 0;
    final saleBalance = saleReportAmount(sale);
    final salePaid = sale.amountPaid ?? 0;

    return (sale.items ?? []).map((item) {
      final qty = item.quantity ?? 0;
      final unitPrice = item.unitPrice ?? 0;
      final lineTotal = qty * unitPrice;

      return [
        if (!hasDateFilter)
          sale.createdAt == null
              ? ""
              : DateFormat("dd-MM-yyyy")
                  .format(DateTime.parse(sale.createdAt!)),
        sale.receiptNo ?? "",
        item.product?.name ?? "",
        qty.toString(),
        money(unitPrice),
        money(lineTotal),
        if (useOutstandingForCredit || statusFilter == "credit")
          money(salePaid),
        if (useOutstandingForCredit || statusFilter == "credit")
          money(saleBalance),
        if (!hasStatusFilter) sale.paymentType ?? "",
        sale.attendant?.username ?? "",
      ];
    });
  }).toList();

  pdf.addPage(
    pw.MultiPage(
      pageFormat: PdfPageFormat.a4,
      margin: const pw.EdgeInsets.all(14),
      footer: (context) => _footer(
        shopName: shop?.name ?? "Pointify",
        context: context,
      ),
      build: (context) {
        return [
          _header(
            shopName: shop?.name ?? "Sales Report",
            address: shop?.addressReceipt ?? shop?.location ?? "",
            contact: shop?.contact ?? "",
            paybillTill: shop?.paybillTill ?? "",
            paybillAccount: shop?.paybillAccount ?? "",
            title: reportTitle ?? "Customer Sales Items Report",
          ),
          pw.SizedBox(height: 6),
          _customerAndFilterBox(
            customerName: customer?.name ?? "Walk-in Customer",
            customerNo: customer?.customerNo?.toString() ?? "",
            generatedAt:
                DateFormat("dd MMM yyyy, hh:mm a").format(DateTime.now()),
            status: hasStatusFilter ? statusFilter : null,
            startDate: startDateFilter,
            endDate: endDateFilter,
            walletBalance: walletBalance,
            currency: currency,
          ),
          pw.SizedBox(height: 6),
          pw.Row(
            children: [
              _summaryBox("Sales", sales.length.toString()),
              pw.SizedBox(width: 5),
              _summaryBox("Items", totalItems.toString()),
              pw.SizedBox(width: 5),
              _summaryBox(
                useOutstandingForCredit || statusFilter == "credit"
                    ? "Amount Due"
                    : "Total",
                money(totalSales),
              ),
            ],
          ),
          if (useOutstandingForCredit || statusFilter == "credit") ...[
            pw.SizedBox(height: 5),
            pw.Row(
              children: [
                _summaryBox("Invoice Total", money(totalOriginalSales)),
                pw.SizedBox(width: 5),
                _summaryBox("Paid", money(totalPaid)),
                pw.SizedBox(width: 5),
                _summaryBox("Balance", money(totalSales)),
              ],
            ),
          ],
          pw.SizedBox(height: 6),
          if (!(useOutstandingForCredit || statusFilter == "credit"))
            _paymentSummary(
              cash: money(cashTotal),
              mpesa: money(mpesaTotal),
              wallet: money(walletTotal),
              bank: money(bankTotal),
            ),
          pw.SizedBox(height: 7),
          pw.Text(
            "Sold Items",
            style: pw.TextStyle(
              fontSize: 10,
              fontWeight: pw.FontWeight.bold,
            ),
          ),
          pw.SizedBox(height: 4),
          if (rows.isEmpty)
            _emptyBox("No sales items found.")
          else
            pw.Table.fromTextArray(
              headers: headers,
              data: rows,
              border: pw.TableBorder.all(
                color: PdfColors.grey300,
                width: 0.3,
              ),
              headerDecoration: const pw.BoxDecoration(
                color: PdfColors.deepPurple,
              ),
              headerStyle: pw.TextStyle(
                fontSize: 7,
                fontWeight: pw.FontWeight.bold,
                color: PdfColors.white,
              ),
              cellStyle: pw.TextStyle(fontSize: 6.3),
              cellPadding: const pw.EdgeInsets.symmetric(
                horizontal: 3,
                vertical: 3,
              ),
              cellAlignment: pw.Alignment.centerLeft,
            ),
          pw.SizedBox(height: 8),
          pw.Align(
            alignment: pw.Alignment.centerRight,
            child: pw.Container(
              padding:
                  const pw.EdgeInsets.symmetric(horizontal: 9, vertical: 5),
              decoration: pw.BoxDecoration(
                color: PdfColors.grey100,
                borderRadius: pw.BorderRadius.circular(5),
                border: pw.Border.all(color: PdfColors.grey300),
              ),
              child: pw.Text(
                "${useOutstandingForCredit || statusFilter == "credit" ? "Amount Due" : "Grand Total"}: ${money(totalSales)}",
                style: pw.TextStyle(
                  fontSize: 10,
                  fontWeight: pw.FontWeight.bold,
                ),
              ),
            ),
          ),
        ];
      },
    ),
  );

  await _saveAndOpenPdf(
    pdf,
    "customer_sales_items_${DateTime.now().millisecondsSinceEpoch}.pdf",
  );
}

Future<void> downloadCustomerReturnsPdf(
  List<SaleRetuns> returns, {
  Customer? customer,
  DateTime? startDateFilter,
  DateTime? endDateFilter,
}) async {
  final fonts = await _loadFonts();

  final pdf = pw.Document(
    theme: pw.ThemeData.withFont(
      base: fonts.regular,
      bold: fonts.bold,
    ),
  );

  const currency = "KES";

  String money(num value) {
    return "$currency ${NumberFormat("#,##0.00").format(value)}";
  }

  num getNum(dynamic object, List<String> keys) {
    for (final key in keys) {
      try {
        final value = _readDynamic(object, key);
        if (value == null) continue;
        if (value is num) return value;
        return num.tryParse(value.toString()) ?? 0;
      } catch (_) {}
    }
    return 0;
  }

  String getText(dynamic object, List<String> keys) {
    for (final key in keys) {
      try {
        final value = _readDynamic(object, key);
        if (value != null && value.toString().isNotEmpty) {
          return value.toString();
        }
      } catch (_) {}
    }
    return "";
  }

  final rows = returns.map((item) {
    final date = getText(item, ["createdAt", "date"]);
    final receipt = getText(item, ["receiptNo", "receipt", "invoice"]);
    final reason = getText(item, ["reason", "salesnote", "note"]);
    final amount = getNum(item, [
      "totalWithDiscount",
      "totalAmount",
      "amount",
      "total",
    ]);

    return [
      date.isEmpty ? "" : DateFormat("dd-MM-yyyy").format(DateTime.parse(date)),
      receipt,
      reason,
      money(amount),
    ];
  }).toList();

  final totalReturns = returns.fold<num>(
    0,
    (sum, item) =>
        sum +
        getNum(item, [
          "totalWithDiscount",
          "totalAmount",
          "amount",
          "total",
        ]),
  );

  pdf.addPage(
    pw.MultiPage(
      pageFormat: PdfPageFormat.a4,
      margin: const pw.EdgeInsets.all(14),
      footer: (context) => _footer(shopName: "Pointify", context: context),
      build: (context) {
        return [
          _header(
            shopName: "Customer Returns",
            address: "",
            contact: "",
            paybillTill: "",
            paybillAccount: "",
            title: "Customer Returns Report",
          ),
          pw.SizedBox(height: 6),
          _customerAndFilterBox(
            customerName: customer?.name ?? "Customer",
            customerNo: customer?.customerNo?.toString() ?? "",
            generatedAt:
                DateFormat("dd MMM yyyy, hh:mm a").format(DateTime.now()),
            startDate: startDateFilter,
            endDate: endDateFilter,
            currency: currency,
          ),
          pw.SizedBox(height: 6),
          pw.Row(
            children: [
              _summaryBox("Returns", returns.length.toString()),
              pw.SizedBox(width: 5),
              _summaryBox("Total Returned", money(totalReturns)),
            ],
          ),
          pw.SizedBox(height: 8),
          if (rows.isEmpty)
            _emptyBox("No returns found.")
          else
            pw.Table.fromTextArray(
              headers: const ["Date", "Receipt", "Reason/Note", "Amount"],
              data: rows,
              border: pw.TableBorder.all(color: PdfColors.grey300, width: 0.3),
              headerDecoration: const pw.BoxDecoration(
                color: PdfColors.deepPurple,
              ),
              headerStyle: pw.TextStyle(
                fontSize: 7,
                fontWeight: pw.FontWeight.bold,
                color: PdfColors.white,
              ),
              cellStyle: const pw.TextStyle(fontSize: 6.5),
              cellPadding: const pw.EdgeInsets.symmetric(
                horizontal: 3,
                vertical: 3,
              ),
            ),
          pw.SizedBox(height: 8),
          pw.Align(
            alignment: pw.Alignment.centerRight,
            child: pw.Text(
              "Total Returns: ${money(totalReturns)}",
              style: pw.TextStyle(fontSize: 10, fontWeight: pw.FontWeight.bold),
            ),
          ),
        ];
      },
    ),
  );

  await _saveAndOpenPdf(
    pdf,
    "customer_returns_${DateTime.now().millisecondsSinceEpoch}.pdf",
  );
}

Future<void> downloadCustomerStatementPdf(
  List<Payment> payments, {
  Customer? customer,
  DateTime? startDateFilter,
  DateTime? endDateFilter,
}) async {
  final fonts = await _loadFonts();

  final pdf = pw.Document(
    theme: pw.ThemeData.withFont(
      base: fonts.regular,
      bold: fonts.bold,
    ),
  );

  const currency = "KES";

  String money(num value) {
    return "$currency ${NumberFormat("#,##0.00").format(value)}";
  }

  final totalIn = payments
      .where((p) => p.type != "withdraw")
      .fold<num>(0, (sum, p) => sum + (p.amount ?? 0));

  final totalOut = payments
      .where((p) => p.type == "withdraw")
      .fold<num>(0, (sum, p) => sum + (p.amount ?? 0));

  final currentBalance = payments.isEmpty ? 0 : payments.last.balance ?? 0;

  final rows = payments.map((payment) {
    final isWithdraw = payment.type == "withdraw";

    return [
      payment.date == null
          ? ""
          : DateFormat("dd-MM-yyyy HH:mm")
              .format(DateTime.parse(payment.date!)),
      isWithdraw ? "" : money(payment.amount ?? 0),
      isWithdraw ? money(payment.amount ?? 0) : "",
      money(payment.balance ?? 0),
    ];
  }).toList();

  pdf.addPage(
    pw.MultiPage(
      pageFormat: PdfPageFormat.a4,
      margin: const pw.EdgeInsets.all(14),
      footer: (context) => _footer(shopName: "Pointify", context: context),
      build: (context) {
        return [
          _header(
            shopName: "Customer Statement",
            address: "",
            contact: "",
            paybillTill: "",
            paybillAccount: "",
            title: "Customer Wallet Statement",
          ),
          pw.SizedBox(height: 6),
          _customerAndFilterBox(
            customerName: customer?.name ?? "Customer",
            customerNo: customer?.customerNo?.toString() ?? "",
            generatedAt:
                DateFormat("dd MMM yyyy, hh:mm a").format(DateTime.now()),
            startDate: startDateFilter,
            endDate: endDateFilter,
            walletBalance: customer?.wallet,
            currency: currency,
          ),
          pw.SizedBox(height: 6),
          pw.Row(
            children: [
              _summaryBox("Entries", payments.length.toString()),
              pw.SizedBox(width: 5),
              _summaryBox("In", money(totalIn)),
              pw.SizedBox(width: 5),
              _summaryBox("Out", money(totalOut)),
              pw.SizedBox(width: 5),
              _summaryBox("Balance", money(currentBalance)),
            ],
          ),
          pw.SizedBox(height: 8),
          if (rows.isEmpty)
            _emptyBox("No statement entries found.")
          else
            pw.Table.fromTextArray(
              headers: const ["Date", "In", "Out", "Balance"],
              data: rows,
              border: pw.TableBorder.all(color: PdfColors.grey300, width: 0.3),
              headerDecoration: const pw.BoxDecoration(
                color: PdfColors.deepPurple,
              ),
              headerStyle: pw.TextStyle(
                fontSize: 7,
                fontWeight: pw.FontWeight.bold,
                color: PdfColors.white,
              ),
              cellStyle: const pw.TextStyle(fontSize: 6.5),
              cellPadding: const pw.EdgeInsets.symmetric(
                horizontal: 3,
                vertical: 3,
              ),
            ),
        ];
      },
    ),
  );

  await _saveAndOpenPdf(
    pdf,
    "customer_statement_${DateTime.now().millisecondsSinceEpoch}.pdf",
  );
}

pw.Widget _header({
  required String shopName,
  required String address,
  required String contact,
  required String paybillTill,
  required String paybillAccount,
  required String title,
}) {
  return pw.Container(
    padding: const pw.EdgeInsets.all(9),
    decoration: pw.BoxDecoration(
      color: PdfColors.deepPurple,
      borderRadius: pw.BorderRadius.circular(6),
    ),
    child: pw.Row(
      crossAxisAlignment: pw.CrossAxisAlignment.start,
      children: [
        pw.Expanded(
          child: pw.Column(
            crossAxisAlignment: pw.CrossAxisAlignment.start,
            children: [
              pw.Text(
                shopName,
                style: pw.TextStyle(
                  color: PdfColors.white,
                  fontSize: 12,
                  fontWeight: pw.FontWeight.bold,
                ),
              ),
              if (address.isNotEmpty)
                pw.Text(
                  address,
                  style: const pw.TextStyle(
                    color: PdfColors.white,
                    fontSize: 7.5,
                  ),
                ),
              if (contact.isNotEmpty)
                pw.Text(
                  "Contact: $contact",
                  style: const pw.TextStyle(
                    color: PdfColors.white,
                    fontSize: 7.5,
                  ),
                ),
              if (paybillTill.isNotEmpty || paybillAccount.isNotEmpty)
                pw.Text(
                  "Payment: Till/Paybill $paybillTill  Account $paybillAccount",
                  style: const pw.TextStyle(
                    color: PdfColors.white,
                    fontSize: 7.5,
                  ),
                ),
            ],
          ),
        ),
        pw.SizedBox(width: 10),
        pw.Text(
          title,
          textAlign: pw.TextAlign.right,
          style: pw.TextStyle(
            color: PdfColors.white,
            fontSize: 10,
            fontWeight: pw.FontWeight.bold,
          ),
        ),
      ],
    ),
  );
}

pw.Widget _customerAndFilterBox({
  required String customerName,
  required String customerNo,
  required String generatedAt,
  String? status,
  DateTime? startDate,
  DateTime? endDate,
  num? walletBalance,
  String currency = "KES",
}) {
  final hasStatus = status != null && status.trim().isNotEmpty;
  final hasDate = startDate != null || endDate != null;

  String money(num value) {
    return "$currency ${NumberFormat("#,##0.00").format(value)}";
  }

  return pw.Container(
    width: double.infinity,
    padding: const pw.EdgeInsets.all(6),
    decoration: pw.BoxDecoration(
      color: PdfColors.grey100,
      borderRadius: pw.BorderRadius.circular(5),
      border: pw.Border.all(color: PdfColors.grey300),
    ),
    child: pw.Row(
      crossAxisAlignment: pw.CrossAxisAlignment.start,
      children: [
        pw.Expanded(
          child: pw.Column(
            crossAxisAlignment: pw.CrossAxisAlignment.start,
            children: [
              pw.Text(
                "Customer",
                style: pw.TextStyle(
                  fontSize: 7,
                  color: PdfColors.grey700,
                  fontWeight: pw.FontWeight.bold,
                ),
              ),
              pw.Text(
                customerName,
                style: pw.TextStyle(
                  fontSize: 9,
                  fontWeight: pw.FontWeight.bold,
                ),
              ),
              if (customerNo.isNotEmpty)
                pw.Text(
                  "No: $customerNo",
                  style: const pw.TextStyle(fontSize: 7),
                ),
              if (walletBalance != null)
                pw.Text(
                  "Wallet: ${money(walletBalance)}",
                  style: const pw.TextStyle(fontSize: 7),
                ),
            ],
          ),
        ),
        pw.Expanded(
          child: pw.Column(
            crossAxisAlignment: pw.CrossAxisAlignment.start,
            children: [
              pw.Text(
                "Filters",
                style: pw.TextStyle(
                  fontSize: 7,
                  color: PdfColors.grey700,
                  fontWeight: pw.FontWeight.bold,
                ),
              ),
              if (!hasStatus && !hasDate)
                pw.Text(
                  "None",
                  style: const pw.TextStyle(fontSize: 7),
                ),
              if (hasStatus)
                pw.Text(
                  "Status: ${_capitalize(status!)}",
                  style: const pw.TextStyle(fontSize: 7),
                ),
              if (hasDate)
                pw.Text(
                  "Date: ${startDate == null ? "Start" : DateFormat("dd MMM yyyy").format(startDate)} - ${endDate == null ? "Today" : DateFormat("dd MMM yyyy").format(endDate)}",
                  style: const pw.TextStyle(fontSize: 7),
                ),
            ],
          ),
        ),
        pw.Column(
          crossAxisAlignment: pw.CrossAxisAlignment.end,
          children: [
            pw.Text(
              "Generated",
              style: pw.TextStyle(
                fontSize: 7,
                color: PdfColors.grey700,
                fontWeight: pw.FontWeight.bold,
              ),
            ),
            pw.Text(
              generatedAt,
              style: const pw.TextStyle(fontSize: 7),
            ),
          ],
        ),
      ],
    ),
  );
}

pw.Widget _summaryBox(String title, String value) {
  return pw.Expanded(
    child: pw.Container(
      padding: const pw.EdgeInsets.all(6),
      decoration: pw.BoxDecoration(
        color: PdfColors.grey100,
        borderRadius: pw.BorderRadius.circular(5),
        border: pw.Border.all(color: PdfColors.grey300),
      ),
      child: pw.Column(
        crossAxisAlignment: pw.CrossAxisAlignment.start,
        children: [
          pw.Text(
            title,
            style: const pw.TextStyle(
              fontSize: 7,
              color: PdfColors.grey700,
            ),
          ),
          pw.Text(
            value,
            style: pw.TextStyle(
              fontSize: 9,
              fontWeight: pw.FontWeight.bold,
            ),
          ),
        ],
      ),
    ),
  );
}

pw.Widget _paymentSummary({
  required String cash,
  required String mpesa,
  required String wallet,
  required String bank,
}) {
  return pw.Container(
    width: double.infinity,
    padding: const pw.EdgeInsets.all(6),
    decoration: pw.BoxDecoration(
      color: PdfColors.grey100,
      borderRadius: pw.BorderRadius.circular(5),
      border: pw.Border.all(color: PdfColors.grey300),
    ),
    child: pw.Row(
      mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
      children: [
        _paymentItem("Cash", cash),
        _paymentItem("M-Pesa", mpesa),
        _paymentItem("Wallet", wallet),
        _paymentItem("Bank", bank),
      ],
    ),
  );
}

pw.Widget _paymentItem(String title, String value) {
  return pw.Container(
    width: 90,
    child: pw.Column(
      crossAxisAlignment: pw.CrossAxisAlignment.start,
      children: [
        pw.Text(
          title,
          style: const pw.TextStyle(
            fontSize: 6.5,
            color: PdfColors.grey700,
          ),
        ),
        pw.Text(
          value,
          style: pw.TextStyle(
            fontSize: 7.5,
            fontWeight: pw.FontWeight.bold,
          ),
        ),
      ],
    ),
  );
}

pw.Widget _footer({
  required String shopName,
  required pw.Context context,
}) {
  return pw.Container(
    padding: const pw.EdgeInsets.only(top: 5),
    decoration: const pw.BoxDecoration(
      border: pw.Border(
        top: pw.BorderSide(color: PdfColors.grey300, width: 0.4),
      ),
    ),
    child: pw.Row(
      mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
      children: [
        pw.Text(
          shopName,
          style: const pw.TextStyle(
            fontSize: 7,
            color: PdfColors.grey600,
          ),
        ),
        pw.Text(
          "Page ${context.pageNumber} of ${context.pagesCount}",
          style: const pw.TextStyle(
            fontSize: 7,
            color: PdfColors.grey600,
          ),
        ),
      ],
    ),
  );
}

pw.Widget _emptyBox(String text) {
  return pw.Container(
    width: double.infinity,
    padding: const pw.EdgeInsets.all(8),
    decoration: pw.BoxDecoration(
      color: PdfColors.grey100,
      borderRadius: pw.BorderRadius.circular(5),
      border: pw.Border.all(color: PdfColors.grey300),
    ),
    child: pw.Text(
      text,
      style: const pw.TextStyle(fontSize: 8),
    ),
  );
}

String _capitalize(String value) {
  if (value.isEmpty) return value;
  return "${value[0].toUpperCase()}${value.substring(1)}";
}

class _PdfFonts {
  final pw.Font regular;
  final pw.Font bold;

  _PdfFonts({
    required this.regular,
    required this.bold,
  });
}

Future<_PdfFonts> _loadFonts() async {
  final regularFont = pw.Font.ttf(
    await rootBundle.load("assets/fonts/Roboto-Regular.ttf"),
  );

  final boldFont = pw.Font.ttf(
    await rootBundle.load("assets/fonts/Roboto-Bold.ttf"),
  );

  return _PdfFonts(
    regular: regularFont,
    bold: boldFont,
  );
}

Future<void> _saveAndOpenPdf(pw.Document pdf, String fileName) async {
  final dir = await getTemporaryDirectory();

  final file = File("${dir.path}/$fileName");

  await file.writeAsBytes(await pdf.save(), flush: true);

  await OpenFile.open(file.path);
}

dynamic _readDynamic(dynamic object, String key) {
  try {
    final json = object.toJson();
    if (json is Map && json.containsKey(key)) {
      return json[key];
    }
  } catch (_) {}

  try {
    final json = object.toMap();
    if (json is Map && json.containsKey(key)) {
      return json[key];
    }
  } catch (_) {}

  return null;
}
