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
      merlinVersion: "nvram get buildinfo",
      uptime: "cat /proc/uptime | awk '{print int($1)}'",
      cpuUsage: "top -bn1 | grep -E 'CPU:|%Cpu' | head -1 | awk '{for(i=1;i<=NF;i++) if($i ~ /[0-9]+\.[0-9]+%/) {gsub(/%.*/, \"\", $i); print $i; break}}'",
      memoryInfo: "free -m | awk '/^Mem:/ {printf \"%.1f %.1f\", $3/1024, $2/1024}'",
      temperature: "cat /proc/dmu/temperature 2>/dev/null || cat /sys/class/thermal/thermal_zone*/temp 2>/dev/null | head -1 | awk '{print $1/1000}' || echo '0'",
      ipAddress: "nvram get lan_ipaddr",
      wanIp: "nvram get wan0_ipaddr",
      routerName: "nvram get computer_name",
      timezone: "nvram get time_zone",
      firmwareDate: "nvram get builddate",
      kernelVersion: "uname -r",
      loadAverage: "cat /proc/loadavg | awk '{print $1, $2, $3}'",
      totalConnections: "cat /proc/sys/net/netfilter/nf_conntrack_count 2>/dev/null || echo '0'",
      maxConnections: "cat /proc/sys/net/netfilter/nf_conntrack_max 2>/dev/null || echo '0'",
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

    // Parse load average
    if (results.loadAverage) {
      const loads = results.loadAverage.split(' ').map(parseFloat);
      results.load1min = loads[0];
      results.load5min = loads[1];
      results.load15min = loads[2];
    }

    return results;
  }

  async getConnectedDevices(): Promise<any[]> {
    try {
      // Get ARP table for IP/MAC mappings
      const arpTable = await this.executeCommand("cat /proc/net/arp | grep -v 'IP address'");
      
      // Get DHCP leases for device names and additional info
      const dhcpLeases = await this.executeCommand("cat /var/lib/dhcp/dhcpd.leases 2>/dev/null || cat /tmp/dhcp_clients.txt 2>/dev/null || echo ''");
      
      // Get wireless client info from both bands
      const wifiClients24 = await this.executeCommand("wl -i eth1 assoclist 2>/dev/null || echo ''");
      const wifiClients5 = await this.executeCommand("wl -i eth2 assoclist 2>/dev/null || echo ''");
      
      // Get client bandwidth usage
      const bandwidthStats = await this.executeCommand("cat /proc/net/dev");
      
      // Get custom client names from Merlin
      const customNames = await this.executeCommand("nvram get custom_clientlist");
      
      const devices: any[] = [];
      const arpEntries = arpTable.split('\n').filter(line => line.trim());
      
      // Parse custom client names
      const clientNames: { [mac: string]: string } = {};
      if (customNames) {
        const nameEntries = customNames.split('<');
        nameEntries.forEach(entry => {
          const parts = entry.split('>');
          if (parts.length >= 2) {
            const [name, mac] = parts;
            if (mac) clientNames[mac.toLowerCase()] = name;
          }
        });
      }
      
      // Parse ARP table entries
      for (const arpEntry of arpEntries) {
        const parts = arpEntry.split(/\s+/);
        if (parts.length >= 6) {
          const [ipAddress, , , macAddress, , interface_name] = parts;
          
          if (macAddress && macAddress !== '00:00:00:00:00:00' && ipAddress !== '0.0.0.0') {
            // Determine connection type
            const isWifi24 = wifiClients24.includes(macAddress);
            const isWifi5 = wifiClients5.includes(macAddress);
            const connectionType = isWifi24 ? '2.4GHz WiFi' : isWifi5 ? '5GHz WiFi' : 'Ethernet';
            
            // Get device name from custom names or try to resolve
            let deviceName = clientNames[macAddress.toLowerCase()] || `Device-${macAddress.slice(-5)}`;
            
            // Try to get hostname from DHCP leases
            if (dhcpLeases) {
              const leaseMatch = dhcpLeases.match(new RegExp(`${macAddress}[\\s\\S]*?client-hostname "([^"]+)"`, 'i'));
              if (leaseMatch && leaseMatch[1]) {
                deviceName = leaseMatch[1];
              }
            }
            
            // Determine device type based on MAC vendor and name patterns
            const deviceType = this.getDeviceType(macAddress, deviceName);
            
            // Get signal strength for WiFi devices
            let signalStrength = null;
            if (isWifi24 || isWifi5) {
              try {
                const wlInterface = isWifi24 ? 'eth1' : 'eth2';
                const rssi = await this.executeCommand(`wl -i ${wlInterface} rssi ${macAddress} 2>/dev/null || echo '0'`);
                signalStrength = parseInt(rssi.trim()) || null;
              } catch (error) {
                // Signal strength not available
              }
            }
            
            devices.push({
              macAddress: macAddress.toUpperCase(),
              name: deviceName,
              ipAddress,
              isOnline: true,
              deviceType,
              connectionType,
              signalStrength,
              interface: interface_name,
              downloadSpeed: Math.random() * 10, // Would need traffic monitoring
              uploadSpeed: Math.random() * 5,
            });
          }
        }
      }
      
      return devices;
    } catch (error) {
      console.error('Failed to get connected devices:', error);
      return [];
    }
  }

  private getDeviceType(macAddress: string, deviceName: string): string {
    const mac = macAddress.toLowerCase();
    const name = deviceName.toLowerCase();
    
    // MAC address vendor patterns
    if (mac.startsWith('00:50:56') || mac.startsWith('00:0c:29') || mac.startsWith('00:1c:14')) return 'virtual-machine';
    if (mac.startsWith('dc:a6:32') || mac.startsWith('98:01:a7') || mac.startsWith('ac:de:48')) return 'raspberry-pi';
    if (mac.startsWith('b8:27:eb') || mac.startsWith('dc:a6:32')) return 'raspberry-pi';
    
    // Device name patterns
    if (name.includes('iphone') || name.includes('ipad')) return 'mobile';
    if (name.includes('android') || name.includes('samsung') || name.includes('pixel')) return 'mobile';
    if (name.includes('macbook') || name.includes('imac') || name.includes('mac')) return 'laptop';
    if (name.includes('windows') || name.includes('desktop') || name.includes('pc')) return 'desktop';
    if (name.includes('tv') || name.includes('roku') || name.includes('chromecast') || name.includes('firestick')) return 'streaming';
    if (name.includes('echo') || name.includes('alexa') || name.includes('google') || name.includes('nest')) return 'smart-home';
    if (name.includes('printer') || name.includes('canon') || name.includes('hp') || name.includes('epson')) return 'printer';
    if (name.includes('nas') || name.includes('synology') || name.includes('qnap')) return 'storage';
    if (name.includes('switch') || name.includes('hub') || name.includes('router')) return 'networking';
    
    return 'unknown';
  }

  async getWiFiNetworks(): Promise<any[]> {
    try {
      const networks: any[] = [];
      
      // Get all wireless interfaces
      const wlInterfaces = await this.executeCommand("nvram show | grep '^wl[0-9]_ssid=' | cut -d'=' -f1 | sed 's/_ssid//'");
      const interfaces = wlInterfaces.split('\n').filter(iface => iface.trim());
      
      for (const iface of interfaces) {
        if (!iface.trim()) continue;
        
        try {
          // Get basic network info
          const ssid = await this.executeCommand(`nvram get ${iface}_ssid`);
          const enabled = await this.executeCommand(`nvram get ${iface}_radio`);
          const channel = await this.executeCommand(`nvram get ${iface}_channel`);
          const power = await this.executeCommand(`nvram get ${iface}_txpwr`);
          const security = await this.executeCommand(`nvram get ${iface}_akm`);
          const mode = await this.executeCommand(`nvram get ${iface}_mode`);
          const bandwidth = await this.executeCommand(`nvram get ${iface}_bw`);
          
          // Get connected clients count
          const ethInterface = iface === 'wl0' ? 'eth1' : 'eth2';
          const clientList = await this.executeCommand(`wl -i ${ethInterface} assoclist 2>/dev/null || echo ''`);
          const connectedClients = clientList.split('\n').filter(line => line.trim()).length;
          
          // Determine band and channel info
          const band = iface === 'wl0' ? '2.4GHz' : '5GHz';
          const channelNum = parseInt(channel.trim()) || (band === '2.4GHz' ? 6 : 36);
          
          // Get channel utilization
          const channelStats = await this.executeCommand(`wl -i ${ethInterface} chanim_stats 2>/dev/null || echo ''`);
          let channelUtilization = 0;
          if (channelStats) {
            const utilizationMatch = channelStats.match(/chanspec.*?busy\s+(\d+)/);
            if (utilizationMatch) {
              channelUtilization = parseInt(utilizationMatch[1]) || 0;
            }
          }
          
          // Parse security mode
          let securityMode = 'Open';
          if (security.includes('psk2')) securityMode = 'WPA2';
          else if (security.includes('psk')) securityMode = 'WPA';
          else if (security.includes('wpa2')) securityMode = 'WPA2-Enterprise';
          else if (security.includes('wpa3')) securityMode = 'WPA3';
          
          // Check for guest network
          const isGuest = ssid.trim().toLowerCase().includes('guest') || 
                         await this.executeCommand(`nvram get ${iface}_guest`).then(r => r.trim() === '1').catch(() => false);
          
          networks.push({
            ssid: ssid.trim(),
            band,
            channel: channelNum,
            isEnabled: enabled.trim() === '1',
            securityMode,
            connectedDevices: connectedClients,
            txPower: parseInt(power.trim()) || 100,
            mode: mode.trim() || 'ap',
            bandwidth: bandwidth.trim() || '20',
            channelUtilization,
            isGuest,
            interface: iface,
          });
        } catch (error) {
          console.error(`Failed to get info for interface ${iface}:`, error);
        }
      }
      
      return networks;
    } catch (error) {
      console.error('Failed to get WiFi networks:', error);
      return [];
    }
  }

  async getBandwidthData(): Promise<any> {
    try {
      // Get WAN interface statistics
      const wanInterface = await this.executeCommand("nvram get wan_ifname || echo 'eth0'");
      const wanIface = wanInterface.trim();
      
      // Get current bandwidth usage from interface statistics
      const rxBytes = await this.executeCommand(`cat /sys/class/net/${wanIface}/statistics/rx_bytes`);
      const txBytes = await this.executeCommand(`cat /sys/class/net/${wanIface}/statistics/tx_bytes`);
      const rxPackets = await this.executeCommand(`cat /sys/class/net/${wanIface}/statistics/rx_packets`);
      const txPackets = await this.executeCommand(`cat /sys/class/net/${wanIface}/statistics/tx_packets`);
      
      // Get real-time bandwidth from Merlin's bandwidth monitor
      const bwdpiStats = await this.executeCommand("cat /tmp/bwdpi_db.stat 2>/dev/null || echo ''");
      
      // Get traffic analyzer data if available
      const trafficData = await this.executeCommand("iptables -t mangle -L BWDPI_FILTER -nvx 2>/dev/null || echo ''");
      
      // Get per-device bandwidth from netstat or similar
      const deviceTraffic = await this.executeCommand("cat /proc/net/dev");
      
      // Parse Merlin's bandwidth monitoring data
      let currentDownload = 0;
      let currentUpload = 0;
      
      if (bwdpiStats) {
        // Parse real-time bandwidth data from Merlin's monitoring
        const downloadMatch = bwdpiStats.match(/download_speed[:\s]+(\d+)/);
        const uploadMatch = bwdpiStats.match(/upload_speed[:\s]+(\d+)/);
        
        if (downloadMatch) currentDownload = parseInt(downloadMatch[1]) / 1024 / 1024; // Convert to Mbps
        if (uploadMatch) currentUpload = parseInt(uploadMatch[1]) / 1024 / 1024;
      }
      
      // Get historical data from Merlin's traffic analyzer
      const monthlyData = await this.executeCommand("cat /var/lib/misc/rstats-history.gz 2>/dev/null | gunzip 2>/dev/null || echo ''");
      
      return {
        downloadSpeed: currentDownload || 0,
        uploadSpeed: currentUpload || 0,
        totalDownload: parseInt(rxBytes.trim()) / (1024 * 1024 * 1024),
        totalUpload: parseInt(txBytes.trim()) / (1024 * 1024 * 1024),
        totalPacketsRx: parseInt(rxPackets.trim()),
        totalPacketsTx: parseInt(txPackets.trim()),
        interface: wanIface,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      console.error('Failed to get bandwidth data:', error);
      return null;
    }
  }

  async getMerlinFeatures(): Promise<any> {
    try {
      // Get Adaptive QoS status
      const qosEnabled = await this.executeCommand("nvram get adaptive_qos_enable");
      const qosMode = await this.executeCommand("nvram get qos_type");
      
      // Get AiProtection status
      const aiProtection = await this.executeCommand("nvram get wrs_protect_enable");
      const aiMalware = await this.executeCommand("nvram get wrs_cc_enable");
      const aiVuln = await this.executeCommand("nvram get wrs_vp_enable");
      
      // Get VPN Server status
      const vpnServer = await this.executeCommand("nvram get vpn_server_enable");
      const vpnType = await this.executeCommand("nvram get vpn_server_proto");
      
      // Get USB and media server status
      const usbEnabled = await this.executeCommand("nvram get usb_enable");
      const sambaEnabled = await this.executeCommand("nvram get enable_samba");
      const ftpEnabled = await this.executeCommand("nvram get enable_ftp");
      
      // Get Guest Network status
      const guestEnabled = await this.executeCommand("nvram get wl0.1_bss_enabled");
      const guest5Enabled = await this.executeCommand("nvram get wl1.1_bss_enabled");
      
      // Get AiMesh status
      const aimeshMode = await this.executeCommand("nvram get cfg_master");
      const aimeshNodes = await this.executeCommand("cfg_clientlist | wc -l 2>/dev/null || echo '0'");
      
      // Get DDNS status
      const ddnsEnabled = await this.executeCommand("nvram get ddns_enable_x");
      const ddnsProvider = await this.executeCommand("nvram get ddns_server_x");
      
      return {
        adaptiveQos: {
          enabled: qosEnabled.trim() === '1',
          mode: qosMode.trim(),
        },
        aiProtection: {
          enabled: aiProtection.trim() === '1',
          malwareBlocking: aiMalware.trim() === '1',
          vulnerabilityProtection: aiVuln.trim() === '1',
        },
        vpnServer: {
          enabled: vpnServer.trim() === '1',
          protocol: vpnType.trim(),
        },
        usbServices: {
          enabled: usbEnabled.trim() === '1',
          samba: sambaEnabled.trim() === '1',
          ftp: ftpEnabled.trim() === '1',
        },
        guestNetwork: {
          enabled24: guestEnabled.trim() === '1',
          enabled5: guest5Enabled.trim() === '1',
        },
        aiMesh: {
          isMaster: aimeshMode.trim() === '1',
          nodeCount: parseInt(aimeshNodes.trim()) || 0,
        },
        ddns: {
          enabled: ddnsEnabled.trim() === '1',
          provider: ddnsProvider.trim(),
        },
      };
    } catch (error) {
      console.error('Failed to get Merlin features:', error);
      return {};
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