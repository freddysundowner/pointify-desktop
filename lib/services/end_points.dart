const apiEndPoint = "https://sandbox.pointifypos.com/";
const storeurl = "https://store.pointifypos.com/";

class EndPoints {
  //AUTH
  static const register = "${apiEndPoint}auth/register";
  static const login = "${apiEndPoint}auth/login";
  static const requestpassword = "${apiEndPoint}auth/admin/request/password";
  static const resetpassword = "${apiEndPoint}auth/admin/reset/password";
  static const admin = "${apiEndPoint}auth/admin/";

  //SHOP
  static const shop = "${apiEndPoint}shop/";
  static const warehouse = "${apiEndPoint}warehouse/";
  static const deleteshopdata = "${apiEndPoint}shop/data/";
  static const getadminshop = "${apiEndPoint}shop/admin/";
  static const shoptypes = "${apiEndPoint}shop/category/";
  static const transfer = "${apiEndPoint}transfer/shop/transfer";
  static const transferfilter = "${apiEndPoint}transfer/filter";
  static const redeemusage = "${shop}redeem/usage";
  static const updatebackupiterval = "${shop}backup/interval";

  //USER
  static const profile = "${apiEndPoint}admin/";
  static const lastseen = "${apiEndPoint}analysis/update/user/lastseen";
  static const sendverificationemail = "${profile}sendverificationemail";
  static const theme = "${apiEndPoint}themes";
  static const setting = "${apiEndPoint}settings";
  static const attendants = "${apiEndPoint}attendants/";
  static const attendantsfilter = "${apiEndPoint}attendants/shop/filter";
  static const producttrasferhistory = "${apiEndPoint}transfer/product";

  //PRODUCT
  static const report = "${apiEndPoint}product/report";
  static const productcategories = "${apiEndPoint}product/category";
  static const products = "${apiEndPoint}product/";
  static const barcode = "${products}bardcode";
  static const productCount = "${apiEndPoint}counts";
  static const warehouserequest = "${apiEndPoint}warehouse";
  static const warehouserequests = "${apiEndPoint}warehouse/request";
  static const deletewarehouserequestitem =
      "${apiEndPoint}warehouse/delete/item";
  static const approvewarehouseitems =
      "${apiEndPoint}warehouse/request/approve";
  static const productimport = "${products}import/products";
  static const producttransferimport = "${products}transfer/products";
  static const shopproductCount = "${apiEndPoint}counts/shop";
  static const badstock = "${apiEndPoint}badstock";
  static const summarybadstock = "${apiEndPoint}badstock/summary";
  static const countsproduct = productCount;
  static const badstockfilter = "${apiEndPoint}badstock/product/filter";
  static const stockreport = "${products}stockreport/";
  static const updateproductimages = "${products}images/";

  //measures
  static const measures = "${apiEndPoint}measures/";

  //ANALYSIS
  static const analysis = "${apiEndPoint}analysis/stockanalysis/";
  static const analysisnet = "${apiEndPoint}analysis/netprofit/";
  static const analysismonthly = "${apiEndPoint}sales/product/month/analysis/";
  static const analysisproducts =
      "${apiEndPoint}sales/summary/month/analysis/product/";
  static const salesreport = "${apiEndPoint}analysis/sales/report";
  static const profitsummary = "${apiEndPoint}analysis/profits/summary";
  static const debtor = "${apiEndPoint}customers/customers/debtors";
  static const debtorexcel = "${apiEndPoint}customers/customers/debtors/excel";
  static const purchasesreport = "${apiEndPoint}analysis/report/purchases";
  static const backupnow = "${apiEndPoint}analysis/backup/download";
  static const reports = "${apiEndPoint}reports/";
  static const salesreportexcel = "${reports}/sales/excel/";

  // SUPPLIERS
  static const supplier = "${apiEndPoint}suppliers/";
  static const supplies = supplier;

  // PURCHASE
  static const purchase = "${apiEndPoint}purchases/";
  static const purchasesendreportemail = "${purchase}send/report/email";
  static const productpurchase = "${apiEndPoint}purchases/product/filter";
  static const purchasefilter =
      "${apiEndPoint}purchases/product/month/analysis";
  static const purchasepayment = "${apiEndPoint}payments/recordPurchasePayment";
  static const purchasepayments = "${apiEndPoint}payments";
  static const purchasereturn = "${apiEndPoint}purchasereturns/";
  static const purchasereturnsupplier =
      "${apiEndPoint}purchasereturns/supplier";

  //SALES
  static const sales = "${apiEndPoint}sales/";
  static const salesfilter = "${sales}filter";
  static const sendreportemail = "${sales}send/report/email";
  static const singlesale = "${sales}single/receipt";
  static const productsalesfilter = "${sales}product/filter";
  static const salereturn = "${apiEndPoint}salereturns/";
  static const salereturnsfilter = "${salereturn}filter";
  static const payments = "${apiEndPoint}payments";
  static const paymentsmethods = "${apiEndPoint}payment-methods";
  static const deletepayments = "${apiEndPoint}customers/payments/delete";
  static const salepayment = "$payments/recordSalePayment";
  static const voidreceipt = "${sales}void/sale";
  static const productsales = "${sales}products/reports";
  static const discountsales = "${sales}discount/reports";
  static const duesbydate = "${sales}duesbydate/reports";

  //CUSTOMER
  static const customer = "${apiEndPoint}customers/";
  static const customerimport = "${apiEndPoint}customers/import/customers";
  static const customerverify = "${customer}verify/";
  static const customerpayments = "${customer}payments";

  //CASHFLOW
  static const cashflowcategory = "${apiEndPoint}cashflowcategory/";
  static const cashflowcategoryshop = "${cashflowcategory}shop/";
  static const deleteBank = "${cashflowcategory}deletebank";

  static const cashflow = "${apiEndPoint}cashflow/";
  static const cashflowtransactions = "${cashflow}transactions/";
  static const cashflowcategorytransactions =
      "${cashflowtransactions}category/";
  static const cashflowsummary = "${cashflow}shop/cashflow";
  static const cashflowcategrybyshop = "${cashflow}total/category";
  static const createbank = "${cashflow}bank/";

  //BANK
  static const bank = "${apiEndPoint}bank/";
  static const banks = "${bank}list";
  static const banktransactions = "${bank}transactions";

  //EPENSES
  static const expense = "${apiEndPoint}expenses/";
  static const expensefilter = "${expense}filter";
  static const expensecategory = "${apiEndPoint}expensescategory";
  static const expensecategorytotal = "$expense/total/category";
  static const expensecategorytransactions = "${expense}transactions";

  //ATTENDANTS

  static const getattendants = "${apiEndPoint}attendants/";
  static const getattendantslogin = "${apiEndPoint}attendants/login";

  //PACKAGES
  static const packages = "${apiEndPoint}packages/";

  //SUBSCRIPTIONS
  static const subscriptions = "${apiEndPoint}subscriptions";
  static const inpappsubscribe = "${apiEndPoint}subscriptions/inapp/ios";
  static const updatestripesubscriptions =
      "${apiEndPoint}subscriptions/stripe/updateAfterStripeSuccessPayment";
  static const subscriptionPaymentconfirm =
      "${apiEndPoint}payment/subscribe/confirm";

  //STRIPE

  var stripeBase = "https://api.stripe.com/v1";
  var connectStripeBase = "$apiEndPoint/stripe/connect/";
  static const createIntentStripeUrl = "$apiEndPoint/stripe/createIntent/";

  //ORDERS
  static const order = "${apiEndPoint}sales/orders/sale/online";
  static const awardstransactions = "${apiEndPoint}payments/awards/";

  static const checkpaymentstatus = "${apiEndPoint}payments/checkpaymentstatus";

  static var productstats = "${apiEndPoint}product/stats/summary";

  static var topUp = "${apiEndPoint}sms/topup";
}
