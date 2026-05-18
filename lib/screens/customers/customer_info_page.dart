// customer_info_page.dart

import 'package:data_table_2/data_table_2.dart';
import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:intl/intl.dart';
import 'package:pointify/models/salereturn.dart';
import 'package:pointify/pdfFiles/pdf/sales_by_items.dart';
import 'package:pointify/screens/customers/edit_user.dart';
import 'package:pointify/screens/customers/wallet_page.dart';
import 'package:pointify/screens/sales/components/sales_card.dart';
import 'package:pointify/utils/helper.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../controllers/customercontroller.dart';
import '../../controllers/salescontroller.dart';
import '../../controllers/shopcontroller.dart';
import '../../controllers/suppliercontroller.dart';
import '../../functions/functions.dart';
import '../../main.dart';
import '../../models/customer.dart';
import '../../models/payment.dart';
import '../../models/salemodel.dart';
import '../../utils/colors.dart';
import '../../widgets/alert.dart';
import '../../widgets/delete_dialog.dart';
import '../../widgets/snackBars.dart';
import '../sales/components/sales_rerurn_card.dart';

class CustomerInfoPage extends StatelessWidget {
  CustomerInfoPage({super.key, Key? ke}) {
    salesController.getSalesByDate(
      shop: userController.currentUser.value!.primaryShop!.id!,
      status: "cashed",
      paymentType: "credit",
      customerid: customerController.currentCustomer.value?.sId,
    );

    salesController.getReturns(
      customerModel: customerController.currentCustomer.value,
      type: "return",
      shopid: userController.currentUser.value!.primaryShop!.id!,
    );

    customerController.getCustomersById(
      customerController.currentCustomer.value!.sId!,
    );
  }

  final CustomerController customerController = Get.find<CustomerController>();
  final SupplierController supplierController = Get.find<SupplierController>();
  final ShopController shopController = Get.find<ShopController>();
  final SalesController salesController = Get.find<SalesController>();

  launchWhatsApp({required number, required message}) async {
    String url = "whatsapp://send?phone=+254$number&text=$message";
    await canLaunchUrl(Uri.parse(url))
        ? launchUrl(Uri.parse(url))
        : showSnackBar(message: "Cannot open whatsapp", color: Colors.red);
  }

  launchMessage({required number, required message}) async {
    Uri sms = Uri.parse('sms:$number?body=$message');
    await launchUrl(sms);
  }

  @override
  Widget build(BuildContext context) {
    return Helper(
      floatButton: Container(),
      widget: SingleChildScrollView(
        child: Column(
          children: [
            Obx(
              () => Container(
                height: MediaQuery.of(context).size.height * 0.2,
                color: AppColors.mainColor,
                child: Column(
                  children: [
                    Center(
                      child: Container(
                        decoration: BoxDecoration(
                          shape: BoxShape.circle,
                          color: Colors.white,
                          border: Border.all(color: Colors.white, width: 2),
                        ),
                        child: const Icon(
                          Icons.person,
                          color: Colors.grey,
                          size: 50,
                        ),
                      ),
                    ),
                    const SizedBox(height: 10),
                    Center(
                      child: Text(
                        customerController.currentCustomer.value!.name ?? "",
                        style: const TextStyle(
                          color: Colors.white,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ),
                    const SizedBox(height: 15),
                    Container(
                      width: double.infinity,
                      padding: const EdgeInsets.only(
                        left: 20,
                        right: 20,
                        bottom: 10,
                      ),
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                        children: [
                          IconButton(
                            onPressed: () {
                              launchMessage(
                                number: customerController
                                    .currentCustomer.value?.phoneNumber,
                                message:
                                    "A quick reminder that you owe our shop please pay your debt ",
                              );
                            },
                            icon: const Icon(Icons.message),
                            color: Colors.white,
                          ),
                          IconButton(
                            onPressed: () {
                              launchWhatsApp(
                                number: customerController
                                    .currentCustomer.value?.phoneNumber,
                                message:
                                    "A quick reminder that you owe our shop please pay your debt ",
                              );
                            },
                            icon: const Icon(Icons.whatshot),
                            color: Colors.white,
                          ),
                          IconButton(
                            onPressed: () async {
                              final Uri launchUri = Uri(
                                scheme: 'tel',
                                path: customerController
                                    .currentCustomer.value?.phoneNumber,
                              );
                              await launchUrl(launchUri);
                            },
                            icon: const Icon(Icons.phone),
                            color: Colors.white,
                          ),
                          InkWell(
                            onTap: () {
                              Get.to(() => WalletPage());
                            },
                            child: Container(
                              padding: const EdgeInsets.only(
                                top: 5,
                                bottom: 5,
                                left: 10,
                                right: 15,
                              ),
                              decoration: BoxDecoration(
                                borderRadius: BorderRadius.circular(50),
                                color: Colors.white.withOpacity(0.2),
                              ),
                              child: const Row(
                                children: [
                                  Icon(Icons.credit_card, color: Colors.white),
                                  SizedBox(width: 10),
                                  Text(
                                    "Wallet",
                                    style: TextStyle(color: Colors.white),
                                  ),
                                ],
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            ),
            SizedBox(
              height: MediaQuery.of(context).size.height * 0.9,
              child: Container(
                color: Colors.white,
                width: double.infinity,
                child: DefaultTabController(
                  initialIndex: 0,
                  length: 4,
                  child: Builder(
                    builder: (context) {
                      return Column(
                        children: [
                          TabBar(
                            controller: DefaultTabController.of(context),
                            onTap: (index) {
                              if (index == 0) {
                                salesController.getSalesByDate(
                                  shop: userController
                                      .currentUser.value!.primaryShop!.id!,
                                  status: "cashed",
                                  paymentType: "credit",
                                  customerid: customerController
                                      .currentCustomer.value?.sId,
                                );
                              } else if (index == 1) {
                                salesController.getSalesByDate(
                                  shop: userController
                                      .currentUser.value!.primaryShop!.id!,
                                  status: "",
                                  customerid: customerController
                                      .currentCustomer.value?.sId,
                                );
                              } else if (index == 2) {
                                salesController.getReturns(
                                  customerModel:
                                      customerController.currentCustomer.value!,
                                  type: "return",
                                  shopid: userController
                                      .currentUser.value!.primaryShop!.id!,
                                );
                              } else if (index == 3) {
                                customerController.getTransactions(
                                  "all",
                                  customerController
                                      .currentCustomer.value!.sId!,
                                );
                              }
                            },
                            tabs: const [
                              Tab(child: Text("Credit")),
                              Tab(child: Text("Sales")),
                              Tab(child: Text("Returns")),
                              Tab(child: Text("Statement")),
                            ],
                            isScrollable: true,
                            labelColor: Colors.black,
                            unselectedLabelColor: Colors.black54,
                            labelStyle: const TextStyle(
                              fontSize: 15,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                          Expanded(
                            child: Container(
                              color: Colors.white,
                              child: TabBarView(
                                physics: const NeverScrollableScrollPhysics(),
                                children: [
                                  CreditInfo(
                                    customerModel: customerController
                                        .currentCustomer.value!,
                                  ),
                                  SalesTab(),
                                  ReturnsTab(),
                                  StatementTab(),
                                ],
                              ),
                            ),
                          ),
                        ],
                      );
                    },
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
      appBar: AppBar(
        elevation: 0.0,
        backgroundColor: AppColors.mainColor,
        leading: IconButton(
          onPressed: () {
            Get.back();
          },
          icon: const Icon(Icons.arrow_back_ios, color: Colors.white),
        ),
        actions: [
          IconButton(
            onPressed: () {
              customerController.assignTextFields(
                customerController.currentCustomer.value!,
              );
              Get.to(() => EditCustomer());
            },
            icon: const Icon(Icons.edit, color: Colors.white),
          ),
          if (verifyPermission(category: "customers", permission: "manage"))
            IconButton(
              onPressed: () {
                generalAlert(
                  title:
                      "Are you sure you want to delete ${customerController.currentCustomer.value!.name}",
                  function: () {
                    customerController.deleteCustomer(
                      customerController.currentCustomer.value!,
                    );
                  },
                );
              },
              icon: const Icon(Icons.delete, color: Colors.white),
            ),
        ],
      ),
    );
  }
}

class ReportFilterHeader extends StatelessWidget {
  final Rx<DateTime?> startDate;
  final Rx<DateTime?> endDate;
  final RxString? status;
  final List<DropdownMenuItem<String>>? statusItems;
  final Future<void> Function() onApply;
  final VoidCallback onPdf;
  final bool pdfDisabled;
  final String countText;

  const ReportFilterHeader({
    super.key,
    required this.startDate,
    required this.endDate,
    this.status,
    this.statusItems,
    required this.onApply,
    required this.onPdf,
    required this.pdfDisabled,
    required this.countText,
  });

  Future<void> pickDate({
    required BuildContext context,
    required bool isStart,
  }) async {
    final picked = await showDatePicker(
      context: context,
      initialDate: isStart
          ? startDate.value ?? DateTime.now()
          : endDate.value ?? DateTime.now(),
      firstDate: DateTime(2020),
      lastDate: DateTime.now(),
    );

    if (picked != null) {
      if (isStart) {
        startDate.value = picked;
      } else {
        endDate.value = picked;
      }

      await onApply();
    }
  }

  Widget filterChipButton({
    required String text,
    required IconData icon,
    required VoidCallback onTap,
  }) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(30),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 7),
        decoration: BoxDecoration(
          color: Colors.grey.shade100,
          borderRadius: BorderRadius.circular(30),
          border: Border.all(color: Colors.grey.shade300),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(icon, size: 15, color: Colors.black54),
            const SizedBox(width: 5),
            Text(
              text,
              style: const TextStyle(fontSize: 12, color: Colors.black87),
            ),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Obx(() {
      final hasDate = startDate.value != null || endDate.value != null;
      final hasStatus = status != null && status!.value.trim().isNotEmpty;

      return Container(
        padding: const EdgeInsets.fromLTRB(8, 6, 8, 6),
        decoration: BoxDecoration(
          color: Colors.white,
          border: Border(
            bottom: BorderSide(color: Colors.grey.shade200),
          ),
        ),
        child: Column(
          children: [
            Row(
              children: [
                Expanded(
                  child: filterChipButton(
                    icon: Icons.calendar_today,
                    text: startDate.value == null
                        ? "Start"
                        : DateFormat("dd MMM").format(startDate.value!),
                    onTap: () => pickDate(context: context, isStart: true),
                  ),
                ),
                const SizedBox(width: 6),
                Expanded(
                  child: filterChipButton(
                    icon: Icons.event,
                    text: endDate.value == null
                        ? "End"
                        : DateFormat("dd MMM").format(endDate.value!),
                    onTap: () => pickDate(context: context, isStart: false),
                  ),
                ),
                if (status != null && statusItems != null) ...[
                  const SizedBox(width: 6),
                  Expanded(
                    child: Container(
                      height: 34,
                      padding: const EdgeInsets.symmetric(horizontal: 10),
                      decoration: BoxDecoration(
                        color: Colors.grey.shade100,
                        borderRadius: BorderRadius.circular(30),
                        border: Border.all(color: Colors.grey.shade300),
                      ),
                      child: DropdownButtonHideUnderline(
                        child: DropdownButton<String>(
                          value: status!.value,
                          isExpanded: true,
                          iconSize: 18,
                          style: const TextStyle(
                            fontSize: 12,
                            color: Colors.black87,
                          ),
                          items: statusItems!,
                          onChanged: (value) async {
                            status!.value = value ?? "";
                            await onApply();
                          },
                        ),
                      ),
                    ),
                  ),
                ],
              ],
            ),
            const SizedBox(height: 6),
            Row(
              children: [
                Expanded(
                  child: Text(
                    countText,
                    style: TextStyle(
                      fontSize: 12,
                      color: Colors.grey.shade600,
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                ),
                TextButton.icon(
                  onPressed: pdfDisabled ? null : onPdf,
                  icon: const Icon(Icons.picture_as_pdf, size: 17),
                  label: const Text("PDF", style: TextStyle(fontSize: 12)),
                  style: TextButton.styleFrom(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 10,
                      vertical: 4,
                    ),
                    minimumSize: Size.zero,
                    tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                  ),
                ),
                if (hasDate || hasStatus)
                  TextButton(
                    onPressed: () async {
                      startDate.value = null;
                      endDate.value = null;
                      if (status != null) {
                        status!.value = "";
                      }
                      await onApply();
                    },
                    style: TextButton.styleFrom(
                      padding: const EdgeInsets.symmetric(horizontal: 8),
                      minimumSize: Size.zero,
                      tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                    ),
                    child: const Text(
                      "Clear",
                      style: TextStyle(fontSize: 12),
                    ),
                  ),
              ],
            ),
          ],
        ),
      );
    });
  }
}

class CreditInfo extends StatelessWidget {
  final Customer customerModel;

  CreditInfo({Key? key, required this.customerModel}) : super(key: key);

  final SalesController salesController = Get.find<SalesController>();
  final CustomerController customerController = Get.find<CustomerController>();

  final Rx<DateTime?> startDate = Rx<DateTime?>(null);
  final Rx<DateTime?> endDate = Rx<DateTime?>(null);

  Future<void> applyFilter() async {
    await salesController.getSalesByDate(
      shop: userController.currentUser.value!.primaryShop!.id!,
      status: "cashed",
      paymentType: "credit",
      customerid: customerController.currentCustomer.value?.sId,
      fromDate: startDate.value == null
          ? ""
          : DateFormat("yyyy-MM-dd").format(startDate.value!),
      toDate: endDate.value == null
          ? ""
          : DateFormat("yyyy-MM-dd").format(endDate.value!),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Obx(() {
      final sales = salesController.creditSales;

      return Column(
        children: [
          ReportFilterHeader(
            startDate: startDate,
            endDate: endDate,
            onApply: applyFilter,
            countText: "${sales.length} credit sales found",
            pdfDisabled: sales.isEmpty,
            onPdf: () async {
              await downloadSalesItemsPdf(
                sales,
                reportTitle: "Customer Credit Report",
                statusFilter: "credit",
                startDateFilter: startDate.value,
                endDateFilter: endDate.value,
                useOutstandingForCredit: true,
                walletBalance: customerController.currentCustomer.value?.wallet,
              );
            },
          ),
          Expanded(
            child: salesController.loadingSales.value
                ? const Center(child: CircularProgressIndicator())
                : sales.isEmpty
                    ? const Center(
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Text(
                              "No entries found.",
                              style: TextStyle(color: Colors.black),
                            ),
                            Text(
                              "For now",
                              style: TextStyle(color: Colors.grey),
                            ),
                          ],
                        ),
                      )
                    : ListView.builder(
                        itemCount: sales.length,
                        itemBuilder: (context, index) {
                          SaleModel salesBody = sales.elementAt(index);
                          return salesCard(salesModel: salesBody);
                        },
                      ),
          ),
        ],
      );
    });
  }
}

class SalesTab extends StatelessWidget {
  SalesTab({Key? key}) : super(key: key);

  final CustomerController customerController = Get.find<CustomerController>();
  final SalesController salesController = Get.find<SalesController>();

  final Rx<DateTime?> startDate = Rx<DateTime?>(null);
  final Rx<DateTime?> endDate = Rx<DateTime?>(null);
  final RxString status = "".obs;

  Future<void> applyFilter() async {
    await salesController.getSalesByDate(
      shop: userController.currentUser.value!.primaryShop!.id!,
      customerid: customerController.currentCustomer.value?.sId,
      paymentType: status.value,
      fromDate: startDate.value == null
          ? ""
          : DateFormat("yyyy-MM-dd").format(startDate.value!),
      toDate: endDate.value == null
          ? ""
          : DateFormat("yyyy-MM-dd").format(endDate.value!),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Obx(() {
      final sales = salesController.allSales;

      return Column(
        children: [
          ReportFilterHeader(
            startDate: startDate,
            endDate: endDate,
            status: status,
            statusItems: const [
              DropdownMenuItem(value: "", child: Text("All")),
              DropdownMenuItem(value: "cash", child: Text("Cash")),
              DropdownMenuItem(value: "credit", child: Text("Credit")),
              DropdownMenuItem(value: "mpesa", child: Text("M-Pesa")),
              DropdownMenuItem(value: "wallet", child: Text("Wallet")),
            ],
            onApply: applyFilter,
            countText: "${sales.length} sales found",
            pdfDisabled: sales.isEmpty,
            onPdf: () async {
              await downloadSalesItemsPdf(
                sales,
                reportTitle: "Customer Sales Report",
                statusFilter: status.value,
                startDateFilter: startDate.value,
                endDateFilter: endDate.value,
                useOutstandingForCredit: status.value == "credit",
                walletBalance: customerController.currentCustomer.value?.wallet,
              );
            },
          ),
          Expanded(
            child: salesController.loadingSales.value
                ? const Center(child: CircularProgressIndicator())
                : sales.isEmpty
                    ? const Center(
                        child: Text(
                          "No entries",
                          style: TextStyle(color: Colors.grey),
                        ),
                      )
                    : ListView.separated(
                        padding: const EdgeInsets.only(top: 4, bottom: 10),
                        itemCount: sales.length,
                        separatorBuilder: (_, __) => const SizedBox(height: 2),
                        itemBuilder: (context, index) {
                          final saleOrder = sales.elementAt(index);

                          return salesCard(
                            salesModel: saleOrder,
                            from: 'customerpage',
                          );
                        },
                      ),
          ),
        ],
      );
    });
  }
}

class ReturnsTab extends StatelessWidget {
  ReturnsTab({Key? key}) : super(key: key);

  final SalesController salesController = Get.find<SalesController>();
  final CustomerController customerController = Get.find<CustomerController>();

  final Rx<DateTime?> startDate = Rx<DateTime?>(null);
  final Rx<DateTime?> endDate = Rx<DateTime?>(null);

  Future<void> applyFilter() async {
    await salesController.getReturns(
      customerModel: customerController.currentCustomer.value!,
      type: "return",
      shopid: userController.currentUser.value!.primaryShop!.id!,
    );
  }

  List<SaleRetuns> filteredReturns(List<SaleRetuns> returns) {
    return returns.where((item) {
      try {
        final dynamic value = item;
        final dateValue = value.createdAt ?? value.date;
        if (dateValue == null) return true;

        final date = DateTime.parse(dateValue.toString());

        if (startDate.value != null) {
          final start = DateTime(
            startDate.value!.year,
            startDate.value!.month,
            startDate.value!.day,
          );
          if (date.isBefore(start)) return false;
        }

        if (endDate.value != null) {
          final end = DateTime(
            endDate.value!.year,
            endDate.value!.month,
            endDate.value!.day,
            23,
            59,
            59,
          );
          if (date.isAfter(end)) return false;
        }

        return true;
      } catch (_) {
        return true;
      }
    }).toList();
  }

  @override
  Widget build(BuildContext context) {
    return Obx(() {
      final returns = filteredReturns(salesController.allSalesReturns);

      return Column(
        children: [
          ReportFilterHeader(
            startDate: startDate,
            endDate: endDate,
            onApply: applyFilter,
            countText: "${returns.length} returns found",
            pdfDisabled: returns.isEmpty,
            onPdf: () async {
              await downloadCustomerReturnsPdf(
                returns,
                customer: customerController.currentCustomer.value,
                startDateFilter: startDate.value,
                endDateFilter: endDate.value,
              );
            },
          ),
          Expanded(
            child: returns.isEmpty
                ? const Center(
                    child: Text(
                      "No entries",
                      textAlign: TextAlign.center,
                    ),
                  )
                : ListView.builder(
                    itemCount: returns.length,
                    itemBuilder: (context, index) {
                      SaleRetuns saleReturnItems = returns.elementAt(index);
                      return saleReturnCard(saleReturnItems);
                    },
                  ),
          ),
        ],
      );
    });
  }
}

class StatementTab extends StatelessWidget {
  StatementTab({Key? key}) : super(key: key);

  final CustomerController customerController = Get.find<CustomerController>();

  final Rx<DateTime?> startDate = Rx<DateTime?>(null);
  final Rx<DateTime?> endDate = Rx<DateTime?>(null);

  Future<void> applyFilter() async {
    await customerController.getTransactions(
      "all",
      customerController.currentCustomer.value!.sId!,
    );
  }

  List<Payment> filteredPayments(List<Payment> payments) {
    return payments.where((payment) {
      if (payment.date == null) return true;

      final date = DateTime.parse(payment.date!);

      if (startDate.value != null) {
        final start = DateTime(
          startDate.value!.year,
          startDate.value!.month,
          startDate.value!.day,
        );
        if (date.isBefore(start)) return false;
      }

      if (endDate.value != null) {
        final end = DateTime(
          endDate.value!.year,
          endDate.value!.month,
          endDate.value!.day,
          23,
          59,
          59,
        );
        if (date.isAfter(end)) return false;
      }

      return true;
    }).toList();
  }

  @override
  Widget build(BuildContext context) {
    return Obx(() {
      final payments = filteredPayments(customerController.deposits);

      return Column(
        children: [
          ReportFilterHeader(
            startDate: startDate,
            endDate: endDate,
            onApply: applyFilter,
            countText: "${payments.length} statement entries found",
            pdfDisabled: payments.isEmpty,
            onPdf: () async {
              await downloadCustomerStatementPdf(
                payments,
                customer: customerController.currentCustomer.value,
                startDateFilter: startDate.value,
                endDateFilter: endDate.value,
              );
            },
          ),
          Expanded(
            child: Container(
              margin: const EdgeInsets.only(bottom: 20),
              child: DataTable2(
                minWidth: 400,
                horizontalMargin: 5,
                columns: const [
                  DataColumn2(label: Text('Date')),
                  DataColumn(label: Text('In')),
                  DataColumn(label: Text('Out')),
                  DataColumn(label: Text('Balance')),
                ],
                rows: List<DataRow>.generate(payments.length, (index) {
                  Payment payment = payments.elementAt(index);

                  return DataRow(
                    cells: [
                      DataCell(
                        Text(
                          payment.date == null
                              ? ""
                              : DateFormat("dd-MM-yyyy HH:mm:a").format(
                                  DateTime.parse(payment.date!),
                                ),
                          style: const TextStyle(fontSize: 12),
                        ),
                      ),
                      DataCell(
                        Text(
                          "${payment.type == "withdraw" ? "" : "-${htmlPrice(payment.amount ?? 0)}"} ",
                          style: TextStyle(
                            color: payment.type == "withdraw"
                                ? Colors.red
                                : Colors.green,
                            fontSize: 12,
                          ),
                        ),
                      ),
                      DataCell(
                        Text(
                          "${payment.type == "withdraw" ? "+${htmlPrice(payment.amount ?? 0)}" : ""} ",
                          style: TextStyle(
                            color: payment.type == "withdraw"
                                ? Colors.red
                                : Colors.green,
                            fontSize: 12,
                          ),
                        ),
                      ),
                      DataCell(Text(htmlPrice(payment.balance ?? 0))),
                    ],
                  );
                }),
                isHorizontalScrollBarVisible: true,
              ),
            ),
          ),
        ],
      );
    });
  }
}

showBottomSheet(BuildContext context) {
  return showModalBottomSheet<void>(
    context: context,
    builder: (BuildContext context) {
      return SizedBox(
        height: 150,
        child: Center(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Container(
                padding: const EdgeInsets.all(10),
                width: double.infinity,
                color: Colors.grey.withOpacity(0.7),
                child: const Text('Manage Bank'),
              ),
              Padding(
                padding: const EdgeInsets.all(8.0),
                child: GestureDetector(
                  onTap: () {
                    Navigator.pop(context);
                  },
                  child: const Row(
                    children: [
                      Icon(Icons.edit),
                      SizedBox(width: 10),
                      Text('Edit'),
                    ],
                  ),
                ),
              ),
              Padding(
                padding: const EdgeInsets.all(8.0),
                child: GestureDetector(
                  onTap: () {
                    Navigator.pop(context);
                    deleteDialog(context: context, onPressed: () {});
                  },
                  child: const Row(
                    children: [
                      Icon(Icons.delete_outline_rounded),
                      SizedBox(width: 10),
                      Text('Delete'),
                    ],
                  ),
                ),
              ),
            ],
          ),
        ),
      );
    },
  );
}
