import { sshClient } from './ssh-client';

export class AsusRouterAPI {
  private routerIP: string = '';
  private username: string = '';
  private password: string = '';

  async initialize(config: { host: string; username: string; password: string }) {
    this.routerIP = config.host;
    this.username = config.username;
    this.password = config.password;
  }

  // Real ASUS router API integration for authentic device data
  async getRealConnectedDevices(): Promise<any[]> {
    try {
      // Use SSH to get authentic device data from ASUS router
      const deviceData = await sshClient.executeCommand(`
        echo "===ASUS_DEVICE_DISCOVERY==="
        
        # Get DHCP client list with real hostnames and lease info
        echo "DHCP_CLIENTS:"
        cat /tmp/dnsmasq.leases 2>/dev/null | while read -r lease; do
          TIMESTAMP=$(echo "$lease" | awk '{print $1}')
          MAC=$(echo "$lease" | awk '{print $2}')
          IP=$(echo "$lease" | awk '{print $3}')
          HOSTNAME=$(echo "$lease" | awk '{print $4}')
          LEASE_TIME=$(date -d "@$TIMESTAMP" 2>/dev/null || echo "Active")
          echo "DHCP:$MAC:$IP:$HOSTNAME:$LEASE_TIME"
        done
        
        # Get real wireless clients with signal strength and connection info
        echo "WIRELESS_CLIENTS:"
        for IF in wl0 wl1 wl2; do
          IFNAME=$(nvram get \${IF}_ifname 2>/dev/null)
          if [ -n "$IFNAME" ]; then
            case "$IF" in
              wl0) BAND="2.4GHz" ;;
              wl1) BAND="5GHz" ;;  
              wl2) BAND="6GHz" ;;
            esac
            
            wl -i "$IFNAME" assoclist 2>/dev/null | while read -r line; do
              MAC=$(echo "$line" | awk '{print $2}')
              if [ -n "$MAC" ]; then
                RSSI=$(wl -i "$IFNAME" rssi "$MAC" 2>/dev/null | grep -o "[-0-9]*" | head -1 || echo "N/A")
                RATE=$(wl -i "$IFNAME" rate "$MAC" 2>/dev/null | grep -o "[0-9.]*" | head -1 || echo "0")
                UPTIME=$(wl -i "$IFNAME" sta_info "$MAC" 2>/dev/null | grep "in network" | grep -o "[0-9]*" || echo "0")
                echo "WIRELESS:$MAC::$BAND:$RSSI:$RATE:$UPTIME"
              fi
            done
          fi
        done
        
        # Get ARP table for live device detection
        echo "LIVE_DEVICES:"
        cat /proc/net/arp | grep -v "incomplete" | grep -v "00:00:00:00:00:00" | while read -r line; do
          IP=$(echo "$line" | awk '{print $1}')
          MAC=$(echo "$line" | awk '{print $4}')
          INTERFACE=$(echo "$line" | awk '{print $6}')
          FLAGS=$(echo "$line" | awk '{print $3}')
          echo "ARP:$MAC:$IP:$INTERFACE:$FLAGS"
        done
        
        # Get ASUS router's custom client names and device types
        echo "CUSTOM_CLIENTS:"
        nvram get custom_clientlist 2>/dev/null | tr '<' '\\n' | while read -r entry; do
          if echo "$entry" | grep -q ">"; then
            MAC=$(echo "$entry" | cut -d'>' -f1)
            NAME=$(echo "$entry" | cut -d'>' -f2)
            TYPE=$(echo "$entry" | cut -d'>' -f6 2>/dev/null || echo "0")
            echo "CUSTOM:$MAC:$NAME:$TYPE"
          fi
        done
        
        echo "===ASUS_DEVICE_DISCOVERY_END==="
      `);

      return this.parseAsusDeviceData(deviceData);
    } catch (error) {
      console.error('Failed to get real ASUS device data:', error);
      return [];
    }
  }

  // Get real WiFi network information from ASUS router
  async getRealWiFiNetworks(): Promise<any[]> {
    try {
      const wifiData = await sshClient.executeCommand(`
        echo "===ASUS_WIFI_NETWORKS==="
        
        # Get all wireless interfaces and their configurations
        for IF in wl0 wl1 wl2; do
          SSID=$(nvram get \${IF}_ssid 2>/dev/null)
          if [ -n "$SSID" ]; then
            ENABLED=$(nvram get \${IF}_radio 2>/dev/null)
            CHANNEL=$(nvram get \${IF}_channel 2>/dev/null)
            SECURITY=$(nvram get \${IF}_akm 2>/dev/null)
            POWER=$(nvram get \${IF}_txpwr 2>/dev/null)
            BANDWIDTH=$(nvram get \${IF}_bw 2>/dev/null)
            CLIENTS=$(wl -i $(nvram get \${IF}_ifname) assoclist 2>/dev/null | wc -l)
            
            case "$IF" in
              wl0) BAND="2.4GHz" ;;
              wl1) BAND="5GHz" ;;
              wl2) BAND="6GHz" ;;
            esac
            
            echo "NETWORK:$SSID:$BAND:$CHANNEL:$ENABLED:$SECURITY:$POWER:$BANDWIDTH:$CLIENTS"
          fi
        done
        
        # Get guest networks
        for IF in wl0.1 wl1.1 wl2.1; do
          SSID=$(nvram get \${IF}_ssid 2>/dev/null)
          if [ -n "$SSID" ]; then
            ENABLED=$(nvram get \${IF}_bss_enabled 2>/dev/null)
            echo "GUEST:$SSID:$IF:$ENABLED"
          fi
        done
        
        echo "===ASUS_WIFI_NETWORKS_END==="
      `);

      return this.parseAsusWiFiData(wifiData);
    } catch (error) {
      console.error('Failed to get real WiFi data:', error);
      return [];
    }
  }

  // Get real router status and system information
  async getRealRouterStatus(): Promise<any> {
    try {
      const statusData = await sshClient.executeCommand(`
        echo "===ASUS_ROUTER_STATUS==="
        
        # Get router model and firmware
        MODEL=$(nvram get productid 2>/dev/null || echo "Unknown")
        FIRMWARE=$(nvram get firmver 2>/dev/null).$(nvram get buildno 2>/dev/null)
        
        # Get system uptime
        UPTIME=$(cat /proc/uptime | awk '{print $1}')
        
        # Get CPU and memory usage
        CPU_USAGE=$(top -bn1 | grep "CPU:" | awk '{print $2}' | cut -d'%' -f1 || echo "0")
        MEM_INFO=$(cat /proc/meminfo)
        MEM_TOTAL=$(echo "$MEM_INFO" | grep MemTotal | awk '{print $2}')
        MEM_FREE=$(echo "$MEM_INFO" | grep MemFree | awk '{print $2}')
        MEM_AVAILABLE=$(echo "$MEM_INFO" | grep MemAvailable | awk '{print $2}')
        
        # Get temperature if available
        TEMP=$(cat /proc/dmu/temperature 2>/dev/null || echo "N/A")
        
        # Get WAN IP and gateway
        WAN_IP=$(nvram get wan0_ipaddr 2>/dev/null || nvram get wan_ipaddr 2>/dev/null)
        WAN_GATEWAY=$(nvram get wan0_gateway 2>/dev/null || nvram get wan_gateway 2>/dev/null)
        
        # Get load average
        LOAD_AVG=$(cat /proc/loadavg | awk '{print $1","$2","$3}')
        
        echo "STATUS:$MODEL:$FIRMWARE:$UPTIME:$CPU_USAGE:$MEM_TOTAL:$MEM_FREE:$MEM_AVAILABLE:$TEMP:$WAN_IP:$WAN_GATEWAY:$LOAD_AVG"
        
        echo "===ASUS_ROUTER_STATUS_END==="
      `);

      return this.parseAsusStatusData(statusData);
    } catch (error) {
      console.error('Failed to get real router status:', error);
      return null;
    }
  }

  private parseAsusDeviceData(data: string): any[] {
    const devices: any[] = [];
    const deviceMap = new Map(); // To merge data from different sources
    
    const lines = data.split('\n');
    
    for (const line of lines) {
      if (line.startsWith('DHCP:')) {
        const [, mac, ip, hostname, leaseTime] = line.split(':');
        deviceMap.set(mac, {
          macAddress: mac,
          ipAddress: ip,
          name: hostname === '*' ? `Device-${mac.slice(-5)}` : hostname,
          leaseTime,
          connectionType: 'dhcp',
          isOnline: true,
        });
      } else if (line.startsWith('WIRELESS:')) {
        const parts = line.split(':');
        const [, mac, , band, rssi, rate, uptime] = parts;
        const existing = deviceMap.get(mac) || {};
        deviceMap.set(mac, {
          ...existing,
          macAddress: mac,
          connectionType: `wireless-${band}`,
          signalStrength: rssi,
          connectionRate: rate,
          uptime: uptime,
          isOnline: true,
        });
      } else if (line.startsWith('ARP:')) {
        const [, mac, ip, iface, flags] = line.split(':');
        const existing = deviceMap.get(mac) || {};
        deviceMap.set(mac, {
          ...existing,
          macAddress: mac,
          ipAddress: ip || existing.ipAddress,
          networkInterface: iface,
          isOnline: true,
        });
      } else if (line.startsWith('CUSTOM:')) {
        const [, mac, name, type] = line.split(':');
        const existing = deviceMap.get(mac) || {};
        deviceMap.set(mac, {
          ...existing,
          macAddress: mac,
          name: name || existing.name,
          deviceType: this.getDeviceTypeFromAsus(type),
        });
      }
    }

    // Convert map to array and add device type detection
    Array.from(deviceMap.entries()).forEach(([mac, device]) => {
      devices.push({
        ...device,
        deviceType: device.deviceType || this.detectDeviceType(mac, device.name || ''),
        downloadSpeed: 0, // Will be populated by bandwidth monitoring
        uploadSpeed: 0,
        connectedAt: new Date(),
        lastSeen: new Date(),
      });
    });

    return devices;
  }

  private parseAsusWiFiData(data: string): any[] {
    const networks: any[] = [];
    const lines = data.split('\n');
    
    for (const line of lines) {
      if (line.startsWith('NETWORK:')) {
        const [, ssid, band, channel, enabled, security, power, bandwidth, clients] = line.split(':');
        networks.push({
          ssid,
          band,
          channel: parseInt(channel) || 0,
          isEnabled: enabled === '1',
          securityMode: this.parseSecurityMode(security),
          transmitPower: parseInt(power) || 0,
          bandwidth: bandwidth,
          connectedDevices: parseInt(clients) || 0,
          isGuest: false,
        });
      } else if (line.startsWith('GUEST:')) {
        const [, ssid, iface, enabled] = line.split(':');
        networks.push({
          ssid,
          band: iface.includes('wl0') ? '2.4GHz' : iface.includes('wl1') ? '5GHz' : '6GHz',
          isEnabled: enabled === '1',
          isGuest: true,
          connectedDevices: 0,
        });
      }
    }
    
    return networks;
  }

  private parseAsusStatusData(data: string): any {
    const lines = data.split('\n');
    
    for (const line of lines) {
      if (line.startsWith('STATUS:')) {
        const [, model, firmware, uptime, cpuUsage, memTotal, memFree, memAvailable, temp, wanIp, wanGateway, loadAvg] = line.split(':');
        
        const memTotalKB = parseInt(memTotal) || 0;
        const memFreeKB = parseInt(memFree) || 0;
        const memUsage = memTotalKB > 0 ? ((memTotalKB - memFreeKB) / memTotalKB) * 100 : 0;
        
        return {
          model,
          firmware,
          ipAddress: wanIp,
          uptime: parseInt(parseFloat(uptime)) || 0,
          cpuUsage: parseFloat(cpuUsage) || 0,
          memoryUsage: memUsage,
          memoryTotal: memTotalKB / 1024, // Convert to MB
          temperature: temp !== 'N/A' ? parseFloat(temp) : null,
          loadAverage: loadAvg,
          lastUpdated: new Date(),
        };
      }
    }
    
    return null;
  }

  private getDeviceTypeFromAsus(type: string): string {
    // ASUS device type mapping
    switch (type) {
      case '1': return 'smartphone';
      case '2': return 'laptop';
      case '3': return 'desktop';
      case '4': return 'tv';
      case '5': return 'tablet';
      case '6': return 'gaming';
      default: return 'unknown';
    }
  }

  private detectDeviceType(mac: string, name: string): string {
    const macLower = mac.toLowerCase();
    const nameLower = name.toLowerCase();
    
    // MAC OUI detection for common manufacturers
    if (macLower.startsWith('00:50:56')) return 'virtual-machine';
    if (macLower.startsWith('b8:27:eb') || macLower.startsWith('dc:a6:32')) return 'raspberry-pi';
    
    // Name-based detection
    if (nameLower.includes('iphone') || nameLower.includes('android')) return 'smartphone';
    if (nameLower.includes('ipad') || nameLower.includes('tablet')) return 'tablet';
    if (nameLower.includes('macbook') || nameLower.includes('laptop')) return 'laptop';
    if (nameLower.includes('imac') || nameLower.includes('desktop')) return 'desktop';
    if (nameLower.includes('tv') || nameLower.includes('roku')) return 'tv';
    
    return 'unknown';
  }

  private parseSecurityMode(security: string): string {
    if (security.includes('psk2')) return 'WPA2';
    if (security.includes('psk3') || security.includes('sae')) return 'WPA3';
    if (security.includes('psk')) return 'WPA';
    if (security.includes('wep')) return 'WEP';
    return 'Open';
  }
}

export const asusAPI = new AsusRouterAPI();