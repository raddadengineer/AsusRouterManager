import { db } from "./db";
import { 
  routerStatus, 
  connectedDevices, 
  wifiNetworks, 
  portForwardingRules, 
  bandwidthData 
} from "@shared/schema";

async function initializeDatabase() {
  try {
    console.log("Initializing database with sample data...");

    // Initialize router status
    await db.insert(routerStatus).values({
      model: "RT-AX88U",
      firmware: "3.0.0.4.388.22525",
      ipAddress: "192.168.1.1",
      uptime: 223200, // 2d 14h 0m in seconds
      cpuUsage: 12,
      memoryUsage: 2.1,
      memoryTotal: 4.0,
      temperature: 45.5,
      lastUpdated: new Date(),
    }).onConflictDoNothing();

    // Initialize connected devices
    const devices = [
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

    await db.insert(connectedDevices).values(devices).onConflictDoNothing();

    // Initialize WiFi networks
    const networks = [
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

    await db.insert(wifiNetworks).values(networks).onConflictDoNothing();

    // Initialize port forwarding rules
    const rules = [
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

    await db.insert(portForwardingRules).values(rules).onConflictDoNothing();

    // Generate sample bandwidth data for the last 24 hours
    const now = new Date();
    const bandwidthEntries = [];
    for (let i = 23; i >= 0; i--) {
      const timestamp = new Date(now.getTime() - i * 60 * 60 * 1000);
      bandwidthEntries.push({
        timestamp,
        downloadSpeed: 120 + Math.random() * 380,
        uploadSpeed: 80 + Math.random() * 170,
        totalDownload: 1200 + Math.random() * 500,
        totalUpload: 400 + Math.random() * 200,
      });
    }

    await db.insert(bandwidthData).values(bandwidthEntries).onConflictDoNothing();

    console.log("Database initialized successfully!");
  } catch (error) {
    console.error("Error initializing database:", error);
  }
}

// Only run if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  initializeDatabase().then(() => process.exit(0));
}

export { initializeDatabase };