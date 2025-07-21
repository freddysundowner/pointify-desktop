import type { Express } from "express";
import {  getPrinters,getPrinterStatus,testPrint,initializePrinter,printReceipt } from "../controllers/printerController.js";

export function registerPrinterRoutes(app: Express) {
    app.get('/api/printers', getPrinters);
    app.get('/api/printer/status', getPrinterStatus);
    app.post('/api/printer/test', testPrint);
    app.post('/api/printer/initialize', initializePrinter );
    app.post('/api/printer/salereceipt', printReceipt);
  
  // Add a test route to verify routing works
  app.get("/api/printer/test", (req, res) => {
    console.log('🖨️ Test route hit successfully!');
    res.setHeader('Content-Type', 'application/json');
    res.json({ message: "Printer routes are working!", timestamp: new Date().toISOString() });
  });


  // Get system printers (for Windows/Linux/Mac)
  app.get("/api/printer/system", async (req, res) => {
    try {
      // This would require a system-specific implementation
      // For now, return empty array with instructions
      res.json({ 
        success: true,
        printers: [],
        message: "System printer detection requires platform-specific implementation"
      });
    } catch (error) {
      console.error("System printer detection error:", error);
      res.status(500).json({ 
        success: false,
        printers: [],
        message: error instanceof Error ? error.message : "Detection failed"
      });
    }
  });
}