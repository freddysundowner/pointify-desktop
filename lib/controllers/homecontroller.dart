import 'package:flutter/cupertino.dart';
import 'package:get/get_rx/src/rx_types/rx_types.dart';
import 'package:get/get_state_manager/src/simple/get_controllers.dart';

import '../screens/home/attendant/attendants_page.dart';
import '../screens/home/home_page.dart';
import '../screens/home/profile_page.dart';
import '../screens/shop/shops_page.dart';
import '../utils/constants.dart';

class HomeController extends GetxController {
  RxString hoveredItem = RxString(homePage);
  RxString activeItem = RxString(homePage);

  Rxn<Widget> selectedWidget = Rxn(HomePage());

  RxInt selectedIndex = RxInt(0);
  List pages = [HomePage(), ShopsPage(), AttendantsPage(), ProfilePage()];
}
