import { jsPDF } from "jspdf";

// Deliberately uses only delivery fields; never include prices or payment data.
export function createDeliveryNote(sale: any): jsPDF {
  const doc = new jsPDF();
  let y = 20;
  const text = (value: unknown) =>
    typeof value === "string" || typeof value === "number" ? String(value) : "";
  const line = (value: string, bold = false) => {
    doc.setFont("helvetica", bold ? "bold" : "normal");
    for (const row of doc.splitTextToSize(value, 170)) {
      if (y > 275) { doc.addPage(); y = 20; }
      doc.text(row, 20, y);
      y += 6;
    }
  };
  const shop = sale.shopId || {};
  const customer = sale.customerId || {};
  doc.setFontSize(16);
  line("DELIVERY NOTE", true);
  doc.setFontSize(10);
  if (shop.name) line(text(shop.name), true);
  const address = text(shop.address_receipt) || text(shop.address);
  if (address) line(address);
  if (shop.contact) line(`Tel: ${text(shop.contact)}`);
  line(`Reference: ${text(sale.receiptNo || sale._id || sale.id)}`);
  const date = new Date(sale.createdAt || sale.saleDate);
  if (!Number.isNaN(date.getTime())) line(`Date: ${date.toLocaleDateString()}`);
  y += 4;
  line(`Customer: ${text(customer.name || sale.customerName) || "Walk-in"}`);
  line(`Delivery address: ${text(customer.address) || "________________________"}`);
  if (customer.phoneNumber || customer.phone)
    line(`Contact: ${text(customer.phoneNumber || customer.phone)}`);
  y += 6;
  const header = () => {
    doc.setFont("helvetica", "bold");
    doc.text("Product", 20, y);
    doc.text("Quantity", 190, y, { align: "right" });
    y += 3;
    doc.line(20, y, 190, y);
    y += 7;
    doc.setFont("helvetica", "normal");
  };
  header();
  for (const item of sale.items || []) {
    const rows: string[] = doc.splitTextToSize(
      text(item.product?.name || item.productName || item.name) || "Product", 135,
    );
    rows.forEach((row, index) => {
      if (y > 270) { doc.addPage(); y = 20; header(); }
      doc.text(row, 20, y);
      if (index === 0) doc.text(text(item.quantity), 190, y, { align: "right" });
      y += 6;
    });
    y += 3;
  }
  if (y > 230) { doc.addPage(); y = 20; }
  y += 10;
  line("Dispatched by: ____________________");
  line("Signature: ____________________    Date: ____________________");
  y += 8;
  line("Received by: ____________________");
  line("Signature: ____________________    Date: ____________________");
  return doc;
}