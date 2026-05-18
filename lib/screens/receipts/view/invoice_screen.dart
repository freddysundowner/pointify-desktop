import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:intl/intl.dart';
import 'package:pointify/controllers/paymentcontroller.dart';
import 'package:pointify/controllers/purchase_controller.dart';
import 'package:pointify/controllers/suppliercontroller.dart';
import 'package:pointify/functions/functions.dart';
import 'package:printing/printing.dart';

import '../../../controllers/shopcontroller.dart';
import '../../../models/invoice.dart';
import '../../../pdfFiles/pdf/invoice_pdf.dart';
import '../../../utils/colors.dart';
import '../../../utils/themer.dart';
import '../../../widgets/alert.dart';
import '../../cash_flow/payment_history.dart';

class InvoiceScreen extends StatelessWidget {
  final Invoice? invoice;
  final String? type;
  final String? from;

  InvoiceScreen({
    super.key,
    this.invoice,
    this.type = '',
    this.from = '',
  }) {
    purchaseController.currentInvoice.value = invoice;
  }

  final ShopController shopController = Get.find<ShopController>();
  final PurchaseController purchaseController = Get.find<PurchaseController>();
  final PaymentController paymentController = Get.find<PaymentController>();

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xfff5f5f5),
      appBar: AppBar(
        elevation: 0,
        backgroundColor: Colors.transparent,
        title: Obx(
          () => Text(
            'Invoice #${purchaseController.currentInvoice.value?.purchaseNo ?? ""}',
            style: const TextStyle(
              fontSize: 16,
              fontWeight: FontWeight.bold,
            ),
          ),
        ),
        actions: [
          PopupMenuButton<String>(
            onSelected: _onMenuSelected,
            itemBuilder: (_) => [
              const PopupMenuItem<String>(
                value: 'Print',
                child: Text('Print invoice'),
              ),
              if (verifyPermission(
                category: 'stocks',
                permission: 'delete_purchase_invoice',
              ))
                const PopupMenuItem<String>(
                  value: 'Delete',
                  child: Text('Delete Invoice'),
                ),
            ],
          ),
        ],
      ),
      body: SafeArea(
        child: Obx(() {
          final invoice = purchaseController.currentInvoice.value!;

          return SingleChildScrollView(
            padding: const EdgeInsets.all(12),
            child: Container(
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(18),
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withOpacity(.05),
                    blurRadius: 15,
                    offset: const Offset(0, 5),
                  ),
                ],
              ),
              child: Column(
                children: [
                  _buildHeader(invoice),
                  _buildItems(invoice),
                  _buildTotals(invoice),
                  _buildActions(invoice),
                ],
              ),
            ),
          );
        }),
      ),
    );
  }

  // ─── menu handler ──────────────────────────────────────────────────────

  void _onMenuSelected(String value) {
    final invoice = purchaseController.currentInvoice.value!;

    switch (value) {
      case 'Print':
        _printInvoice();
        break;
      case 'Delete':
        if (verifyPermission(
          category: 'stocks',
          permission: 'delete_purchase_invoice',
        )) {
          invoiceActions(invoice: invoice, delete: true);
        }
        break;
    }
  }

  // ─── header ────────────────────────────────────────────────────────────

  Widget _buildHeader(Invoice invoice) {
    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        border: Border(
          bottom: BorderSide(color: Colors.grey.shade200),
        ),
      ),
      child: Column(
        children: [
          // Title + status badge
          Row(
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'INVOICE',
                      style: TextStyle(
                        fontSize: 24,
                        fontWeight: FontWeight.w900,
                        letterSpacing: 1.2,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      '#${invoice.purchaseNo ?? ""}',
                      style: TextStyle(color: Colors.grey.shade600),
                    ),
                  ],
                ),
              ),
              Row(
                children: [
                  if (verifyPermission(
                        category: 'stocks',
                        permission: 'return',
                      ) &&
                      invoice.invoiceType != 'return' &&
                      type != 'returns')
                    _ChipButton(
                      label: 'Return',
                      foreground: Colors.red,
                      background: Colors.red.withOpacity(.08),
                      onTap: () => invoiceActions(invoice: invoice),
                    ),
                  const SizedBox(width: 8),
                  _StatusBadge(
                    text: _checkPayment(invoice, type ?? ''),
                    color: _checkPaymentColor(invoice, type ?? ''),
                  ),
                ],
              ),
            ],
          ),
          const SizedBox(height: 20),

          // Meta row (date / time / supplier)
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              _MetaItem(
                title: 'Date',
                value: invoice.createdAt == null
                    ? '-'
                    : DateFormat('dd MMM yyyy').format(
                        DateTime.parse(invoice.createdAt!),
                      ),
              ),
              _MetaItem(
                title: 'Time',
                value: invoice.createdAt == null
                    ? '-'
                    : DateFormat('hh:mm a').format(
                        DateTime.parse(invoice.createdAt!),
                      ),
              ),
              _MetaItem(
                title: 'Recorded By',
                value: invoice.attendantId?.username ?? '-',
              ),
            ],
          ),

          if (invoice.supplierId?.name != null) ...[
            const SizedBox(height: 15),
            _ReceiptInfoRow(
              title: 'Supplier',
              value: invoice.supplierId!.name ?? '',
            ),
          ],
        ],
      ),
    );
  }

  // ─── items ─────────────────────────────────────────────────────────────

  Widget _buildItems(Invoice invoice) {
    final items = invoice.items ?? [];

    return Column(
      children: List.generate(items.length, (index) {
        final item = items[index];
        final isReturned = item.quantity == 0;
        final lineTotal = (item.unitPrice ?? 0) * (item.quantity ?? 0);
        final canReturn = verifyPermission(
              category: 'stocks',
              permission: 'return',
            ) &&
            invoice.invoiceType != 'return' &&
            type != 'returns';

        return Column(
          children: [
            Padding(
              padding: const EdgeInsets.symmetric(
                horizontal: 18,
                vertical: 14,
              ),
              child: Row(
                children: [
                  Expanded(
                    flex: 5,
                    child: InkWell(
                      onTap: canReturn
                          ? () => invoiceActions(invoiceItem: item)
                          : null,
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            item.product?.name?.capitalize ?? '',
                            style: TextStyle(
                              fontSize: 14,
                              fontWeight: FontWeight.w700,
                              decoration: isReturned
                                  ? TextDecoration.lineThrough
                                  : null,
                            ),
                          ),
                          const SizedBox(height: 3),
                          Text(
                            '${item.quantity} × ${htmlPrice(item.unitPrice)}',
                            style: TextStyle(
                              fontSize: 12,
                              color: Colors.grey.shade600,
                              decoration: isReturned
                                  ? TextDecoration.lineThrough
                                  : null,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                  Expanded(
                    flex: 2,
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.end,
                      children: [
                        Text(
                          htmlPrice(lineTotal),
                          textAlign: TextAlign.right,
                          style: const TextStyle(
                            fontWeight: FontWeight.bold,
                            fontSize: 13,
                          ),
                        ),
                        if (isReturned)
                          const Padding(
                            padding: EdgeInsets.only(top: 4),
                            child: Text(
                              'Returned',
                              style: TextStyle(
                                color: Colors.red,
                                fontSize: 11,
                              ),
                            ),
                          ),
                      ],
                    ),
                  ),
                  if (canReturn) ...[
                    const SizedBox(width: 10),
                    InkWell(
                      onTap: () => invoiceActions(invoiceItem: item),
                      borderRadius: BorderRadius.circular(20),
                      child: Container(
                        padding: const EdgeInsets.all(6),
                        decoration: BoxDecoration(
                          color: Colors.red.withOpacity(.08),
                          shape: BoxShape.circle,
                        ),
                        child: const Icon(
                          Icons.undo,
                          color: Colors.red,
                          size: 18,
                        ),
                      ),
                    ),
                  ],
                ],
              ),
            ),
            if (index != items.length - 1)
              Divider(height: 1, color: Colors.grey.shade200),
          ],
        );
      }),
    );
  }

  // ─── totals ────────────────────────────────────────────────────────────

  Widget _buildTotals(Invoice invoice) {
    final itemsTotal = invoice.items?.fold<double>(
          0,
          (sum, e) => sum + ((e.unitPrice ?? 0) * (e.quantity ?? 0)),
        ) ??
        0;

    final outstanding = invoice.outstandingBalance ?? 0;
    final totalAmount = invoice.totalAmount ?? itemsTotal;
    final paid = totalAmount - outstanding.abs();

    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: Colors.grey.shade50,
        borderRadius: const BorderRadius.only(
          bottomLeft: Radius.circular(18),
          bottomRight: Radius.circular(18),
        ),
      ),
      child: Column(
        children: [
          _TotalRow(title: 'Subtotal', value: htmlPrice(itemsTotal)),
          const Padding(
            padding: EdgeInsets.symmetric(vertical: 10),
            child: Divider(height: 1),
          ),
          _TotalRow(
            title: 'TOTAL',
            value: htmlPrice(totalAmount),
            bold: true,
            large: true,
          ),
          if (paid > 0) ...[
            const SizedBox(height: 6),
            _TotalRow(
              title: 'PAID',
              value: htmlPrice(paid),
              bold: true,
              valueColor: Colors.green,
            ),
          ],
          if (outstanding > 0) ...[
            const SizedBox(height: 8),
            _TotalRow(
              title: 'BALANCE',
              value: htmlPrice(outstanding),
              bold: true,
              valueColor: Colors.red,
            ),
          ],
        ],
      ),
    );
  }

  // ─── actions (only render when there's something actionable) ───────────

  Widget _buildActions(Invoice invoice) {
    final isCredit = invoice.paymentType == 'credit';
    final hasBalance = (invoice.outstandingBalance ?? 0) > 0;

    if (!isCredit && !hasBalance) return const SizedBox.shrink();

    return Container(
      padding: const EdgeInsets.all(18),
      child: Row(
        children: [
          if (isCredit)
            Expanded(
              child: OutlinedButton(
                onPressed: () {
                  paymentController.getSalesPaymentByPurchaseId(invoice.sId!);
                  Get.to(() => PaymentHistory());
                },
                style: OutlinedButton.styleFrom(
                  foregroundColor: Colors.red,
                  side: const BorderSide(color: Colors.red),
                ),
                child: const Text('Payments'),
              ),
            ),
          if (isCredit && hasBalance) const SizedBox(width: 10),
          if (hasBalance)
            Expanded(
              child: ElevatedButton(
                onPressed: () => showAmountDialog(invoice),
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppColors.mainColor,
                  foregroundColor: Colors.white,
                ),
                child: const Text('Pay Now'),
              ),
            ),
        ],
      ),
    );
  }

  // ─── print invoice (kept from original) ────────────────────────────────

  void _printInvoice() {
    Get.to(
      () => Scaffold(
        backgroundColor: const Color(0xfff3f4f6),
        appBar: AppBar(
          elevation: 0,
          backgroundColor: Colors.white,
          surfaceTintColor: Colors.white,
          leading: IconButton(
            icon: const Icon(
              Icons.arrow_back_ios_new_rounded,
              color: Colors.black,
              size: 20,
            ),
            onPressed: () => Get.back(),
          ),
          centerTitle: true,
          title: Column(
            children: [
              Text(
                'PURCHASE INVOICE',
                style: TextStyle(
                  color: Colors.black,
                  fontSize: 18,
                  fontWeight: FontWeight.w800,
                  letterSpacing: 1,
                ),
              ),
              const SizedBox(height: 2),
              Text(
                '#${purchaseController.currentInvoice.value?.purchaseNo ?? ""}',
                style: TextStyle(
                  color: Colors.grey.shade600,
                  fontSize: 11,
                  fontWeight: FontWeight.w500,
                ),
              ),
            ],
          ),
        ),
        body: Container(
          margin: const EdgeInsets.only(top: 6),
          child: PdfPreview(
            canChangeOrientation: false,
            canDebug: false,
            allowPrinting: true,
            allowSharing: true,
            pdfFileName:
                'invoice_${purchaseController.currentInvoice.value?.purchaseNo ?? ""}.pdf',
            build: (context) => invoiceReceipt(
              purchaseController.currentInvoice.value!,
              '${type ?? "".capitalizeFirst} Invoice'.toUpperCase(),
            ),
            previewPageMargin: const EdgeInsets.all(18),
            padding: const EdgeInsets.all(12),
            maxPageWidth: 700,
            scrollViewDecoration: BoxDecoration(
              color: const Color(0xffececec),
            ),
            loadingWidget: const Center(
              child: CircularProgressIndicator(),
            ),
            actionBarTheme: PdfActionBarTheme(
              backgroundColor: Colors.white,
              elevation: 2,
              iconColor: AppColors.mainColor,
              textStyle: TextStyle(
                color: Colors.black,
                fontWeight: FontWeight.w700,
              ),
            ),
          ),
        ),
        bottomNavigationBar: SafeArea(
          child: Container(
            padding: const EdgeInsets.fromLTRB(16, 12, 16, 20),
            decoration: BoxDecoration(
              color: Colors.white,
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withOpacity(.04),
                  blurRadius: 10,
                  offset: const Offset(0, -3),
                ),
              ],
            ),
            child: Row(
              children: [
                Expanded(
                  child: OutlinedButton.icon(
                    onPressed: () async {
                      await Printing.sharePdf(
                        bytes: await invoiceReceipt(
                          purchaseController.currentInvoice.value!,
                          '${type ?? "".capitalizeFirst} Invoice'.toUpperCase(),
                        ),
                        filename:
                            'invoice_${purchaseController.currentInvoice.value?.purchaseNo ?? ""}.pdf',
                      );
                    },
                    icon: const Icon(Icons.share_rounded),
                    label: const Text('Share'),
                    style: OutlinedButton.styleFrom(
                      foregroundColor: AppColors.mainColor,
                      side: BorderSide(
                        color: AppColors.mainColor.withOpacity(.3),
                      ),
                      padding: const EdgeInsets.symmetric(vertical: 14),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(14),
                      ),
                    ),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  flex: 2,
                  child: ElevatedButton.icon(
                    onPressed: () async {
                      await Printing.layoutPdf(
                        onLayout: (format) => invoiceReceipt(
                          purchaseController.currentInvoice.value!,
                          '${type ?? "".capitalizeFirst} Invoice'.toUpperCase(),
                        ),
                      );
                    },
                    icon: const Icon(Icons.print_rounded),
                    label: const Text('Print Invoice'),
                    style: ElevatedButton.styleFrom(
                      elevation: 0,
                      backgroundColor: AppColors.mainColor,
                      foregroundColor: Colors.white,
                      padding: const EdgeInsets.symmetric(vertical: 15),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(14),
                      ),
                      textStyle: const TextStyle(
                        fontWeight: FontWeight.w700,
                        fontSize: 15,
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

// ───────────────────────────────────────────────────────────────────────────
// SHARED SMALL WIDGETS — same shapes as sales receipt
// ───────────────────────────────────────────────────────────────────────────

class _MetaItem extends StatelessWidget {
  final String title;
  final String value;
  const _MetaItem({required this.title, required this.value});

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          title,
          style: TextStyle(color: Colors.grey.shade500, fontSize: 11),
        ),
        const SizedBox(height: 3),
        Text(
          value,
          style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 12),
        ),
      ],
    );
  }
}

class _ReceiptInfoRow extends StatelessWidget {
  final String title;
  final String value;
  const _ReceiptInfoRow({required this.title, required this.value});

  @override
  Widget build(BuildContext context) {
    if (value.isEmpty) return const SizedBox.shrink();

    return Padding(
      padding: const EdgeInsets.only(top: 8),
      child: Row(
        children: [
          Text(
            '$title: ',
            style: TextStyle(color: Colors.grey.shade600, fontSize: 12),
          ),
          Expanded(
            child: Text(
              value,
              textAlign: TextAlign.right,
              style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 12),
            ),
          ),
        ],
      ),
    );
  }
}

class _TotalRow extends StatelessWidget {
  final String title;
  final String value;
  final bool bold;
  final bool large;
  final Color? valueColor;

  const _TotalRow({
    required this.title,
    required this.value,
    this.bold = false,
    this.large = false,
    this.valueColor,
  });

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(
            title,
            style: TextStyle(
              fontSize: large ? 15 : 13,
              fontWeight: bold ? FontWeight.w800 : FontWeight.w500,
              color: Colors.grey.shade700,
            ),
          ),
          Text(
            value,
            style: TextStyle(
              fontSize: large ? 18 : 13,
              fontWeight: bold ? FontWeight.w900 : FontWeight.w700,
              color: valueColor ?? Colors.black,
            ),
          ),
        ],
      ),
    );
  }
}

class _ChipButton extends StatelessWidget {
  final String label;
  final Color foreground;
  final Color background;
  final VoidCallback onTap;

  const _ChipButton({
    required this.label,
    required this.foreground,
    required this.background,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(30),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 7),
        decoration: BoxDecoration(
          color: background,
          borderRadius: BorderRadius.circular(30),
        ),
        child: Text(
          label,
          style: TextStyle(
            color: foreground,
            fontSize: 11,
            fontWeight: FontWeight.w700,
          ),
        ),
      ),
    );
  }
}

class _StatusBadge extends StatelessWidget {
  final String text;
  final Color color;
  const _StatusBadge({required this.text, required this.color});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 7),
      decoration: BoxDecoration(
        color: color.withOpacity(.1),
        borderRadius: BorderRadius.circular(30),
      ),
      child: Text(
        text,
        style: TextStyle(
          color: color,
          fontWeight: FontWeight.bold,
          fontSize: 11,
        ),
      ),
    );
  }
}

// ───────────────────────────────────────────────────────────────────────────
// STATUS HELPERS
// ───────────────────────────────────────────────────────────────────────────

String _checkPayment(Invoice invoice, String? type) {
  if (invoice.totalAmount == 0 || type == 'returns') {
    return type == 'returns' ? 'RETURNED ITEMS' : 'RETURNED';
  }
  if (invoice.outstandingBalance == 0) return 'CASH';
  if ((invoice.outstandingBalance ?? 0) > 0) return 'ON CREDIT';
  return '';
}

Color _checkPaymentColor(Invoice invoice, String? type) {
  if (invoice.totalAmount == 0 || type == 'returns') return Colors.red;
  if (invoice.outstandingBalance == 0) return Colors.green;
  if ((invoice.outstandingBalance ?? 0) > 0) return Colors.red;
  return Colors.black;
}

// ───────────────────────────────────────────────────────────────────────────
// INVOICE ACTIONS — return / delete invoice or item
// ───────────────────────────────────────────────────────────────────────────

void invoiceActions({
  Invoice? invoice,
  InvoiceItem? invoiceItem,
  bool delete = false,
}) {
  // Invoice-level return or delete.
  if (invoice != null) {
    generalAlert(
      title: delete ? 'Delete invoice' : 'Return invoice',
      positiveText: 'Yes',
      negativeText: 'No',
      message:
          'Are you sure you want to ${delete ? "delete" : "return"} this invoice?',
      function: () {
        Get.find<PurchaseController>().returnInvoiceItem(
          invoice.items!
              .map((e) => InvoiceItem(quantity: e.quantity, product: e.product))
              .toList(),
          deleteReceipt: delete,
          invoiceType: invoice.invoiceType ?? '',
        );
        Get.back();
      },
    );
    return;
  }

  // Single-item return.
  if (invoiceItem != null && (invoiceItem.quantity ?? 0) > 0) {
    _showReturnItemDialog(invoiceItem);
  }
}

void _showReturnItemDialog(InvoiceItem item) {
  final controller = TextEditingController(text: item.quantity.toString());

  showDialog(
    context: Get.context!,
    builder: (_) => AlertDialog(
      title: const Text('Return Product?'),
      content: Container(
        decoration: ThemeHelper().inputBoxDecorationShaddow(),
        child: TextFormField(
          controller: controller,
          keyboardType: const TextInputType.numberWithOptions(decimal: true),
          decoration: ThemeHelper().textInputDecoration(
            'Quantity',
            'Enter quantity',
          ),
        ),
      ),
      actions: [
        TextButton(
          onPressed: Get.back,
          child: Text(
            'CANCEL',
            style: TextStyle(color: AppColors.mainColor),
          ),
        ),
        TextButton(
          onPressed: () => _onReturnItemSubmit(item, controller.text),
          child: Text(
            'OKAY',
            style: TextStyle(color: AppColors.mainColor),
          ),
        ),
      ],
    ),
  );
}

void _onReturnItemSubmit(InvoiceItem item, String text) {
  if (text.isEmpty) {
    generalAlert(title: 'Error', message: 'Quantity cannot be empty');
    Get.back();
    return;
  }

  final parsed = double.tryParse(text);
  if (parsed == null) {
    generalAlert(title: 'Error', message: 'Invalid quantity');
    return;
  }

  if ((item.quantity ?? 0) < parsed) {
    generalAlert(
      title: 'Error',
      message: 'You cannot return more than ${item.quantity}',
    );
    return;
  }

  if (parsed <= 0) {
    generalAlert(title: 'Error', message: 'You must at least return 1 item');
    return;
  }

  Get.back();
  Get.find<PurchaseController>().returnInvoiceItem(
    [InvoiceItem(quantity: parsed, product: item.product)],
    deleteReceipt: false,
  );
}

// ───────────────────────────────────────────────────────────────────────────
// PAY-NOW DIALOG
// ───────────────────────────────────────────────────────────────────────────

void showAmountDialog(Invoice invoice) {
  final supplierController = Get.find<SupplierController>();

  showDialog(
    context: Get.context!,
    builder: (_) => AlertDialog(
      title: const Text(
        'Enter Amount to pay',
        style: TextStyle(color: Colors.black, fontWeight: FontWeight.bold),
      ),
      content: Form(
        child: TextFormField(
          controller: supplierController.amountController,
          keyboardType: TextInputType.number,
          decoration: InputDecoration(
            hintText: 'eg ${invoice.totalAmount}',
            hintStyle: const TextStyle(color: Colors.black),
            fillColor: Colors.white,
            filled: true,
            border: OutlineInputBorder(
              borderRadius: BorderRadius.circular(8),
            ),
          ),
        ),
      ),
      actions: [
        TextButton(
          onPressed: Get.back,
          child: Text(
            'CANCEL',
            style: TextStyle(
              color: AppColors.mainColor,
              fontWeight: FontWeight.bold,
            ),
          ),
        ),
        TextButton(
          onPressed: () {
            Get.back();
            Get.find<PurchaseController>().paySupplierCredit(
              invoice: invoice,
              amount: supplierController.amountController.text,
            );
          },
          child: Text(
            'PAY',
            style: TextStyle(
              color: AppColors.mainColor,
              fontWeight: FontWeight.bold,
            ),
          ),
        ),
      ],
    ),
  );
}
