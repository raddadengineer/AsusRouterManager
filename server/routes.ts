import { Express, Request, Response, NextFunction } from 'express';
import { Server } from 'http';
import { storage } from './storage';
import { sshClient } from './ssh-client';
import { routerSync } from './router-sync';
import { backgroundServiceManager } from './background-services';
import { insertSSHConfigSchema, insertConnectedDeviceSchema, insertSystemInfoSchema, insertRouterFeaturesSchema } from '@shared/schema';
import { ZodError } from 'zod';

export async function registerRoutes(app: Express): Promise<Server> {
  
  // SSH Configuration endpoints
  app.get("/api/ssh/config", async (req: Request, res: Response) => {
    try {
      const config = await storage.getSSHConfig();
      res.json(config);
    } catch (error: any) {
      res.status(500).json({ message: "Failed to retrieve SSH configuration" });
    }
  });

  app.post("/api/ssh/config", async (req: Request, res: Response) => {
    try {
      const validatedData = insertSSHConfigSchema.parse(req.body);
      const config = await storage.saveSSHConfig(validatedData);
      
      if (config.enabled) {
        await routerSync.startSync(config.syncInterval);
        backgroundServiceManager.startAllJobs();
      }
      
      res.json({ success: true, config });
    } catch (error: any) {
      if (error instanceof ZodError) {
        res.status(400).json({ message: "Invalid SSH configuration", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to save SSH configuration" });
      }
    }
  });

  app.post("/api/ssh/test", async (req: Request, res: Response) => {
    try {
      const validatedData = insertSSHConfigSchema.parse(req.body);
      
      const testConfig = {
        host: validatedData.host,
        port: validatedData.port || 22,
        username: validatedData.username,
        password: validatedData.password
      };

      await sshClient.connect(testConfig);
      res.json({ 
        success: true, 
        message: "Successfully connected to ASUS router via SSH" 
      });
    } catch (error: any) {
      res.status(500).json({ 
        success: false, 
        message: error?.message || "Failed to connect to router",
        details: "Please check your connection settings"
      });
    }
  });

  // System Info endpoints
  app.get("/api/system", async (req: Request, res: Response) => {
    try {
      const systemInfo = await storage.getSystemInfo();
      res.json(systemInfo);
    } catch (error: any) {
      res.status(500).json({ message: "Failed to retrieve system information" });
    }
  });

  app.post("/api/system/sync", async (req: Request, res: Response) => {
    try {
      await routerSync.syncRouterData();
      res.json({ success: true, message: "System data synchronized successfully" });
    } catch (error: any) {
      res.status(500).json({ message: "Failed to sync system data" });
    }
  });

  // Connected Devices endpoints
  app.get("/api/devices", async (req: Request, res: Response) => {
    try {
      const devices = await storage.getConnectedDevices();
      res.json(devices);
    } catch (error: any) {
      res.status(500).json({ message: "Failed to retrieve connected devices" });
    }
  });

  app.get("/api/devices/:id", async (req: Request, res: Response) => {
    try {
      const deviceId = parseInt(req.params.id);
      const device = await storage.getConnectedDevice(deviceId);
      if (!device) {
        res.status(404).json({ message: "Device not found" });
        return;
      }
      res.json(device);
    } catch (error: any) {
      res.status(500).json({ message: "Failed to retrieve device" });
    }
  });

  // Wi-Fi Networks endpoints
  app.get("/api/wifi", async (req: Request, res: Response) => {
    try {
      const networks = await storage.getWiFiNetworks();
      res.json(networks);
    } catch (error: any) {
      res.status(500).json({ message: "Failed to retrieve Wi-Fi networks" });
    }
  });

  // Bandwidth Data endpoints
  app.get("/api/bandwidth", async (req: Request, res: Response) => {
    try {
      const bandwidthData = await storage.getBandwidthData();
      res.json(bandwidthData);
    } catch (error: any) {
      res.status(500).json({ message: "Failed to retrieve bandwidth data" });
    }
  });

  // Router Features endpoints
  app.get("/api/router/features", async (req: Request, res: Response) => {
    try {
      const features = await storage.getRouterFeatures();
      res.json(features);
    } catch (error: any) {
      res.status(500).json({ message: "Failed to retrieve router features" });
    }
  });

  // Background Services endpoints
  app.get("/api/background/jobs", async (req: Request, res: Response) => {
    try {
      const jobs = backgroundServiceManager.getJobs();
      res.json(jobs);
    } catch (error: any) {
      res.status(500).json({ message: "Failed to retrieve background jobs" });
    }
  });

  app.post("/api/background/jobs/:id/start", async (req: Request, res: Response) => {
    try {
      const jobId = req.params.id;
      const success = backgroundServiceManager.startJob(jobId);
      if (success) {
        res.json({ success: true, message: `Job ${jobId} started successfully` });
      } else {
        res.status(400).json({ success: false, message: `Failed to start job ${jobId}` });
      }
    } catch (error: any) {
      res.status(500).json({ message: "Failed to start background job" });
    }
  });

  app.post("/api/background/jobs/:id/stop", async (req: Request, res: Response) => {
    try {
      const jobId = req.params.id;
      const success = backgroundServiceManager.stopJob(jobId);
      if (success) {
        res.json({ success: true, message: `Job ${jobId} stopped successfully` });
      } else {
        res.status(400).json({ success: false, message: `Failed to stop job ${jobId}` });
      }
    } catch (error: any) {
      res.status(500).json({ message: "Failed to stop background job" });
    }
  });

  app.post("/api/background/jobs/:id/run", async (req: Request, res: Response) => {
    try {
      const jobId = req.params.id;
      const success = backgroundServiceManager.runJobNow(jobId);
      if (success) {
        res.json({ success: true, message: `Job ${jobId} executed successfully` });
      } else {
        res.status(400).json({ success: false, message: `Failed to execute job ${jobId}` });
      }
    } catch (error: any) {
      res.status(500).json({ message: "Failed to execute background job" });
    }
  });

  // AiMesh endpoints
  app.get("/api/aimesh/nodes", async (req: Request, res: Response) => {
    try {
      const nodes = await storage.getAiMeshNodes();
      res.json(nodes);
    } catch (error: any) {
      res.status(500).json({ message: "Failed to retrieve AiMesh nodes" });
    }
  });

  // Network Topology endpoint
  app.get("/api/topology", async (req: Request, res: Response) => {
    try {
      const devices = await storage.getConnectedDevices();
      const nodes = await storage.getAiMeshNodes();
      const systemInfo = await storage.getSystemInfo();
      
      res.json({
        devices,
        nodes,
        router: systemInfo
      });
    } catch (error: any) {
      res.status(500).json({ message: "Failed to retrieve network topology" });
    }
  });

  // Router Status endpoint
  app.get("/api/router/status", async (req: Request, res: Response) => {
    try {
      const status = await storage.getRouterStatus();
      res.json(status);
    } catch (error: any) {
      res.status(500).json({ message: "Failed to retrieve router status" });
    }
  });

  // Device Groups endpoints
  app.get("/api/device-groups", async (req: Request, res: Response) => {
    try {
      const groups = await storage.getDeviceGroups();
      res.json(groups);
    } catch (error: any) {
      res.status(500).json({ message: "Failed to retrieve device groups" });
    }
  });

  app.post("/api/device-groups", async (req: Request, res: Response) => {
    try {
      const { name, description, color, icon } = req.body;
      const group = await storage.createDeviceGroup({ name, description, color, icon });
      res.json(group);
    } catch (error: any) {
      res.status(500).json({ message: "Failed to create device group" });
    }
  });

  // Device Group Assignments endpoints
  app.get("/api/device-group-assignments", async (req: Request, res: Response) => {
    try {
      const assignments = await storage.getDeviceGroupAssignments();
      res.json(assignments);
    } catch (error: any) {
      res.status(500).json({ message: "Failed to retrieve device group assignments" });
    }
  });

  app.post("/api/device-group-assignments", async (req: Request, res: Response) => {
    try {
      const { deviceId, groupId } = req.body;
      const assignment = await storage.createDeviceGroupAssignment({ deviceId, groupId });
      res.json(assignment);
    } catch (error: any) {
      res.status(500).json({ message: "Failed to create device group assignment" });
    }
  });

  // Client Associations endpoints
  app.get("/api/client-associations", async (req: Request, res: Response) => {
    try {
      const associations = await storage.getClientAssociations();
      res.json(associations);
    } catch (error: any) {
      res.status(500).json({ message: "Failed to retrieve client associations" });
    }
  });

  // Port Forwarding endpoints
  app.get("/api/port-forwarding", async (req: Request, res: Response) => {
    try {
      const rules = await storage.getPortForwardingRules();
      res.json(rules);
    } catch (error: any) {
      res.status(500).json({ message: "Failed to retrieve port forwarding rules" });
    }
  });

  app.post("/api/port-forwarding", async (req: Request, res: Response) => {
    try {
      const rule = await storage.createPortForwardingRule(req.body);
      res.json(rule);
    } catch (error: any) {
      res.status(500).json({ message: "Failed to create port forwarding rule" });
    }
  });

  // Sync control endpoints
  app.post("/api/sync/start", async (req: Request, res: Response) => {
    try {
      const { interval } = req.body;
      await routerSync.startSync(interval || 5);
      backgroundServiceManager.startAllJobs();
      res.json({ success: true, message: "Router sync started successfully" });
    } catch (error: any) {
      res.status(500).json({ message: "Failed to start router sync" });
    }
  });

  app.post("/api/sync/stop", async (req: Request, res: Response) => {
    try {
      routerSync.stopSync();
      backgroundServiceManager.stopAllJobs();
      res.json({ success: true, message: "Router sync stopped successfully" });
    } catch (error: any) {
      res.status(500).json({ message: "Failed to stop router sync" });
    }
  });

  // Error handling middleware
  app.use((err: any, req: Request, res: Response, next: NextFunction) => {
    console.error('Server error:', err);
    res.status(500).json({ 
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  });

  // Return the app (server will be created in index.ts)
  return app as any;
}