import { sshClient } from "./ssh-client";
import { storage } from "./storage";

export class RouterSyncService {
  private syncInterval: NodeJS.Timeout | null = null;
  private isSyncing = false;
  private lastSyncTime: { [key: string]: number } = {};
  private cacheTimeout = 30000; // 30 seconds cache

  async startSync(intervalSeconds: number = 5) {
    // Stop any existing sync
    this.stopSync();

    console.log(`Starting router sync with ${intervalSeconds} second interval`);
    
    // Start periodic sync
    this.syncInterval = setInterval(async () => {
      await this.syncRouterData();
    }, intervalSeconds * 1000);

    // Do initial sync
    await this.syncRouterData();
  }

  stopSync() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
      console.log("Router sync stopped");
    }
  }

  async syncRouterData() {
    if (this.isSyncing || !sshClient.isConnectionActive()) {
      return;
    }

    this.isSyncing = true;
    
    try {
      console.log("Starting progressive router data sync...");
      const startTime = Date.now();

      // Phase 1: Essential data (immediate - under 2 seconds)
      console.log("Phase 1: Loading essential data...");
      if (this.shouldSync('systemInfo')) {
        await this.syncSystemInfo();
      }

      // Phase 2: Connected devices (fast - 2-5 seconds)
      console.log("Phase 2: Loading connected devices...");
      if (this.shouldSync('devices')) {
        await this.syncConnectedDevices();
      }

      // Phase 3: WiFi networks (medium - 5-8 seconds)
      console.log("Phase 3: Loading WiFi networks...");
      if (this.shouldSync('wifi')) {
        await this.syncWifiNetworks();
      }

      // Phase 4: Bandwidth data (slower - 8-12 seconds)
      console.log("Phase 4: Loading bandwidth data...");
      if (this.shouldSync('bandwidth')) {
        await this.syncBandwidthData();
      }

      // Phase 5: Router features (slowest - 12+ seconds)
      console.log("Phase 5: Loading router features...");
      if (this.shouldSync('features')) {
        await this.syncRouterFeatures();
      }

      const totalTime = Date.now() - startTime;
      console.log(`Progressive data sync completed in ${totalTime}ms`);
    } catch (error) {
      console.error("Error in optimized sync:", error);
    } finally {
      this.isSyncing = false;
    }
  }

  private shouldSync(component: string): boolean {
    const lastSync = this.lastSyncTime[component] || 0;
    const now = Date.now();
    
    // Different cache timeouts for different components
    const cacheTimeouts: { [key: string]: number } = {
      systemInfo: 15000,  // 15 seconds
      bandwidth: 5000,    // 5 seconds (most frequent)
      devices: 30000,     // 30 seconds
      wifi: 120000,       // 2 minutes
      features: 300000    // 5 minutes
    };
    
    return (now - lastSync) > (cacheTimeouts[component] || this.cacheTimeout);
  }

  private markSynced(component: string) {
    this.lastSyncTime[component] = Date.now();
  }

  private async syncSystemInfo() {
    try {
      const systemInfo = await sshClient.getSystemInfo();
      
      await storage.updateRouterStatus({
        model: systemInfo.model || "Unknown",
        firmware: systemInfo.firmware || "Unknown", 
        ipAddress: systemInfo.ipAddress || "192.168.1.1",
        uptime: systemInfo.uptime || 0,
        cpuUsage: systemInfo.cpuUsage || 0,
        memoryUsage: systemInfo.memoryUsage || 0,
        memoryTotal: systemInfo.memoryTotal || 0,
        temperature: systemInfo.temperature || null,
        storageUsage: systemInfo.storageUsage || null,
        storageTotal: systemInfo.storageTotal || null,
        loadAverage: systemInfo.loadAverage || null,
        cpuCores: systemInfo.cpuCores || null,
        cpuModel: systemInfo.cpuModel || null
      });
      
      this.markSynced('systemInfo');
    } catch (error) {
      console.error("Error syncing system info:", error);
    }
  }

  private async syncConnectedDevices() {
    try {
      console.log("Fetching connected devices...");
      const devices = await sshClient.getConnectedDevices();
      console.log(`Found ${devices.length} devices, processing in batches...`);
      
      // Get existing devices to avoid duplicates
      const existingDevices = await storage.getConnectedDevices();
      const existingMacs = new Set(existingDevices.map(d => d.macAddress));

      // Process devices in batches of 5 for faster incremental updates
      const batchSize = 5;
      for (let i = 0; i < devices.length; i += batchSize) {
        const batch = devices.slice(i, i + batchSize);
        
        await Promise.all(batch.map(async (device) => {
          if (!existingMacs.has(device.macAddress)) {
            await storage.createConnectedDevice({
              name: device.name || device.hostname || "Unknown Device",
              macAddress: device.macAddress,
              ipAddress: device.ipAddress,
              deviceType: device.deviceType || "unknown",
              isOnline: device.isOnline ?? true,
              downloadSpeed: device.downloadSpeed || null,
              uploadSpeed: device.uploadSpeed || null,
              connectionType: device.connectionType || null,
              hostname: device.hostname || null
            });
          }
        }));
        
        console.log(`Processed batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(devices.length/batchSize)}`);
      }
      
      this.markSynced('devices');
    } catch (error) {
      console.error("Error syncing connected devices:", error);
    }
  }

  private async syncWifiNetworks() {
    try {
      const networks = await sshClient.getWiFiNetworks();
      
      for (const network of networks) {
        await storage.createWifiNetwork({
          ssid: network.ssid,
          band: network.frequency || "2.4GHz",
          channel: network.channel || 0,
          isEnabled: network.isEnabled ?? true,
          securityMode: network.security || "WPA2",
          connectedDevices: network.connectedClients || 0
        });
      }
    } catch (error) {
      console.error("Error syncing WiFi networks:", error);
    }
  }

  private async syncBandwidthData() {
    try {
      const bandwidthData = await sshClient.getBandwidthData();
      
      await storage.addBandwidthData({
        downloadSpeed: bandwidthData.downloadSpeed || 0,
        uploadSpeed: bandwidthData.uploadSpeed || 0,
        totalDownload: bandwidthData.totalDownload || 0,
        totalUpload: bandwidthData.totalUpload || 0
      });
    } catch (error) {
      console.error("Error syncing bandwidth data:", error);
    }
  }

  private async syncRouterFeatures() {
    try {
      const features = await sshClient.getMerlinFeatures();
      
      // Get the actual WiFi network count using your script
      const wifiNetworkCount = await sshClient.getWiFiNetworkCount();
      console.log(`Syncing router features with WiFi network count: ${wifiNetworkCount}`);
      
      await storage.updateRouterFeatures({
        adaptiveQosEnabled: features.adaptiveQosEnabled ?? false,
        aiProtectionEnabled: features.aiProtectionEnabled ?? false,
        vpnServerEnabled: features.vpnServerEnabled ?? false,
        aimeshIsMaster: features.aimeshIsMaster ?? true,
        aimeshNodeCount: features.aimeshNodeCount || 0,
        aimeshPeers: features.aimeshPeers ? JSON.stringify(features.aimeshPeers) : null,
        wirelessClients24ghz: features.wirelessClients24ghz || 0,
        wirelessClients5ghz: features.wirelessClients5ghz || 0,
        wirelessClients6ghz: features.wirelessClients6ghz || 0,
        wirelessClientsTotal: features.wirelessClientsTotal || 0,
        wifiNetworkCount: wifiNetworkCount
      });
    } catch (error) {
      console.error("Error syncing router features:", error);
    }
  }
}

export const routerSync = new RouterSyncService();