import { Client } from 'ssh2';

interface SSHConfig {
  host: string;
  port: number;
  username: string;
  password: string;
  privateKey?: string;
}

export class ImprovedSSHClient {
  private client: Client;
  private isConnected: boolean = false;

  constructor() {
    this.client = new Client();
  }

  async connect(config: SSHConfig): Promise<boolean> {
    return new Promise((resolve, reject) => {
      this.client.connect({
        host: config.host,
        port: config.port,
        username: config.username,
        password: config.password,
        privateKey: config.privateKey,
        readyTimeout: 10000,
        algorithms: {
          kex: ['diffie-hellman-group14-sha256', 'diffie-hellman-group14-sha1'],
          cipher: ['aes128-ctr', 'aes192-ctr', 'aes256-ctr'],
          hmac: ['hmac-sha2-256', 'hmac-sha2-512', 'hmac-sha1']
        }
      });

      this.client.on('ready', () => {
        console.log('SSH Client :: Ready');
        this.isConnected = true;
        resolve(true);
      });

      this.client.on('error', (err) => {
        console.log('SSH Client :: Error:', err);
        this.isConnected = false;
        reject(err);
      });

      this.client.on('close', () => {
        console.log('SSH Client :: Connection closed');
        this.isConnected = false;
      });
    });
  }

  async executeCommand(command: string): Promise<string> {
    if (!this.isConnected) {
      throw new Error('SSH client is not connected');
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
          if (code !== 0 && errorOutput) {
            reject(new Error(`Command failed with code ${code}: ${errorOutput}`));
          } else {
            resolve(output);
          }
        });
      });
    });
  }

  async getEnhancedDeviceInfo(macAddress: string): Promise<any> {
    if (!this.isConnected) return null;

    try {
      const normalizedMac = this.normalizeMacAddress(macAddress);
      
      // Use your improved all-in-one command for accurate device detection
      const command = `
        MAC="${normalizedMac}"
        echo "==== Info for $MAC ===="
        
        # DHCP lease information
        grep -i "$MAC" /var/lib/misc/dnsmasq.leases
        
        # Check wireless connection and band with improved dynamic method
        for iface in \$(nvram get wl_ifnames); do
          if wl -i \$iface assoclist 2>/dev/null | grep -iq "\$MAC"; then
            RSSI=\$(wl -i \$iface rssi \$MAC 2>/dev/null)
            echo "\$iface (Wireless) | RSSI: \${RSSI:-N/A} dBm"
          fi
        done
        
        # Check if wired with improved method
        ip neigh show | grep -i "$MAC" || cat /proc/net/arp | grep -i "$MAC"
        
        # Check AiMesh Node with your instant lookup method
        grep -i "$MAC" /tmp/sysinfo/mesh_status 2>/dev/null || grep -i "$MAC" /tmp/sysinfo/mesh_topology.json 2>/dev/null
      `;

      const result = await this.executeCommand(command);
      
      // Parse the results using your improved detection format
      const info: any = {
        macAddress: normalizedMac,
        connectionType: 'Unknown',
        signalStrength: null,
        wirelessInterface: null,
        aimeshNode: null,
        ipAddress: '',
        hostname: ''
      };

      const lines = result.split('\n');

      for (const line of lines) {
        // Parse DHCP lease info
        if (line.includes(normalizedMac) && line.includes('.')) {
          const parts = line.split(/\s+/);
          if (parts.length >= 4) {
            info.ipAddress = parts[2];
            info.hostname = parts[3];
          }
        }
        
        // Parse wireless connection with your format: "wl0 (Wireless) | RSSI: -45 dBm"
        if (line.includes('(Wireless)') && line.includes('RSSI:')) {
          const interfaceMatch = line.match(/(wl\d+)\s*\(Wireless\)/);
          const rssiMatch = line.match(/RSSI:\s*(-?\d+)\s*dBm/);
          
          if (interfaceMatch) {
            info.wirelessInterface = interfaceMatch[1];
            info.connectionType = this.getConnectionType(interfaceMatch[1]);
          }
          
          if (rssiMatch) {
            info.signalStrength = parseInt(rssiMatch[1]);
          }
        }
        
        // Parse wired connection
        if (line.includes(normalizedMac) && (line.includes('REACHABLE') || line.includes('STALE'))) {
          info.connectionType = 'Wired';
        }
        
        // Parse AiMesh node info with your format
        if (line.includes(normalizedMac) && (line.includes('node') || line.includes('conn_type'))) {
          const nodeMatch = line.match(/"node":"([^"]+)"/);
          if (nodeMatch) {
            info.aimeshNode = nodeMatch[1];
          }
        }
      }

      return info;
    } catch (error) {
      console.error(`Error getting enhanced device info for ${macAddress}:`, error);
      return null;
    }
  }

  async getConnectedDevices(): Promise<any[]> {
    if (!this.isConnected) return [];

    try {
      // Use your improved commands for accurate device detection
      const command = `
        echo "=== Connected Devices Report ==="
        
        echo "DHCP_CLIENTS:"
        cat /var/lib/misc/dnsmasq.leases
        
        echo "WIRELESS_DEVICES:"
        # Check each wireless interface for connected devices using your method
        for i in wl0 wl1 wl2; do
          wl -i $i assoclist 2>/dev/null | while read mac; do
            if [ -n "$mac" ]; then
              rssi=$(wl -i $i rssi "$mac" 2>/dev/null || echo "N/A")
              echo "$mac|$i|$rssi"
            fi
          done
        done
        
        echo "WIRED_DEVICES:"
        # Check for wired connections using your method
        ip neigh | grep -E "REACHABLE|STALE"
        
        echo "AIMESH_INFO:"
        # Check AiMesh node information using your method
        grep -v "^$" /tmp/sysinfo/mesh_status 2>/dev/null || grep -v "^$" /tmp/sysinfo/mesh_topology.json 2>/dev/null || echo "No AiMesh data"
      `;

      const result = await this.executeCommand(command);
      return this.parseConnectedDevices(result);
    } catch (error) {
      console.error('Error getting connected devices:', error);
      return [];
    }
  }

  private parseConnectedDevices(output: string): any[] {
    const devices: any[] = [];
    const lines = output.split('\n');
    let currentSection = '';
    const dhcpMap = new Map();

    for (const line of lines) {
      if (line.includes('DHCP_CLIENTS:')) {
        currentSection = 'dhcp';
        continue;
      } else if (line.includes('WIRELESS_DEVICES:')) {
        currentSection = 'wireless';
        continue;
      } else if (line.includes('WIRED_DEVICES:')) {
        currentSection = 'wired';
        continue;
      } else if (line.includes('AIMESH_INFO:')) {
        currentSection = 'aimesh';
        continue;
      }

      if (currentSection === 'dhcp' && line.trim()) {
        const parts = line.split(/\s+/);
        if (parts.length >= 4) {
          const mac = this.normalizeMacAddress(parts[1]);
          dhcpMap.set(mac.toLowerCase(), {
            ip: parts[2],
            hostname: parts[3]
          });
        }
      } else if (currentSection === 'wireless' && line.includes('|')) {
        const parts = line.split('|');
        if (parts.length >= 3) {
          const mac = this.normalizeMacAddress(parts[0].trim());
          const interface = parts[1].trim();
          const rssi = parts[2].trim();
          
          const dhcpInfo = dhcpMap.get(mac.toLowerCase());
          
          devices.push({
            macAddress: mac,
            name: dhcpInfo?.hostname || `Device-${mac.slice(-5)}`,
            ipAddress: dhcpInfo?.ip || '',
            isOnline: true,
            deviceType: this.getDeviceType(mac, dhcpInfo?.hostname || ''),
            connectionType: `${this.getConnectionType(interface)} WiFi`,
            signalStrength: rssi === 'N/A' ? null : parseInt(rssi),
            wirelessInterface: interface,
            aimeshNode: 'Main Router',
            lastSeen: new Date(),
            downloadSpeed: 0,
            uploadSpeed: 0
          });
        }
      } else if (currentSection === 'wired' && line.includes('REACHABLE') || line.includes('STALE')) {
        const parts = line.split(/\s+/);
        if (parts.length >= 5) {
          const ip = parts[0];
          const mac = this.normalizeMacAddress(parts[4]);
          const dhcpInfo = dhcpMap.get(mac.toLowerCase());
          
          // Only add if not already added as wireless
          const existingDevice = devices.find(d => d.macAddress.toLowerCase() === mac.toLowerCase());
          if (!existingDevice) {
            devices.push({
              macAddress: mac,
              name: dhcpInfo?.hostname || `Device-${mac.slice(-5)}`,
              ipAddress: ip,
              isOnline: true,
              deviceType: this.getDeviceType(mac, dhcpInfo?.hostname || ''),
              connectionType: 'Wired',
              signalStrength: null,
              wirelessInterface: null,
              aimeshNode: 'Main Router',
              lastSeen: new Date(),
              downloadSpeed: 0,
              uploadSpeed: 0
            });
          }
        }
      }
    }

    return devices;
  }

  private getConnectionType(interface: string): string {
    switch (interface) {
      case 'wl0':
        return '2.4GHz';
      case 'wl1':
        return '5GHz';
      case 'wl2':
        return '6GHz';
      default:
        return 'Unknown';
    }
  }

  private getDeviceType(macAddress: string, deviceName: string): string {
    const name = deviceName.toLowerCase();
    const mac = macAddress.toLowerCase();

    // Device type detection based on name patterns
    if (name.includes('iphone') || name.includes('ipad')) return 'mobile';
    if (name.includes('android') || name.includes('samsung')) return 'mobile';
    if (name.includes('laptop') || name.includes('macbook')) return 'laptop';
    if (name.includes('desktop') || name.includes('pc')) return 'desktop';
    if (name.includes('tv') || name.includes('roku') || name.includes('chromecast')) return 'tv';
    if (name.includes('tablet')) return 'tablet';
    if (name.includes('camera') || name.includes('security')) return 'camera';
    if (name.includes('printer')) return 'printer';
    if (name.includes('speaker') || name.includes('echo') || name.includes('google')) return 'speaker';

    // OUI-based detection for common manufacturers
    const oui = mac.substring(0, 8);
    if (oui.startsWith('00:50:56') || oui.startsWith('00:0c:29')) return 'virtual';
    if (oui.startsWith('b8:27:eb') || oui.startsWith('dc:a6:32')) return 'raspberry-pi';

    return 'unknown';
  }

  private normalizeMacAddress(mac: string): string {
    return mac.replace(/[:\-\s]/g, '')
             .toUpperCase()
             .replace(/(.{2})(?=.)/g, '$1:');
  }

  async getSystemInfo(): Promise<any> {
    if (!this.isConnected) return null;

    try {
      const command = `
        echo "MODEL: $(nvram get productid)"
        echo "FIRMWARE: $(nvram get firmver)"
        echo "UPTIME: $(cat /proc/uptime | awk '{print $1}')"
        echo "MEMORY: $(free | grep Mem | awk '{print $3" "$2}')"
        echo "CPU: $(cat /proc/loadavg | awk '{print $1}')"
        echo "TEMPERATURE: $(cat /sys/class/thermal/thermal_zone0/temp 2>/dev/null | awk '{print $1/1000}' || echo 'N/A')"
      `;

      const result = await this.executeCommand(command);
      const lines = result.split('\n');
      const info: any = {};

      for (const line of lines) {
        if (line.startsWith('MODEL:')) info.model = line.split(':')[1]?.trim();
        if (line.startsWith('FIRMWARE:')) info.firmware = line.split(':')[1]?.trim();
        if (line.startsWith('UPTIME:')) info.uptime = line.split(':')[1]?.trim();
        if (line.startsWith('MEMORY:')) {
          const memParts = line.split(':')[1]?.trim().split(' ');
          info.memoryUsage = parseFloat(memParts[0]) || 0;
          info.memoryTotal = parseFloat(memParts[1]) || 0;
        }
        if (line.startsWith('CPU:')) info.cpuUsage = parseFloat(line.split(':')[1]?.trim()) || 0;
        if (line.startsWith('TEMPERATURE:')) info.temperature = line.split(':')[1]?.trim();
      }

      return info;
    } catch (error) {
      console.error('Error getting system info:', error);
      return null;
    }
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

export const improvedSSHClient = new ImprovedSSHClient();