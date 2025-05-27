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
      loadAverage: "cat /proc/loadavg | awk '{print $1\" \"$2\" \"$3}'",
      totalConnections: "cat /proc/sys/net/netfilter/nf_conntrack_count 2>/dev/null || echo '0'",
      maxConnections: "cat /proc/sys/net/netfilter/nf_conntrack_max 2>/dev/null || echo '0'",
      // Enhanced system resource commands
      cpuModel: "cat /proc/cpuinfo | grep 'model name' | head -1 | cut -d':' -f2 | sed 's/^ *//'",
      cpuCores: "cat /proc/cpuinfo | grep processor | wc -l",
      // Detailed memory breakdown
      memoryDetails: "cat /proc/meminfo | awk '/MemTotal:|MemFree:|MemAvailable:|Buffers:|Cached:|SwapTotal:|SwapFree:/ {gsub(/kB/, \"\", $2); if($1==\"MemTotal:\") total=$2/1024/1024; if($1==\"MemFree:\") free=$2/1024/1024; if($1==\"MemAvailable:\") avail=$2/1024/1024; if($1==\"Buffers:\") buffers=$2/1024/1024; if($1==\"Cached:\") cached=$2/1024/1024; if($1==\"SwapTotal:\") swapTotal=$2/1024/1024; if($1==\"SwapFree:\") swapFree=$2/1024/1024} END {used=total-free; swapUsed=swapTotal-swapFree; printf \"%.3f %.3f %.3f %.3f %.3f %.3f %.3f\", used, total, avail, free, buffers, cached, swapUsed}'",
      // Storage breakdown: NVRAM, JFFS, /tmp
      nvramUsage: "nvram show 2>/dev/null | wc -c | awk '{printf \"%.3f\", $1/1024/1024}' || echo '0'",
      nvramTotal: "cat /proc/mtd | grep nvram | awk '{gsub(/[^0-9a-f]/, \"\", $2); printf \"%.3f\", strtonum(\"0x\"$2)/1024/1024}' || echo '0.512'",
      jffsUsage: "df /jffs 2>/dev/null | awk 'NR==2 {gsub(/[KMG]/, \"\", $3); if($3 ~ /K/) $3=$3/1024/1024; if($3 ~ /M/) $3=$3/1024; if($3 ~ /G/) $3=$3; printf \"%.3f\", $3}' || echo '0'",
      jffsTotal: "df /jffs 2>/dev/null | awk 'NR==2 {gsub(/[KMG]/, \"\", $2); if($2 ~ /K/) $2=$2/1024/1024; if($2 ~ /M/) $2=$2/1024; if($2 ~ /G/) $2=$2; printf \"%.3f\", $2}' || echo '0'",
      tmpUsage: "df /tmp 2>/dev/null | awk 'NR==2 {gsub(/[KMG]/, \"\", $3); if($3 ~ /K/) $3=$3/1024/1024; if($3 ~ /M/) $3=$3/1024; if($3 ~ /G/) $3=$3; printf \"%.3f\", $3}' || echo '0'",
      tmpTotal: "df /tmp 2>/dev/null | awk 'NR==2 {gsub(/[KMG]/, \"\", $2); if($2 ~ /K/) $2=$2/1024/1024; if($2 ~ /M/) $2=$2/1024; if($2 ~ /G/) $2=$2; printf \"%.3f\", $2}' || echo '0'",
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

    // Parse detailed memory breakdown
    if (results.memoryDetails) {
      const memParts = results.memoryDetails.split(' ').map(parseFloat);
      if (memParts.length >= 7) {
        results.memoryUsed = memParts[0];
        results.memoryTotalDetailed = memParts[1];
        results.memoryAvailable = memParts[2];
        results.memoryFree = memParts[3];
        results.memoryBuffers = memParts[4];
        results.memoryCached = memParts[5];
        results.swapUsed = memParts[6];
      }
    }

    // Parse storage information
    results.nvramUsage = parseFloat(results.nvramUsage) || 0;
    results.nvramTotal = parseFloat(results.nvramTotal) || 0.512;
    results.jffsUsage = parseFloat(results.jffsUsage) || 0;
    results.jffsTotal = parseFloat(results.jffsTotal) || 0;
    results.tmpUsage = parseFloat(results.tmpUsage) || 0;
    results.tmpTotal = parseFloat(results.tmpTotal) || 0;

    // Calculate total storage
    const totalStorageUsed = results.nvramUsage + results.jffsUsage + results.tmpUsage;
    const totalStorageTotal = results.nvramTotal + results.jffsTotal + results.tmpTotal;
    results.storageUsage = totalStorageUsed;
    results.storageTotal = totalStorageTotal;

    // Parse load average
    if (results.loadAverage) {
      const loads = results.loadAverage.split(' ').map(parseFloat);
      results.load1min = loads[0];
      results.load5min = loads[1];
      results.load15min = loads[2];
    }

    // Parse CPU info
    results.cpuCores = parseInt(results.cpuCores) || 2;
    results.cpuModel = results.cpuModel || 'ARMv7 Processor';

    return results;
  }

  async getNetworkTopologyReport(): Promise<any> {
    if (!this.isConnected) return null;

    try {
      console.log('Generating comprehensive network topology report...');
      
      // Use your exact script methodology for complete topology detection
      const command = `
        echo "=== ASUS Network Topology Report ==="
        echo "Date: $(date)"
        echo

        echo "NODE NAME: $(nvram get productid)"
        echo "ROUTER IP: $(nvram get lan_ipaddr)"
        echo

        echo "------ DHCP Clients (All Devices) ------"
        echo "IP, MAC, Hostname"
        cat /var/lib/misc/dnsmasq.leases | awk '{print $3", "$2", "$4}'
        echo

        echo "------ Connected Wireless Clients ------"
        for iface in wl0 wl1 wl2; do
          echo
          echo "Interface: $iface"
          wl -i $iface assoclist 2>/dev/null | while read mac; do
            if [ -n "$mac" ]; then
              rssi=$(wl -i $iface rssi "$mac" 2>/dev/null || echo "N/A")
              hostname=$(grep -i "$mac" /var/lib/misc/dnsmasq.leases | awk '{print $4}' | head -1)
              ip=$(grep -i "$mac" /var/lib/misc/dnsmasq.leases | awk '{print $3}' | head -1)
              band="Unknown"
              if [ "$iface" = "wl0" ]; then band="2.4GHz"; fi
              if [ "$iface" = "wl1" ]; then band="5GHz"; fi
              if [ "$iface" = "wl2" ]; then band="6GHz"; fi
              echo "MAC: $mac | IP: $ip | Hostname: $hostname | RSSI: $rssi dBm | Band: $band"
            fi
          done
        done

        echo
        echo "------ Wired Clients (via ARP Table) ------"
        echo "IP, MAC, Interface"
        ip neigh | grep -i "lladdr" | awk '{print $1", "$5", "$3}'

        echo
        echo "------ AiMesh Topology ------"
        if [ -f /tmp/sysinfo/mesh_topology.json ]; then
          echo "(Found mesh_topology.json)"
          cat /tmp/sysinfo/mesh_topology.json
        elif [ -f /tmp/sysinfo/mesh_status ]; then
          echo "(Found mesh_status)"
          cat /tmp/sysinfo/mesh_status
        else
          echo "AiMesh topology info not found."
        fi

        echo
        echo "------ Finished ------"
      `;
      
      const result = await this.executeCommand(command);
      return this.parseNetworkTopologyReport(result);
    } catch (error) {
      console.error('Error generating network topology report:', error);
      return null;
    }
  }

  private parseNetworkTopologyReport(data: string): any {
    const report = {
      routerInfo: {},
      dhcpClients: [],
      wirelessClients: [],
      wiredClients: [],
      aimeshTopology: null
    };

    const lines = data.split('\n');
    let currentSection = '';
    
    for (const line of lines) {
      if (line.includes('NODE NAME:')) {
        report.routerInfo.name = line.split(':')[1]?.trim();
      } else if (line.includes('ROUTER IP:')) {
        report.routerInfo.ip = line.split(':')[1]?.trim();
      } else if (line.includes('DHCP Clients')) {
        currentSection = 'dhcp';
      } else if (line.includes('Connected Wireless Clients')) {
        currentSection = 'wireless';
      } else if (line.includes('Wired Clients')) {
        currentSection = 'wired';
      } else if (line.includes('AiMesh Topology')) {
        currentSection = 'aimesh';
      } else if (line.startsWith('MAC:') && currentSection === 'wireless') {
        // Parse wireless client line: "MAC: aa:bb:cc | IP: 192.168.1.100 | Hostname: device | RSSI: -45 dBm | Band: 5GHz"
        const macMatch = line.match(/MAC:\s*([a-fA-F0-9:]+)/);
        const ipMatch = line.match(/IP:\s*([0-9.]+)/);
        const hostnameMatch = line.match(/Hostname:\s*([^|]+)/);
        const rssiMatch = line.match(/RSSI:\s*(-?\d+)/);
        const bandMatch = line.match(/Band:\s*([^|]+)/);
        
        if (macMatch) {
          report.wirelessClients.push({
            mac: macMatch[1].trim(),
            ip: ipMatch?.[1]?.trim() || '',
            hostname: hostnameMatch?.[1]?.trim() || '',
            rssi: rssiMatch ? parseInt(rssiMatch[1]) : null,
            band: bandMatch?.[1]?.trim() || 'Unknown'
          });
        }
      } else if (line.includes(',') && currentSection === 'dhcp') {
        const parts = line.split(',').map(p => p.trim());
        if (parts.length >= 3) {
          report.dhcpClients.push({
            ip: parts[0],
            mac: parts[1],
            hostname: parts[2]
          });
        }
      } else if (line.includes(',') && currentSection === 'wired') {
        const parts = line.split(',').map(p => p.trim());
        if (parts.length >= 3) {
          report.wiredClients.push({
            ip: parts[0],
            mac: parts[1],
            interface: parts[2]
          });
        }
      }
    }

    return report;
  }

  async getConnectedDevices(): Promise<any[]> {
    try {
      console.log('Getting connected devices with enhanced detection...');
      
      // Get comprehensive topology report
      const topologyReport = await this.getNetworkTopologyReport();
      if (!topologyReport) return [];

      const devices: any[] = [];
      const processedMacs = new Set();

      // Process wireless clients first (most detailed info)
      for (const client of topologyReport.wirelessClients) {
        if (client.mac && !processedMacs.has(client.mac.toLowerCase())) {
          processedMacs.add(client.mac.toLowerCase());
          
          devices.push({
            macAddress: this.normalizeMacAddress(client.mac),
            name: client.hostname || `Device-${client.mac.slice(-5)}`,
            ipAddress: client.ip || '',
            isOnline: true,
            deviceType: this.getDeviceType(client.mac, client.hostname),
            connectionType: `${client.band} WiFi`,
            signalStrength: client.rssi,
            wirelessInterface: this.getBandInterface(client.band),
            aimeshNode: null, // Will be populated if found in AiMesh data
            hostname: client.hostname,
              downloadSpeed: deviceInfo.downloadSpeed,
              uploadSpeed: deviceInfo.uploadSpeed
            });
          }
        }
      }
      
      console.log(`Found ${devices.length} devices with enhanced detection`);
      return devices;
    } catch (error) {
      console.error('Failed to get connected devices:', error);
      return [];
    }
  }

  // Enhanced device detection using your exact script logic
  async getEnhancedDeviceInfo(macAddress: string): Promise<any> {
    try {
      const deviceInfo = {
        hostname: '',
        ipAddress: '',
        isOnline: false,
        connectionType: 'ethernet', // Default to ethernet
        signalStrength: null,
        wirelessInterface: null,
        aimeshNode: null,
        downloadSpeed: null,
        uploadSpeed: null
      };

      // Get DHCP lease info for this specific MAC (from your script)
      const leaseCommand = `grep -i "${macAddress}" /var/lib/misc/dnsmasq.leases`;
      try {
        const leaseInfo = await this.executeCommand(leaseCommand);
        if (leaseInfo.trim()) {
          const parts = leaseInfo.trim().split(/\s+/);
          if (parts.length >= 4) {
            deviceInfo.ipAddress = parts[2];
            deviceInfo.hostname = parts[3];
          }
        }
      } catch (error) {
        // Device not in DHCP leases
      }

      // Check wireless interfaces (wl0, wl1, wl2) exactly like your script
      const wirelessInterfaces = ['wl0', 'wl1', 'wl2'];
      let foundWireless = false;

      for (const iface of wirelessInterfaces) {
        try {
          // Check if device is associated with this wireless interface
          const assocCheck = await this.executeCommand(`wl -i ${iface} assoclist | grep -iq "${macAddress}" && echo "found" || echo ""`);
          
          if (assocCheck.trim() === 'found') {
            // Device is connected wirelessly on this interface
            foundWireless = true;
            deviceInfo.connectionType = 'wifi';
            deviceInfo.wirelessInterface = iface;
            deviceInfo.isOnline = true;

            // Get RSSI (signal strength) exactly like your script
            try {
              const rssiOutput = await this.executeCommand(`wl -i ${iface} rssi "${macAddress}"`);
              const rssi = parseInt(rssiOutput.trim());
              if (!isNaN(rssi)) {
                deviceInfo.signalStrength = rssi;
              }
            } catch (rssiError) {
              console.log(`Could not get RSSI for ${macAddress} on ${iface}`);
            }
            
            // Determine band based on interface
            if (iface === 'wl0') {
              deviceInfo.connectionType = '2.4GHz WiFi';
            } else if (iface === 'wl1') {
              deviceInfo.connectionType = '5GHz WiFi';
            } else if (iface === 'wl2') {
              deviceInfo.connectionType = '6GHz WiFi';
            }
            
            break; // Found on wireless, no need to check other interfaces
          }
        } catch (ifaceError) {
          // Interface might not exist or command failed, continue
          continue;
        }
      }

      // If not found on wireless, check if it's wired (from your script)
      if (!foundWireless) {
        try {
          const neighCheck = await this.executeCommand(`ip neigh | grep -i "${macAddress}" | grep -q "br" && echo "wired" || echo ""`);
          if (neighCheck.trim() === 'wired') {
            deviceInfo.connectionType = 'ethernet';
            deviceInfo.isOnline = true;
          }
        } catch (error) {
          // Device might be offline or command failed
        }
      }

      // Check AiMesh information (from your script)
      try {
        let aimeshInfo = '';
        
        // Try mesh_status first
        try {
          aimeshInfo = await this.executeCommand(`grep -i "${macAddress}" /tmp/sysinfo/mesh_status 2>/dev/null || echo ""`);
        } catch (error) {
          // mesh_status not available
        }
        
        // Try mesh_topology.json if mesh_status didn't work
        if (!aimeshInfo.trim()) {
          try {
            aimeshInfo = await this.executeCommand(`grep -i "${macAddress}" /tmp/sysinfo/mesh_topology.json 2>/dev/null || echo ""`);
          } catch (error) {
            // mesh_topology.json not available
          }
        }
        
        if (aimeshInfo.trim()) {
          deviceInfo.aimeshNode = aimeshInfo.trim();
          // If found in AiMesh data, it might be connected through an AiMesh node
          if (!foundWireless && deviceInfo.connectionType === 'ethernet') {
            deviceInfo.connectionType = 'aimesh';
          }
        }
      } catch (error) {
        // AiMesh info not available
      }

      // Set bandwidth to null for authentic data (would need additional monitoring)
      deviceInfo.downloadSpeed = null;
      deviceInfo.uploadSpeed = null;

      return deviceInfo;
    } catch (error) {
      console.error(`Error getting enhanced info for ${macAddress}:`, error);
      return {
        hostname: '',
        ipAddress: '',
        isOnline: false,
        connectionType: 'unknown',
        signalStrength: null,
        wirelessInterface: null,
        aimeshNode: null,
        downloadSpeed: null,
        uploadSpeed: null
      };
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
      // Get Adaptive QoS status using correct commands
      const qosEnabled = await this.executeCommand("nvram get qos_enable");
      const qosMode = await this.executeCommand("nvram get qos_type");
      
      // Get AiProtection status using correct commands
      const aiProtection = await this.executeCommand("nvram get aiprotection_enable");
      const aiMalware = await this.executeCommand("nvram get tm_malware");
      const aiVuln = await this.executeCommand("nvram get tm_vprot");
      
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
      
      // Get AiMesh network topology using your script approach
      const aimeshRole = await this.executeCommand("nvram get amas_mode");
      const mainRouterMac = await this.executeCommand("nvram get et0macaddr");
      const aimeshPeers = await this.executeCommand("nvram get amas_peerlist");
      
      // Parse AiMesh peers
      const aimeshNodeList = await this.executeCommand(`
        PEERS=$(nvram get amas_peerlist)
        if [ -n "$PEERS" ]; then
          for PEER in $PEERS; do
            echo "Node MAC: $PEER"
          done
        fi
      `);
      
      // Get wireless clients by band using your script approach
      const wirelessClientsByBand = await this.executeCommand(`
        # Get wireless clients by band with RSSI
        echo "===WIRELESS_CLIENTS_START==="
        
        for IF in wl0 wl1 wl2; do
          IFNAME=$(nvram get \${IF}_ifname)
          if [ -n "$IFNAME" ]; then
            case "$IF" in
              wl0) BAND="2.4GHz" ;;
              wl1) BAND="5GHz" ;;
              wl2) BAND="6GHz" ;;
            esac
            
            echo "BAND:$BAND"
            wl -i "$IFNAME" assoclist 2>/dev/null | while read -r line; do
              MAC=$(echo "$line" | awk '{print $2}')
              if [ -n "$MAC" ]; then
                RSSI=$(wl -i "$IFNAME" rssi "$MAC" 2>/dev/null || echo "N/A")
                echo "CLIENT:$MAC:$RSSI:$BAND"
              fi
            done
          fi
        done
        
        echo "===WIRELESS_CLIENTS_END==="
      `);
      
      // Get DDNS status
      const ddnsEnabled = await this.executeCommand("nvram get ddns_enable_x");
      const ddnsProvider = await this.executeCommand("nvram get ddns_server_x");
      
      // Get hardware acceleration features using correct commands
      const ctfEnabled = await this.executeCommand("nvram get ctf_enable");
      const runnerEnabled = await this.executeCommand("nvram get runner_enable");
      const fcEnabled = await this.executeCommand("nvram get fc_enable");
      
      // Get WAN IP information
      const wanIp = await this.executeCommand("nvram get wan0_ipaddr || nvram get wan_ipaddr");
      const wanGateway = await this.executeCommand("nvram get wan0_gateway || nvram get wan_gateway");
      
      // Get wireless client counts using multiple detection methods
      const wifiClients24 = await this.executeCommand(`
        # Try multiple methods to get 2.4GHz clients
        COUNT=$(wl -i eth1 assoclist 2>/dev/null | wc -l)
        if [ "$COUNT" = "0" ]; then
          COUNT=$(wl -i wl0 assoclist 2>/dev/null | wc -l)
        fi
        if [ "$COUNT" = "0" ]; then
          COUNT=$(cat /tmp/wireless_clients.txt 2>/dev/null | grep -c "2.4GHz" || echo 0)
        fi
        if [ "$COUNT" = "0" ]; then
          COUNT=$(nvram get wl0_assoc_list 2>/dev/null | wc -w)
        fi
        echo $COUNT
      `);
      
      const wifiClients5 = await this.executeCommand(`
        # Try multiple methods to get 5GHz clients
        COUNT=$(wl -i eth2 assoclist 2>/dev/null | wc -l)
        if [ "$COUNT" = "0" ]; then
          COUNT=$(wl -i wl1 assoclist 2>/dev/null | wc -l)
        fi
        if [ "$COUNT" = "0" ]; then
          COUNT=$(cat /tmp/wireless_clients.txt 2>/dev/null | grep -c "5GHz" || echo 0)
        fi
        if [ "$COUNT" = "0" ]; then
          COUNT=$(nvram get wl1_assoc_list 2>/dev/null | wc -w)
        fi
        echo $COUNT
      `);
      
      const wifiClients6 = await this.executeCommand(`
        # Try multiple methods to get 6GHz clients
        COUNT=$(wl -i eth3 assoclist 2>/dev/null | wc -l)
        if [ "$COUNT" = "0" ]; then
          COUNT=$(wl -i wl2 assoclist 2>/dev/null | wc -l)
        fi
        if [ "$COUNT" = "0" ]; then
          COUNT=$(cat /tmp/wireless_clients.txt 2>/dev/null | grep -c "6GHz" || echo 0)
        fi
        echo $COUNT
      `);

      // Alternative method: Get wireless clients from DHCP/ARP if wl commands fail
      const totalWifiCheck = await this.executeCommand(`
        # Count wireless devices from DHCP leases and ARP table
        TOTAL=0
        # Count devices connected via wireless interfaces
        TOTAL=$(cat /proc/net/arp | grep -E "(wl0|wl1|wl2|eth1|eth2|eth3)" | wc -l)
        if [ "$TOTAL" = "0" ]; then
          TOTAL=$(cat /tmp/dhcp_clients.txt 2>/dev/null | grep -c "wireless" || echo 0)
        fi
        echo $TOTAL
      `);
      
      // Get wireless features using correct commands
      const beamforming24 = await this.executeCommand("nvram get wl_bfd_enable");
      const beamforming5 = await this.executeCommand("nvram get wl1_bfd_enable");

      // Get DHCP leases and wired clients using your script approach
      const dhcpLeases = await this.executeCommand(`
        echo "===DHCP_LEASES_START==="
        cat /tmp/dnsmasq.leases 2>/dev/null | while read -r lease; do
          MAC=$(echo "$lease" | awk '{print $2}')
          HOST=$(echo "$lease" | awk '{print $3}')
          IP=$(echo "$lease" | awk '{print $4}')
          echo "DHCP:$MAC:$IP:$HOST"
        done
        echo "===DHCP_LEASES_END==="
      `);

      const wiredClients = await this.executeCommand(`
        echo "===WIRED_CLIENTS_START==="
        arp | grep -v incomplete | grep br0 2>/dev/null | while read -r line; do
          IP=$(echo "$line" | awk '{print $1}')
          MAC=$(echo "$line" | awk '{print $3}')
          echo "WIRED:$MAC:$IP"
        done
        echo "===WIRED_CLIENTS_END==="
      `);

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
          isMaster: aimeshRole.trim() === '0', // 0 = main router, 1 = node
          nodeCount: aimeshPeers.trim() ? aimeshPeers.trim().split(' ').length : 0,
          nodeList: aimeshNodeList.trim().split('\n').filter(line => line.includes('Node MAC:')).map(line => line.replace('Node MAC: ', '')),
          mainRouterMac: mainRouterMac.trim(),
          peers: aimeshPeers.trim().split(' ').filter(peer => peer.length > 0),
        },
        ddns: {
          enabled: ddnsEnabled.trim() === '1',
          provider: ddnsProvider.trim(),
        },
        // Hardware Acceleration (enabled = 1 means enabled)
        hardwareAcceleration: {
          ctf: ctfEnabled.trim() === '1',
          runner: runnerEnabled.trim() === '1',
          flowCache: fcEnabled.trim() === '1',
        },
        // Network Information
        network: {
          wanIp: wanIp.trim(),
          wanGateway: wanGateway.trim(),
        },
        // Parse wireless clients data from your script format
        wirelessClients: this.parseWirelessClients(wirelessClientsByBand),
        
        // Additional network topology data
        networkTopology: {
          dhcpLeases: this.parseDHCPLeases(dhcpLeases),
          wiredClients: this.parseWiredClients(wiredClients),
        },
        // Wireless Features
        wirelessFeatures: {
          beamforming: beamforming24.trim() === '1' || beamforming5.trim() === '1',
          beamforming24: beamforming24.trim() === '1',
          beamforming5: beamforming5.trim() === '1',
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

  private parseWirelessClients(data: string) {
    const bands = {
      band24ghz: 0,
      band5ghz: 0,
      band6ghz: 0,
      total: 0,
      details: {
        band24ghz: [] as Array<{mac: string, rssi: string, band: string}>,
        band5ghz: [] as Array<{mac: string, rssi: string, band: string}>,
        band6ghz: [] as Array<{mac: string, rssi: string, band: string}>
      }
    };

    const lines = data.split('\n');
    let currentBand = '';
    
    for (const line of lines) {
      if (line.startsWith('BAND:')) {
        currentBand = line.replace('BAND:', '');
      } else if (line.startsWith('CLIENT:')) {
        const parts = line.replace('CLIENT:', '').split(':');
        if (parts.length >= 9) { // MAC (6 parts) + RSSI + Band
          // First 6 parts are MAC address
          const macParts = parts.slice(0, 6);
          const mac = this.normalizeMacAddress(macParts.join(':'));
          const rssi = parts[6];
          const band = parts[7];
          const clientData = { mac, rssi, band };
          
          if (band === '2.4GHz') {
            bands.band24ghz++;
            bands.details.band24ghz.push(clientData);
          } else if (band === '5GHz') {
            bands.band5ghz++;
            bands.details.band5ghz.push(clientData);
          } else if (band === '6GHz') {
            bands.band6ghz++;
            bands.details.band6ghz.push(clientData);
          }
        }
      }
    }
    
    bands.total = bands.band24ghz + bands.band5ghz + bands.band6ghz;
    return bands;
  }

  private parseDHCPLeases(data: string) {
    const leases = [];
    const lines = data.split('\n');
    
    for (const line of lines) {
      if (line.startsWith('DHCP:')) {
        const parts = line.replace('DHCP:', '').split(':');
        if (parts.length >= 3) {
          // Reconstruct MAC address properly - first 6 parts are MAC, rest is IP and hostname
          const macParts = parts.slice(0, 6);
          const mac = macParts.join(':');
          const ip = parts[6];
          const hostname = parts.slice(7).join(':'); // In case hostname contains colons
          leases.push({ mac: this.normalizeMacAddress(mac), ip, hostname });
        }
      }
    }
    
    return leases;
  }

  private parseWiredClients(data: string) {
    const clients = [];
    const lines = data.split('\n');
    
    for (const line of lines) {
      if (line.startsWith('WIRED:')) {
        const parts = line.replace('WIRED:', '').split(':');
        if (parts.length >= 7) {
          // First 6 parts are MAC address, last part is IP
          const macParts = parts.slice(0, 6);
          const mac = macParts.join(':');
          const ip = parts[6];
          clients.push({ mac: this.normalizeMacAddress(mac), ip });
        }
      }
    }
    
    return clients;
  }

  // Normalize MAC address format to prevent double colon issues
  private normalizeMacAddress(mac: string): string {
    if (!mac) return '';
    
    // Remove any extra spaces and convert to lowercase
    let normalized = mac.trim().toLowerCase();
    
    // Handle cases where MAC might have double colons or other formatting issues
    normalized = normalized.replace(/[^a-f0-9:]/g, ''); // Remove invalid characters
    
    // Split by colon and filter out empty parts
    const parts = normalized.split(':').filter(part => part.length > 0);
    
    // Ensure each part is exactly 2 characters, pad with 0 if needed
    const paddedParts = parts.map(part => {
      if (part.length === 1) return '0' + part;
      if (part.length === 2) return part;
      if (part.length > 2) return part.substring(0, 2); // Truncate if too long
      return '00'; // Default for empty parts
    });
    
    // Ensure we have exactly 6 parts for a valid MAC address
    while (paddedParts.length < 6) {
      paddedParts.push('00');
    }
    
    // Take only first 6 parts if there are more
    const validParts = paddedParts.slice(0, 6);
    
    return validParts.join(':');
  }
}

export const sshClient = new SSHClient();