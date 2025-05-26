import { pgTable, text, serial, integer, boolean, timestamp, real } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const routerStatus = pgTable("router_status", {
  id: serial("id").primaryKey(),
  model: text("model").notNull(),
  firmware: text("firmware").notNull(),
  ipAddress: text("ip_address").notNull(),
  uptime: integer("uptime").notNull(), // in seconds
  cpuUsage: real("cpu_usage").notNull(),
  memoryUsage: real("memory_usage").notNull(),
  memoryTotal: real("memory_total").notNull(),
  temperature: real("temperature"),
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
