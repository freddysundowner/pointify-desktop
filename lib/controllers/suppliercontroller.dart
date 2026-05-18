import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:pointify/controllers/productcontroller.dart';
import 'package:pointify/main.dart';
import 'package:pointify/models/saleitem.dart';
import 'package:pointify/widgets/snackBars.dart';

import '../functions/functions.dart';
import '../models/customer.dart';
import '../models/invoice.dart';
import '../models/supplier.dart';
import '../services/supplier_service.dart';
import '../widgets/loading_dialog.dart';

class SupplierController extends GetxController
    with GetSingleTickerProviderStateMixin {
  ProductController productController = Get.find<ProductController>();
  final GlobalKey<State> _keyLoader = GlobalKey<State>();
  RxList<InvoiceItem> suppliersupplies = RxList([]);
  TextEditingController nameController = TextEditingController();
  TextEditingController phoneController = TextEditingController();
  TextEditingController emailController = TextEditingController();
  TextEditingController genderController = TextEditingController();
  TextEditingController addressController = TextEditingController();
  TextEditingController amountController = TextEditingController();
  TextEditingController namesController = TextEditingController();
  TextEditingController supplierController = TextEditingController();
  TextEditingController contactController = TextEditingController();
  TextEditingController quantityController = TextEditingController();
  RxBool loadingImportedSuppliers = RxBool(false);

  RxBool creatingSupplierLoad = RxBool(false);
  RxBool getSupplierReturnsLoad = RxBool(false);
  RxBool getsupplierLoad = RxBool(false);
  RxBool isLoadingSupplies = RxBool(false);
  RxBool loadingsuppliers = RxBool(false);
  RxBool supliesReturnedLoad = RxBool(false);
  RxList<Supplier> suppliers = RxList([]);
  RxList<Supplier> filteredSuppliers = RxList([]);
  RxList<SaleItem> returnedPurchases = RxList([]);
  Rxn<Supplier> supplier = Rxn(null);
  RxBool suppliersOnCreditLoad = RxBool(false);

  RxBool savesupplierLoad = RxBool(false);
  RxBool getSinglesupplier = RxBool(false);
  RxBool updatesupplierLoad = RxBool(false);
  RxBool deletesupplierLoad = RxBool(false);
  RxBool gettingSupplierSupliesLoad = RxBool(false);
  RxBool gettingSuppliesLoad = RxBool(false);
  RxBool returningLoad = RxBool(false);
  RxBool getSupplierLoad = RxBool(false);
  RxBool gettingSupliesReturnerLoad = RxBool(false);
  var purchaseOrder = [].obs;
  var returnedProducts = [].obs;
  var supplies = [].obs;
  Rxn<Customer> singleSupplier = Rxn(null);
  RxInt totals = RxInt(0);
  RxInt totalsReturn = RxInt(0);
  RxInt initialPage = RxInt(0);
  late TabController tabController;
  var sType = 'debtors'.obs;

  @override
  void onInit() {
    tabController = TabController(length: 2, vsync: this);
    super.onInit();
  }

  createSupplier({required BuildContext context, required page}) async {
    try {
      LoadingDialog.showLoadingDialog(
          context: context, title: "Creating supplier...", key: _keyLoader);
      creatingSupplierLoad.value = true;
      var supplier = {
        "name": nameController.text,
        "shopId": userController.currentUser.value?.primaryShop?.id,
        "phoneNumber": phoneController.text,
      };
      await SupplierService().createSupplier(supplier);
      await getSuppliers('');
      clearTexts();
      Get.back();
      Get.back();

      creatingSupplierLoad.value = false;
    } catch (e) {
      debugPrintMessage(e);
      creatingSupplierLoad.value = false;
    }
  }

  clearTexts() {
    nameController.text = "";
    phoneController.text = "";
    genderController.text = "";
    emailController.text = "";
    addressController.text = "";
    amountController.text = "";
  }

  getSuppliers(type, {String? name, String? shop}) async {
    loadingsuppliers.value = true;
    suppliers.clear();
    List<dynamic> suppliersList = await SupplierService().getSuppliers(
        name: name,
        shop: userController.currentUser.value?.primaryShop?.id.toString(),
        type: type);
    suppliers.addAll(suppliersList.map((e) => Supplier.fromJson(e)).toList());
    filteredSuppliers.value = suppliers;
    loadingsuppliers.value = false;
  }

  assignTextFields(Supplier supplierModel) {
    nameController.text = supplierModel.name ?? "";
    phoneController.text = supplierModel.phoneNumber ?? "";
    emailController.text = supplierModel.email ?? "";
    addressController.text = supplierModel.address ?? "";
  }

  updateSupplier(Supplier supplierModel) async {
    LoadingDialog.showLoadingDialog(
        context: Get.context!, title: "Please wait...", key: _keyLoader);
    var data = {
      "name": nameController.text,
      "phoneNumber": phoneController.text,
      "email": emailController.text,
      "address": addressController.text
    };
    var response = await SupplierService.updateSupplier(supplierModel, data);
    Get.back();
    if (response["error"] != null) {
      showSnackBar(message: response["error"], color: Colors.red);
      return;
    }
    showSnackBar(
        message: "supplier info updated successfully", color: Colors.green);
    supplier.value = Supplier.fromJson(response);
    supplier.refresh();
    debugPrintMessage(response);
  }
}
