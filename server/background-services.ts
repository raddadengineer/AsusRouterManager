import { CronJob } from 'cron';
import { sshClient } from './ssh-client';
import { storage } from './storage';
import type { InsertConnectedDevice, InsertBandwidthData, InsertRouterStatus } from '@shared/schema';

interface BackgroundJob {
  id: string;
  name: string;
  description: string;
  cronExpression: string;
  isEnabled: boolean;
  lastRun?: Date;
  nextRun?: Date;
  status: 'running' | 'stopped' | 'error';
  errorMessage?: string;
}

class BackgroundServiceManager {
  private jobs: Map<string, { job: CronJob; config: BackgroundJob }> = new Map();
  private isInitialized = false;

  constructor() {
    this.initializeDefaultJobs();
  }

  private initializeDefaultJobs() {
    const defaultJobs: BackgroundJob[] = [
      {
        id: 'device-discovery',
        name: 'Device Discovery',
        description: 'Scans for new devices and updates device information',
        cronExpression: '*/2 * * * *', // Every 2 minutes
        isEnabled: true,
        status: 'stopped'
      },
      {
        id: 'device-detail-sync',
        name: 'Device Detail Sync',
        description: 'Updates detailed device information (connection type, signal strength)',
        cronExpression: '*/5 * * * *', // Every 5 minutes
        isEnabled: true,
        status: 'stopped'
      },
      {
        id: 'bandwidth-monitoring',
        name: 'Bandwidth Monitoring',
        description: 'Collects bandwidth usage data for connected devices',
        cronExpression: '*/10 * * * * *', // Every 10 seconds for real-time monitoring
        isEnabled: true,
        status: 'stopped'
      },
      {
        id: 'router-health-check',
        name: 'Router Health Check',
        description: 'Monitors router status and system resources',
        cronExpression: '*/3 * * * *', // Every 3 minutes
        isEnabled: true,
        status: 'stopped'
      },
      {
        id: 'wifi-network-scan',
        name: 'WiFi Network Scan',
        description: 'Updates WiFi network information and client associations',
        cronExpression: '*/10 * * * *', // Every 10 minutes
        isEnabled: false,
        status: 'stopped'
      }
    ];

    defaultJobs.forEach(jobConfig => {
      this.createJob(jobConfig);
    });
  }

  private createJob(config: BackgroundJob) {
    try {
      const cronJob = new CronJob(
        config.cronExpression,
        async () => {
          await this.executeJob(config.id);
        },
        null,
        false, // Don't start automatically
        'America/New_York'
      );

      this.jobs.set(config.id, { job: cronJob, config });
      
      if (config.isEnabled) {
        this.startJob(config.id);
      }
    } catch (error) {
      console.error(`Failed to create job ${config.id}:`, error);
    }
  }

  private async executeJob(jobId: string) {
    const jobData = this.jobs.get(jobId);
    if (!jobData) return;

    const { config } = jobData;
    
    try {
      console.log(`Executing background job: ${config.name}`);
      config.status = 'running';
      config.lastRun = new Date();
      config.errorMessage = undefined;

      switch (jobId) {
        case 'device-discovery':
          await this.executeDeviceDiscovery();
          break;
        case 'device-detail-sync':
          await this.executeDeviceDetailSync();
          break;
        case 'bandwidth-monitoring':
          await this.executeBandwidthMonitoring();
          break;
        case 'router-health-check':
          await this.executeRouterHealthCheck();
          break;
        case 'wifi-network-scan':
          await this.executeWifiNetworkScan();
          break;
        default:
          throw new Error(`Unknown job: ${jobId}`);
      }

      config.status = 'stopped';
      console.log(`Completed background job: ${config.name}`);
    } catch (error) {
      config.status = 'error';
      config.errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`Error in background job ${config.name}:`, error);
    }
  }

  private async executeDeviceDiscovery() {
    if (!sshClient.isConnectionActive()) return;

    const devices = await sshClient.getConnectedDevices();
    
    // Update existing devices and add new ones
    for (const deviceData of devices) {
      try {
        const existingDevices = await storage.getConnectedDevices();
        const existingDevice = existingDevices.find(d => d.macAddress === deviceData.macAddress);

        if (existingDevice) {
          // Update existing device
          await storage.updateConnectedDevice(existingDevice.id, {
            name: deviceData.name,
            ipAddress: deviceData.ipAddress,
            isOnline: deviceData.isOnline,
            connectionType: deviceData.connectionType,
            hostname: deviceData.hostname
          });
        } else {
          // Add new device (MAC address already normalized in SSH client)
          const newDevice: InsertConnectedDevice = {
            name: deviceData.name,
            macAddress: deviceData.macAddress,
            ipAddress: deviceData.ipAddress,
            deviceType: deviceData.deviceType,
            isOnline: deviceData.isOnline,
            connectionType: deviceData.connectionType,
            hostname: deviceData.hostname,
            downloadSpeed: deviceData.downloadSpeed,
            uploadSpeed: deviceData.uploadSpeed,
            wirelessBand: deviceData.wirelessBand || null,
            signalStrength: deviceData.signalStrength || null,
            wirelessInterface: deviceData.wirelessInterface || null,
            aimeshNode: deviceData.aimeshNode || null,
            aimeshNodeMac: deviceData.aimeshNodeMac || null
          };
          await storage.createConnectedDevice(newDevice);
        }
      } catch (error) {
        console.error(`Error updating device ${deviceData.macAddress}:`, error);
      }
    }
  }

  private async executeDeviceDetailSync() {
    if (!sshClient.isConnectionActive()) return;

    const devices = await storage.getConnectedDevices();
    
    // Update detailed information for each device with enhanced detection
    for (const device of devices.slice(0, 5)) { // Process 5 devices at a time
      try {
        const detailedInfo = await sshClient.getEnhancedDeviceInfo(device.macAddress);
        
        await storage.updateConnectedDevice(device.id, {
          connectionType: detailedInfo.connectionType,
          isOnline: detailedInfo.isOnline,
          signalStrength: detailedInfo.signalStrength,
          wirelessInterface: detailedInfo.wirelessInterface,
          wirelessBand: detailedInfo.wirelessBand,
          aimeshNode: detailedInfo.aimeshNode
        });
      } catch (error) {
        console.error(`Error updating device details for ${device.macAddress}:`, error);
      }
    }
    
    console.log(`Updated enhanced device details for ${Math.min(5, devices.length)} devices`);
  }

  private async executeBandwidthMonitoring() {
    if (!sshClient.isConnectionActive()) return;

    try {
      // Use your efficient one-liner for network interface statistics
      const bandwidthCommand = `cat /proc/net/dev | grep -E "(eth|wl)" | awk '{rx=$2/1024/1024; tx=$10/1024/1024; gsub(":", "", $1); printf "%-8s RX: %.2f MB  TX: %.2f MB\\n", $1, rx, tx}'`;
      const bandwidthResult = await sshClient.executeCommand(bandwidthCommand);
      
      if (bandwidthResult) {
        const lines = bandwidthResult.split('\n').filter(line => line.trim());
        
        for (const line of lines) {
          // Parse: "eth0     RX: 1234.56 MB  TX: 789.01 MB"
          const match = line.match(/^(\w+)\s+RX:\s+([\d.]+)\s+MB\s+TX:\s+([\d.]+)\s+MB/);
          if (match) {
            const [, interfaceName, rxMB, txMB] = match;
            
            const newBandwidthData: InsertBandwidthData = {
              downloadSpeed: parseFloat(rxMB),
              uploadSpeed: parseFloat(txMB),
              totalDownload: parseFloat(rxMB),
              totalUpload: parseFloat(txMB)
            };
            
            await storage.addBandwidthData(newBandwidthData);
          }
        }
        
        console.log(`Bandwidth data collected for ${lines.length} interfaces`);
      }
    } catch (error) {
      console.error('Error collecting bandwidth data:', error);
    }
  }

  private async executeRouterHealthCheck() {
    if (!sshClient.isConnectionActive()) return;

    try {
      const systemInfo = await sshClient.getSystemInfo();
      
      const routerStatus: InsertRouterStatus = {
        model: systemInfo.model || 'Unknown',
        firmware: systemInfo.firmware || 'Unknown',
        ipAddress: systemInfo.ipAddress || '0.0.0.0',
        uptime: parseInt(systemInfo.uptime) || 0,
        cpuUsage: parseFloat(systemInfo.cpuUsage) || 0,
        memoryUsage: systemInfo.memoryUsage || 0,
        memoryTotal: systemInfo.memoryTotal || 0,
        temperature: parseFloat(systemInfo.temperature) || null,
        storageUsage: systemInfo.storageUsage || null,
        storageTotal: systemInfo.storageTotal || null,
        loadAverage: systemInfo.loadAverage || null,
        cpuCores: systemInfo.cpuCores || null,
        cpuModel: systemInfo.cpuModel || null
      };

      await storage.updateRouterStatus(routerStatus);
    } catch (error) {
      console.error('Error updating router status:', error);
    }
  }

  private async executeWifiNetworkScan() {
    if (!sshClient.isConnectionActive()) return;

    try {
      const wifiNetworks = await sshClient.getWiFiNetworks();
      
      // Update WiFi network information
      for (const network of wifiNetworks) {
        // This would need to be implemented based on your WiFi network storage structure
        console.log('WiFi network scan:', network);
      }
    } catch (error) {
      console.error('Error scanning WiFi networks:', error);
    }
  }

  public startJob(jobId: string): boolean {
    const jobData = this.jobs.get(jobId);
    if (!jobData) return false;

    try {
      jobData.job.start();
      jobData.config.isEnabled = true;
      jobData.config.status = 'stopped';
      jobData.config.nextRun = jobData.job.nextDate()?.toJSDate();
      return true;
    } catch (error) {
      console.error(`Failed to start job ${jobId}:`, error);
      return false;
    }
  }

  public stopJob(jobId: string): boolean {
    const jobData = this.jobs.get(jobId);
    if (!jobData) return false;

    try {
      jobData.job.stop();
      jobData.config.isEnabled = false;
      jobData.config.status = 'stopped';
      jobData.config.nextRun = undefined;
      return true;
    } catch (error) {
      console.error(`Failed to stop job ${jobId}:`, error);
      return false;
    }
  }

  public updateJobSchedule(jobId: string, cronExpression: string): boolean {
    const jobData = this.jobs.get(jobId);
    if (!jobData) return false;

    try {
      const wasRunning = jobData.config.isEnabled;
      
      // Stop the old job
      this.stopJob(jobId);
      
      // Update the cron expression
      jobData.config.cronExpression = cronExpression;
      
      // Create new job with updated schedule
      const newJob = new CronJob(
        cronExpression,
        async () => {
          await this.executeJob(jobId);
        },
        null,
        false,
        'America/New_York'
      );

      jobData.job = newJob;
      
      // Restart if it was running
      if (wasRunning) {
        this.startJob(jobId);
      }
      
      return true;
    } catch (error) {
      console.error(`Failed to update job schedule for ${jobId}:`, error);
      return false;
    }
  }

  public getJobs(): BackgroundJob[] {
    return Array.from(this.jobs.values()).map(({ config }) => ({
      ...config,
      nextRun: config.isEnabled ? this.jobs.get(config.id)?.job.nextDate()?.toJSDate() : undefined
    }));
  }

  public getJob(jobId: string): BackgroundJob | undefined {
    const jobData = this.jobs.get(jobId);
    if (!jobData) return undefined;

    return {
      ...jobData.config,
      nextRun: jobData.config.isEnabled ? jobData.job.nextDate()?.toJSDate() : undefined
    };
  }

  public startAllJobs() {
    this.jobs.forEach((_, jobId) => {
      const job = this.jobs.get(jobId);
      if (job?.config.isEnabled) {
        this.startJob(jobId);
      }
    });
    this.isInitialized = true;
    console.log('Background service manager initialized');
  }

  public stopAllJobs() {
    this.jobs.forEach((_, jobId) => {
      this.stopJob(jobId);
    });
    console.log('All background jobs stopped');
  }

  public runJobNow(jobId: string): boolean {
    const jobData = this.jobs.get(jobId);
    if (!jobData) {
      console.log(`Job ${jobId} not found`);
      return false;
    }

    console.log(`Manually executing job: ${jobId}`);
    this.executeJob(jobId).catch(error => {
      console.error(`Error in manual job execution ${jobId}:`, error);
    });
    
    return true;
  }
}

export const backgroundServiceManager = new BackgroundServiceManager();