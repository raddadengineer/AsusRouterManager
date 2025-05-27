# Comprehensive Data Sources: API vs SSH

## API Endpoints (Database Storage)

### Router Status `/api/router/status`
- Router model and firmware version
- IP address and uptime
- CPU usage percentage
- Memory usage and total memory
- Temperature readings
- Storage usage and capacity
- Load averages
- CPU cores and model information
- Last updated timestamp

### Connected Devices `/api/devices`
- Device ID and name
- MAC address (unique identifier)
- IP address assignment
- Device type classification
- Online/offline status
- Download and upload speeds
- Connection timestamps
- Last seen timestamp
- Connection type (wired/wireless)
- Hostname information

### WiFi Networks `/api/wifi`
- SSID names
- Frequency bands (2.4GHz, 5GHz, 6GHz)
- Channel assignments
- Enabled/disabled status
- Security modes (WPA2, WPA3, etc.)
- Password configurations
- Connected device counts per network

### Port Forwarding Rules `/api/port-forwarding`
- Rule names and descriptions
- Protocol types (TCP, UDP, Both)
- External and internal ports
- Target device IP addresses
- Enabled/disabled status
- Creation timestamps

### Bandwidth Data `/api/bandwidth`
- Historical bandwidth measurements
- Upload and download speeds
- Total data transferred
- Timestamp recordings
- Network interface statistics

### Router Features `/api/router/features`
- QoS configuration status
- VPN server settings
- Hardware acceleration features
- Guest network configurations
- Security feature status

---

## SSH Direct Router Access

### Real-Time Device Detection
```bash
# DHCP client list with lease information
cat /tmp/dnsmasq.leases
# Returns: timestamp, MAC, IP, hostname, lease_duration

# Active ARP table
cat /proc/net/arp
# Returns: IP, HW_type, flags, MAC, mask, device

# Router's custom client list
nvram get custom_clientlist
# Returns: stored device names and types
```

### Wireless Client Analytics
```bash
# Wireless clients per interface
wl -i wl0 assoclist  # 2.4GHz band
wl -i wl1 assoclist  # 5GHz band  
wl -i wl2 assoclist  # 6GHz band

# Signal strength for specific clients
wl -i wl0 rssi <MAC_ADDRESS>
# Returns: RSSI value in dBm

# Connection rates
wl -i wl0 rate <MAC_ADDRESS>
# Returns: current connection speed

# Detailed client information
wl -i wl0 sta_info <MAC_ADDRESS>
# Returns: comprehensive client statistics
```

### AiMesh Network Topology
```bash
# AiMesh mode (master/node)
nvram get amas_mode
# Returns: 0=master, 1=node

# Connected mesh peers
nvram get amas_peerlist
# Returns: space-separated MAC addresses

# Main router MAC
nvram get et0macaddr
# Returns: primary interface MAC address

# Mesh node details
nvram get amas_ethnode
# Returns: ethernet-connected nodes
```

### System Performance Metrics
```bash
# Memory information
cat /proc/meminfo
# Returns: detailed memory breakdown

# CPU load averages
cat /proc/loadavg
# Returns: 1min, 5min, 15min averages

# System uptime
cat /proc/uptime
# Returns: total uptime in seconds

# Temperature monitoring
cat /proc/dmu/temperature
# Returns: router temperature readings

# CPU usage
top -bn1 | grep "CPU:"
# Returns: real-time CPU utilization
```

### Network Interface Statistics
```bash
# Interface traffic counters
cat /proc/net/dev
# Returns: RX/TX bytes, packets, errors

# WAN connection status
nvram get wan0_state_t
nvram get wan0_ipaddr
nvram get wan0_gateway

# Wireless interface details
wl status  # Per interface status
```

### Router Feature Status
```bash
# QoS configuration
nvram get qos_enable
nvram get qos_type

# VPN server status
nvram get vpn_server_enable
nvram get vpn_server_proto

# Hardware acceleration
nvram get ctf_enable
nvram get fc_enable
nvram get runner_enable

# Guest networks
nvram get wl0.1_bss_enabled  # 2.4GHz guest
nvram get wl1.1_bss_enabled  # 5GHz guest

# Security features
nvram get aiprotection_enable
nvram get tm_malware
nvram get tm_vprot
```

### Advanced Network Analysis
```bash
# Port forwarding rules (active)
iptables -t nat -L PREROUTING -n --line-numbers

# Active network connections
netstat -tuln

# Routing table
route -n

# DNS configuration
cat /tmp/resolv.conf

# DHCP lease tracking
tail -f /var/log/dnsmasq.log
```

### Bandwidth Monitoring
```bash
# Real-time interface statistics
cat /sys/class/net/*/statistics/rx_bytes
cat /sys/class/net/*/statistics/tx_bytes

# Per-device bandwidth (if available)
cat /proc/net/ip_conntrack
# Returns: connection tracking data
```

---

## Key Differences Summary

| Data Category | API Source | SSH Source |
|---------------|------------|------------|
| **Device Names** | Manual/stored | Real DHCP hostnames |
| **Connection Status** | Last known state | Live network presence |
| **WiFi Clients** | Configuration counts | Real-time associations |
| **Signal Quality** | Not available | Live RSSI measurements |
| **Mesh Topology** | Static config | Dynamic peer discovery |
| **System Load** | Periodic snapshots | Real-time metrics |
| **Feature Status** | Settings cache | Live firmware state |
| **Network Traffic** | Historical logs | Live interface counters |
| **Security Status** | Configuration flags | Active protection state |

**SSH provides authentic, real-time data directly from your router's firmware, while API endpoints serve stored configuration and historical data.**