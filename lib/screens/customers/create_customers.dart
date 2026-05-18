import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:get/get.dart';
import 'package:pointify/responsive/responsiveness.dart';
import 'package:pointify/screens/customers/customers_page.dart';
import 'package:pointify/screens/product/create_product.dart';
import 'package:pointify/screens/sales/create_sale.dart';

import '../../../../utils/colors.dart';
import '../../controllers/customercontroller.dart';
import '../../controllers/homecontroller.dart';
import '../../controllers/shopcontroller.dart';
import '../../controllers/suppliercontroller.dart';
import '../../main.dart';
import '../../widgets/major_title.dart';
import '../../widgets/minor_title.dart';

class CreateCustomer extends StatelessWidget {
  final String page;
  final Function? function;

  CreateCustomer({Key? key, required this.page, this.function})
      : super(key: key) {
    customersController.nameController.clear();
    customersController.phoneController.clear();
  }

  final CustomerController customersController = Get.find<CustomerController>();
  final SupplierController supplierController = Get.find<SupplierController>();
  final ShopController shopController = Get.find<ShopController>();

  @override
  Widget build(BuildContext context) {
    return PopScope(
      canPop: true,
      onPopInvoked: (val) {
        customersController.getCustomersInShop("");
      },
      child: Scaffold(
          backgroundColor: Colors.white.withOpacity(0.96),
          appBar: AppBar(
              elevation: 0.3,
              titleSpacing: 0.0,
              centerTitle: false,
              backgroundColor: Colors.white,
              automaticallyImplyLeading: false,
              leading: IconButton(
                onPressed: () {
                  Get.back();
                },
                icon: const Icon(Icons.arrow_back_ios, color: Colors.black),
              ),
              title: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  majorTitle(
                      title: "Customer Details",
                      color: Colors.black,
                      size: 16.0),
                  minorTitle(
                      title:
                          userController.currentUser.value?.primaryShop?.name,
                      color: Colors.grey),
                ],
              )),
          body: Column(
            children: [
              TabBar(
                  physics: const NeverScrollableScrollPhysics(),
                  onTap: (value) async {
                    if (value == 1) {
                      // customersController.importContacts();
                    }
                  },
                  controller: customersController.customersController,
                  tabs: const [
                    Tab(
                      child: Text(
                        "Add New",
                        style: TextStyle(fontSize: 14, color: Colors.black),
                      ),
                    ),
                    Tab(
                      child: Text(
                        "Import",
                        style: TextStyle(fontSize: 14, color: Colors.black),
                      ),
                    )
                  ]),
              Expanded(
                  child: TabBarView(
                physics: const NeverScrollableScrollPhysics(),
                controller: customersController.customersController,
                children: [
                  SingleChildScrollView(
                    child: customerInfoCard(context),
                  ),
                  Obx(() {
                    return customersController.loadingImportedCustomers.value ==
                            true
                        ? const Center(
                            child: CircularProgressIndicator(),
                          )
                        : Container(
                            padding: const EdgeInsets.symmetric(
                                horizontal: 20, vertical: 10),
                            child: Column(
                              children: [
                                TextFormField(
                                  controller: shopController.searchController,
                                  onChanged: (value) {
                                    // if (value.isNotEmpty) {
                                    //   //filter based on the text entered
                                    //   customersController
                                    //           .filteredCustomers.value =
                                    //       customersController.importedCustomers
                                    //           .where((element) {
                                    //     return element.displayName
                                    //             .toLowerCase()
                                    //             .contains(
                                    //                 value.toLowerCase()) &&
                                    //         !customersController.customers
                                    //             .contains(element
                                    //                 .phones.first.number);
                                    //   }).toList();
                                    // }
                                  },
                                  decoration: InputDecoration(
                                    contentPadding:
                                        const EdgeInsets.fromLTRB(10, 5, 10, 5),
                                    suffixIcon: IconButton(
                                      onPressed: () {},
                                      icon: const Icon(Icons.search),
                                    ),
                                    hintText: "Search Contact by name",
                                    border: OutlineInputBorder(
                                        borderRadius: BorderRadius.circular(
                                          10,
                                        ),
                                        borderSide: const BorderSide(
                                            color: Colors.grey, width: 1)),
                                    focusedBorder: OutlineInputBorder(
                                        borderRadius: BorderRadius.circular(10),
                                        borderSide: const BorderSide(
                                            color: Colors.grey, width: 1)),
                                  ),
                                ),
                                // Expanded(
                                //   child: ListView.builder(
                                //       shrinkWrap: true,
                                //       itemCount: customersController
                                //           .filteredCustomers.length,
                                //       itemBuilder: (context, index) {
                                //         Contact contact = customersController
                                //             .filteredCustomers
                                //             .elementAt(index);
                                //         return Container(
                                //           padding: EdgeInsets.all(10),
                                //           width:
                                //               MediaQuery.of(context).size.width,
                                //           child: Row(
                                //             children: [
                                //               Icon(Icons.person),
                                //               const SizedBox(
                                //                 width: 10,
                                //               ),
                                //               Column(
                                //                 crossAxisAlignment:
                                //                     CrossAxisAlignment.start,
                                //                 children: [
                                //                   minorTitle(
                                //                       title:
                                //                           contact.displayName,
                                //                       color: Colors.grey),
                                //                   majorTitle(
                                //                       title: contact.phones[0]
                                //                           .normalizedNumber,
                                //                       color: Colors.black,
                                //                       size: 13.0)
                                //                 ],
                                //               ),
                                //               Spacer(),
                                //               InkWell(
                                //                 onTap: () {
                                //                   customersController
                                //                       .importCustomer(
                                //                           contact: contact);
                                //                 },
                                //                 child: Row(
                                //                   children: [
                                //                     const Icon(Icons.add,
                                //                         color: Colors.black),
                                //                     minorTitle(
                                //                         title: "Import",
                                //                         color: Colors.black)
                                //                   ],
                                //                 ),
                                //               )
                                //             ],
                                //           ),
                                //         );
                                //       }),
                                // ),
                                Container()
                              ],
                            ),
                          );
                  })
                ],
              ))
            ],
          )),
    );
  }

  Widget customerInfoCard(context) {
    return Container(
      padding: const EdgeInsets.symmetric(vertical: 15, horizontal: 35),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const SizedBox(height: 20),
              Text("Customer Name".capitalize!),
              const SizedBox(height: 10),
              TextFormField(
                controller: customersController.nameController,
                keyboardType: TextInputType.text,
                decoration: InputDecoration(
                    isDense: true,
                    hintStyle: const TextStyle(
                        color: Colors.grey, fontWeight: FontWeight.bold),
                    hintText: "eg.John Doe",
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(10),
                      borderSide:
                          const BorderSide(color: Colors.grey, width: 1),
                    ),
                    focusedBorder: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(10),
                      borderSide:
                          const BorderSide(color: Colors.grey, width: 1),
                    ),
                    filled: true,
                    fillColor: Colors.white),
              )
            ],
          ),
          const SizedBox(height: 20),
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text("Phone Number"),
              const SizedBox(height: 10),
              TextFormField(
                  controller: customersController.phoneController,
                  keyboardType: TextInputType.number,
                  inputFormatters: [FilteringTextInputFormatter.digitsOnly],
                  decoration: InputDecoration(
                    isDense: true,
                    hintStyle: const TextStyle(
                        color: Colors.grey, fontWeight: FontWeight.bold),
                    hintText: "eg.07XXXXXXXX",
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(10),
                      borderSide:
                          const BorderSide(color: Colors.grey, width: 1),
                    ),
                    focusedBorder: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(10),
                      borderSide:
                          const BorderSide(color: Colors.grey, width: 1),
                    ),
                  ))
            ],
          ),
          const SizedBox(height: 20),
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text("Email"),
              const SizedBox(height: 10),
              TextFormField(
                  controller: customersController.emailController,
                  keyboardType: TextInputType.emailAddress,
                  decoration: InputDecoration(
                    isDense: true,
                    hintStyle: const TextStyle(
                        color: Colors.grey, fontWeight: FontWeight.bold),
                    hintText: "eg.test@gmail.com",
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(10),
                      borderSide:
                          const BorderSide(color: Colors.grey, width: 1),
                    ),
                    focusedBorder: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(10),
                      borderSide:
                          const BorderSide(color: Colors.grey, width: 1),
                    ),
                  ))
            ],
          ),
          const SizedBox(height: 20),
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text("Address"),
              const SizedBox(height: 10),
              TextFormField(
                  controller: customersController.addressController,
                  minLines: 3,
                  maxLines: 20,
                  decoration: InputDecoration(
                    isDense: true,
                    hintStyle: const TextStyle(
                        color: Colors.grey, fontWeight: FontWeight.bold),
                    hintText: "eg. kanu street, nakuru kenya",
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(10),
                      borderSide:
                          const BorderSide(color: Colors.grey, width: 1),
                    ),
                    focusedBorder: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(10),
                      borderSide:
                          const BorderSide(color: Colors.grey, width: 1),
                    ),
                  ))
            ],
          ),
          SizedBox(height: MediaQuery.of(context).size.height * 0.10),
          InkWell(
            splashColor: Colors.transparent,
            hoverColor: Colors.transparent,
            onTap: () {
              customersController.createCustomer(
                  page: page,
                  function: () {
                    chooseCustomer(context: context);
                  });
            },
            child: Center(
              child: Container(
                padding: const EdgeInsets.all(10),
                width: MediaQuery.of(context).size.width * 0.25,
                decoration: BoxDecoration(
                    border: Border.all(width: 3, color: AppColors.mainColor),
                    borderRadius: BorderRadius.circular(40)),
                child: Center(
                    child: majorTitle(
                        title: "Save", color: AppColors.mainColor, size: 18.0)),
              ),
            ),
          ),
          const SizedBox(height: 10),
        ],
      ),
    );
  }

  chooseCustomer({required context}) {
    Get.to(() => Scaffold(
          appBar: AppBar(
            actions: [
              IconButton(
                  onPressed: () {
                    Get.to(() => CreateCustomer(
                          page: "customersPage",
                        ));
                  },
                  icon: const Icon(Icons.add))
            ],
            title: const Text("Select customer"),
          ),
          body: Customers(type: "sale"),
        ));
  }
}
