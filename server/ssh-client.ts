import { Client } from 'ssh2';

interface SSHConfig {
  host: string;
  port: number;
  username: string;
  password: string;
  privateKey?: string;
}

export class SSHClient {
  private client: Client;
  private isConnected: boolean = false;

  constructor() {
    this.client = new Client();
  }

  async connect(config: SSHConfig): Promise<boolean> {
    return new Promise((resolve) => {
      this.client
        .on('ready', () => {
          console.log('SSH Client :: ready');
          this.isConnected = true;
          resolve(true);
        })
        .on('error', (err) => {
          console.error('SSH Client :: error:', err);
          this.isConnected = false;
          resolve(false);
        })
        .connect({
          host: config.host,
          port: config.port,
          username: config.username,
          password: config.password,
          privateKey: config.privateKey
        });
    });
  }

  async executeCommand(command: string): Promise<string> {
    if (!this.isConnected) {
      throw new Error('SSH connection not established');
    }

    return new Promise((resolve, reject) => {
      this.client.exec(command, (err, stream) => {
        if (err) {
          reject(err);
          return;
        }

        let output = '';
        let errorOutput = '';

        stream.on('data', (data: Buffer) => {
          output += data.toString();
        });

        stream.stderr.on('data', (data: Buffer) => {
          errorOutput += data.toString();
        });

        stream.on('close', (code: number) => {
          if (code === 0) {
            resolve(output);
          } else {
            reject(new Error(`Command failed with code ${code}: ${errorOutput}`));
          }
        });
      });
    });
  }

  async getSystemInfo(): Promise<any> {
    if (!this.isConnected) return null;

    try {
      const model = await this.executeCommand("nvram get productid");
      const firmware = await this.executeCommand("nvram get firmver");
      const uptime = await this.executeCommand("cat /proc/uptime | awk '{print $1}'");
      const temperature = await this.executeCommand("cat /proc/dmu/temperature 2>/dev/null | head -1 || echo 'N/A'");
      const memInfo = await this.executeCommand("cat /proc/meminfo | grep -E 'MemTotal|MemFree'");
      const cpuInfo = await this.executeCommand("cat /proc/cpuinfo | grep -E 'model name|cpu cores' | head -2");

      // Parse memory info
      const memLines = memInfo.split('\n');
      const memTotal = parseInt(memLines[0]?.match(/(\d+)/)?.[1] || '0') / 1024; // Convert to MB
      const memFree = parseInt(memLines[1]?.match(/(\d+)/)?.[1] || '0') / 1024;
      const memUsed = memTotal - memFree;

      // Parse CPU info
      const cpuLines = cpuInfo.split('\n');
      const cpuModel = cpuLines[0]?.split(':')[1]?.trim() || 'Unknown';
      const cpuCores = parseInt(cpuLines[1]?.split(':')[1]?.trim() || '1');

      return {
        model: model.trim(),
        firmware: firmware.trim(),
        uptime: parseInt(uptime.trim()),
        temperature: temperature.trim() === 'N/A' ? null : parseFloat(temperature.trim()),
        memoryTotal: memTotal,
        memoryUsage: memUsed,
        cpuUsage: 0, // Would need additional calculation for real CPU usage
        cpuModel,
        cpuCores,
        ipAddress: '',
        storageUsage: null,
        storageTotal: null,
        loadAverage: null
      };
    } catch (error) {
      console.error('Error getting system info:', error);
      return null;
    }
  }

  async getNetworkTopologyReport(): Promise<any> {
    if (!this.isConnected) return null;

    try {
      console.log('Generating comprehensive network topology report...');
      
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
      routerInfo: { name: '', ip: '' },
      dhcpClients: [] as any[],
      wirelessClients: [] as any[],
      wiredClients: [] as any[],
      aimeshTopology: null
    };

    const lines = data.split('\n');
    let currentSection = '';
    
    for (const line of lines) {
      if (line.includes('NODE NAME:')) {
        report.routerInfo.name = line.split(':')[1]?.trim() || '';
      } else if (line.includes('ROUTER IP:')) {
        report.routerInfo.ip = line.split(':')[1]?.trim() || '';
      } else if (line.includes('DHCP Clients')) {
        currentSection = 'dhcp';
      } else if (line.includes('Connected Wireless Clients')) {
        currentSection = 'wireless';
      } else if (line.includes('Wired Clients')) {
        currentSection = 'wired';
      } else if (line.includes('AiMesh Topology')) {
        currentSection = 'aimesh';
      } else if (line.startsWith('MAC:') && currentSection === 'wireless') {
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
            wirelessBand: client.band,
            aimeshNode: null,
            hostname: client.hostname,
            downloadSpeed: null,
            uploadSpeed: null
          });
        }
      }

      // Process wired clients
      for (const client of topologyReport.wiredClients) {
        if (client.mac && !processedMacs.has(client.mac.toLowerCase())) {
          processedMacs.add(client.mac.toLowerCase());
          
          const dhcpInfo = topologyReport.dhcpClients.find((d: any) => 
            d.mac.toLowerCase() === client.mac.toLowerCase()
          );
          
          devices.push({
            macAddress: this.normalizeMacAddress(client.mac),
            name: dhcpInfo?.hostname || `Device-${client.mac.slice(-5)}`,
            ipAddress: client.ip || dhcpInfo?.ip || '',
            isOnline: true,
            deviceType: this.getDeviceType(client.mac, dhcpInfo?.hostname),
            connectionType: 'ethernet',
            signalStrength: null,
            wirelessInterface: null,
            wirelessBand: null,
            aimeshNode: null,
            hostname: dhcpInfo?.hostname || '',
            downloadSpeed: null,
            uploadSpeed: null
          });
        }
      }

      // Process remaining DHCP clients (offline devices)
      for (const dhcpClient of topologyReport.dhcpClients) {
        if (dhcpClient.mac && !processedMacs.has(dhcpClient.mac.toLowerCase())) {
          processedMacs.add(dhcpClient.mac.toLowerCase());
          
          devices.push({
            macAddress: this.normalizeMacAddress(dhcpClient.mac),
            name: dhcpClient.hostname || `Device-${dhcpClient.mac.slice(-5)}`,
            ipAddress: dhcpClient.ip || '',
            isOnline: false,
            deviceType: this.getDeviceType(dhcpClient.mac, dhcpClient.hostname),
            connectionType: 'unknown',
            signalStrength: null,
            wirelessInterface: null,
            wirelessBand: null,
            aimeshNode: null,
            hostname: dhcpClient.hostname,
            downloadSpeed: null,
            uploadSpeed: null
          });
        }
      }

      console.log(`Enhanced device detection found ${devices.length} devices`);
      return devices;
    } catch (error) {
      console.error('Error getting connected devices:', error);
      return [];
    }
  }

  private getBandInterface(band: string): string | null {
    switch (band) {
      case '2.4GHz': return 'wl0';
      case '5GHz': return 'wl1';
      case '6GHz': return 'wl2';
      default: return null;
    }
  }

  async getEnhancedDeviceInfo(macAddress: string): Promise<any> {
    try {
      const deviceInfo = {
        hostname: '',
        ipAddress: '',
        isOnline: false,
        connectionType: 'ethernet',
        signalStrength: null,
        wirelessInterface: null,
        wirelessBand: null,
        aimeshNode: null,
        downloadSpeed: null,
        uploadSpeed: null
      };

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

      const wirelessInterfaces = ['wl0', 'wl1', 'wl2'];
      let foundWireless = false;

      for (const iface of wirelessInterfaces) {
        try {
          const assocCheck = await this.executeCommand(`wl -i ${iface} assoclist | grep -iq "${macAddress}" && echo "found" || echo ""`);
          
          if (assocCheck.trim() === 'found') {
            foundWireless = true;
            deviceInfo.connectionType = 'wifi';
            deviceInfo.wirelessInterface = iface;
            deviceInfo.isOnline = true;

            try {
              const rssiOutput = await this.executeCommand(`wl -i ${iface} rssi "${macAddress}"`);
              const rssi = parseInt(rssiOutput.trim());
              if (!isNaN(rssi)) {
                deviceInfo.signalStrength = rssi;
              }
            } catch (rssiError) {
              console.log(`Could not get RSSI for ${macAddress} on ${iface}`);
            }
            
            if (iface === 'wl0') {
              deviceInfo.connectionType = '2.4GHz WiFi';
              deviceInfo.wirelessBand = '2.4GHz';
            } else if (iface === 'wl1') {
              deviceInfo.connectionType = '5GHz WiFi';
              deviceInfo.wirelessBand = '5GHz';
            } else if (iface === 'wl2') {
              deviceInfo.connectionType = '6GHz WiFi';
              deviceInfo.wirelessBand = '6GHz';
            }
            
            break;
          }
        } catch (ifaceError) {
          continue;
        }
      }

      if (!foundWireless) {
        try {
          const neighCheck = await this.executeCommand(`ip neigh | grep -i "${macAddress}" | grep -q "br" && echo "wired" || echo ""`);
          if (neighCheck.trim() === 'wired') {
            deviceInfo.connectionType = 'ethernet';
            deviceInfo.isOnline = true;
          }
        } catch (error) {
          // Device might be offline
        }
      }

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
        wirelessBand: null,
        aimeshNode: null,
        downloadSpeed: null,
        uploadSpeed: null
      };
    }
  }

  private getDeviceType(macAddress: string, deviceName: string): string {
    const mac = macAddress.toLowerCase();
    const name = (deviceName || '').toLowerCase();
    
    if (mac.startsWith('00:50:56') || mac.startsWith('00:0c:29')) return 'virtual-machine';
    if (mac.startsWith('dc:a6:32') || mac.startsWith('b8:27:eb')) return 'raspberry-pi';
    
    if (name.includes('iphone') || name.includes('ipad')) return 'mobile';
    if (name.includes('android') || name.includes('samsung')) return 'mobile';
    if (name.includes('macbook') || name.includes('imac')) return 'laptop';
    if (name.includes('windows') || name.includes('desktop')) return 'desktop';
    if (name.includes('tv') || name.includes('roku')) return 'streaming';
    if (name.includes('echo') || name.includes('alexa')) return 'smart-home';
    if (name.includes('printer')) return 'printer';
    
    return 'unknown';
  }

  async getWiFiNetworks(): Promise<any[]> {
    try {
      const networks: any[] = [];
      
      const wlInterfaces = await this.executeCommand("nvram show | grep '^wl[0-9]_ssid=' | cut -d'=' -f1 | sed 's/_ssid//'");
      const interfaces = wlInterfaces.split('\n').filter(iface => iface.trim());
      
      for (const iface of interfaces) {
        if (!iface.trim()) continue;
        
        try {
          const ssid = await this.executeCommand(`nvram get ${iface}_ssid`);
          const enabled = await this.executeCommand(`nvram get ${iface}_bss_enabled`);
          const band = iface.includes('0') ? '2.4GHz' : iface.includes('1') ? '5GHz' : '6GHz';
          
          networks.push({
            ssid: ssid.trim(),
            band,
            enabled: enabled.trim() === '1',
            interface: iface.trim()
          });
        } catch (error) {
          console.error(`Error getting WiFi info for ${iface}:`, error);
        }
      }
      
      return networks;
    } catch (error) {
      console.error('Error getting WiFi networks:', error);
      return [];
    }
  }

  async getBandwidthData(): Promise<any> {
    try {
      const rxBytes = await this.executeCommand("cat /sys/class/net/br0/statistics/rx_bytes");
      const txBytes = await this.executeCommand("cat /sys/class/net/br0/statistics/tx_bytes");
      
      return {
        download: parseFloat(rxBytes.trim()) / (1024 * 1024), // Convert to MB
        upload: parseFloat(txBytes.trim()) / (1024 * 1024),
        totalDownload: parseFloat(rxBytes.trim()) / (1024 * 1024 * 1024), // Convert to GB
        totalUpload: parseFloat(txBytes.trim()) / (1024 * 1024 * 1024)
      };
    } catch (error) {
      console.error('Error getting bandwidth data:', error);
      return { download: 0, upload: 0, totalDownload: 0, totalUpload: 0 };
    }
  }

  async getMerlinFeatures(): Promise<any> {
    try {
      const adaptiveQos = await this.executeCommand("nvram get adaptive_qos_enable");
      const aiProtection = await this.executeCommand("nvram get aiprotection_enable");
      const vpnServer = await this.executeCommand("nvram get vpn_server_enable");
      const aimeshMaster = await this.executeCommand("nvram get cfg_master");
      
      return {
        adaptiveQosEnabled: adaptiveQos.trim() === '1',
        aiProtectionEnabled: aiProtection.trim() === '1',
        vpnServerEnabled: vpnServer.trim() === '1',
        aimeshIsMaster: aimeshMaster.trim() === '1',
        wirelessClientsTotal: 0
      };
    } catch (error) {
      console.error('Error getting Merlin features:', error);
      return {
        adaptiveQosEnabled: false,
        aiProtectionEnabled: false,
        vpnServerEnabled: false,
        aimeshIsMaster: false,
        wirelessClientsTotal: 0
      };
    }
  }

  private normalizeMacAddress(mac: string): string {
    return mac.toUpperCase().replace(/[^A-F0-9]/g, '').match(/.{1,2}/g)?.join(':') || mac;
  }

  disconnect(): void {
    if (this.client) {
      this.client.end();
      this.isConnected = false;
    }
  }

  isConnectionActive(): boolean {
    return this.isConnected;
  }
}

export const sshClient = new SSHClient();