import DashboardLayout from "@/components/layout/dashboard-layout";
import { PageHeader } from "@/components/layout/page-header";
import { PrinterConfigDialog } from "@/components/printer-config";

export default function PrinterConfigPage() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <PageHeader
          title="Printer Configuration"
          subtitle="Configure your receipt printer settings"
        />
        <div>
          <p className="text-sm text-muted-foreground">
            Configure your XPrinter thermal printer for receipt printing
          </p>
        </div>
        
        <PrinterConfigDialog />
      </div>
    </DashboardLayout>
  );
}