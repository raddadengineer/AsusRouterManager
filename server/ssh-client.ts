import { Client } from 'ssh2';
import type { SSHConfig } from '@shared/schema';

export class SSHClient {
  private client: Client;
  private isConnected: boolean = false;

  constructor() {
    this.client = new Client();
  }

  async connect(config: SSHConfig): Promise<boolean> {
    return new Promise((resolve, reject) => {
      this.client.on('ready', () => {
        this.isConnected = true;
        resolve(true);
      });

      this.client.on('error', (err) => {
        this.isConnected = false;
        reject(err);
      });

      this.client.connect({
        host: config.host,
        port: config.port,
        username: config.username,
        password: config.password,
        readyTimeout: 10000,
      });
    });
  }

  async executeCommand(command: string): Promise<string> {
    if (!this.isConnected) {
      throw new Error('SSH client not connected');
    }

    return new Promise((resolve, reject) => {
      this.client.exec(command, (err, stream) => {
        if (err) {
          reject(err);
          return;
        }

        let output = '';
        let errorOutput = '';

        stream.on('close', (code: number) => {
          if (code !== 0) {
            reject(new Error(`Command failed with code ${code}: ${errorOutput}`));
          } else {
            resolve(output);
          }
        });

        stream.on('data', (data: Buffer) => {
          output += data.toString();
        });

        stream.stderr.on('data', (data: Buffer) => {
          errorOutput += data.toString();
        });
      });
    });
  }

  async getSystemInfo(): Promise<any> {
    const commands = {
      model: "nvram get productid",
      firmware: "nvram get buildno",
      uptime: "cat /proc/uptime | awk '{print int($1)}'",
      cpuUsage: "top -bn1 | grep 'CPU:' | awk '{print $2}' | sed 's/%us,//'",
      memoryInfo: "free -m | awk '/^Mem:/ {printf \"%.1f %.1f\", $3/1024, $2/1024}'",
      temperature: "cat /sys/class/thermal/thermal_zone0/temp 2>/dev/null | awk '{print $1/1000}' || echo '0'",
      ipAddress: "nvram get lan_ipaddr",
    };

    const results: any = {};
    
    for (const [key, command] of Object.entries(commands)) {
      try {
        const output = await this.executeCommand(command);
        results[key] = output.trim();
      } catch (error) {
        console.error(`Failed to execute command for ${key}:`, error);
        results[key] = null;
      }
    }

    // Parse memory info
    if (results.memoryInfo) {
      const [used, total] = results.memoryInfo.split(' ').map(parseFloat);
      results.memoryUsage = used;
      results.memoryTotal = total;
    }

    return results;
  }

  async getConnectedDevices(): Promise<any[]> {
    try {
      const command = "wl -i eth1 assoclist | awk '{print $2}' && wl -i eth2 assoclist | awk '{print $2}'";
      const macAddresses = await this.executeCommand(command);
      
      const devices: any[] = [];
      const macs = macAddresses.split('\n').filter(mac => mac.trim());

      for (const mac of macs) {
        try {
          const deviceInfo = await this.executeCommand(`grep -i "${mac.trim()}" /tmp/syslog.log | tail -1 || echo "Unknown Device"`);
          devices.push({
            macAddress: mac.trim(),
            name: deviceInfo.includes('Unknown') ? `Device-${mac.slice(-5)}` : deviceInfo.split(' ')[0],
            isOnline: true,
            deviceType: 'unknown',
            ipAddress: '192.168.1.100', // Would need additional parsing
          });
        } catch (error) {
          console.error(`Failed to get device info for ${mac}:`, error);
        }
      }

      return devices;
    } catch (error) {
      console.error('Failed to get connected devices:', error);
      return [];
    }
  }

  async getWiFiNetworks(): Promise<any[]> {
    try {
      const networks: any[] = [];
      
      // Get 2.4GHz network info
      const ssid24 = await this.executeCommand("nvram get wl0_ssid");
      const channel24 = await this.executeCommand("nvram get wl0_channel");
      const enabled24 = await this.executeCommand("nvram get wl0_radio");
      
      networks.push({
        ssid: ssid24.trim(),
        band: "2.4GHz",
        channel: parseInt(channel24.trim()) || 6,
        isEnabled: enabled24.trim() === "1",
        securityMode: "WPA2",
      });

      // Get 5GHz network info
      const ssid5 = await this.executeCommand("nvram get wl1_ssid");
      const channel5 = await this.executeCommand("nvram get wl1_channel");
      const enabled5 = await this.executeCommand("nvram get wl1_radio");
      
      networks.push({
        ssid: ssid5.trim(),
        band: "5GHz",
        channel: parseInt(channel5.trim()) || 36,
        isEnabled: enabled5.trim() === "1",
        securityMode: "WPA2",
      });

      return networks;
    } catch (error) {
      console.error('Failed to get WiFi networks:', error);
      return [];
    }
  }

  async getBandwidthData(): Promise<any> {
    try {
      const rxBytes = await this.executeCommand("cat /sys/class/net/eth0/statistics/rx_bytes");
      const txBytes = await this.executeCommand("cat /sys/class/net/eth0/statistics/tx_bytes");
      
      return {
        downloadSpeed: Math.random() * 50 + 10, // Would need proper calculation
        uploadSpeed: Math.random() * 20 + 5,
        totalDownload: parseInt(rxBytes.trim()) / (1024 * 1024 * 1024),
        totalUpload: parseInt(txBytes.trim()) / (1024 * 1024 * 1024),
      };
    } catch (error) {
      console.error('Failed to get bandwidth data:', error);
      return null;
    }
  }

  disconnect(): void {
    if (this.isConnected) {
      this.client.end();
      this.isConnected = false;
    }
  }

  isConnectionActive(): boolean {
    return this.isConnected;
  }
}

export const sshClient = new SSHClient();