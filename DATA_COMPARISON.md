# Data Available: API vs SSH

## Current API Endpoints (Database Storage)
**Available Now - No Router Connection Required:**

### `/api/devices` - Connected Devices
- Device name, MAC address, IP address
- Device type (laptop, smartphone, tablet, etc.)
- Connection status (online/offline)
- Download/upload speeds (if recorded)
- Connection timestamps
- **Limitation:** Static data, not real-time from router

### `/api/router/status` - Router Status
- Model, firmware version
- CPU usage, memory usage, temperature
- Uptime, IP address
- **Limitation:** Manual entry or cached data

### `/api/wifi` - WiFi Networks
- SSID, band (2.4/5/6GHz), channel
- Security mode, enabled status
- Connected device count
- **Limitation:** Configuration data, not live status

### `/api/bandwidth` - Bandwidth Data
- Historical bandwidth usage
- Upload/download statistics
- **Limitation:** Stored measurements, not real-time

### `/api/router/features` - Router Features
- QoS settings, VPN status
- Hardware acceleration features
- **Limitation:** Feature flags, not live data

---

## SSH Router Data (Real-Time from ASUS Router)
**Requires SSH Connection to Your Router:**

### Real Connected Devices
```bash
# DHCP leases with authentic hostnames
cat /tmp/dnsmasq.leases

# Live ARP table
cat /proc/net/arp

# Wireless clients with signal strength
wl -i wl0 assoclist  # 2.4GHz clients
wl -i wl1 assoclist  # 5GHz clients
wl -i wl2 assoclist  # 6GHz clients
```
**Benefits:** Real device names, live connection status, actual signal strength (RSSI)

### Authentic WiFi Client Data
```bash
# Wireless clients by band with RSSI
wl -i wl0 rssi <MAC>  # Signal strength
wl -i wl0 rate <MAC>  # Connection rate
```
**Benefits:** Live client counts per band, real signal strength, connection rates

### Real AiMesh Topology
```bash
# AiMesh configuration
nvram get amas_mode      # Master/node status
nvram get amas_peerlist  # Connected nodes
nvram get et0macaddr     # Main router MAC
```
**Benefits:** Actual mesh network structure, real node MACs

### Live Router Status
```bash
# Real system metrics
cat /proc/meminfo        # Memory usage
cat /proc/loadavg        # CPU load
cat /proc/uptime         # Actual uptime
cat /proc/dmu/temperature # Router temperature
```
**Benefits:** Real-time system metrics, accurate resource usage

### Authentic Network Features
```bash
# Real feature status
nvram get qos_enable     # QoS status
nvram get vpn_server_enable  # VPN status
nvram get fc_enable      # Hardware acceleration
```
**Benefits:** Live feature status from router firmware

---

## Summary

| Data Type | API (Database) | SSH (Router) |
|-----------|----------------|--------------|
| **Device Names** | Static/Manual | Real hostnames from DHCP |
| **Connection Status** | Last known | Live status |
| **WiFi Clients** | Estimated | Real counts per band |
| **Signal Strength** | Not available | Live RSSI values |
| **AiMesh Nodes** | Configuration | Live mesh topology |
| **System Metrics** | Cached | Real-time |
| **Feature Status** | Settings | Live firmware status |

**The key difference:** API data is stored/configured information, while SSH data is live, authentic information directly from your router's firmware.