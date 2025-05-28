import { pgTable, text, serial, integer, boolean, timestamp, real, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const routerStatus = pgTable("router_status", {
  id: serial("id").primaryKey(),
  model: text("model").notNull(),
  firmware: text("firmware").notNull(),
  serialNumber: text("serial_number"),
  hostname: text("hostname"),
  ipAddress: text("ip_address").notNull(),
  externalIpAddress: text("external_ip_address"),
  lanMacAddress: text("lan_mac_address"),
  wanMacAddress: text("wan_mac_address"),
  uptime: integer("uptime").notNull(), // in seconds
  cpuUsage: real("cpu_usage").notNull(),
  memoryUsage: real("memory_usage").notNull(),
  memoryTotal: real("memory_total").notNull(),
  temperature: real("temperature"),
  storageUsage: real("storage_usage"), // GB used
  storageTotal: real("storage_total"), // GB total
  loadAverage: text("load_average"), // 1min, 5min, 15min averages
  cpuCores: integer("cpu_cores"), // number of CPU cores
  cpuModel: text("cpu_model"), // CPU model name
  ssid24: text("ssid_24"), // 2.4GHz SSID
  ssid5: text("ssid_5"), // 5GHz SSID
  ssid6: text("ssid_6"), // 6GHz SSID
  aimeshMode: text("aimesh_mode"),
  associatedInterfaces: text("associated_interfaces"),
  usbDevices: text("usb_devices"),
  connectedClientsCount: integer("connected_clients_count"),
  lastUpdated: timestamp("last_updated").defaultNow(),
});

export const connectedDevices = pgTable("connected_devices", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  macAddress: text("mac_address").notNull().unique(),
  ipAddress: text("ip_address").notNull(),
  deviceType: text("device_type").notNull(), // laptop, mobile, desktop, tv, etc.
  isOnline: boolean("is_online").notNull().default(true),
  downloadSpeed: real("download_speed").default(0), // MB/s
  uploadSpeed: real("upload_speed").default(0), // MB/s
  connectedAt: timestamp("connected_at").defaultNow(),
  lastSeen: timestamp("last_seen").defaultNow(),
  connectionType: text("connection_type").default("wired"), // wired, wireless, mesh
  hostname: text("hostname"),
  // Enhanced wireless detection fields
  wirelessBand: text("wireless_band"), // 2.4GHz, 5GHz, 6GHz, null for wired
  signalStrength: integer("signal_strength"), // RSSI in dBm
  wirelessInterface: text("wireless_interface"), // wl0, wl1, wl2
  aimeshNode: text("aimesh_node"), // which AiMesh node device is connected to
  aimeshNodeMac: text("aimesh_node_mac"), // MAC address of AiMesh node
});

export const wifiNetworks = pgTable("wifi_networks", {
  id: serial("id").primaryKey(),
  ssid: text("ssid").notNull(),
  band: text("band").notNull(), // 2.4GHz, 5GHz
  channel: integer("channel"),
  isEnabled: boolean("is_enabled").notNull().default(true),
  securityMode: text("security_mode").notNull().default("WPA2"),
  password: text("password"),
  connectedDevices: integer("connected_devices").default(0),
});

export const portForwardingRules = pgTable("port_forwarding_rules", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  protocol: text("protocol").notNull(), // TCP, UDP, Both
  externalPort: integer("external_port").notNull(),
  internalPort: integer("internal_port").notNull(),
  internalIp: text("internal_ip").notNull(),
  isEnabled: boolean("is_enabled").notNull().default(true),
  description: text("description"),
});

export const bandwidthData = pgTable("bandwidth_data", {
  id: serial("id").primaryKey(),
  timestamp: timestamp("timestamp").defaultNow(),
  downloadSpeed: real("download_speed").notNull(), // Mbps
  uploadSpeed: real("upload_speed").notNull(), // Mbps
  totalDownload: real("total_download").notNull(), // GB
  totalUpload: real("total_upload").notNull(), // GB
});

export const sshConfig = pgTable("ssh_config", {
  id: serial("id").primaryKey(),
  host: text("host").notNull(),
  port: integer("port").notNull().default(22),
  username: text("username").notNull(),
  password: text("password").notNull(),
  enabled: boolean("enabled").notNull().default(false),
  syncInterval: integer("sync_interval").notNull().default(5),
  lastConnected: timestamp("last_connected"),
  connectionStatus: text("connection_status").default("disconnected"), // disconnected, connected, error
});

export const routerFeatures = pgTable("router_features", {
  id: serial("id").primaryKey(),
  adaptiveQosEnabled: boolean("adaptive_qos_enabled").default(false),
  aiProtectionEnabled: boolean("ai_protection_enabled").default(false),
  vpnServerEnabled: boolean("vpn_server_enabled").default(false),
  aimeshIsMaster: boolean("aimesh_is_master").default(true),
  aimeshNodeCount: integer("aimesh_node_count").default(0),
  aimeshPeers: text("aimesh_peers"), // JSON array of MAC addresses
  wirelessClients24ghz: integer("wireless_clients_24ghz").default(0),
  wirelessClients5ghz: integer("wireless_clients_5ghz").default(0),
  wirelessClients6ghz: integer("wireless_clients_6ghz").default(0),
  wirelessClientsTotal: integer("wireless_clients_total").default(0),
  lastUpdated: timestamp("last_updated").defaultNow(),
});

export const aimeshNodes = pgTable("aimesh_nodes", {
  id: serial("id").primaryKey(),
  macAddress: text("mac_address").notNull().unique(),
  ipAddress: text("ip_address").notNull(),
  hostname: text("hostname"),
  model: text("model"),
  firmware: text("firmware"),
  status: text("status").default("online"), // online, offline, connecting
  connectionType: text("connection_type"), // ethernet, wireless, powerline
  signalStrength: integer("signal_strength"), // for wireless connections
  uptime: integer("uptime"), // seconds
  clientCount: integer("client_count").default(0),
  lastSeen: timestamp("last_seen").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const clientAssociations = pgTable("client_associations", {
  id: serial("id").primaryKey(),
  deviceMac: text("device_mac").notNull(),
  interface: text("interface").notNull(), // eth6, eth7, etc.
  signalStrength: integer("signal_strength"), // RSSI in dBm
  timestamp: timestamp("timestamp").defaultNow(),
});

export const deviceGroups = pgTable("device_groups", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  color: text("color"),
  icon: text("icon"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const deviceGroupAssignments = pgTable("device_group_assignments", {
  id: serial("id").primaryKey(),
  deviceId: integer("device_id"),
  groupId: integer("group_id"),
  addedAt: timestamp("added_at").defaultNow(),
});

// Insert schemas
export const insertRouterStatusSchema = createInsertSchema(routerStatus).omit({
  id: true,
  lastUpdated: true,
});

export const insertConnectedDeviceSchema = createInsertSchema(connectedDevices).omit({
  id: true,
  connectedAt: true,
  lastSeen: true,
});

export const insertWifiNetworkSchema = createInsertSchema(wifiNetworks).omit({
  id: true,
});

export const insertPortForwardingRuleSchema = createInsertSchema(portForwardingRules).omit({
  id: true,
});

export const insertBandwidthDataSchema = createInsertSchema(bandwidthData).omit({
  id: true,
  timestamp: true,
});

export const insertSSHConfigSchema = createInsertSchema(sshConfig).omit({
  id: true,
  lastConnected: true,
  connectionStatus: true,
});

export const insertRouterFeaturesSchema = createInsertSchema(routerFeatures).omit({
  id: true,
  lastUpdated: true,
});

export const insertAiMeshNodeSchema = createInsertSchema(aimeshNodes).omit({
  id: true,
  lastSeen: true,
  createdAt: true,
  updatedAt: true,
});

export const insertDeviceGroupSchema = createInsertSchema(deviceGroups).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertClientAssociationSchema = createInsertSchema(clientAssociations).omit({
  id: true,
  timestamp: true,
});

export const insertDeviceGroupAssignmentSchema = createInsertSchema(deviceGroupAssignments).omit({
  id: true,
  addedAt: true,
});

// Types
export type RouterStatus = typeof routerStatus.$inferSelect;
export type InsertRouterStatus = z.infer<typeof insertRouterStatusSchema>;

export type ConnectedDevice = typeof connectedDevices.$inferSelect;
export type InsertConnectedDevice = z.infer<typeof insertConnectedDeviceSchema>;

export type WifiNetwork = typeof wifiNetworks.$inferSelect;
export type InsertWifiNetwork = z.infer<typeof insertWifiNetworkSchema>;

export type PortForwardingRule = typeof portForwardingRules.$inferSelect;
export type InsertPortForwardingRule = z.infer<typeof insertPortForwardingRuleSchema>;

export type BandwidthData = typeof bandwidthData.$inferSelect;
export type InsertBandwidthData = z.infer<typeof insertBandwidthDataSchema>;

export type SSHConfig = typeof sshConfig.$inferSelect;
export type InsertSSHConfig = z.infer<typeof insertSSHConfigSchema>;

export type RouterFeatures = typeof routerFeatures.$inferSelect;
export type InsertRouterFeatures = z.infer<typeof insertRouterFeaturesSchema>;

export type AiMeshNode = typeof aimeshNodes.$inferSelect;
export type InsertAiMeshNode = z.infer<typeof insertAiMeshNodeSchema>;

export type DeviceGroup = typeof deviceGroups.$inferSelect;
export type InsertDeviceGroup = z.infer<typeof insertDeviceGroupSchema>;

export type DeviceTag = typeof deviceTags.$inferSelect;
export type InsertDeviceTag = z.infer<typeof insertDeviceTagSchema>;

export type DeviceGroupMembership = typeof deviceGroupMemberships.$inferSelect;
export type InsertDeviceGroupMembership = z.infer<typeof insertDeviceGroupMembershipSchema>;

export type DeviceTagAssignment = typeof deviceTagAssignments.$inferSelect;
export type InsertDeviceTagAssignment = z.infer<typeof insertDeviceTagAssignmentSchema>;
