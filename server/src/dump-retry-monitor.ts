import fs from 'fs';
import path from 'path';
const __dirname = path.dirname(process.argv[1]);


interface DumpFile {
  filePath: string;
  adminId: string;
  timestamp: number;
  retryCount: number;
}

class DumpRetryMonitor {
  private monitorInterval: NodeJS.Timeout | null = null;
  private readonly CHECK_INTERVAL =20 * 1000; // 5 minutes
  private readonly dumpsDir = path.join(__dirname, '../dumps');
  private isRunning = false;


  constructor() {
    this.ensureDumpsDir();
  }

  private ensureDumpsDir(): void {
    if (!fs.existsSync(this.dumpsDir)) {
      fs.mkdirSync(this.dumpsDir, { recursive: true });
    }
  }

  /**
   * Start monitoring for failed dump files
   */
  startMonitoring(): void {
    if (this.isRunning) {
      return;
    }

    this.isRunning = true;
    
    // Check immediately, then set interval
    this.checkAndRetryDumpFiles();
    
    this.monitorInterval = setInterval(() => {
      this.checkAndRetryDumpFiles();
    }, this.CHECK_INTERVAL);
  }

  /**
   * Stop monitoring
   */
  stopMonitoring(): void {
    if (this.monitorInterval) {
      clearInterval(this.monitorInterval);
      this.monitorInterval = null;
    }
    this.isRunning = false;
  }

  /**
   * Check for dump files and retry imports
   */
  private async checkAndRetryDumpFiles(): Promise<void> {
    try {
      if (this.dumpsDir) {
        const files = fs.readdirSync(this.dumpsDir);
        const dumpFiles = files.filter(file => file.startsWith('dump-') && file.endsWith('.json.gz'));
      
        if (dumpFiles.length === 0) {
          return;
        }
        for (const fileName of dumpFiles) {
          const filePath = path.join(this.dumpsDir, fileName);
          const dumpFile = this.parseDumpFileName(fileName, filePath);
        
          if (dumpFile) {
            await this.retryImport(dumpFile);
          }
        }
      }
    } catch (error) {
      console.error('🚨 Error checking dump files:', error);
    }
  }

  /**
   * Parse dump file name to extract metadata
   */
  private parseDumpFileName(fileName: string, filePath: string): DumpFile | null {
    try {
      // Format: dump-{adminId}-{timestamp}.json.gz
      const match = fileName.match(/^dump-([^-]+)-(\d+)\.json\.gz$/);
      if (!match) return null;

      const adminId = match[1];
      const timestamp = parseInt(match[2]);
      
      // Check file modification time to determine retry count
      const stats = fs.statSync(filePath);
      const fileAge = Date.now() - stats.mtime.getTime();
      const retryCount = Math.floor(fileAge / this.CHECK_INTERVAL);

      return {
        filePath,
        adminId,
        timestamp,
        retryCount
      };
    } catch (error) {
      console.error('❌ Error parsing dump file name:', error);
      return null;
    }
  }

  /**
   * Retry import for a dump file
   */
  private async retryImport(dumpFile: DumpFile): Promise<void> {      
      const dumpData = {
        downloadUrl: `file://${dumpFile.filePath}`, // Use file:// protocol for local files
        latestSyncTime: new Date().toISOString(),
        id: dumpFile.adminId,
        status: 'offline'
      };
      const { makeLocalPointifyRequest } = await import('./config.js');
      const dumpResponse = await makeLocalPointifyRequest('/sync/dump', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(dumpData)
      });
      console.log(dumpResponse);
      if(dumpResponse.success ==true){
          // Remove file after successful import
          const removed = this.safeRemoveFile(dumpFile.filePath);
      }
  }

 

  /**
   * Safely remove a file
   */
  private safeRemoveFile(filePath: string): boolean {
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        return true;
      }
      return false;
    } catch (error) {
      console.error('❌ Error removing file:', error);
      return false;
    }
  }

  /**
   * Get monitoring status
   */
  getStatus(): { isRunning: boolean; checkInterval: number;} {
    return {
      isRunning: this.isRunning,
      checkInterval: this.CHECK_INTERVAL,
    };
  }
}

export const dumpRetryMonitor = new DumpRetryMonitor();