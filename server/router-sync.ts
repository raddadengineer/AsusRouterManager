import { sshClient } from "./ssh-client";
import { storage } from "./storage";

export class RouterSyncService {
  private syncInterval: NodeJS.Timeout | null = null;
  private isSyncing = false;

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
      console.log("Syncing router data to database...");

      // Sync all data concurrently for better performance
      await Promise.all([
        this.syncSystemInfo(),
        this.syncConnectedDevices(),
        this.syncWifiNetworks(),
        this.syncBandwidthData(),
        this.syncRouterFeatures()
      ]);

      console.log("Router data sync completed successfully");
    } catch (error) {
      console.error("Error syncing router data:", error);
    } finally {
      this.isSyncing = false;
    }
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
    } catch (error) {
      console.error("Error syncing system info:", error);
    }
  }

  private async syncConnectedDevices() {
    try {
      const devices = await sshClient.getConnectedDevices();
      
      // Clear existing devices and add fresh data
      await storage.clearAllData();
      
      // Get existing devices to avoid duplicates
      const existingDevices = await storage.getConnectedDevices();
      const existingMacs = new Set(existingDevices.map(d => d.macAddress));

      for (const device of devices) {
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
      }
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
        wirelessClientsTotal: features.wirelessClientsTotal || 0
      });
    } catch (error) {
      console.error("Error syncing router features:", error);
    }
  }
}

export const routerSync = new RouterSyncService();