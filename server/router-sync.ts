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
      console.log("Fetching connected devices using ASUS-specific commands...");
      
      // Get wireless devices using your specific commands
      const wirelessMacs = new Set<string>();
      const wirelessDevices: any[] = [];
      
      // Use your enhanced one-liner for wireless device discovery
      const wirelessResult = await sshClient.executeCommand(`
        for iface in $(nvram get sta_ifnames); do
          echo "--- \$iface ---"
          for mac in \$(wl -i \$iface assoclist 2>/dev/null); do
            if [ -n "\$mac" ] && [[ \$mac =~ ^[0-9a-fA-F]{2}:[0-9a-fA-F]{2}:[0-9a-fA-F]{2}:[0-9a-fA-F]{2}:[0-9a-fA-F]{2}:[0-9a-fA-F]{2}\$ ]]; then
              dhcp_info=\$(cat /etc/dnsmasq.leases 2>/dev/null || cat /var/lib/misc/dnsmasq.leases 2>/dev/null | grep -i "\$mac")
              if [ -n "\$dhcp_info" ]; then
                echo "\$iface|\$mac|\$dhcp_info"
              else
                echo "\$iface|\$mac|not_found"
              fi
            fi
          done
        done
      `);
      
      const bandMap: { [key: string]: string } = {
        'eth6': '2.4GHz',
        'eth7': '5GHz', 
        'eth8': '6GHz'
      };
      
      const lines = wirelessResult.split('\n');
      for (const line of lines) {
        if (line.includes('|')) {
          const [iface, mac, dhcpData] = line.split('|');
          if (mac && dhcpData !== 'not_found') {
            const normalizedMac = mac.toLowerCase();
            wirelessMacs.add(normalizedMac);
            
            const dhcpParts = dhcpData.split(' ');
            const ip = dhcpParts[2] || '';
            const hostname = dhcpParts[3] || '';
            
            wirelessDevices.push({
              macAddress: normalizedMac,
              name: hostname || `Device-${mac.slice(-5)}`,
              ipAddress: ip,
              deviceType: this.getDeviceType(mac, hostname),
              isOnline: true,
              connectionType: 'wireless',
              wirelessBand: bandMap[iface] || 'Unknown',
              hostname: hostname
            });
          } else if (mac && dhcpData === 'not_found') {
            // Device connected but no DHCP record
            const normalizedMac = mac.toLowerCase();
            wirelessMacs.add(normalizedMac);
            
            wirelessDevices.push({
              macAddress: normalizedMac,
              name: `Device-${mac.slice(-5)}`,
              ipAddress: '',
              deviceType: 'unknown',
              isOnline: true,
              connectionType: 'wireless',
              wirelessBand: bandMap[iface] || 'Unknown',
              hostname: ''
            });
          }
        }
      }
      
      // Get all DHCP devices to identify wired ones
      const dhcpResult = await sshClient.executeCommand(`
        cat /etc/dnsmasq.leases 2>/dev/null || cat /var/lib/misc/dnsmasq.leases 2>/dev/null
      `);
      
      const allDevices = [...wirelessDevices];
      const dhcpLines = dhcpResult.split('\n').filter(line => line.trim().length > 0);
      
      for (const line of dhcpLines) {
        const parts = line.split(' ');
        if (parts.length >= 4) {
          const [timestamp, mac, ip, hostname] = parts;
          const normalizedMac = mac.toLowerCase();
          
          // If not wireless, it's wired
          if (!wirelessMacs.has(normalizedMac)) {
            allDevices.push({
              macAddress: normalizedMac,
              name: hostname || `Device-${mac.slice(-5)}`,
              ipAddress: ip,
              deviceType: this.getDeviceType(mac, hostname),
              isOnline: true,
              connectionType: 'ethernet',
              wirelessBand: null,
              hostname: hostname
            });
          }
        }
      }
      
      console.log(`Found ${wirelessDevices.length} wireless and ${allDevices.length - wirelessDevices.length} wired devices`);
      
      // Get existing devices to avoid duplicates
      const existingDevices = await storage.getConnectedDevices();
      const existingMacs = new Set(existingDevices.map(d => d.macAddress));

      // Process devices in batches
      const batchSize = 5;
      for (let i = 0; i < allDevices.length; i += batchSize) {
        const batch = allDevices.slice(i, i + batchSize);
        
        await Promise.all(batch.map(async (device) => {
          if (!existingMacs.has(device.macAddress)) {
            await storage.createConnectedDevice({
              name: device.name,
              macAddress: device.macAddress,
              ipAddress: device.ipAddress,
              deviceType: device.deviceType,
              isOnline: device.isOnline,
              downloadSpeed: null,
              uploadSpeed: null,
              connectionType: device.connectionType,
              hostname: device.hostname,
              wirelessBand: device.wirelessBand,
              signalStrength: null,
              connectedAt: new Date(),
              lastSeen: new Date(),
              aimeshNode: null,
              aimeshNodeMac: null
            });
          }
        }));
        
        console.log(`Processed batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(allDevices.length/batchSize)}`);
      }
      
      this.markSynced('devices');
    } catch (error) {
      console.error("Error syncing connected devices:", error);
    }
  }
  
  private getDeviceType(mac: string, hostname: string): string {
    const macUpper = mac.toUpperCase();
    const hostnameUpper = hostname?.toUpperCase() || '';
    
    // Common device type patterns
    if (hostnameUpper.includes('IPHONE') || hostnameUpper.includes('IPAD')) return 'mobile';
    if (hostnameUpper.includes('ANDROID')) return 'mobile';
    if (hostnameUpper.includes('SAMSUNG') || hostnameUpper.includes('GALAXY')) return 'mobile';
    if (hostnameUpper.includes('LAPTOP') || hostnameUpper.includes('MACBOOK')) return 'laptop';
    if (hostnameUpper.includes('DESKTOP') || hostnameUpper.includes('PC')) return 'desktop';
    if (hostnameUpper.includes('TV') || hostnameUpper.includes('ROKU')) return 'tv';
    if (hostnameUpper.includes('ALEXA') || hostnameUpper.includes('ECHO')) return 'iot';
    
    return 'unknown';
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