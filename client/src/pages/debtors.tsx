import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, Eye, DollarSign, AlertTriangle, ChevronLeft, ChevronRight, Download, RefreshCw } from "lucide-react";
import DashboardLayout from "@/components/layout/dashboard-layout";
import { PageHeader } from "@/components/layout/page-header";
import { useAuth } from "@/features/auth/useAuth";
import { useSelector } from "react-redux";
import { RootState } from "@/store/store";
import { Link } from "wouter";
import { useNavigationRoute } from "@/lib/navigation-utils";

interface Debtor {
  _id: string;
  name: string;
  email?: string;
  phonenumber?: string;
  wallet: number;
  totalOutstanding: number;
  totalDebt?: number;
  lastPurchaseDate?: string;
  customerNo?: number;
  type?: string;
  creditLimit?: number;
}

interface DebtorsResponse {
  shopId: string;
  total: number;
  totalDebtors: number;
  totalDebtAmount: number;
  debtors: Debtor[];
  page?: number;
  limit?: number;
  totalPages?: number;
  hasNextPage?: boolean;
  hasPreviousPage?: boolean;
}

export default function DebtorsPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);
  const { admin } = useAuth();
  const { selectedShopId } = useSelector((state: RootState) => state.shop);
  const customerOverviewRoute = useNavigationRoute("customerOverview");

  const primaryShop = admin?.primaryShop;
  const shopId = selectedShopId || (typeof primaryShop === "object" ? primaryShop._id : primaryShop);
  const currency = (typeof primaryShop === "object" ? primaryShop.currency : undefined) || "KES";

  const { data: debtorsData, isLoading, error, refetch } = useQuery({
    queryKey: [`/api/customers/debtors?shopId=${shopId}&adminid=${admin?._id}&page=${currentPage}&limit=${pageSize}`],
    enabled: !!shopId && !!admin?._id,
    staleTime: 0,
    gcTime: 0,
    refetchOnMount: "always",
  });

  const allDebtors: Debtor[] = (debtorsData as DebtorsResponse)?.debtors || [];

  const filteredDebtors = allDebtors.filter((d) =>
    d.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    d.phonenumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    d.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  useEffect(() => { setCurrentPage(1); }, [searchTerm]);

  const getCustomerOverviewUrl = (id: string) => `${customerOverviewRoute}?id=${id}`;

  const handleDownloadReport = async () => {
    try {
      const token = localStorage.getItem("authToken");
      const response = await fetch(`/customers/customers/debtors/excel?shopId=${shopId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) return;
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `debtors-report-${new Date().toISOString().split("T")[0]}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (e) {
      console.error("Error downloading report:", e);
    }
  };

  const fmt = (amount: number) => `${currency} ${Math.abs(amount).toLocaleString()}`;

  const totalDebtors = (debtorsData as DebtorsResponse)?.totalDebtors || 0;
  const totalPages = Math.ceil(totalDebtors / pageSize);

  if (error) {
    return (
      <DashboardLayout>
        <div className="space-y-3 sm:space-y-5">
          <PageHeader title="Debtors" onBack={() => window.history.back()} />
          <div className="flex items-center justify-center min-h-[300px]">
            <Card className="w-full max-w-sm text-center p-6">
              <AlertTriangle className="w-10 h-10 text-red-500 mx-auto mb-3" />
              <p className="font-semibold text-red-600 mb-1">Failed to load debtors</p>
              <p className="text-sm text-muted-foreground mb-4">Please try again.</p>
              <Button onClick={() => refetch()} variant="outline" size="sm">Try Again</Button>
            </Card>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-3 sm:space-y-5">
        <PageHeader
          title="Debtors"
          onBack={() => window.history.back()}
          actions={
            <div className="flex gap-1.5">
              <Button onClick={() => refetch()} variant="outline" size="sm" className="h-8 w-8 p-0">
                <RefreshCw className="h-3.5 w-3.5" />
              </Button>
              <Button onClick={handleDownloadReport} variant="outline" size="sm" className="h-8 w-8 p-0">
                <Download className="h-3.5 w-3.5" />
              </Button>
            </div>
          }
        />

        {/* Summary */}
        {debtorsData && (
          <Card>
            <CardContent className="flex items-center gap-3 py-3 px-4">
              <div className="h-9 w-9 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center shrink-0">
                <DollarSign className="h-4 w-4 text-red-600" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">Total Outstanding Debt</p>
                <p className="text-lg font-bold text-red-600 leading-tight">
                  {fmt((debtorsData as DebtorsResponse).total || 0)}
                </p>
              </div>
              <div className="ml-auto text-right shrink-0">
                <p className="text-xs text-muted-foreground">Customers</p>
                <p className="text-lg font-bold leading-tight">{totalDebtors}</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* List */}
        <Card>
          <CardHeader className="py-3 px-4">
            <div className="flex items-center justify-between gap-2">
              <CardTitle className="text-base">Debtors ({filteredDebtors.length})</CardTitle>
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder="Search..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8 h-8 text-sm w-40 sm:w-52"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-0 px-0">
            {isLoading ? (
              <div className="space-y-0">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="flex items-center gap-3 px-4 py-3 border-b last:border-0">
                    <div className="h-10 w-10 rounded-full bg-gray-200 dark:bg-gray-700 animate-pulse shrink-0" />
                    <div className="flex-1 space-y-1.5">
                      <div className="h-3.5 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-1/2" />
                      <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-1/3" />
                    </div>
                    <div className="h-4 w-20 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                  </div>
                ))}
              </div>
            ) : filteredDebtors.length === 0 ? (
              <div className="text-center py-12 px-4">
                <AlertTriangle className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                <p className="font-medium mb-1">
                  {searchTerm ? "No matching debtors found" : "No debtors found"}
                </p>
                <p className="text-sm text-muted-foreground">
                  {searchTerm
                    ? "Try adjusting your search terms"
                    : "All customers are up to date with their payments"}
                </p>
              </div>
            ) : (
              <>
                {/* Mobile list */}
                <div className="sm:hidden divide-y">
                  {filteredDebtors.map((debtor) => (
                    <div key={debtor._id} className="flex items-center gap-3 px-4 py-3">
                      <div className="h-10 w-10 rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center shrink-0">
                        <span className="text-red-600 font-semibold text-sm">
                          {debtor.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{debtor.name}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {debtor.phonenumber || debtor.email || "—"}
                        </p>
                        <p className="text-xs font-semibold text-red-600 mt-0.5">
                          {fmt(debtor.totalDebt || debtor.totalOutstanding || 0)}
                        </p>
                      </div>
                      <Link href={getCustomerOverviewUrl(debtor._id)}>
                        <Button size="sm" variant="outline" className="h-8 text-xs text-blue-600 shrink-0"
                          onClick={() => {
                            (window as any).__customerData = {
                              _id: debtor._id, name: debtor.name, email: debtor.email,
                              phonenumber: debtor.phonenumber, wallet: debtor.wallet,
                              totalOutstanding: debtor.totalDebt || 0, customerType: debtor.type || "Regular",
                            };
                          }}>
                          <Eye className="h-3.5 w-3.5 mr-1" />
                          Pay
                        </Button>
                      </Link>
                    </div>
                  ))}
                </div>

                {/* Desktop table */}
                <div className="hidden sm:block overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b bg-muted/30">
                        <th className="text-left py-2.5 px-4 text-xs font-medium text-muted-foreground">Customer</th>
                        <th className="text-left py-2.5 px-4 text-xs font-medium text-muted-foreground">Contact</th>
                        <th className="text-right py-2.5 px-4 text-xs font-medium text-muted-foreground">Outstanding</th>
                        <th className="text-center py-2.5 px-4 text-xs font-medium text-muted-foreground">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredDebtors.map((debtor) => (
                        <tr key={debtor._id} className="border-b last:border-0 hover:bg-muted/40 transition-colors">
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2.5">
                              <div className="h-9 w-9 rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center shrink-0">
                                <span className="text-red-600 font-semibold text-sm">
                                  {debtor.name.charAt(0).toUpperCase()}
                                </span>
                              </div>
                              <span className="font-medium text-sm">{debtor.name}</span>
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <div className="text-sm text-muted-foreground space-y-0.5">
                              {debtor.phonenumber && <div>{debtor.phonenumber}</div>}
                              {debtor.email && <div className="text-xs">{debtor.email}</div>}
                              {!debtor.phonenumber && !debtor.email && <span>—</span>}
                            </div>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <span className="font-semibold text-sm text-red-600">
                              {fmt(debtor.totalDebt || debtor.totalOutstanding || 0)}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-center">
                            <Link href={getCustomerOverviewUrl(debtor._id)}>
                              <Button size="sm" variant="outline" className="h-7 text-xs text-blue-600"
                                onClick={() => {
                                  (window as any).__customerData = {
                                    _id: debtor._id, name: debtor.name, email: debtor.email,
                                    phonenumber: debtor.phonenumber, wallet: debtor.wallet,
                                    totalOutstanding: debtor.totalDebt || 0, customerType: debtor.type || "Regular",
                                  };
                                }}>
                                <Eye className="h-3.5 w-3.5 mr-1" />
                                Pay Debt
                              </Button>
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}

            {/* Pagination */}
            {totalDebtors > pageSize && (
              <div className="flex items-center justify-between px-4 mt-4 pt-3 border-t">
                <p className="text-xs text-muted-foreground">
                  {((currentPage - 1) * pageSize) + 1}–{Math.min(currentPage * pageSize, totalDebtors)} of {totalDebtors}
                </p>
                <div className="flex items-center gap-1.5">
                  <Button variant="outline" size="sm" className="h-7 text-xs"
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}>
                    <ChevronLeft className="h-3.5 w-3.5" />
                  </Button>
                  <span className="text-xs px-1">{currentPage} / {totalPages}</span>
                  <Button variant="outline" size="sm" className="h-7 text-xs"
                    onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage >= totalPages}>
                    <ChevronRight className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
