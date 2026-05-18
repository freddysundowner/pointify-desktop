import 'package:get/get.dart';
import 'package:pointify/controllers/homecontroller.dart';
import 'package:pointify/controllers/usercontroller.dart';

import 'controllers/authcontroller.dart';
import 'controllers/chat_controller.dart';
import 'controllers/inapp_purchases.dart';
import 'controllers/printercontroller.dart';
import 'controllers/shopcontroller.dart';

class AuthBinding extends Bindings {
  @override
  void dependencies() {
    Get.put<AuthController>(AuthController(), permanent: true);
    Get.put<UserController>(UserController(), permanent: true);
    Get.put<HomeController>(HomeController(), permanent: true);
    Get.put<ShopController>(ShopController(), permanent: true);
    Get.put<ChatController>(ChatController(), permanent: true);
    Get.put<PrinterController>(PrinterController(), permanent: true);
    Get.put<InappPurchasesController>(
      InappPurchasesController.inAppPurchaseUtilsInstance,
      permanent: true,
    );
  }
}
