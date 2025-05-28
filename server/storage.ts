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
  RouterFeatures,
  InsertRouterFeatures,
  DeviceGroup,
  InsertDeviceGroup,
  DeviceTag,
  InsertDeviceTag,
  DeviceGroupMembership,
  InsertDeviceGroupMembership,
  DeviceTagAssignment,
  InsertDeviceTagAssignment,
  routerStatus,
  connectedDevices,
  wifiNetworks,
  portForwardingRules,
  bandwidthData,
  sshConfig,
  routerFeatures,
  deviceGroups,
  deviceTags,
  deviceGroupMemberships,
  deviceTagAssignments,
} from "@shared/schema";
import { encryptSSHConfig, decryptSSHConfig } from "./crypto";
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
  clearSSHConfig(): Promise<void>;
  clearAllData(): Promise<void>;

  // Router Features
  getRouterFeatures(): Promise<RouterFeatures | undefined>;
  updateRouterFeatures(features: InsertRouterFeatures): Promise<RouterFeatures>;

  // Device Groups
  getDeviceGroups(): Promise<DeviceGroup[]>;
  getDeviceGroup(id: number): Promise<DeviceGroup | undefined>;
  createDeviceGroup(group: InsertDeviceGroup): Promise<DeviceGroup>;
  updateDeviceGroup(id: number, group: Partial<InsertDeviceGroup>): Promise<DeviceGroup | undefined>;
  deleteDeviceGroup(id: number): Promise<boolean>;

  // Device Tags
  getDeviceTags(): Promise<DeviceTag[]>;
  getDeviceTag(id: number): Promise<DeviceTag | undefined>;
  createDeviceTag(tag: InsertDeviceTag): Promise<DeviceTag>;
  updateDeviceTag(id: number, tag: Partial<InsertDeviceTag>): Promise<DeviceTag | undefined>;
  deleteDeviceTag(id: number): Promise<boolean>;

  // Device Group Management
  addDeviceToGroup(deviceId: number, groupId: number): Promise<DeviceGroupMembership>;
  removeDeviceFromGroup(deviceId: number, groupId: number): Promise<boolean>;
  getDeviceGroups(deviceId: number): Promise<DeviceGroup[]>;
  getGroupDevices(groupId: number): Promise<ConnectedDevice[]>;

  // Device Tag Management
  assignTagToDevice(deviceId: number, tagId: number): Promise<DeviceTagAssignment>;
  removeTagFromDevice(deviceId: number, tagId: number): Promise<boolean>;
  getDeviceTags(deviceId: number): Promise<DeviceTag[]>;
  getTaggedDevices(tagId: number): Promise<ConnectedDevice[]>;
}

export class MemStorage implements IStorage {
  private routerStatus: RouterStatus | undefined;
  private connectedDevices: Map<number, ConnectedDevice>;
  private wifiNetworks: Map<number, WifiNetwork>;
  private portForwardingRules: Map<number, PortForwardingRule>;
  private bandwidthData: BandwidthData[];
  private sshConfiguration: SSHConfig | undefined;
  private routerFeatures: RouterFeatures | undefined;
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
      import('fs').then(async fs => {
        import('path').then(async path => {
          const configPath = path.join(process.cwd(), 'ssh-config.json');
          
          if (fs.existsSync(configPath)) {
            const configData = fs.readFileSync(configPath, 'utf8');
            const encryptedConfig = JSON.parse(configData);
            // Decrypt the SSH configuration on load
            this.sshConfiguration = decryptSSHConfig(encryptedConfig);
          }
        }).catch(() => {
          // Path module not available
        });
      }).catch(() => {
        // FS module not available, skip file operations
      });
    } catch (error) {
      console.error('Failed to load SSH config:', error);
      // Clear corrupted config and start fresh
      this.sshConfiguration = undefined;
    }
  }

  private saveSSHConfigToFile() {
    try {
      import('fs').then(async fs => {
        import('path').then(async path => {
          const configPath = path.join(process.cwd(), 'ssh-config.json');
          
          if (this.sshConfiguration) {
            // Encrypt SSH configuration before saving to disk
            const encryptedConfig = encryptSSHConfig(this.sshConfiguration);
            fs.writeFileSync(configPath, JSON.stringify(encryptedConfig, null, 2));
          }
        }).catch(() => {
          // Path module not available
        });
      }).catch(() => {
        // FS module not available, skip file operations
      });
    } catch (error) {
      console.error('Failed to save SSH config:', error);
    }
  }

  // All data comes exclusively from authentic SSH connections to ASUS routers
  // No sample data is used to ensure data integrity

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
    // Check for existing device with same MAC address to prevent duplicates
    for (const [existingId, existingDevice] of this.connectedDevices) {
      if (existingDevice.macAddress === device.macAddress) {
        // Update existing device instead of creating duplicate
        return this.updateConnectedDevice(existingId, device) || existingDevice;
      }
    }
    
    const id = this.currentDeviceId++;
    const newDevice: ConnectedDevice = {
      id,
      ...device,
      isOnline: device.isOnline ?? true,
      downloadSpeed: device.downloadSpeed ?? 0,
      uploadSpeed: device.uploadSpeed ?? 0,
      connectedAt: new Date(),
      lastSeen: new Date(),
      connectionType: device.connectionType || 'wired',
      hostname: device.hostname || device.name,
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
    const existingStatus = this.sshConfiguration?.connectionStatus || 'disconnected';
    const existingLastConnected = this.sshConfiguration?.lastConnected || null;
    
    const newConfig: SSHConfig = {
      id: 1,
      host: config.host,
      port: config.port || 22,
      username: config.username,
      password: config.password,
      enabled: config.enabled || false,
      syncInterval: config.syncInterval || 5,
      lastConnected: existingLastConnected,
      connectionStatus: existingStatus,
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

  async clearSSHConfig(): Promise<void> {
    this.sshConfiguration = undefined;
    // Clear the config file
    try {
      const fs = require('fs');
      const path = require('path');
      const configPath = path.join(process.cwd(), 'ssh-config.json');
      if (fs.existsSync(configPath)) {
        fs.unlinkSync(configPath);
      }
    } catch (error) {
      // Ignore errors
    }
  }

  async clearAllData(): Promise<void> {
    // Clear all router data but keep SSH config
    this.routerStatus = undefined;
    this.connectedDevices.clear();
    this.wifiNetworks.clear();
    this.portForwardingRules.clear();
    this.bandwidthData = [];
    this.routerFeatures = undefined;
    this.currentDeviceId = 1;
    this.currentWifiId = 1;
    this.currentRuleId = 1;
    this.currentBandwidthId = 1;
  }

  async getRouterFeatures(): Promise<RouterFeatures | undefined> {
    return this.routerFeatures;
  }

  async updateRouterFeatures(features: InsertRouterFeatures): Promise<RouterFeatures> {
    const newFeatures: RouterFeatures = {
      id: 1,
      ...features,
      lastUpdated: new Date(),
    };
    this.routerFeatures = newFeatures;
    return newFeatures;
  }

  // Device Groups Methods (stub implementations for MemStorage)
  async getDeviceGroups(): Promise<DeviceGroup[]> {
    return [];
  }

  async getDeviceGroup(id: number): Promise<DeviceGroup | undefined> {
    return undefined;
  }

  async createDeviceGroup(group: InsertDeviceGroup): Promise<DeviceGroup> {
    const newGroup: DeviceGroup = {
      id: 1,
      ...group,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    return newGroup;
  }

  async updateDeviceGroup(id: number, group: Partial<InsertDeviceGroup>): Promise<DeviceGroup | undefined> {
    return undefined;
  }

  async deleteDeviceGroup(id: number): Promise<boolean> {
    return false;
  }

  // Device Tags Methods (stub implementations for MemStorage)
  async getDeviceTags(): Promise<DeviceTag[]> {
    return [];
  }

  async getDeviceTag(id: number): Promise<DeviceTag | undefined> {
    return undefined;
  }

  async createDeviceTag(tag: InsertDeviceTag): Promise<DeviceTag> {
    const newTag: DeviceTag = {
      id: 1,
      ...tag,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    return newTag;
  }

  async updateDeviceTag(id: number, tag: Partial<InsertDeviceTag>): Promise<DeviceTag | undefined> {
    return undefined;
  }

  async deleteDeviceTag(id: number): Promise<boolean> {
    return false;
  }

  // Device Group Management Methods
  async addDeviceToGroup(deviceId: number, groupId: number): Promise<DeviceGroupMembership> {
    const membership: DeviceGroupMembership = {
      deviceId,
      groupId,
      addedAt: new Date(),
    };
    return membership;
  }

  async removeDeviceFromGroup(deviceId: number, groupId: number): Promise<boolean> {
    return false;
  }

  async getDeviceGroups(deviceId: number): Promise<DeviceGroup[]> {
    return [];
  }

  async getGroupDevices(groupId: number): Promise<ConnectedDevice[]> {
    return [];
  }

  // Device Tag Management Methods
  async assignTagToDevice(deviceId: number, tagId: number): Promise<DeviceTagAssignment> {
    const assignment: DeviceTagAssignment = {
      deviceId,
      tagId,
      assignedAt: new Date(),
    };
    return assignment;
  }

  async removeTagFromDevice(deviceId: number, tagId: number): Promise<boolean> {
    return false;
  }

  async getDeviceTags(deviceId: number): Promise<DeviceTag[]> {
    return [];
  }

  async getTaggedDevices(tagId: number): Promise<ConnectedDevice[]> {
    return [];
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
      // Preserve existing connection status and last connected time
      const updateData = {
        ...config,
        connectionStatus: existing.connectionStatus,
        lastConnected: existing.lastConnected,
      };
      
      const [updated] = await db
        .update(sshConfig)
        .set(updateData)
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

  async clearSSHConfig(): Promise<void> {
    await db.delete(sshConfig);
  }

  async clearAllData(): Promise<void> {
    // Clear all router data but keep SSH config
    await db.delete(routerStatus);
    await db.delete(connectedDevices);
    await db.delete(wifiNetworks);
    await db.delete(portForwardingRules);
    await db.delete(bandwidthData);
    await db.delete(routerFeatures);
  }

  async getRouterFeatures(): Promise<RouterFeatures | undefined> {
    const [features] = await db.select().from(routerFeatures).limit(1);
    return features || undefined;
  }

  async updateRouterFeatures(features: InsertRouterFeatures): Promise<RouterFeatures> {
    const existing = await this.getRouterFeatures();
    
    if (existing) {
      const [updated] = await db
        .update(routerFeatures)
        .set({ ...features, lastUpdated: new Date() })
        .where(eq(routerFeatures.id, existing.id))
        .returning();
      return updated;
    } else {
      const [created] = await db
        .insert(routerFeatures)
        .values({ ...features, lastUpdated: new Date() })
        .returning();
      return created;
    }
  }

  // Device Groups Implementation
  async getDeviceGroups(): Promise<DeviceGroup[]> {
    return await db.select().from(deviceGroups).orderBy(deviceGroups.name);
  }

  async getDeviceGroup(id: number): Promise<DeviceGroup | undefined> {
    const [group] = await db.select().from(deviceGroups).where(eq(deviceGroups.id, id));
    return group || undefined;
  }

  async createDeviceGroup(group: InsertDeviceGroup): Promise<DeviceGroup> {
    const [created] = await db
      .insert(deviceGroups)
      .values({
        ...group,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();
    return created;
  }

  async updateDeviceGroup(id: number, group: Partial<InsertDeviceGroup>): Promise<DeviceGroup | undefined> {
    const [updated] = await db
      .update(deviceGroups)
      .set({ ...group, updatedAt: new Date() })
      .where(eq(deviceGroups.id, id))
      .returning();
    return updated || undefined;
  }

  async deleteDeviceGroup(id: number): Promise<boolean> {
    const result = await db.delete(deviceGroups).where(eq(deviceGroups.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  // Device Tags Implementation
  async getDeviceTags(): Promise<DeviceTag[]> {
    return await db.select().from(deviceTags).orderBy(deviceTags.name);
  }

  async getDeviceTag(id: number): Promise<DeviceTag | undefined> {
    const [tag] = await db.select().from(deviceTags).where(eq(deviceTags.id, id));
    return tag || undefined;
  }

  async createDeviceTag(tag: InsertDeviceTag): Promise<DeviceTag> {
    const [created] = await db
      .insert(deviceTags)
      .values({
        ...tag,
        createdAt: new Date(),
      })
      .returning();
    return created;
  }

  async updateDeviceTag(id: number, tag: Partial<InsertDeviceTag>): Promise<DeviceTag | undefined> {
    const [updated] = await db
      .update(deviceTags)
      .set(tag)
      .where(eq(deviceTags.id, id))
      .returning();
    return updated || undefined;
  }

  async deleteDeviceTag(id: number): Promise<boolean> {
    const result = await db.delete(deviceTags).where(eq(deviceTags.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  // Device Group Management
  async addDeviceToGroup(deviceId: number, groupId: number): Promise<DeviceGroupMembership> {
    const [membership] = await db
      .insert(deviceGroupMemberships)
      .values({
        deviceId,
        groupId,
        addedAt: new Date(),
      })
      .returning();
    return membership;
  }

  async removeDeviceFromGroup(deviceId: number, groupId: number): Promise<boolean> {
    const result = await db
      .delete(deviceGroupMemberships)
      .where(eq(deviceGroupMemberships.deviceId, deviceId) && eq(deviceGroupMemberships.groupId, groupId));
    return (result.rowCount ?? 0) > 0;
  }

  async getDeviceGroups(deviceId: number): Promise<DeviceGroup[]> {
    const result = await db
      .select({ group: deviceGroups })
      .from(deviceGroupMemberships)
      .innerJoin(deviceGroups, eq(deviceGroupMemberships.groupId, deviceGroups.id))
      .where(eq(deviceGroupMemberships.deviceId, deviceId));
    return result.map(r => r.group);
  }

  async getGroupDevices(groupId: number): Promise<ConnectedDevice[]> {
    const result = await db
      .select({ device: connectedDevices })
      .from(deviceGroupMemberships)
      .innerJoin(connectedDevices, eq(deviceGroupMemberships.deviceId, connectedDevices.id))
      .where(eq(deviceGroupMemberships.groupId, groupId));
    return result.map(r => r.device);
  }

  // Device Tag Management
  async assignTagToDevice(deviceId: number, tagId: number): Promise<DeviceTagAssignment> {
    const [assignment] = await db
      .insert(deviceTagAssignments)
      .values({
        deviceId,
        tagId,
        assignedAt: new Date(),
      })
      .returning();
    return assignment;
  }

  async removeTagFromDevice(deviceId: number, tagId: number): Promise<boolean> {
    const result = await db
      .delete(deviceTagAssignments)
      .where(eq(deviceTagAssignments.deviceId, deviceId) && eq(deviceTagAssignments.tagId, tagId));
    return (result.rowCount ?? 0) > 0;
  }

  async getDeviceTags(deviceId: number): Promise<DeviceTag[]> {
    const result = await db
      .select({ tag: deviceTags })
      .from(deviceTagAssignments)
      .innerJoin(deviceTags, eq(deviceTagAssignments.tagId, deviceTags.id))
      .where(eq(deviceTagAssignments.deviceId, deviceId));
    return result.map(r => r.tag);
  }

  async getTaggedDevices(tagId: number): Promise<ConnectedDevice[]> {
    const result = await db
      .select({ device: connectedDevices })
      .from(deviceTagAssignments)
      .innerJoin(connectedDevices, eq(deviceTagAssignments.deviceId, connectedDevices.id))
      .where(eq(deviceTagAssignments.tagId, tagId));
    return result.map(r => r.device);
  }
}

export const storage = new MemStorage();
