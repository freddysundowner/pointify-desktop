import 'package:get/get.dart';

import '../models/package.dart';
import '../services/plan_service.dart';

class PlanController extends GetxController {
  RxList<Package> plans = RxList([]);
  RxList<Package> defaultPlans = RxList([]);
  RxBool isLoadingPackages = RxBool(false);

  getPlans() async {
    try {
      plans.clear();
      isLoadingPackages.value = true;
      var response = await PlansService().getPlans();
      isLoadingPackages.value = false;
      if (response.isEmpty) {
        for (var element in defaultPlans) {
          PlansService().createPackage(element);
        }
      }
      List packages = response['data'] ?? response['packages'];
      List<Package> allpackages =
          packages.map((e) => Package.fromJson(e)).toList();

      plans.addAll(allpackages.where((element) => element.type != "trial"));
    } finally {
      isLoadingPackages.value = false;
    }
  }
}
