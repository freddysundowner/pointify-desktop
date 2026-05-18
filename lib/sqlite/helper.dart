import 'dart:convert';

import 'package:path/path.dart';
import 'package:sqflite/sqflite.dart';

import '../main.dart';

class DatabaseHelper {
  static final DatabaseHelper _instance = DatabaseHelper._internal();
  factory DatabaseHelper() => _instance;
  int newVersion = 31;
  static Database? _database;
  Future _onUpgrade(Database db, int oldVersion, int newVersion) async {
    if (oldVersion < newVersion) {
      await _instance.deleteDb(); // Delete existing database
      await _instance.database; // Initialize database
    }
  }

  DatabaseHelper._internal();

  Future<Database> get database async {
    if (_database != null) return _database!;
    _database = await _initDatabase();
    return _database!;
  }

  Future<Database> _initDatabase() async {
    final databasesPath = await getDatabasesPath();
    final path = join(databasesPath, 'pointy_$newVersion.db');
    return await openDatabase(
      path,
      version: 1,
      onCreate: _onCreate,
      onUpgrade: _onUpgrade,
    );
  }

  Future<void> _onCreate(Database db, int version) async {
    await db.execute('''
    CREATE TABLE sales (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      products TEXT,
      shopId TEXT,
      attendantId TEXT,
      saleType TEXT,
      createdAt TEXT,
      status TEXT,
      totaltax REAL,
      salesnote TEXT,
      duedate TEXT,
      mpesaTotal REAL,
      bankTotal REAL,
      amountPaid REAL,
      paymentType TEXT,
      paymentTag TEXT,
      totalDiscount REAL,
      customerId TEXT
    )
    ''');
    await db.execute('''
      CREATE TABLE products (
        id TEXT PRIMARY KEY,
        name TEXT,
        buyingPrice REAL,
        sellingPrice REAL,
        wholesalePrice REAL,
        dealerPrice REAL,
        minSellingPrice REAL,
        quantity INTEGER,
        lastCount INTEGER,
        maxDiscount REAL,
        reorderLevel INTEGER,
        productCategoryId TEXT,
        measure TEXT,
        deleted INTEGER,
        taxable INTEGER,
        supplierId TEXT,
        shopId TEXT,
        description TEXT,
        attendantId TEXT,
        lastcoundate TEXT,
        expiryDate TEXT,
        barcode TEXT,
        productType TEXT,
        date TEXT,
        manufacturer TEXT
      )
    ''');

    await db.execute('''
      CREATE TABLE productCategory (
        id TEXT PRIMARY KEY,
        name TEXT
      )
    ''');

    await db.execute('''
      CREATE TABLE shop (
        id TEXT PRIMARY KEY,
        name TEXT,
        address TEXT,
        shopCategoryId TEXT,
        deletewarning INTEGER,
        affliate TEXT,
        backupdate TEXT,
        currency TEXT,
        backupInterval TEXT,
        backupemail TEXT,
        allowBackup INTEGER,
        allowOnlineSelling INTEGER,
        useWarehouse INTEGER,
        adminId TEXT,
        createAt TEXT,
        coordinates_lat REAL,
        coordinates_long REAL,
        subscriptionId TEXT
      )
    ''');

    await db.execute('''
      CREATE TABLE subscription (
        id TEXT PRIMARY KEY,
        userId TEXT,
        shop TEXT,
        amount REAL,
        status INTEGER,
        commission REAL,
        paid INTEGER,
        startDate TEXT,
        endDate TEXT,
        createAt TEXT,
        packageId TEXT
      )
    ''');

    await db.execute('''
      CREATE TABLE packageId (
        id TEXT PRIMARY KEY,
        discount INTEGER,
        title TEXT,
        description TEXT,
        durationValue INTEGER,
        durationUnit TEXT,
        amount INTEGER,
        type TEXT,
        features TEXT,
        maxShops INTEGER,
        status INTEGER
      )
    ''');

    await db.execute('''
      CREATE TABLE supplier (
        id TEXT PRIMARY KEY,
        name TEXT,
        phoneNumber TEXT
      )
    ''');

    await db.execute('''
      CREATE TABLE attendant (
        id TEXT PRIMARY KEY,
        username TEXT
        shopId TEXT,
        uniqueDigits INTEGER
      )
    ''');

    await db.execute('''
      CREATE TABLE settings (
        number_of_image_per_product TEXT,
        shop_name TEXT,
        android_version TEXT,
        ios_version TEXT,
        address TEXT,
        demolink TEXT,
        company_name TEXT,
        vat_number TEXT,
        post_code TEXT,
        contact TEXT,
        email TEXT,
        website TEXT,
        receipt_size TEXT,
        default_currency TEXT,
        default_time_zone TEXT,
        default_date_format TEXT,
        forceUpdate INTEGER,
        appName TEXT,
        discovershops INTEGER,
        google_api_key TEXT,
        stripe_secret_key TEXT,
        verifyemail INTEGER
      )
    ''');

    await db.execute('''
      CREATE TABLE users (
        id TEXT PRIMARY KEY,
        platform TEXT,
        app_version TEXT,
        email TEXT,
        usertype TEXT,
        username TEXT,
        password TEXT,
        phone TEXT,
        createdAt TEXT,
        last_seen TEXT,
        emailVerified INTEGER,
        phoneVerified INTEGER,
        emailVerificationDate TEXT,
        affliate TEXT,
        otp INTEGER,
        otp_expiry INTEGER,
        lastSubscriptionReminder TEXT,
        lastSubscriptionReminderCount INTEGER,
        attendantId TEXT,
        primaryShopId TEXT,
        shopName TEXT,
        shopAddress TEXT
      )
    ''');

    //create customer table
    await db.execute('''
      CREATE TABLE customer (
        id TEXT PRIMARY KEY,
        name TEXT,
        totalDebt INTEGER,
        wallet INTEGER,
        shopId TEXT,
        attendantId TEXT,
        phoneNumber TEXT,
        customerNo INTEGER,
        address TEXT,
        email TEXT,
        sId TEXT,
        createAt TEXT
      )
    ''');
  }

  Future<void> deleteDb() async {
    final databasesPath = await getDatabasesPath();
    final path = join(databasesPath, 'products.db');
    await deleteDatabase(path);
  }

  Future<void> insertProduct(Map<String, dynamic> product) async {
    final db = await database;
    // Insert product
    await db.insert(
      'products',
      {
        'id': product['_id'],
        'name': product['name'],
        'buyingPrice': product['buyingPrice'],
        'sellingPrice': product['sellingPrice'],
        'wholesalePrice': product['wholesalePrice'],
        'dealerPrice': product['dealerPrice'],
        'minSellingPrice': product['minSellingPrice'],
        'quantity': product['quantity'],
        'lastCount': product['lastCount'],
        'maxDiscount': product['maxDiscount'],
        'reorderLevel': product['reorderLevel'],
        'productCategoryId': product['productCategoryId']?['_id'],
        'measure': product['measure'],
        'deleted': product['deleted'] ? 1 : 0,
        'taxable': product['taxable'] ? 1 : 0,
        'supplierId': product['supplierId']?['_id'],
        'shopId': product['shopId']?['_id'],
        'description': product['description'],
        'attendantId': product['attendantId']?['_id'],
        'lastcoundate': product['lastcoundate'],
        'expiryDate': product['expiryDate'],
        'barcode': product['barcode'],
        'productType': product['productType'],
        'date': product['date'],
        'manufacturer': product['manufacturer'],
      },
      conflictAlgorithm: ConflictAlgorithm.replace,
    );

    // Insert product category if it exists
    if (product['productCategoryId'] != null) {
      await db.insert(
        'productCategory',
        {
          'id': product['productCategoryId']['_id'],
          'name': product['productCategoryId']['name']
        },
        conflictAlgorithm: ConflictAlgorithm.replace,
      );
    }

    // Insert supplier if it exists
    if (product['supplierId'] != null) {
      await db.insert(
        'supplier',
        {
          'id': product['supplierId']['_id'],
          'name': product['supplierId']['name'],
          'phoneNumber': product['supplierId']['phoneNumber']
        },
        conflictAlgorithm: ConflictAlgorithm.replace,
      );
    }

    // Insert attendant if it exists
    if (product['attendantId'] != null) {
      await db.insert(
        'attendant',
        {
          'id': product['attendantId']['_id'],
          'username': product['attendantId']['username']
        },
        conflictAlgorithm: ConflictAlgorithm.replace,
      );
    }
  }

  //get customers

  Future<List<Map<String, dynamic>>> getCustomers() async {
    final db = await database;
    final result = await db.rawQuery('SELECT * FROM customer');
    return result;
  }

  //get sales

  Future<List<Map<String, dynamic>>> getSales() async {
    final db = await database;
    final result = await db.rawQuery('SELECT * FROM sales');
    return result;
  }

  Future<List<Map<String, dynamic>>> getProducts() async {
    final db = await database;
    final result = await db.rawQuery('''
      SELECT 
        products.*,
        productCategory.name as categoryName,
        shop.name as shopName,
        shop.address as shopAddress,
        supplier.name as supplierName,
        supplier.phoneNumber as supplierPhoneNumber,
        attendant.username as attendantUsername
      FROM products
      LEFT JOIN productCategory ON products.productCategoryId = productCategory.id
      LEFT JOIN shop ON products.shopId = shop.id
      LEFT JOIN supplier ON products.supplierId = supplier.id
      LEFT JOIN attendant ON products.attendantId = attendant.id
    ''');
    return result
        .where((element) =>
            element['shopId'] ==
            userController.currentUser.value?.primaryShop?.id)
        .toList();
  }
  //delete sale

  Future<void> deleteSale(int id) async {
    final db = await database;
    await db.delete(
      'sales',
      where: 'id = ?',
      whereArgs: [id],
    );
  }

  Future<void> insertSale(Map<String, dynamic> sale) async {
    final db = await database;
    await db.insert('sales', {
      'products': jsonEncode(sale['products']),
      'shopId': sale['shopId'],
      'attendantId': sale['attendantId'],
      'saleType': sale['saleType'],
      'createdAt': sale['createdAt'],
      'status': sale['status'],
      'totaltax': sale['totaltax'],
      'salesnote': sale['salesnote'],
      'duedate': sale['duedate'],
      'mpesaTotal': sale['mpesaTotal'],
      'bankTotal': sale['bankTotal'],
      'amountPaid': sale['amountPaid'],
      'paymentType': sale['paymentType'],
      'paymentTag': sale['paymentTag'],
      'totalDiscount': sale['totalDiscount'],
      'customerId': sale['customerId'],
    });
  }

  Future<void> updateProduct(Map<String, dynamic> product) async {
    final db = await database;
    await db.update(
      'products',
      product,
      where: 'id = ?',
      whereArgs: [product['id']],
    );
  }

  Future<void> insertUser(Map<String, dynamic> user) async {
    final db = await database;
    await db.insert(
      'users',
      {
        'id': user['_id'],
        'platform': user['platform'],
        'app_version': user['app_version'],
        'email': user['email'],
        'username': user['username'],
        'usertype': user['usertype'],
        'password': user['password'],
        'phone': user['phone'],
        'createdAt': user['createdAt'],
        'last_seen': user['last_seen'],
        'emailVerified': user['emailVerified'] ? 1 : 0,
        'phoneVerified': user['phoneVerified'] ? 1 : 0,
        'emailVerificationDate': user['emailVerificationDate'],
        'affliate': user['affliate'],
        'otp': user['otp'],
        'otp_expiry': user['otp_expiry'],
        'lastSubscriptionReminder': user['lastSubscriptionReminder'],
        'lastSubscriptionReminderCount': user['lastSubscriptionReminderCount'],
        'attendantId': user['attendantId']?['_id'],
        'primaryShopId': user['primaryShop']?['_id'],
        'shopName': user['primaryShop']?['name'],
        'shopAddress': user['primaryShop']?['address'],
      },
      conflictAlgorithm: ConflictAlgorithm.replace,
    );
    if (user['primaryShop'] != null) {
      await insertShop(user['primaryShop']);
    }
    if (user['primaryShop'] != null &&
        user['primaryShop']?['subscription'] != null) {
      await insertSubscription(user['primaryShop']?['subscription']);
    }
    if (user['primaryShop'] != null &&
        user['primaryShop']?['subscription']?['packageId'] != null) {
      await insertPackageId(user['primaryShop']?['subscription']?['packageId']);
    }

    if (user['attendantId'] != null) {
      await insertAttendant(user['attendantId']);
    }
  }

  Future getPrimaryShopId() async {
    final db = await database;
    final result = await db.rawQuery('''
      SELECT 
        primaryShopId
      FROM users
    ''');
    return result.first['primaryShopId'];
  }

  Future<Map<String, dynamic>?> getUserByEmail(
      {String? email, String? id}) async {
    final db = await database;
    var userResult = <Map<String, dynamic>>[];
    if (email != null) {
      // Fetch user details
      const String userSql = '''
    SELECT 
      *
    FROM users
    WHERE email = ?
  ''';
      userResult = await db.rawQuery(userSql, [email]);
    } else if (id != null) {
      // Fetch user details
      const String userSql = '''
    SELECT 
      *
    FROM users
    WHERE id = ?  
  ''';
      userResult = await db.rawQuery(userSql, [id]);
    }

    if (userResult.isEmpty) {
      return null;
    }

    // Extract user data
    Map<String, dynamic> user = Map<String, dynamic>.from(userResult.first);

    // Fetch primary shop details
    const String shopSql = '''
    SELECT 
      *
    FROM shop
    WHERE id = ?
  ''';
    List<Map<String, dynamic>> shopResult =
        await db.rawQuery(shopSql, [user['primaryShopId']]);
    if (shopResult.isNotEmpty && user['primaryShopId'] != null) {
      user['primaryShop'] = Map<String, dynamic>.from(shopResult.first);
      // Fetch subscription details
      const String subscriptionSql = '''
      SELECT 
        *
      FROM subscription
      WHERE id = ?
    ''';
      if (user['primaryShop']['subscriptionId'] != null) {
        List<Map<String, dynamic>> subscriptionResult = await db
            .rawQuery(subscriptionSql, [user['primaryShop']['subscriptionId']]);

        if (subscriptionResult.isNotEmpty) {
          user['primaryShop']['subscription'] =
              Map<String, dynamic>.from(subscriptionResult.first);

          // Fetch packageId details
          const String packageSql = '''
        SELECT 
          *
        FROM packageId
        WHERE id = ?
      ''';
          List<Map<String, dynamic>> packageResult = await db.rawQuery(
              packageSql, [user['primaryShop']['subscription']['packageId']]);

          if (packageResult.isNotEmpty) {
            user['primaryShop']['subscription']['packageId'] =
                Map<String, dynamic>.from(packageResult.first);
          }
        }
      }
    }
    if (user['attendantId'] != null) {
      const String attendantSql = '''
      SELECT 
        *
      FROM attendant
      WHERE id = ?
    ''';
      List<Map<String, dynamic>> attendantResult =
          await db.rawQuery(attendantSql, [user['attendantId']]);
      if (attendantResult.isNotEmpty) {
        user['attendantId'] = Map<String, dynamic>.from(attendantResult.first);
      }
    }
    return user;
  }

  Future<List<Map<String, dynamic>>> getAllUsers() async {
    final db = await database;
    return await db.query('users');
  }

  Future<void> insertSettings(Map<String, dynamic> settings) async {
    final db = await database;
    await db.insert(
      'settings',
      {
        'number_of_image_per_product': settings['number_of_image_per_product'],
        'shop_name': settings['shop_name'],
        'android_version': settings['android_version'],
        'ios_version': settings['ios_version'],
        'address': settings['address'],
        'demolink': settings['demolink'],
        'company_name': settings['company_name'],
        'vat_number': settings['vat_number'],
        'post_code': settings['post_code'],
        'contact': settings['contact'],
        'email': settings['email'],
        'website': settings['website'],
        'receipt_size': settings['receipt_size'],
        'default_currency': settings['default_currency'],
        'default_time_zone': settings['default_time_zone'],
        'default_date_format': settings['default_date_format'],
        'forceUpdate': settings['forceUpdate'] ? 1 : 0,
        'appName': settings['appName'],
        'discovershops': settings['discovershops'] ? 1 : 0,
        'google_api_key': settings['google_api_key'],
        'stripe_secret_key': settings['stripe_secret_key'],
        'verifyemail': settings['verifyemail'] ? 1 : 0,
      },
      conflictAlgorithm: ConflictAlgorithm.replace,
    );
  }

  Future<Map<String, dynamic>?> getOfflineSettings() async {
    final db = await database;
    List<Map<String, dynamic>> result = await db.query('settings');
    if (result.isNotEmpty) {
      return result.first;
    } else {
      return null;
    }
  }

  // String? name;
  // int? totalDebt;
  // int? wallet;
  // String? shopId;
  // String? attendantId;
  // String? phoneNumber;
  // int? customerNo;
  // String? address;
  // String? email;
  // String? sId;
  // String? createAt;

  Future<void> inserCustomer(Map<String, dynamic> customer) async {
    final db = await database;
    await db.insert(
      'customer',
      {
        'name': customer['name'],
        'totalDebt': customer['totalDebt'],
        'wallet': customer['wallet'],
        'shopId': customer['shopId'],
        'attendantId': customer['attendantId'],
        'phoneNumber': customer['phoneNumber'],
        'customerNo': customer['customerNo'],
        'address': customer['address'],
        'email': customer['email'],
        'sId': customer['_id'],
        'createAt': customer['createAt'],
      },
      conflictAlgorithm: ConflictAlgorithm.replace,
    );
  }

  Future<void> insertShop(Map<String, dynamic> shop) async {
    final db = await database;
    Map<String, dynamic> shopData = {
      'id': shop['_id'],
      'name': shop['name'],
      'address': shop['address'],
      'subscriptionId': shop['subscription']['_id'],
      'shopCategoryId': shop['shopCategoryId'].toString().length > 45
          ? shop['shopCategoryId']['_id']
          : shop['shopCategoryId'],
      'deletewarning': shop['deletewarning'],
      'affliate': shop['affliate'],
      'backupdate': shop['backupdate'],
      'currency': shop['currency'],
      'backupInterval': shop['backupInterval'],
      'backupemail': shop['backupemail'],
      'allowBackup': shop['allowBackup'] ? 1 : 0,
      'useWarehouse': shop['useWarehouse'] == true ? 1 : 0,
      'allowOnlineSelling': shop['allowOnlineSelling'] ? 1 : 0,
      'adminId': shop['adminId'],
      'createAt': shop['createAt'],
      'coordinates_lat': shop['location']['coordinates'][1],
      'coordinates_long': shop['location']['coordinates'][0],
    };

    try {
      await db.insert(
        'shop',
        shopData,
        conflictAlgorithm: ConflictAlgorithm.replace,
      );

      await insertSubscription(shop['subscription']);
    } catch (e) {
      print("Error inserting shop: $e");
    }
  }

  Future<void> insertSubscription(Map<String, dynamic> subscription) async {
    final db = await database;
    await db.insert(
      'subscription',
      {
        'id': subscription['_id'],
        'userId': subscription['userId'],
        'shop': subscription['shop'],
        'amount': subscription['amount'],
        'status': subscription['status'] ? 1 : 0,
        'commission': subscription['commission'],
        'paid': subscription['paid'] ? 1 : 0,
        'startDate': subscription['startDate'],
        'endDate': subscription['endDate'],
        'createAt': subscription['createAt'],
        'packageId': subscription['packageId'] == null
            ? ''
            : subscription['packageId']['_id']
      },
      conflictAlgorithm: ConflictAlgorithm.replace,
    );
    if (subscription['packageId'] == null) {
      return;
    }
    await insertPackageId(subscription['packageId']);
  }

  //insert attendant
  Future<void> insertAttendant(Map<String, dynamic> attendant) async {
    final db = await database;
    await db.insert(
      'attendant',
      {
        'id': attendant['_id'],
        'username': attendant['username'],
      },
      conflictAlgorithm: ConflictAlgorithm.replace,
    );
  }

  Future<void> insertPackageId(Map<String, dynamic> packageId) async {
    final db = await database;
    await db.insert(
      'packageId',
      {
        'id': packageId['_id'],
        'discount': packageId['discount'],
        'title': packageId['title'],
        'description': packageId['description'],
        'durationValue': packageId['durationValue'],
        'durationUnit': packageId['durationUnit'],
        'amount': packageId['amount'],
        'type': packageId['type'],
        'features':
            packageId['features'].join(','), // Assuming features is a list
        'maxShops': packageId['maxShops'],
        'status': packageId['status'] ? 1 : 0
      },
      conflictAlgorithm: ConflictAlgorithm.replace,
    );
  }

  Future<dynamic> getAllShops() async {
    final db = await database;
    List<Map<String, dynamic>> result = await db.query('shop');

    List<Map<String, dynamic>> updatedResults = [];

    for (var shop in result) {
      // Create a mutable copy of the shop map
      var mutableShop = Map<String, dynamic>.from(shop);

      if (mutableShop['subscriptionId'] != null) {
        var subscription =
            await getSubscriptionById(mutableShop['subscriptionId']);
        if (subscription != null) {
          mutableShop['subscription'] = subscription;
        }
      }
      mutableShop['_id'] = mutableShop['id'];

      // Ensure the coordinates are available before adding them
      if (mutableShop.containsKey('coordinates_long') &&
          mutableShop.containsKey('coordinates_lat')) {
        mutableShop['location'] = {
          'type': 'Point',
          'coordinates': [
            mutableShop['coordinates_long'],
            mutableShop['coordinates_lat']
          ]
        };
      }

      // Add the modified shop to the results list
      updatedResults.add(mutableShop);
    }

    return updatedResults;
  }

  Future updateProfilePrimaryShop(shopid) async {
    final db = await database;
    await db.update(
      'users',
      {'primaryShopId': shopid},
      where: 'id = ?',
      whereArgs: [userController.currentUser.value!.id],
    );
    return getUserByEmail(email: userController.currentUser.value!.email);
  }

  Future<Map<String, dynamic>?> getShopById(String? id) async {
    final db = await database;
    List<Map<String, dynamic>> result =
        await db.query('shop', where: 'id = ?', whereArgs: [id]);
    if (result.isNotEmpty) {
      var shop = result.first;
      var subscription = await getSubscriptionById(shop['subscriptionId']);
      if (subscription != null) {
        shop['subscription'] = subscription;
        shop['location'] = {
          'type': 'Point',
          'coordinates': [shop['coordinates_long'], shop['coordinates_lat']]
        };
      }
      return shop;
    } else {
      return null;
    }
  }

  Future<Map<String, dynamic>?> getSubscriptionById(String id) async {
    final db = await database;
    List<Map<String, dynamic>> result =
        await db.query('subscription', where: 'id = ?', whereArgs: [id]);

    if (result.isNotEmpty) {
      var subscription = result.first;

      // Create a mutable copy of the subscription
      var updatedSubscription = Map<String, dynamic>.from(subscription);

      var packageId = await getPackageIdById(subscription['packageId']);
      if (packageId != null) {
        updatedSubscription['packageId'] = packageId;
      }

      return updatedSubscription;
    } else {
      return null;
    }
  }

// Ensure you have this function defined somewhere
  Future<Map<String, dynamic>?> getPackageIdById(String id) async {
    final db = await database;

    List<Map<String, dynamic>> result =
        await db.query('packageId', where: 'id = ?', whereArgs: [id]);

    if (result.isNotEmpty) {
      var packageId = result.first;
      return packageId;
    }
    return null;
  }
}
