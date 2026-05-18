import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:qr_code_scanner_plus/qr_code_scanner_plus.dart';

class BarcodeScannerPage extends StatefulWidget {
  final bool popAfterScan;
  final Function(String code)? onScanned;

  const BarcodeScannerPage({
    super.key,
    this.onScanned,
    this.popAfterScan = true,
  });

  @override
  State<BarcodeScannerPage> createState() => _BarcodeScannerPageState();
}

class _BarcodeScannerPageState extends State<BarcodeScannerPage> {
  final GlobalKey qrKey = GlobalKey(debugLabel: 'QR');

  QRViewController? controller;

  bool scanned = false;
  bool flashOn = false;

  @override
  void dispose() {
    controller?.dispose();
    super.dispose();
  }

  void _onQRViewCreated(QRViewController controller) {
    this.controller = controller;

    controller.scannedDataStream.listen((scanData) async {
      if (scanned) return;

      final code = scanData.code;

      if (code != null && code.isNotEmpty) {
        scanned = true;

        if (widget.onScanned != null) {
          await widget.onScanned!(code);
        }
        print("scanned: $code");
        if (widget.popAfterScan) {
          Get.back(result: code);
        }
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.black,
      appBar: AppBar(
        backgroundColor: Colors.black,
        elevation: 0,
        title: const Text("Scan Product"),
        actions: [
          IconButton(
            onPressed: () async {
              await controller?.toggleFlash();

              final status = await controller?.getFlashStatus();

              setState(() {
                flashOn = status ?? false;
              });
            },
            icon: Icon(
              flashOn ? Icons.flash_on : Icons.flash_off,
            ),
          ),
        ],
      ),
      body: Stack(
        children: [
          QRView(
            key: qrKey,
            onQRViewCreated: _onQRViewCreated,
            overlay: QrScannerOverlayShape(
              borderColor: Colors.white,
              borderRadius: 16,
              borderLength: 30,
              borderWidth: 4,
              cutOutWidth: 250,
              cutOutHeight: 120,
            ),
          ),
          Center(
            child: Container(
              width: 250,
              height: 120,
              decoration: BoxDecoration(
                border: Border.all(
                  color: Colors.white,
                  width: 2,
                ),
                borderRadius: BorderRadius.circular(16),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
