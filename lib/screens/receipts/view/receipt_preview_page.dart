import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:intl/intl.dart';
import 'package:pointify/controllers/salescontroller.dart';
import 'package:printing/printing.dart';

import '../../../models/salemodel.dart';
import '../../../utils/colors.dart';
import '../pdf/sales/thermal_receipt_pdf.dart';

class ReceiptPreviewPage extends StatelessWidget {
  final SaleModel saleModel;

  const ReceiptPreviewPage({super.key, required this.saleModel});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      // Background is the brand color — receipt sits on top of it like a print.
      backgroundColor: AppColors.mainColor,
      body: Column(
        children: [
          _Header(saleModel: saleModel),
          Expanded(
            child: Container(
              decoration: const BoxDecoration(
                color: Color(0xffececec),
              ),
              child: SingleChildScrollView(
                padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
                child: Transform.translate(
                  offset: const Offset(0, -14),
                  child: _ReceiptCard(saleModel: saleModel),
                ),
              ),
            ),
          ),
          _ActionBar(saleModel: saleModel),
        ],
      ),
    );
  }
}

// ───────────────────────────────────────────────────────────────────────────
// HEADER — brand-color band with back, title/receipt#, and total
// ───────────────────────────────────────────────────────────────────────────

class _Header extends StatelessWidget {
  final SaleModel saleModel;
  const _Header({required this.saleModel});

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [
            AppColors.mainColor,
            AppColors.mainColor.withOpacity(.85),
          ],
        ),
      ),
      child: SafeArea(
        bottom: false,
        child: Padding(
          padding: const EdgeInsets.fromLTRB(16, 12, 16, 28),
          child: Row(
            children: [
              // Back button (frosted circle)
              InkWell(
                onTap: Get.back,
                borderRadius: BorderRadius.circular(40),
                child: Container(
                  width: 38,
                  height: 38,
                  decoration: BoxDecoration(
                    color: Colors.white.withOpacity(.18),
                    shape: BoxShape.circle,
                  ),
                  child: const Icon(
                    Icons.arrow_back,
                    color: Colors.white,
                    size: 18,
                  ),
                ),
              ),
              const SizedBox(width: 12),

              // Title + receipt number
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    const Text(
                      'Receipt Preview',
                      style: TextStyle(
                        color: Colors.white,
                        fontSize: 14,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      '#${saleModel.receiptNo ?? '—'}',
                      style: TextStyle(
                        color: Colors.white.withOpacity(.7),
                        fontSize: 11,
                        letterSpacing: 0.5,
                      ),
                    ),
                  ],
                ),
              ),

              // Total at a glance
              Column(
                crossAxisAlignment: CrossAxisAlignment.end,
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(
                    'TOTAL',
                    style: TextStyle(
                      color: Colors.white.withOpacity(.7),
                      fontSize: 10,
                      letterSpacing: 0.8,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    _formatMoney(saleModel.totalWithDiscount ?? 0),
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 16,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  String _formatMoney(num value) {
    final formatter = NumberFormat('#,##0.00');
    return formatter.format(value);
  }
}

// ───────────────────────────────────────────────────────────────────────────
// RECEIPT CARD — with perforated top edge
// ───────────────────────────────────────────────────────────────────────────

class _ReceiptCard extends StatelessWidget {
  final SaleModel saleModel;
  const _ReceiptCard({required this.saleModel});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: ConstrainedBox(
        constraints: const BoxConstraints(maxWidth: 320),
        child: Column(
          children: [
            // Perforated top edge (zig-zag)
            CustomPaint(
              size: const Size(double.infinity, 10),
              painter: _PerforationPainter(color: const Color(0xfffdfcf7)),
            ),

            // Body
            Container(
              decoration: BoxDecoration(
                color: const Color(0xfffdfcf7),
                boxShadow: [
                  BoxShadow(
                    blurRadius: 8,
                    offset: const Offset(0, 4),
                    color: Colors.black.withOpacity(.12),
                  ),
                ],
              ),
              child: Padding(
                padding: const EdgeInsets.symmetric(
                  horizontal: 16,
                  vertical: 18,
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: _buildReceiptBody(),
                ),
              ),
            ),

            // Perforated bottom edge (zig-zag, inverted)
            CustomPaint(
              size: const Size(double.infinity, 10),
              painter: _PerforationPainter(
                color: const Color(0xfffdfcf7),
                bottom: true,
              ),
            ),
          ],
        ),
      ),
    );
  }

  List<Widget> _buildReceiptBody() {
    final totalPaid = saleModel.amountPaid ?? 0;

    return [
      // Shop name
      Center(
        child: Text(
          saleModel.shopId?.name?.toUpperCase() ?? 'STORE',
          textAlign: TextAlign.center,
          style: const TextStyle(
            fontSize: 15,
            fontWeight: FontWeight.w900,
            letterSpacing: 1,
            fontFamily: 'Courier',
          ),
        ),
      ),
      if ((saleModel.shopId?.addressReceipt ?? '').isNotEmpty) ...[
        const SizedBox(height: 4),
        Center(
          child: Text(
            saleModel.shopId!.addressReceipt!,
            textAlign: TextAlign.center,
            style: const TextStyle(fontSize: 11, fontFamily: 'Courier'),
          ),
        ),
      ],
      if ((saleModel.shopId?.contact ?? '').isNotEmpty) ...[
        const SizedBox(height: 2),
        Center(
          child: Text(
            'Tel: ${saleModel.shopId!.contact}',
            textAlign: TextAlign.center,
            style: const TextStyle(fontSize: 11, fontFamily: 'Courier'),
          ),
        ),
      ],
      if (saleModel.shopId?.paybillTill != null) ...[
        const SizedBox(height: 2),
        Center(
          child: Text(
            saleModel.shopId?.paybillAccount != null
                ? 'Paybill: ${saleModel.shopId?.paybillTill}, A/c: ${saleModel.shopId?.paybillAccount}'
                : 'Till: ${saleModel.shopId?.paybillTill}',
            textAlign: TextAlign.center,
            style: const TextStyle(fontSize: 11, fontFamily: 'Courier'),
          ),
        ),
      ],

      _ReceiptDivider(),

      // Receipt info
      _ReceiptRow(title: 'Receipt #:', value: saleModel.receiptNo ?? ''),
      _ReceiptRow(
        title: 'Date:',
        value: saleModel.createdAt == null
            ? '-'
            : DateFormat('dd MMM yyyy hh:mm a').format(
                DateTime.parse(saleModel.createdAt!),
              ),
      ),
      _ReceiptRow(
        title: 'Cashier:',
        value: saleModel.attendant?.username ?? '-',
      ),
      _ReceiptRow(
        title: 'Customer:',
        value: saleModel.customerId?.name ?? 'Walk-in',
      ),
      _ReceiptRow(
        title: 'Payment:',
        value: saleModel.paymentTag?.toUpperCase() ?? '-',
      ),

      _ReceiptDivider(),

      // Table header
      const Row(
        children: [
          Expanded(flex: 1, child: _ReceiptHeaderCell('QTY')),
          Expanded(flex: 4, child: _ReceiptHeaderCell('ITEM')),
          Expanded(
            flex: 2,
            child: _ReceiptHeaderCell('AMOUNT', align: TextAlign.right),
          ),
        ],
      ),

      _ReceiptDivider(),

      // Items
      ...List.generate(saleModel.items?.length ?? 0, (index) {
        final item = saleModel.items![index];
        return Padding(
          padding: const EdgeInsets.only(bottom: 4),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(
                flex: 1,
                child: Text(
                  '${item.quantity}',
                  style: const TextStyle(fontSize: 11, fontFamily: 'Courier'),
                ),
              ),
              Expanded(
                flex: 4,
                child: Text(
                  item.product?.name ?? '',
                  style: const TextStyle(fontSize: 11, fontFamily: 'Courier'),
                ),
              ),
              Expanded(
                flex: 2,
                child: Text(
                  (item.totalLinePrice ?? 0).toStringAsFixed(2),
                  textAlign: TextAlign.right,
                  style: const TextStyle(fontSize: 11, fontFamily: 'Courier'),
                ),
              ),
            ],
          ),
        );
      }),

      _ReceiptDivider(),

      // Totals
      _AmountRow(
        title: 'Subtotal',
        amount: ((saleModel.totalWithDiscount ?? 0) +
                (saleModel.totalDiscount ?? 0))
            .toStringAsFixed(2),
      ),
      _AmountRow(
        title: 'Discount',
        amount: (saleModel.totalDiscount ?? 0).toStringAsFixed(2),
      ),
      _AmountRow(
        title: 'Tax',
        amount: (saleModel.totaltax ?? 0).toStringAsFixed(2),
      ),

      if ((saleModel.extraCharges ?? []).isNotEmpty)
        ...List.generate(saleModel.extraCharges?.length ?? 0, (index) {
          final charge = saleModel.extraCharges![index];
          return _AmountRow(
            title: charge.name ?? '',
            amount: (charge.amount ?? 0).toStringAsFixed(2),
          );
        }),

      _ReceiptDivider(),

      _AmountRow(
        title: 'TOTAL',
        amount: (saleModel.totalWithDiscount ?? 0).toStringAsFixed(2),
        bold: true,
        large: true,
      ),

      _ReceiptDivider(),

      const Padding(
        padding: EdgeInsets.only(top: 2),
        child: Text(
          'PAYMENT SUMMARY',
          style: TextStyle(
            fontSize: 11,
            fontWeight: FontWeight.bold,
            fontFamily: 'Courier',
          ),
        ),
      ),
      const SizedBox(height: 4),
      _AmountRow(title: 'Paid', amount: totalPaid.toStringAsFixed(2)),
      _AmountRow(
        title: 'Balance',
        amount: (saleModel.outstandingBalance ?? 0).toStringAsFixed(2),
      ),

      _ReceiptDivider(),

      const SizedBox(height: 6),
      const Center(
        child: Text(
          'Thank you for shopping!',
          style: TextStyle(fontSize: 11, fontFamily: 'Courier'),
        ),
      ),
      const SizedBox(height: 2),
      const Center(
        child: Text(
          'Powered by Pointify',
          style: TextStyle(fontSize: 10, fontFamily: 'Courier'),
        ),
      ),
    ];
  }
}

// ───────────────────────────────────────────────────────────────────────────
// ACTION BAR — primary Done button + icon row
// ───────────────────────────────────────────────────────────────────────────

class _ActionBar extends StatelessWidget {
  final SaleModel saleModel;
  const _ActionBar({required this.saleModel});

  @override
  Widget build(BuildContext context) {
    return Container(
      color: const Color(0xffececec),
      padding: const EdgeInsets.fromLTRB(16, 12, 16, 8),
      child: SafeArea(
        top: false,
        child: SizedBox(
          height: 52,
          child: Row(
            children: [
              // Primary action: Done
              Expanded(
                child: ElevatedButton.icon(
                  onPressed: Get.back,
                  icon: const Icon(Icons.check, color: Colors.white, size: 18),
                  label: const Text(
                    'Done',
                    style: TextStyle(
                      color: Colors.white,
                      fontSize: 14,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppColors.mainColor,
                    elevation: 0,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(14),
                    ),
                  ),
                ),
              ),
              const SizedBox(width: 8),

              // Secondary: Print
              _SecondaryAction(
                icon: Icons.print_outlined,
                tooltip: 'Print',
                onTap: () => Get.find<SalesController>()
                    .reprintReceipt(saleModel: saleModel),
              ),
              const SizedBox(width: 8),

              // Secondary: Share
              _SecondaryAction(
                icon: Icons.share_outlined,
                tooltip: 'Share',
                onTap: () async {
                  await Printing.sharePdf(
                    bytes: await generateThermalReceiptPdf(saleModel),
                    filename: '${saleModel.receiptNo}.pdf',
                  );
                },
              ),
              const SizedBox(width: 8),

              // Secondary: Save PDF
              _SecondaryAction(
                icon: Icons.picture_as_pdf_outlined,
                tooltip: 'Save PDF',
                onTap: () {
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(content: Text('PDF saved')),
                  );
                },
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _SecondaryAction extends StatelessWidget {
  final IconData icon;
  final String tooltip;
  final VoidCallback onTap;

  const _SecondaryAction({
    required this.icon,
    required this.tooltip,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return Tooltip(
      message: tooltip,
      child: Material(
        color: Colors.white,
        borderRadius: BorderRadius.circular(14),
        child: InkWell(
          onTap: onTap,
          borderRadius: BorderRadius.circular(14),
          child: Container(
            width: 52,
            height: 52,
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(14),
              border: Border.all(
                color: Colors.black.withOpacity(.06),
                width: 0.5,
              ),
            ),
            child: Icon(icon, color: AppColors.mainColor, size: 22),
          ),
        ),
      ),
    );
  }
}

// ───────────────────────────────────────────────────────────────────────────
// PERFORATION PAINTER — for top + bottom of receipt
// ───────────────────────────────────────────────────────────────────────────

class _PerforationPainter extends CustomPainter {
  final Color color;
  final bool bottom;

  _PerforationPainter({required this.color, this.bottom = false});

  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()..color = color;
    const toothWidth = 14.0;

    final path = Path();

    if (!bottom) {
      path.moveTo(0, size.height);
      double x = 0;
      while (x < size.width) {
        path.lineTo(x + toothWidth / 2, 0);
        path.lineTo(x + toothWidth, size.height);
        x += toothWidth;
      }
      path.lineTo(size.width, size.height);
      path.close();
    } else {
      path.moveTo(0, 0);
      double x = 0;
      while (x < size.width) {
        path.lineTo(x + toothWidth / 2, size.height);
        path.lineTo(x + toothWidth, 0);
        x += toothWidth;
      }
      path.lineTo(size.width, 0);
      path.close();
    }

    canvas.drawPath(path, paint);
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}

// ───────────────────────────────────────────────────────────────────────────
// SMALL RECEIPT-BODY HELPERS (now proper widgets)
// ───────────────────────────────────────────────────────────────────────────

class _ReceiptDivider extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.symmetric(vertical: 3),
      child: const Text(
        '--------------------------------',
        maxLines: 1,
        overflow: TextOverflow.clip,
        style: TextStyle(
          fontSize: 11,
          height: 1,
          letterSpacing: 1,
          fontFamily: 'Courier',
          fontWeight: FontWeight.bold,
        ),
      ),
    );
  }
}

class _ReceiptRow extends StatelessWidget {
  final String title;
  final String value;
  const _ReceiptRow({required this.title, required this.value});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 2),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 72,
            child: Text(
              title,
              style: const TextStyle(
                fontSize: 11,
                fontWeight: FontWeight.bold,
                fontFamily: 'Courier',
                height: 1,
              ),
            ),
          ),
          Expanded(
            child: Text(
              value,
              style: const TextStyle(
                fontSize: 11,
                fontFamily: 'Courier',
                height: 1,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _ReceiptHeaderCell extends StatelessWidget {
  final String text;
  final TextAlign align;
  const _ReceiptHeaderCell(this.text, {this.align = TextAlign.left});

  @override
  Widget build(BuildContext context) {
    return Text(
      text,
      textAlign: align,
      style: const TextStyle(
        fontSize: 11,
        fontFamily: 'Courier',
        fontWeight: FontWeight.bold,
      ),
    );
  }
}

class _AmountRow extends StatelessWidget {
  final String title;
  final String amount;
  final bool bold;
  final bool large;

  const _AmountRow({
    required this.title,
    required this.amount,
    this.bold = false,
    this.large = false,
  });

  @override
  Widget build(BuildContext context) {
    final style = TextStyle(
      fontSize: large ? 15 : 11,
      fontWeight: bold ? FontWeight.w900 : FontWeight.w500,
      fontFamily: 'Courier',
    );

    return Padding(
      padding: const EdgeInsets.only(bottom: 2),
      child: Row(
        children: [
          Expanded(child: Text(title, style: style)),
          Text(amount, style: style),
        ],
      ),
    );
  }
}
