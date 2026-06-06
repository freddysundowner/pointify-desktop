import { useState, useRef } from "react";
import { useLocation } from "wouter";
import DashboardLayout from "@/components/layout/dashboard-layout";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  ArrowLeft,
  Download,
  Upload,
  FileSpreadsheet,
  CheckCircle,
  XCircle,
  X,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useSelector } from "react-redux";
import type { RootState } from "@/store";
import { apiCall } from "@/lib/api-config";
import { useQueryClient } from "@tanstack/react-query";
import { useProducts } from "@/contexts/ProductsContext";
import * as XLSX from "xlsx";

const COLUMNS = [
  { key: "name", label: "Name", required: true },
  { key: "category", label: "Category" },
  { key: "supplier", label: "Supplier" },
  { key: "buyingPrice", label: "Buying Price" },
  { key: "sellingPrice", label: "Selling Price" },
  { key: "wholesalePrice", label: "Wholesale Price" },
  { key: "dealerPrice", label: "Dealer Price" },
  { key: "quantity", label: "Quantity" },
  { key: "sku", label: "SKU" },
  { key: "description", label: "Description" },
  { key: "lowStockThreshold", label: "Low Stock Threshold" },
  { key: "reorderLevel", label: "Reorder Level" },
  { key: "unit", label: "Unit" },
  { key: "manufacturer", label: "Manufacturer" },
  { key: "measure", label: "Measure" },
];

type PreviewRow = Record<string, any> & { _valid: boolean; _errors: string[]; _originalQuantity?: string };
type ResultRow = { name: string; success: boolean; error?: string };

const HEADER_ALIASES: Record<string, string> = {
  name: "name", "product name": "name", product_name: "name", "item name": "name",
  item_name: "name", product: "name", item: "name", title: "name", "product title": "name",
  productname: "name", itemname: "name",
  category: "category", cat: "category", "product category": "category",
  "category name": "category", categoryname: "category", "item category": "category",
  type: "category",
  supplier: "supplier", vendor: "supplier", "supplier name": "supplier",
  suppliername: "supplier", brand: "supplier",
  buyingprice: "buyingPrice", "buying price": "buyingPrice", buying_price: "buyingPrice",
  cost: "buyingPrice", "cost price": "buyingPrice", costprice: "buyingPrice",
  "purchase price": "buyingPrice", purchaseprice: "buyingPrice",
  "buy price": "buyingPrice", buyprice: "buyingPrice", "buying cost": "buyingPrice",
  buyingcost: "buyingPrice",
  bp: "buyingPrice", "b p": "buyingPrice", buying: "buyingPrice",
  sellingprice: "sellingPrice", "selling price": "sellingPrice", selling_price: "sellingPrice",
  price: "sellingPrice", "sale price": "sellingPrice", saleprice: "sellingPrice",
  "retail price": "sellingPrice", retailprice: "sellingPrice",
  "selling cost": "sellingPrice",
  sp: "sellingPrice", "s p": "sellingPrice", selling: "sellingPrice",
  wholesaleprice: "wholesalePrice", "wholesale price": "wholesalePrice",
  wholesale_price: "wholesalePrice", wholesale: "wholesalePrice",
  "whole sale price": "wholesalePrice", "whole sale": "wholesalePrice",
  dealerprice: "dealerPrice", "dealer price": "dealerPrice", dealer_price: "dealerPrice",
  dealer: "dealerPrice",
  quantity: "quantity", qty: "quantity", stock: "quantity", "stock quantity": "quantity",
  stockquantity: "quantity", units: "quantity", "current stock": "quantity",
  currentstock: "quantity", "opening stock": "quantity", openingstock: "quantity",
  "opening qty": "quantity", openingqty: "quantity",
  sku: "sku", barcode: "sku", code: "sku", "product code": "sku", productcode: "sku",
  "item code": "sku", itemcode: "sku", "bar code": "sku",
  description: "description", desc: "description", details: "description",
  notes: "description", note: "description", "product description": "description",
  lowstockthreshold: "lowStockThreshold", "low stock threshold": "lowStockThreshold",
  "low stock": "lowStockThreshold", "min stock": "lowStockThreshold",
  "minimum stock": "lowStockThreshold", lowstock: "lowStockThreshold",
  "alert level": "lowStockThreshold",
  reorderlevel: "reorderLevel", "reorder level": "reorderLevel", reorder: "reorderLevel",
  "reorder point": "reorderLevel", reorderpoint: "reorderLevel",
  unit: "unit", "unit of measure": "unit", uom: "unit",
  manufacturer: "manufacturer", make: "manufacturer", "brand name": "manufacturer",
  brandname: "manufacturer",
  measure: "measure",
};

const normalizeHeader = (h: string): string => {
  const key = h.toLowerCase().replace(/[._\-\/]+/g, " ").replace(/\s+/g, " ").trim();
  return HEADER_ALIASES[key] || HEADER_ALIASES[key.replace(/\s/g, "")] || h;
};

const KNOWN_KEYS = new Set(COLUMNS.map((c) => c.key));
const isRecognizedHeader = (h: string) => KNOWN_KEYS.has(h);

const splitQuantityCell = (raw: any): { qty: string; unit: string } => {
  const s = String(raw ?? "").trim();
  if (!s) return { qty: "", unit: "" };
  const m = s.match(/^\s*([\d.,]+)\s*(.*)$/);
  if (!m) return { qty: "", unit: s };
  const qty = m[1].replace(/,/g, "");
  let unit = (m[2] || "").trim();
  unit = unit.split(/\s*(?:per\s+\w+|@|\/=)/i)[0].trim();
  return { qty, unit };
};

const detectHeaderRow = (rows: any[][]): { index: number; headers: string[] } | null => {
  const scan = Math.min(5, rows.length);
  for (let i = 0; i < scan; i++) {
    const row = rows[i] || [];
    const normalized = row.map((c) => normalizeHeader(String(c ?? "").trim()));
    const recognized = normalized.filter(isRecognizedHeader);
    if (recognized.length >= 2 && normalized.includes("name")) {
      return { index: i, headers: normalized };
    }
  }
  return null;
};

export default function ImportProductsPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { refreshProducts } = useProducts();
  const { selectedShopId } = useSelector((state: RootState) => state.shop);

  const [file, setFile] = useState<File | null>(null);
  const [rows, setRows] = useState<PreviewRow[]>([]);
  const [isParsing, setIsParsing] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<ResultRow[]>([]);
  const [isDone, setIsDone] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [resetQuantity, setResetQuantity] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const EXCEL_TYPES = [
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/vnd.ms-excel",
  ];
  const isExcelFile = (f: File) =>
    EXCEL_TYPES.includes(f.type) || /\.(xlsx|xls)$/i.test(f.name);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isImporting) setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (isImporting) return;
    const dropped = e.dataTransfer.files[0];
    if (!dropped) return;
    if (!isExcelFile(dropped)) {
      toast({ title: "Invalid file type", description: "Please drop an Excel file (.xlsx, .xls).", variant: "destructive" });
      return;
    }
    handleFileChange(dropped);
  };

  const downloadSample = () => {
    const data = [
      COLUMNS.map((c) => c.key),
      ["White Shirt", "Clothing", 500, 800, 650, 600, 50, "SKU001", "Premium white shirt", 10, 5, "pcs", "BrandX", ""],
      ["Basmati Rice 5kg", "Groceries", 800, 1200, 1000, 950, 100, "SKU002", "Quality basmati rice", 20, 10, "kg", "", ""],
      ["Sony Headphones", "Electronics", 3000, 5000, 4200, 4000, 30, "SKU003", "Noise cancelling headphones", 5, 3, "pcs", "Sony", ""],
    ];
    const ws = XLSX.utils.aoa_to_sheet(data);
    ws["!cols"] = COLUMNS.map((_, i) => ({ wch: i === 8 ? 30 : 18 }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Products");
    XLSX.writeFile(wb, "products_sample.xlsx");
  };

  const validateRow = (obj: Record<string, string>): PreviewRow => {
    const errors: string[] = [];
    if (!obj.name) errors.push("Name is required");
    if (obj.sellingPrice !== "" && isNaN(Number(obj.sellingPrice))) errors.push("Selling price must be a number");
    if (obj.buyingPrice !== "" && isNaN(Number(obj.buyingPrice))) errors.push("Buying price must be a number");
    if (obj.quantity !== "" && isNaN(Number(obj.quantity))) errors.push("Quantity must be a number");
    return { ...obj, _valid: errors.length === 0, _errors: errors };
  };

  const parseExcelFile = async (f: File) => {
    const buf = await f.arrayBuffer();
    const wb = XLSX.read(buf, { type: "array" });

    const out: PreviewRow[] = [];
    let lastHeaders: string[] | null = null;
    let lastCols = 0;

    for (const sheetName of wb.SheetNames) {
      const ws = wb.Sheets[sheetName];
      if (!ws) continue;
      const raw: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" });
      if (!raw.length) continue;

      const detected = detectHeaderRow(raw);
      let headers: string[];
      let startIdx: number;

      if (detected) {
        headers = detected.headers;
        startIdx = detected.index + 1;
        lastHeaders = headers;
        lastCols = headers.length;
      } else if (lastHeaders && (raw[0]?.length ?? 0) >= Math.max(2, lastCols - 1)) {
        headers = lastHeaders;
        startIdx = 0;
      } else {
        continue;
      }

      const hasQty = headers.includes("quantity");
      const hasUnit = headers.includes("unit");

      for (let i = startIdx; i < raw.length; i++) {
        const row = raw[i] || [];
        const obj: Record<string, string> = {};
        headers.forEach((h, idx) => {
          if (KNOWN_KEYS.has(h)) obj[h] = String(row[idx] ?? "").trim();
        });

        if (hasQty && obj.quantity) {
          const { qty, unit } = splitQuantityCell(obj.quantity);
          if (qty) obj.quantity = qty;
          if (unit && (!hasUnit || !obj.unit)) obj.unit = unit;
        }

        const hasAnyValue = Object.values(obj).some((v) => v !== "");
        if (!hasAnyValue) continue;
        if (
          obj.name &&
          (obj.name.toLowerCase() === "item" ||
            obj.name.toLowerCase() === "name" ||
            obj.name.toLowerCase() === "product")
        ) {
          continue;
        }

        const originalQty = obj.quantity ?? "";
        if (resetQuantity) obj.quantity = "0";
        out.push(validateRow({ ...obj, _originalQuantity: originalQty } as any));
      }
    }

    if (out.length === 0) {
      toast({
        title: "Couldn't read this spreadsheet",
        description: "No recognizable columns found. Make sure the file has column headers like Name, Buying Price, Selling Price, Quantity etc.",
        variant: "destructive",
      });
    }
    return out;
  };

  const parseFile = async (f: File) => {
    setIsParsing(true);
    setRows([]);
    setResults([]);
    setIsDone(false);
    try {
      const parsed = await parseExcelFile(f);
      setRows(parsed);
    } catch (e: any) {
      toast({ title: "Failed to read file", description: e.message, variant: "destructive" });
    }
    setIsParsing(false);
  };

  const handleFileChange = (f: File | null) => {
    setFile(f);
    setResults([]);
    setIsDone(false);
    setProgress(0);
    if (f) parseFile(f);
  };

  const validRows = rows.filter((r) => r._valid);
  const invalidRows = rows.filter((r) => !r._valid);

  const handleImport = async () => {
    const adminDataStr = localStorage.getItem("adminData");
    if (!adminDataStr) {
      toast({ title: "Error", description: "Please log in again.", variant: "destructive" });
      return;
    }
    const adminData = JSON.parse(adminDataStr);
    const adminId = adminData._id;
    const attendantId = adminData.attendantId?._id || adminData._id;
    const shopId = selectedShopId || (typeof adminData?.primaryShop === "string" ? adminData.primaryShop : adminData?.primaryShop?._id);

    setIsImporting(true);
    setResults([]);
    setProgress(0);

    const products = validRows.map((row) => ({
      name: row.name,
      productCategoryId: row.category || "General",
      supplierId: row.supplier || "General",
      buyingPrice: row.buyingPrice !== "" ? (parseFloat(row.buyingPrice) || 0) : 0,
      sellingPrice: row.sellingPrice !== "" ? (parseFloat(row.sellingPrice) || 0) : 0,
      wholesalePrice: row.wholesalePrice !== "" ? (parseFloat(row.wholesalePrice) || 0) : 0,
      dealerPrice: row.dealerPrice !== "" ? (parseFloat(row.dealerPrice) || 0) : 0,
      quantity: row.quantity !== "" ? (parseInt(row.quantity) || 0) : 0,
      reorderLevel: row.reorderLevel !== "" ? (parseInt(row.reorderLevel) || 0) : 0,
      description: row.description || "",
      manufacturer: row.manufacturer || "",
      measure: row.measure || "",
      virtual: false,
      adminId,
      attendantId,
      shopId,
    }));

    try {
      setProgress(Math.round(products.length * 0.1));
      const resp = await apiCall("/api/product/import/products", {
        method: "POST",
        body: JSON.stringify({ products }),
      });
      const data = await resp.json();
      setProgress(products.length);

      if (!resp.ok) {
        throw new Error(data?.error || `HTTP ${resp.status}`);
      }

      const msg: string = data?.message || "";
      const successMatch = msg.match(/Imported (\d+)/);
      const failMatch = msg.match(/(\d+) failed/);
      const successCount = successMatch ? parseInt(successMatch[1]) : products.length;
      const failCount = failMatch ? parseInt(failMatch[1]) : 0;

      const successResults = validRows.slice(0, successCount).map((r) => ({ name: r.name, success: true }));
      const failResults = validRows.slice(successCount).map((r) => ({ name: r.name, success: false, error: "Import failed" }));
      setResults([...successResults, ...failResults]);

      setIsDone(true);
      queryClient.invalidateQueries({ queryKey: ["/api/product"] });
      refreshProducts();
      toast({
        title: "Import Complete",
        description: msg || `${successCount} product${successCount !== 1 ? "s" : ""} imported${failCount > 0 ? `, ${failCount} failed` : " successfully"}.`,
        variant: failCount > 0 ? "destructive" : "default",
      });
    } catch (err: any) {
      setResults(validRows.map((r) => ({ name: r.name, success: false, error: err.message })));
      setIsDone(true);
      toast({ title: "Import Failed", description: err.message, variant: "destructive" });
    }

    setIsImporting(false);
  };

  const resetPage = () => {
    setFile(null);
    setRows([]);
    setResults([]);
    setIsDone(false);
    setProgress(0);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto space-y-5 p-4 sm:p-6">
        <PageHeader
          title="Import Products"
          subtitle="Upload an Excel file to bulk-import products into your inventory"
          onBack={() => setLocation("/stock/products")}
        />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="space-y-4">
            {/* Step 1 */}
            <Card>
              <CardHeader className="pb-2 pt-4 px-4">
                <CardTitle className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                  <span className="flex items-center justify-center h-5 w-5 rounded-full bg-purple-100 text-purple-700 text-xs font-bold shrink-0">1</span>
                  Download template
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4 space-y-2">
                <p className="text-xs text-gray-500">Get the sample Excel file with the correct column headers and example data.</p>
                <Button variant="outline" size="sm" onClick={downloadSample} className="w-full gap-2">
                  <Download className="h-4 w-4" />
                  Download Sample Excel
                </Button>
              </CardContent>
            </Card>

            {/* Step 2 */}
            <Card>
              <CardHeader className="pb-2 pt-4 px-4">
                <CardTitle className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                  <span className="flex items-center justify-center h-5 w-5 rounded-full bg-purple-100 text-purple-700 text-xs font-bold shrink-0">2</span>
                  Upload your file
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4 space-y-3">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
                  className="hidden"
                  onChange={(e) => handleFileChange(e.target.files?.[0] || null)}
                  data-testid="input-import-file"
                />
                <div
                  className={`flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-5 cursor-pointer transition-colors ${
                    isDragging
                      ? "border-purple-500 bg-purple-50 scale-[1.01]"
                      : "border-gray-300 bg-gray-50 hover:border-purple-400 hover:bg-purple-50"
                  }`}
                  onClick={() => !isImporting && fileInputRef.current?.click()}
                  onDragOver={handleDragOver}
                  onDragEnter={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                >
                  {file ? (
                    <div className="text-center">
                      <FileSpreadsheet className="h-8 w-8 text-green-600 mx-auto mb-1" />
                      <p className="text-sm font-medium text-gray-700 break-all">{file.name}</p>
                      <button
                        className="mt-1 text-xs text-red-400 hover:text-red-600 flex items-center gap-1 mx-auto"
                        onClick={(e) => { e.stopPropagation(); resetPage(); }}
                        data-testid="button-remove-file"
                      >
                        <X className="h-3 w-3" /> Remove
                      </button>
                    </div>
                  ) : isDragging ? (
                    <>
                      <Upload className="h-8 w-8 text-purple-500 mb-2 animate-bounce" />
                      <p className="text-sm font-medium text-purple-600">Drop it here!</p>
                    </>
                  ) : (
                    <>
                      <Upload className="h-8 w-8 text-gray-400 mb-2" />
                      <p className="text-sm text-gray-500 text-center">
                        Drag & drop or click to select<br />
                        <span className="text-xs">Excel (.xlsx, .xls)</span>
                      </p>
                    </>
                  )}
                </div>

                <div className="flex items-center justify-between gap-2 pt-1">
                  <Label htmlFor="reset-qty" className="text-xs text-gray-700 cursor-pointer flex-1">
                    Reset quantity to 0
                    <span className="block text-[10px] text-gray-400 font-normal">Ignore quantity in source; import as 0.</span>
                  </Label>
                  <Switch
                    id="reset-qty"
                    checked={resetQuantity}
                    onCheckedChange={(v) => {
                      setResetQuantity(v);
                      if (rows.length > 0) {
                        setRows((prev) =>
                          prev.map((r) => {
                            const original = r._originalQuantity ?? r.quantity;
                            return validateRow({
                              ...r,
                              _originalQuantity: original,
                              quantity: v ? "0" : original,
                            });
                          }),
                        );
                      }
                    }}
                    data-testid="switch-reset-quantity"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Step 3 */}
            {rows.length > 0 && !isDone && (
              <Card>
                <CardHeader className="pb-2 pt-4 px-4">
                  <CardTitle className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                    <span className="flex items-center justify-center h-5 w-5 rounded-full bg-purple-100 text-purple-700 text-xs font-bold shrink-0">3</span>
                    Import products
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-4 pb-4 space-y-3">
                  <div className="flex gap-3 text-sm">
                    <span className="flex items-center gap-1 text-green-700">
                      <CheckCircle className="h-4 w-4" />{validRows.length} valid
                    </span>
                    {invalidRows.length > 0 && (
                      <span className="flex items-center gap-1 text-amber-600">
                        <AlertCircle className="h-4 w-4" />{invalidRows.length} with errors
                      </span>
                    )}
                  </div>
                  {invalidRows.length > 0 && (
                    <p className="text-xs text-amber-700 bg-amber-50 rounded p-2 border border-amber-100">
                      Rows with errors will be skipped. Fix them in your file and re-upload to include them.
                    </p>
                  )}
                  {isImporting && (
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-xs text-gray-500">
                        <span>Importing…</span>
                        <span>{progress} / {validRows.length}</span>
                      </div>
                      <Progress value={validRows.length > 0 ? (progress / validRows.length) * 100 : 0} />
                    </div>
                  )}
                  <Button
                    className="w-full bg-purple-600 hover:bg-purple-700 gap-2"
                    onClick={handleImport}
                    disabled={validRows.length === 0 || isImporting}
                  >
                    {isImporting ? (
                      <><Loader2 className="h-4 w-4 animate-spin" /> Importing {progress}/{validRows.length}…</>
                    ) : (
                      <><Upload className="h-4 w-4" /> Import {validRows.length} Product{validRows.length !== 1 ? "s" : ""}</>
                    )}
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Done summary */}
            {isDone && (
              <Card className="border-green-200 bg-green-50">
                <CardContent className="px-4 py-4 space-y-3">
                  <div className="flex gap-4 text-sm">
                    <span className="flex items-center gap-1.5 text-green-700 font-medium">
                      <CheckCircle className="h-4 w-4" />{results.filter((r) => r.success).length} imported
                    </span>
                    {results.filter((r) => !r.success).length > 0 && (
                      <span className="flex items-center gap-1.5 text-red-600 font-medium">
                        <XCircle className="h-4 w-4" />{results.filter((r) => !r.success).length} failed
                      </span>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" className="flex-1" onClick={resetPage}>Import more</Button>
                    <Button size="sm" className="flex-1 bg-purple-600 hover:bg-purple-700" onClick={() => setLocation("/stock/products")}>
                      View Products
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Right column: preview table */}
          <div className="lg:col-span-2">
            {isParsing && (
              <Card className="h-64 flex items-center justify-center">
                <div className="text-center text-gray-500">
                  <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2 text-purple-500" />
                  <p className="text-sm">Reading file…</p>
                </div>
              </Card>
            )}

            {!isParsing && rows.length === 0 && (
              <Card className="h-64 flex items-center justify-center border-dashed">
                <div className="text-center text-gray-400 px-4">
                  <FileSpreadsheet className="h-12 w-12 mx-auto mb-3 opacity-30" />
                  <p className="text-sm font-medium">No file selected</p>
                  <p className="text-xs mt-1">Upload an Excel file to preview its contents before importing</p>
                </div>
              </Card>
            )}

            {!isParsing && rows.length > 0 && (
              <Card>
                <CardHeader className="py-3 px-4 border-b">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-semibold text-gray-700">
                      Preview — {rows.length} row{rows.length !== 1 ? "s" : ""}
                    </CardTitle>
                    <div className="flex gap-2 text-xs">
                      <Badge variant="outline" className="text-green-700 border-green-300 bg-green-50">
                        {validRows.length} valid
                      </Badge>
                      {invalidRows.length > 0 && (
                        <Badge variant="outline" className="text-amber-700 border-amber-300 bg-amber-50">
                          {invalidRows.length} errors
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="overflow-auto max-h-[calc(100vh-280px)]">
                    <table className="w-full text-xs border-collapse">
                      <thead className="sticky top-0 bg-gray-50 z-10">
                        <tr>
                          <th className="text-left px-3 py-2 font-medium text-gray-600 border-b w-8">#</th>
                          <th className="text-left px-3 py-2 font-medium text-gray-600 border-b w-6"></th>
                          {COLUMNS.slice(0, 8).map((col) => (
                            <th key={col.key} className="text-left px-3 py-2 font-medium text-gray-600 border-b whitespace-nowrap">
                              {col.label}{col.required && <span className="text-red-400 ml-0.5">*</span>}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {rows.map((row, idx) => (
                          <tr
                            key={idx}
                            className={`border-b last:border-0 ${
                              isDone
                                ? results[idx]?.success
                                  ? "bg-green-50"
                                  : results[idx]?.success === false
                                  ? "bg-red-50"
                                  : ""
                                : row._valid
                                ? "hover:bg-gray-50"
                                : "bg-amber-50 hover:bg-amber-100"
                            }`}
                          >
                            <td className="px-3 py-2 text-gray-400">{idx + 1}</td>
                            <td className="px-2 py-2">
                              {isDone ? (
                                results[idx]?.success ? (
                                  <CheckCircle className="h-3.5 w-3.5 text-green-600" />
                                ) : results[idx]?.success === false ? (
                                  <XCircle className="h-3.5 w-3.5 text-red-500" />
                                ) : null
                              ) : row._valid ? (
                                <CheckCircle className="h-3.5 w-3.5 text-green-500" />
                              ) : (
                                <span title={row._errors.join(", ")}>
                                  <AlertCircle className="h-3.5 w-3.5 text-amber-500" />
                                </span>
                              )}
                            </td>
                            {COLUMNS.slice(0, 8).map((col) => (
                              <td key={col.key} className="px-3 py-2 text-gray-700 max-w-[140px] truncate" title={row[col.key]}>
                                {row[col.key] || <span className="text-gray-300">—</span>}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {COLUMNS.length > 8 && (
                    <p className="text-xs text-gray-400 px-4 py-2 border-t">
                      Showing first 8 columns. All {COLUMNS.length} columns will be imported.
                    </p>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
