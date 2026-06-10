import { EventEmitter } from 'events';
import dns from 'dns';
import { promisify } from 'util';

const lookup = promisify(dns.lookup);

export type NetworkStatus = 'online' | 'offline';

class NetworkMonitor extends EventEmitter {
  private status: NetworkStatus = 'online';
  private checkInterval: NodeJS.Timeout | null = null;
  private readonly CHECK_INTERVAL = 30000; // 30 seconds
  private readonly TIMEOUT = 10000; // 10 seconds
  private isChecking = false;

  constructor() {
    super();
    this.startMonitoring();
  }

  /**
   * Get current network status
   */
  getStatus(): NetworkStatus {
    return this.status;
  }

  /**
   * Check if currently online
   */
  isOnline(): boolean {
    return this.status === 'online';
  }

  /**
   * Check if currently offline
   */
  isOffline(): boolean {
    return this.status === 'offline';
  }

  /**
   * Start monitoring network connectivity
   */
  private startMonitoring(): void {
    
    // Initial check
    this.checkConnectivity();

    // Set up periodic checking
    this.checkInterval = setInterval(() => {
      this.checkConnectivity();
    }, this.CHECK_INTERVAL);
  }

  /**
   * Stop monitoring network connectivity
   */
  stopMonitoring(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
  }

  /**
   * Check network connectivity by trying to resolve multiple reliable hosts
   */
  private async checkConnectivity(): Promise<void> {
    if (this.isChecking) return;
    
    this.isChecking = true;
    const previousStatus = this.status;
    
    try {
      // Test multiple reliable hosts
      const hosts = [
        'google.com',
        'cloudflare.com',
        '8.8.8.8',
        'sandbox.pointifypos.com'
      ];

      const promises = hosts.map(host => 
        this.testHost(host).catch(() => false)
      );

      const results = await Promise.all(promises);
      const onlineCount = results.filter(result => result).length;
      
      // Consider online if at least 2 hosts respond
      const isOnline = onlineCount >= 2;
      
      this.status = isOnline ? 'online' : 'offline';
      
      // Emit status change event
      if (previousStatus !== this.status) {
        this.emit('statusChange', this.status, previousStatus);
        
        if (this.status === 'online') {
          this.emit('online');
        } else {
          this.emit('offline');
        }
      }
      
    } catch (error) {
      console.error('🌐 Network check failed:', error);
      this.status = 'offline';
      
      if (previousStatus !== this.status) {
        this.emit('statusChange', this.status, previousStatus);
        this.emit('offline');
      }
    } finally {
      this.isChecking = false;
    }
  }

  /**
   * Test connectivity to a specific host
   */
  private async testHost(host: string): Promise<boolean> {
    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        resolve(false);
      }, this.TIMEOUT);

      lookup(host)
        .then(() => {
          clearTimeout(timeout);
          resolve(true);
        })
        .catch(() => {
          clearTimeout(timeout);
          resolve(false);
        });
    });
  }

  /**
   * Force a connectivity check
   */
  async forceCheck(): Promise<NetworkStatus> {
    await this.checkConnectivity();
    return this.status;
  }

  /**
   * Wait for online status
   */
  async waitForOnline(timeout: number = 60000): Promise<boolean> {
    if (this.isOnline()) return true;

    return new Promise((resolve) => {
      const timeoutId = setTimeout(() => {
        this.removeListener('online', onOnline);
        resolve(false);
      }, timeout);

      const onOnline = () => {
        clearTimeout(timeoutId);
        resolve(true);
      };

      this.once('online', onOnline);
    });
  }

  /**
   * Get network statistics
   */
  getStats(): {
    status: NetworkStatus;
    uptime: number;
    lastCheck: Date;
    checkInterval: number;
  } {
    return {
      status: this.status,
      uptime: process.uptime(),
      lastCheck: new Date(),
      checkInterval: this.CHECK_INTERVAL
    };
  }
}

// Global network monitor instance
export const networkMonitor = new NetworkMonitor();

// Global status getter function
export function getNetworkStatus(): NetworkStatus {
  return networkMonitor.getStatus();
}

// Global online checker function
export function isOnline(): boolean {
  return networkMonitor.isOnline();
}

// Global offline checker function
export function isOffline(): boolean {
  return networkMonitor.isOffline();
}

// Export network monitor for advanced usage
export { NetworkMonitor };