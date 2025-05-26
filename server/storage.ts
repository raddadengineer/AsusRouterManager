import {
  RouterStatus,
  InsertRouterStatus,
  ConnectedDevice,
  InsertConnectedDevice,
  WifiNetwork,
  InsertWifiNetwork,
  PortForwardingRule,
  InsertPortForwardingRule,
  BandwidthData,
  InsertBandwidthData,
  SSHConfig,
  InsertSSHConfig,
  routerStatus,
  connectedDevices,
  wifiNetworks,
  portForwardingRules,
  bandwidthData,
  sshConfig,
} from "@shared/schema";
import { db } from "./db";
import { eq } from "drizzle-orm";

export interface IStorage {
  // Router Status
  getRouterStatus(): Promise<RouterStatus | undefined>;
  updateRouterStatus(status: InsertRouterStatus): Promise<RouterStatus>;

  // Connected Devices
  getConnectedDevices(): Promise<ConnectedDevice[]>;
  getConnectedDevice(id: number): Promise<ConnectedDevice | undefined>;
  createConnectedDevice(device: InsertConnectedDevice): Promise<ConnectedDevice>;
  updateConnectedDevice(id: number, device: Partial<InsertConnectedDevice>): Promise<ConnectedDevice | undefined>;
  deleteConnectedDevice(id: number): Promise<boolean>;

  // WiFi Networks
  getWifiNetworks(): Promise<WifiNetwork[]>;
  getWifiNetwork(id: number): Promise<WifiNetwork | undefined>;
  createWifiNetwork(network: InsertWifiNetwork): Promise<WifiNetwork>;
  updateWifiNetwork(id: number, network: Partial<InsertWifiNetwork>): Promise<WifiNetwork | undefined>;
  deleteWifiNetwork(id: number): Promise<boolean>;

  // Port Forwarding Rules
  getPortForwardingRules(): Promise<PortForwardingRule[]>;
  getPortForwardingRule(id: number): Promise<PortForwardingRule | undefined>;
  createPortForwardingRule(rule: InsertPortForwardingRule): Promise<PortForwardingRule>;
  updatePortForwardingRule(id: number, rule: Partial<InsertPortForwardingRule>): Promise<PortForwardingRule | undefined>;
  deletePortForwardingRule(id: number): Promise<boolean>;

  // Bandwidth Data
  getBandwidthData(limit?: number): Promise<BandwidthData[]>;
  addBandwidthData(data: InsertBandwidthData): Promise<BandwidthData>;

  // SSH Configuration
  getSSHConfig(): Promise<SSHConfig | undefined>;
  saveSSHConfig(config: InsertSSHConfig): Promise<SSHConfig>;
  updateSSHConnectionStatus(status: string): Promise<void>;
}

export class MemStorage implements IStorage {
  private routerStatus: RouterStatus | undefined;
  private connectedDevices: Map<number, ConnectedDevice>;
  private wifiNetworks: Map<number, WifiNetwork>;
  private portForwardingRules: Map<number, PortForwardingRule>;
  private bandwidthData: BandwidthData[];
  private sshConfiguration: SSHConfig | undefined;
  private currentDeviceId: number;
  private currentWifiId: number;
  private currentRuleId: number;
  private currentBandwidthId: number;

  constructor() {
    this.connectedDevices = new Map();
    this.wifiNetworks = new Map();
    this.portForwardingRules = new Map();
    this.bandwidthData = [];
    this.currentDeviceId = 1;
    this.currentWifiId = 1;
    this.currentRuleId = 1;
    this.currentBandwidthId = 1;

    // Start with empty data - populate only when SSH connection is established
    this.loadSSHConfigFromFile();
  }

  private loadSSHConfigFromFile() {
    try {
      const fs = require('fs');
      const path = require('path');
      const configPath = path.join(process.cwd(), 'ssh-config.json');
      
      if (fs.existsSync(configPath)) {
        const configData = fs.readFileSync(configPath, 'utf8');
        this.sshConfiguration = JSON.parse(configData);
      }
    } catch (error) {
      // Ignore errors, will start with no config
    }
  }

  private saveSSHConfigToFile() {
    try {
      const fs = require('fs');
      const path = require('path');
      const configPath = path.join(process.cwd(), 'ssh-config.json');
      
      if (this.sshConfiguration) {
        fs.writeFileSync(configPath, JSON.stringify(this.sshConfiguration, null, 2));
      }
    } catch (error) {
      // Ignore errors
    }
  }

  private initializeSampleData() {
    // Router Status
    this.routerStatus = {
      id: 1,
      model: "RT-AX88U",
      firmware: "3.0.0.4.388.22525",
      ipAddress: "192.168.1.1",
      uptime: 223200, // 2d 14h 0m in seconds
      cpuUsage: 12,
      memoryUsage: 2.1,
      memoryTotal: 4.0,
      temperature: 45.5,
      lastUpdated: new Date(),
    };

    // Sample connected devices
    const sampleDevices = [
      {
        name: "MacBook Pro",
        macAddress: "AA:BB:CC:DD:EE:FF",
        ipAddress: "192.168.1.101",
        deviceType: "laptop",
        isOnline: true,
        downloadSpeed: 24.5,
        uploadSpeed: 12.3,
        connectedAt: new Date(Date.now() - 86400000),
        lastSeen: new Date(),
      },
      {
        name: "iPhone 14",
        macAddress: "11:22:33:44:55:66",
        ipAddress: "192.168.1.102",
        deviceType: "mobile",
        isOnline: true,
        downloadSpeed: 12.1,
        uploadSpeed: 5.2,
        connectedAt: new Date(Date.now() - 43200000),
        lastSeen: new Date(),
      },
      {
        name: "Gaming PC",
        macAddress: "77:88:99:AA:BB:CC",
        ipAddress: "192.168.1.103",
        deviceType: "desktop",
        isOnline: false,
        downloadSpeed: 0,
        uploadSpeed: 0,
        connectedAt: new Date(Date.now() - 172800000),
        lastSeen: new Date(Date.now() - 3600000),
      },
      {
        name: "Smart TV",
        macAddress: "DD:EE:FF:00:11:22",
        ipAddress: "192.168.1.104",
        deviceType: "tv",
        isOnline: true,
        downloadSpeed: 8.7,
        uploadSpeed: 2.1,
        connectedAt: new Date(Date.now() - 259200000),
        lastSeen: new Date(),
      },
    ];

    sampleDevices.forEach((device) => {
      this.connectedDevices.set(this.currentDeviceId, {
        id: this.currentDeviceId++,
        ...device,
      });
    });

    // Sample WiFi networks
    const sampleWifiNetworks = [
      {
        ssid: "ASUS_AX88U",
        band: "2.4GHz",
        channel: 6,
        isEnabled: true,
        securityMode: "WPA2",
        password: "mypassword123",
        connectedDevices: 12,
      },
      {
        ssid: "ASUS_AX88U_5G",
        band: "5GHz",
        channel: 149,
        isEnabled: true,
        securityMode: "WPA2",
        password: "mypassword123",
        connectedDevices: 8,
      },
    ];

    sampleWifiNetworks.forEach((network) => {
      this.wifiNetworks.set(this.currentWifiId, {
        id: this.currentWifiId++,
        ...network,
      });
    });

    // Sample port forwarding rules
    const sampleRules = [
      {
        name: "Web Server",
        protocol: "TCP",
        externalPort: 80,
        internalPort: 8080,
        internalIp: "192.168.1.100",
        isEnabled: true,
        description: "HTTP traffic to internal web server",
      },
      {
        name: "SSH Access",
        protocol: "TCP",
        externalPort: 22,
        internalPort: 22,
        internalIp: "192.168.1.101",
        isEnabled: true,
        description: "SSH access to development machine",
      },
    ];

    sampleRules.forEach((rule) => {
      this.portForwardingRules.set(this.currentRuleId, {
        id: this.currentRuleId++,
        ...rule,
      });
    });

    // Generate sample bandwidth data for the last 24 hours
    const now = new Date();
    for (let i = 23; i >= 0; i--) {
      const timestamp = new Date(now.getTime() - i * 60 * 60 * 1000);
      this.bandwidthData.push({
        id: this.currentBandwidthId++,
        timestamp,
        downloadSpeed: 120 + Math.random() * 380,
        uploadSpeed: 80 + Math.random() * 170,
        totalDownload: 1200 + Math.random() * 500,
        totalUpload: 400 + Math.random() * 200,
      });
    }
  }

  // Router Status Methods
  async getRouterStatus(): Promise<RouterStatus | undefined> {
    return this.routerStatus;
  }

  async updateRouterStatus(status: InsertRouterStatus): Promise<RouterStatus> {
    this.routerStatus = {
      id: this.routerStatus?.id || 1,
      ...status,
      temperature: status.temperature ?? null,
      lastUpdated: new Date(),
    };
    return this.routerStatus;
  }

  // Connected Devices Methods
  async getConnectedDevices(): Promise<ConnectedDevice[]> {
    return Array.from(this.connectedDevices.values());
  }

  async getConnectedDevice(id: number): Promise<ConnectedDevice | undefined> {
    return this.connectedDevices.get(id);
  }

  async createConnectedDevice(device: InsertConnectedDevice): Promise<ConnectedDevice> {
    const id = this.currentDeviceId++;
    const newDevice: ConnectedDevice = {
      id,
      ...device,
      isOnline: device.isOnline ?? true,
      downloadSpeed: device.downloadSpeed ?? 0,
      uploadSpeed: device.uploadSpeed ?? 0,
      connectedAt: new Date(),
      lastSeen: new Date(),
    };
    this.connectedDevices.set(id, newDevice);
    return newDevice;
  }

  async updateConnectedDevice(id: number, device: Partial<InsertConnectedDevice>): Promise<ConnectedDevice | undefined> {
    const existing = this.connectedDevices.get(id);
    if (!existing) return undefined;

    const updated: ConnectedDevice = {
      ...existing,
      ...device,
      lastSeen: new Date(),
    };
    this.connectedDevices.set(id, updated);
    return updated;
  }

  async deleteConnectedDevice(id: number): Promise<boolean> {
    return this.connectedDevices.delete(id);
  }

  // WiFi Networks Methods
  async getWifiNetworks(): Promise<WifiNetwork[]> {
    return Array.from(this.wifiNetworks.values());
  }

  async getWifiNetwork(id: number): Promise<WifiNetwork | undefined> {
    return this.wifiNetworks.get(id);
  }

  async createWifiNetwork(network: InsertWifiNetwork): Promise<WifiNetwork> {
    const id = this.currentWifiId++;
    const newNetwork: WifiNetwork = { 
      id, 
      ...network,
      channel: network.channel ?? null,
      isEnabled: network.isEnabled ?? true,
      securityMode: network.securityMode ?? "WPA2",
      password: network.password ?? null,
      connectedDevices: network.connectedDevices ?? 0,
    };
    this.wifiNetworks.set(id, newNetwork);
    return newNetwork;
  }

  async updateWifiNetwork(id: number, network: Partial<InsertWifiNetwork>): Promise<WifiNetwork | undefined> {
    const existing = this.wifiNetworks.get(id);
    if (!existing) return undefined;

    const updated: WifiNetwork = { ...existing, ...network };
    this.wifiNetworks.set(id, updated);
    return updated;
  }

  async deleteWifiNetwork(id: number): Promise<boolean> {
    return this.wifiNetworks.delete(id);
  }

  // Port Forwarding Rules Methods
  async getPortForwardingRules(): Promise<PortForwardingRule[]> {
    return Array.from(this.portForwardingRules.values());
  }

  async getPortForwardingRule(id: number): Promise<PortForwardingRule | undefined> {
    return this.portForwardingRules.get(id);
  }

  async createPortForwardingRule(rule: InsertPortForwardingRule): Promise<PortForwardingRule> {
    const id = this.currentRuleId++;
    const newRule: PortForwardingRule = { 
      id, 
      ...rule,
      isEnabled: rule.isEnabled ?? true,
      description: rule.description ?? null,
    };
    this.portForwardingRules.set(id, newRule);
    return newRule;
  }

  async updatePortForwardingRule(id: number, rule: Partial<InsertPortForwardingRule>): Promise<PortForwardingRule | undefined> {
    const existing = this.portForwardingRules.get(id);
    if (!existing) return undefined;

    const updated: PortForwardingRule = { ...existing, ...rule };
    this.portForwardingRules.set(id, updated);
    return updated;
  }

  async deletePortForwardingRule(id: number): Promise<boolean> {
    return this.portForwardingRules.delete(id);
  }

  // Bandwidth Data Methods
  async getBandwidthData(limit: number = 24): Promise<BandwidthData[]> {
    return this.bandwidthData
      .sort((a, b) => (b.timestamp || new Date()).getTime() - (a.timestamp || new Date()).getTime())
      .slice(0, limit);
  }

  async addBandwidthData(data: InsertBandwidthData): Promise<BandwidthData> {
    const id = this.currentBandwidthId++;
    const newData: BandwidthData = {
      id,
      ...data,
      timestamp: new Date(),
    };
    this.bandwidthData.push(newData);
    
    // Keep only last 100 entries
    if (this.bandwidthData.length > 100) {
      this.bandwidthData = this.bandwidthData.slice(-100);
    }
    
    return newData;
  }

  async getSSHConfig(): Promise<SSHConfig | undefined> {
    return this.sshConfiguration;
  }

  async saveSSHConfig(config: InsertSSHConfig): Promise<SSHConfig> {
    const newConfig: SSHConfig = {
      id: 1,
      host: config.host,
      port: config.port || 22,
      username: config.username,
      password: config.password,
      enabled: config.enabled || false,
      lastConnected: null,
      connectionStatus: 'disconnected',
    };
    this.sshConfiguration = newConfig;
    this.saveSSHConfigToFile();
    return newConfig;
  }

  async updateSSHConnectionStatus(status: string): Promise<void> {
    if (this.sshConfiguration) {
      this.sshConfiguration.connectionStatus = status;
      if (status === 'connected') {
        this.sshConfiguration.lastConnected = new Date();
      }
      this.saveSSHConfigToFile();
    }
  }
}

export class DatabaseStorage implements IStorage {
  async getRouterStatus(): Promise<RouterStatus | undefined> {
    const [status] = await db.select().from(routerStatus).limit(1);
    return status || undefined;
  }

  async updateRouterStatus(status: InsertRouterStatus): Promise<RouterStatus> {
    const existing = await this.getRouterStatus();
    
    if (existing) {
      const [updated] = await db
        .update(routerStatus)
        .set({
          ...status,
          temperature: status.temperature ?? null,
          lastUpdated: new Date(),
        })
        .where(eq(routerStatus.id, existing.id))
        .returning();
      return updated;
    } else {
      const [created] = await db
        .insert(routerStatus)
        .values({
          ...status,
          temperature: status.temperature ?? null,
          lastUpdated: new Date(),
        })
        .returning();
      return created;
    }
  }

  async getConnectedDevices(): Promise<ConnectedDevice[]> {
    return await db.select().from(connectedDevices);
  }

  async getConnectedDevice(id: number): Promise<ConnectedDevice | undefined> {
    const [device] = await db.select().from(connectedDevices).where(eq(connectedDevices.id, id));
    return device || undefined;
  }

  async createConnectedDevice(device: InsertConnectedDevice): Promise<ConnectedDevice> {
    const [created] = await db
      .insert(connectedDevices)
      .values({
        ...device,
        isOnline: device.isOnline ?? true,
        downloadSpeed: device.downloadSpeed ?? 0,
        uploadSpeed: device.uploadSpeed ?? 0,
        connectedAt: new Date(),
        lastSeen: new Date(),
      })
      .returning();
    return created;
  }

  async updateConnectedDevice(id: number, device: Partial<InsertConnectedDevice>): Promise<ConnectedDevice | undefined> {
    const [updated] = await db
      .update(connectedDevices)
      .set({
        ...device,
        lastSeen: new Date(),
      })
      .where(eq(connectedDevices.id, id))
      .returning();
    return updated || undefined;
  }

  async deleteConnectedDevice(id: number): Promise<boolean> {
    const result = await db.delete(connectedDevices).where(eq(connectedDevices.id, id));
    return result.rowCount > 0;
  }

  async getWifiNetworks(): Promise<WifiNetwork[]> {
    return await db.select().from(wifiNetworks);
  }

  async getWifiNetwork(id: number): Promise<WifiNetwork | undefined> {
    const [network] = await db.select().from(wifiNetworks).where(eq(wifiNetworks.id, id));
    return network || undefined;
  }

  async createWifiNetwork(network: InsertWifiNetwork): Promise<WifiNetwork> {
    const [created] = await db
      .insert(wifiNetworks)
      .values({
        ...network,
        channel: network.channel ?? null,
        isEnabled: network.isEnabled ?? true,
        securityMode: network.securityMode ?? "WPA2",
        password: network.password ?? null,
        connectedDevices: network.connectedDevices ?? 0,
      })
      .returning();
    return created;
  }

  async updateWifiNetwork(id: number, network: Partial<InsertWifiNetwork>): Promise<WifiNetwork | undefined> {
    const [updated] = await db
      .update(wifiNetworks)
      .set(network)
      .where(eq(wifiNetworks.id, id))
      .returning();
    return updated || undefined;
  }

  async deleteWifiNetwork(id: number): Promise<boolean> {
    const result = await db.delete(wifiNetworks).where(eq(wifiNetworks.id, id));
    return result.rowCount > 0;
  }

  async getPortForwardingRules(): Promise<PortForwardingRule[]> {
    return await db.select().from(portForwardingRules);
  }

  async getPortForwardingRule(id: number): Promise<PortForwardingRule | undefined> {
    const [rule] = await db.select().from(portForwardingRules).where(eq(portForwardingRules.id, id));
    return rule || undefined;
  }

  async createPortForwardingRule(rule: InsertPortForwardingRule): Promise<PortForwardingRule> {
    const [created] = await db
      .insert(portForwardingRules)
      .values({
        ...rule,
        isEnabled: rule.isEnabled ?? true,
        description: rule.description ?? null,
      })
      .returning();
    return created;
  }

  async updatePortForwardingRule(id: number, rule: Partial<InsertPortForwardingRule>): Promise<PortForwardingRule | undefined> {
    const [updated] = await db
      .update(portForwardingRules)
      .set(rule)
      .where(eq(portForwardingRules.id, id))
      .returning();
    return updated || undefined;
  }

  async deletePortForwardingRule(id: number): Promise<boolean> {
    const result = await db.delete(portForwardingRules).where(eq(portForwardingRules.id, id));
    return result.rowCount > 0;
  }

  async getBandwidthData(limit: number = 24): Promise<BandwidthData[]> {
    return await db
      .select()
      .from(bandwidthData)
      .orderBy(bandwidthData.timestamp)
      .limit(limit);
  }

  async addBandwidthData(data: InsertBandwidthData): Promise<BandwidthData> {
    const [created] = await db
      .insert(bandwidthData)
      .values({
        ...data,
        timestamp: new Date(),
      })
      .returning();
    return created;
  }

  async getSSHConfig(): Promise<SSHConfig | undefined> {
    const [config] = await db.select().from(sshConfig).limit(1);
    return config || undefined;
  }

  async saveSSHConfig(config: InsertSSHConfig): Promise<SSHConfig> {
    const existing = await this.getSSHConfig();
    
    if (existing) {
      const [updated] = await db
        .update(sshConfig)
        .set(config)
        .where(eq(sshConfig.id, existing.id))
        .returning();
      return updated;
    } else {
      const [newConfig] = await db
        .insert(sshConfig)
        .values(config)
        .returning();
      return newConfig;
    }
  }

  async updateSSHConnectionStatus(status: string): Promise<void> {
    const existing = await this.getSSHConfig();
    if (existing) {
      await db
        .update(sshConfig)
        .set({ 
          connectionStatus: status,
          lastConnected: status === 'connected' ? new Date() : existing.lastConnected
        })
        .where(eq(sshConfig.id, existing.id));
    }
  }
}

export const storage = new MemStorage();
