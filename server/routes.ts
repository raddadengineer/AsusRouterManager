import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { sshClient } from "./ssh-client";
import { asusAPI } from "./asus-api";
import { 
  insertRouterStatusSchema,
  insertConnectedDeviceSchema,
  insertWifiNetworkSchema,
  insertPortForwardingRuleSchema,
  insertBandwidthDataSchema,
  insertSSHConfigSchema
} from "@shared/schema";

export async function registerRoutes(app: Express): Promise<Server> {
  // Router Status Routes
  app.get("/api/router/status", async (req, res) => {
    try {
      const status = await storage.getRouterStatus();
      res.json(status);
    } catch (error) {
      res.status(500).json({ message: "Failed to get router status" });
    }
  });

  app.put("/api/router/status", async (req, res) => {
    try {
      const validatedData = insertRouterStatusSchema.parse(req.body);
      const status = await storage.updateRouterStatus(validatedData);
      res.json(status);
    } catch (error) {
      res.status(400).json({ message: "Invalid router status data" });
    }
  });

  // Connected Devices Routes
  app.get("/api/devices", async (req, res) => {
    try {
      const devices = await storage.getConnectedDevices();
      res.json(devices);
    } catch (error) {
      res.status(500).json({ message: "Failed to get connected devices" });
    }
  });

  app.get("/api/devices/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const device = await storage.getConnectedDevice(id);
      if (!device) {
        return res.status(404).json({ message: "Device not found" });
      }
      res.json(device);
    } catch (error) {
      res.status(500).json({ message: "Failed to get device" });
    }
  });

  app.post("/api/devices", async (req, res) => {
    try {
      const validatedData = insertConnectedDeviceSchema.parse(req.body);
      const device = await storage.createConnectedDevice(validatedData);
      res.status(201).json(device);
    } catch (error) {
      res.status(400).json({ message: "Invalid device data" });
    }
  });

  app.put("/api/devices/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const validatedData = insertConnectedDeviceSchema.partial().parse(req.body);
      const device = await storage.updateConnectedDevice(id, validatedData);
      if (!device) {
        return res.status(404).json({ message: "Device not found" });
      }
      res.json(device);
    } catch (error) {
      res.status(400).json({ message: "Invalid device data" });
    }
  });

  app.delete("/api/devices/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const deleted = await storage.deleteConnectedDevice(id);
      if (!deleted) {
        return res.status(404).json({ message: "Device not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete device" });
    }
  });

  // WiFi Networks Routes
  app.get("/api/wifi", async (req, res) => {
    try {
      const networks = await storage.getWifiNetworks();
      res.json(networks);
    } catch (error) {
      res.status(500).json({ message: "Failed to get WiFi networks" });
    }
  });

  app.get("/api/wifi/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const network = await storage.getWifiNetwork(id);
      if (!network) {
        return res.status(404).json({ message: "WiFi network not found" });
      }
      res.json(network);
    } catch (error) {
      res.status(500).json({ message: "Failed to get WiFi network" });
    }
  });

  app.post("/api/wifi", async (req, res) => {
    try {
      const validatedData = insertWifiNetworkSchema.parse(req.body);
      const network = await storage.createWifiNetwork(validatedData);
      res.status(201).json(network);
    } catch (error) {
      res.status(400).json({ message: "Invalid WiFi network data" });
    }
  });

  app.put("/api/wifi/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const validatedData = insertWifiNetworkSchema.partial().parse(req.body);
      const network = await storage.updateWifiNetwork(id, validatedData);
      if (!network) {
        return res.status(404).json({ message: "WiFi network not found" });
      }
      res.json(network);
    } catch (error) {
      res.status(400).json({ message: "Invalid WiFi network data" });
    }
  });

  app.delete("/api/wifi/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const deleted = await storage.deleteWifiNetwork(id);
      if (!deleted) {
        return res.status(404).json({ message: "WiFi network not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete WiFi network" });
    }
  });

  // Port Forwarding Rules Routes
  app.get("/api/port-forwarding", async (req, res) => {
    try {
      const rules = await storage.getPortForwardingRules();
      res.json(rules);
    } catch (error) {
      res.status(500).json({ message: "Failed to get port forwarding rules" });
    }
  });

  app.get("/api/port-forwarding/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const rule = await storage.getPortForwardingRule(id);
      if (!rule) {
        return res.status(404).json({ message: "Port forwarding rule not found" });
      }
      res.json(rule);
    } catch (error) {
      res.status(500).json({ message: "Failed to get port forwarding rule" });
    }
  });

  app.post("/api/port-forwarding", async (req, res) => {
    try {
      const validatedData = insertPortForwardingRuleSchema.parse(req.body);
      const rule = await storage.createPortForwardingRule(validatedData);
      res.status(201).json(rule);
    } catch (error) {
      res.status(400).json({ message: "Invalid port forwarding rule data" });
    }
  });

  app.put("/api/port-forwarding/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const validatedData = insertPortForwardingRuleSchema.partial().parse(req.body);
      const rule = await storage.updatePortForwardingRule(id, validatedData);
      if (!rule) {
        return res.status(404).json({ message: "Port forwarding rule not found" });
      }
      res.json(rule);
    } catch (error) {
      res.status(400).json({ message: "Invalid port forwarding rule data" });
    }
  });

  app.delete("/api/port-forwarding/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const deleted = await storage.deletePortForwardingRule(id);
      if (!deleted) {
        return res.status(404).json({ message: "Port forwarding rule not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete port forwarding rule" });
    }
  });

  // Bandwidth Data Routes
  app.get("/api/bandwidth", async (req, res) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 24;
      const data = await storage.getBandwidthData(limit);
      res.json(data);
    } catch (error) {
      res.status(500).json({ message: "Failed to get bandwidth data" });
    }
  });

  app.post("/api/bandwidth", async (req, res) => {
    try {
      const validatedData = insertBandwidthDataSchema.parse(req.body);
      const data = await storage.addBandwidthData(validatedData);
      res.status(201).json(data);
    } catch (error) {
      res.status(400).json({ message: "Invalid bandwidth data" });
    }
  });

  // System Actions Routes
  app.post("/api/system/reboot", async (req, res) => {
    try {
      // In a real implementation, this would trigger a router reboot
      res.json({ message: "Router reboot initiated" });
    } catch (error) {
      res.status(500).json({ message: "Failed to reboot router" });
    }
  });

  app.post("/api/system/speed-test", async (req, res) => {
    try {
      // In a real implementation, this would trigger a speed test
      const mockResults = {
        downloadSpeed: 486.2,
        uploadSpeed: 124.8,
        latency: 12,
        testDate: new Date().toISOString(),
      };
      res.json(mockResults);
    } catch (error) {
      res.status(500).json({ message: "Failed to run speed test" });
    }
  });

  app.post("/api/system/firmware-update", async (req, res) => {
    try {
      // In a real implementation, this would check for and install firmware updates
      res.json({ message: "Firmware update check initiated" });
    } catch (error) {
      res.status(500).json({ message: "Failed to check for firmware updates" });
    }
  });

  app.post("/api/system/backup", async (req, res) => {
    try {
      // In a real implementation, this would create a configuration backup
      res.json({ 
        message: "Configuration backup created",
        filename: `router-backup-${new Date().toISOString().split('T')[0]}.cfg`
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to create backup" });
    }
  });

  // SSH Configuration Routes
  app.get("/api/ssh/config", async (req, res) => {
    try {
      const config = await storage.getSSHConfig();
      if (config) {
        // Don't send password in response for security
        const { password, ...safeConfig } = config;
        res.json({ ...safeConfig, password: '' });
      } else {
        res.json(null);
      }
    } catch (error) {
      res.status(500).json({ message: "Failed to get SSH configuration" });
    }
  });

  app.post("/api/ssh/config", async (req, res) => {
    try {
      console.log("Received SSH config data:", req.body);
      
      // Ensure syncInterval has a default value if not provided
      const configData = {
        ...req.body,
        syncInterval: req.body.syncInterval || 5
      };
      
      const validatedData = insertSSHConfigSchema.parse(configData);
      
      // Test connection first before saving
      const testConfig = {
        id: 1,
        host: validatedData.host,
        port: validatedData.port || 22,
        username: validatedData.username,
        password: validatedData.password,
        enabled: validatedData.enabled || false,
        syncInterval: validatedData.syncInterval || 5,
        lastConnected: null,
        connectionStatus: 'connecting' as string | null
      };

      await sshClient.connect(testConfig);
      
      // If connection successful, save the configuration
      const savedConfig = await storage.saveSSHConfig(validatedData);
      await storage.updateSSHConnectionStatus('connected');
      
      const { password, ...safeConfig } = savedConfig;
      res.json({ ...safeConfig, password: '', connectionTested: true });
    } catch (error: any) {
      console.error("SSH config save error:", error);
      await storage.updateSSHConnectionStatus('error');
      res.status(400).json({ 
        message: error?.message || "Failed to save SSH configuration",
        details: error?.issues || "Connection test failed"
      });
    }
  });

  app.delete("/api/ssh/config", async (req, res) => {
    try {
      await storage.clearSSHConfig();
      res.json({ success: true, message: "SSH configuration cleared" });
    } catch (error: any) {
      res.status(500).json({ message: "Failed to clear SSH configuration" });
    }
  });

  app.delete("/api/data/clear", async (req, res) => {
    try {
      await storage.clearAllData();
      res.json({ success: true, message: "All router data cleared" });
    } catch (error: any) {
      res.status(500).json({ message: "Failed to clear router data" });
    }
  });

  app.post("/api/ssh/test", async (req, res) => {
    try {
      const validatedData = insertSSHConfigSchema.parse(req.body);
      
      // Test SSH connection to ASUS router
      const testConfig = {
        id: 1,
        host: validatedData.host,
        port: validatedData.port || 22,
        username: validatedData.username,
        password: validatedData.password,
        enabled: validatedData.enabled || false,
        syncInterval: validatedData.syncInterval || 5,
        lastConnected: null,
        connectionStatus: 'connecting' as string | null
      };

      await sshClient.connect(testConfig);
      await storage.updateSSHConnectionStatus('connected');
      
      res.json({ 
        success: true, 
        message: "Successfully connected to ASUS router via SSH" 
      });
    } catch (error: any) {
      await storage.updateSSHConnectionStatus('error');
      res.status(500).json({ 
        success: false, 
        message: `SSH connection failed: ${error?.message || 'Unknown error'}` 
      });
    }
  });

  app.post("/api/ssh/sync-data", async (req, res) => {
    try {
      if (!sshClient.isConnectionActive()) {
        return res.status(400).json({ message: "SSH connection not active. Please connect first." });
      }

      // Pull real data from ASUS router
      const systemInfo = await sshClient.getSystemInfo();
      const devices = await sshClient.getConnectedDevices();
      const wifiNetworks = await sshClient.getWiFiNetworks();
      const bandwidth = await sshClient.getBandwidthData();
      const merlinFeatures = await sshClient.getMerlinFeatures();

      // Update router status with comprehensive real data
      if (systemInfo) {
        // Parse storage info (used, total)
        const storageData = systemInfo.storageInfo ? systemInfo.storageInfo.split(' ') : ['0', '0'];
        const storageUsed = parseFloat(storageData[0]) || 0;
        const storageTotal = parseFloat(storageData[1]) || 8;

        // Parse memory details (used, total, available)
        const memoryData = systemInfo.memoryDetails ? systemInfo.memoryDetails.split(' ') : [systemInfo.memoryUsage?.toString() || '0', systemInfo.memoryTotal?.toString() || '4', '0'];
        const memoryUsed = parseFloat(memoryData[0]) || parseFloat(systemInfo.memoryUsage) || 0;
        const memoryTotal = parseFloat(memoryData[1]) || parseFloat(systemInfo.memoryTotal) || 4;

        await storage.updateRouterStatus({
          model: systemInfo.model || 'ASUS Router',
          firmware: `${systemInfo.firmware || 'Unknown'} ${systemInfo.merlinVersion ? '(Merlin ' + systemInfo.merlinVersion + ')' : ''}`.trim(),
          ipAddress: systemInfo.ipAddress || '192.168.1.1',
          uptime: parseInt(systemInfo.uptime) || 0,
          cpuUsage: parseFloat(systemInfo.cpuUsage) || 0,
          memoryUsage: memoryUsed,
          memoryTotal: memoryTotal,
          temperature: parseFloat(systemInfo.temperature) || null,
          storageUsage: storageUsed,
          storageTotal: storageTotal,
          loadAverage: systemInfo.loadAverage || null,
          cpuCores: parseInt(systemInfo.cpuCores) || null,
          cpuModel: systemInfo.cpuModel || null,
        });
      }

      // Sync connected devices to database
      for (const device of devices) {
        try {
          await storage.createConnectedDevice({
            name: device.name,
            macAddress: device.macAddress,
            ipAddress: device.ipAddress,
            deviceType: device.deviceType,
            isOnline: device.isOnline,
            downloadSpeed: device.downloadSpeed || 0,
            uploadSpeed: device.uploadSpeed || 0,
          });
        } catch (error) {
          // Device might already exist, update instead
          const existingDevices = await storage.getConnectedDevices();
          const existing = existingDevices.find(d => d.macAddress === device.macAddress);
          if (existing) {
            await storage.updateConnectedDevice(existing.id, {
              name: device.name,
              ipAddress: device.ipAddress,
              isOnline: device.isOnline,
              downloadSpeed: device.downloadSpeed || 0,
              uploadSpeed: device.uploadSpeed || 0,
            });
          }
        }
      }

      res.json({ 
        success: true, 
        message: "Successfully synchronized data from ASUS Merlin router",
        data: {
          systemInfo,
          deviceCount: devices.length,
          wifiNetworks: wifiNetworks.length,
          merlinFeatures,
          bandwidth
        }
      });
    } catch (error: any) {
      res.status(500).json({ 
        success: false, 
        message: `Failed to sync data: ${error?.message || 'Unknown error'}` 
      });
    }
  });

  app.get("/api/ssh/merlin-features", async (req, res) => {
    try {
      if (!sshClient.isConnectionActive()) {
        return res.status(400).json({ message: "SSH connection not active. Please connect first." });
      }

      const merlinFeatures = await sshClient.getMerlinFeatures();
      res.json(merlinFeatures);
    } catch (error) {
      res.status(500).json({ 
        success: false, 
        message: `Failed to get Merlin features: ${error.message}` 
      });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
