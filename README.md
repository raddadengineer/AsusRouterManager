# ASUS Router Management System

A comprehensive web-based management interface for ASUS routers running Merlin firmware, providing advanced network monitoring, configuration tools, and real-time diagnostics with enhanced connection reliability.

## 🚀 Features

### Core Management
- **Real-time Router Monitoring** - Live system metrics, CPU, memory, and temperature
- **Device Discovery & Management** - Automatic detection of all connected devices
- **Network Topology Visualization** - Interactive network mapping with AiMesh support
- **WiFi Network Management** - Complete wireless configuration and monitoring
- **Bandwidth Monitoring** - Real-time traffic analysis and historical data
- **Port Forwarding Management** - Easy port forwarding rule configuration
- **Background Services** - Automated data collection and synchronization

### Advanced Features
- **AiMesh Node Management** - Full mesh network topology and node control
- **Device Grouping & Tagging** - Organize devices with custom groups and tags
- **Router Feature Detection** - Automatic detection of Merlin-specific capabilities
- **System Logs & Diagnostics** - Comprehensive logging and troubleshooting tools
- **Dark Theme Support** - Modern, responsive dark/light theme interface
- **Database Persistence** - PostgreSQL backend for reliable data storage

## 🛠 Technology Stack

- **Frontend**: React.js, TypeScript, Tailwind CSS, shadcn/ui
- **Backend**: Node.js, Express, TypeScript
- **Database**: PostgreSQL with Drizzle ORM
- **Router Communication**: SSH client for ASUS Merlin firmware
- **Real-time Updates**: Background job scheduling with cron
- **State Management**: TanStack Query for data fetching and caching

## 📋 Prerequisites

- ASUS router with Merlin firmware installed
- SSH access enabled on your router
- Node.js 18+ and npm
- PostgreSQL database (included in setup)

## 🚀 Quick Start

### 1. Clone and Install
```bash
git clone <repository-url>
cd asus-router-management
npm install
```

### 2. Database Setup
```bash
# Initialize database
npm run db:push

# Optional: Reset database
npm run db:reset
```

### 3. Start Development Server
```bash
npm run dev
```

The application will be available at `http://localhost:5010`

### 4. Configure Router Connection
1. Navigate to **System Settings** in the web interface
2. Enter your router's SSH credentials:
   - **Host**: Your router IP (usually 192.168.1.1)
   - **Username**: admin (or your custom username)
   - **Password**: Your router admin password
   - **Port**: 22 (SSH port)
3. Enable real-time sync and set your preferred interval
4. Click **Save & Connect**

## 📁 Project Structure

```
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/     # Reusable UI components
│   │   ├── pages/         # Application pages
│   │   ├── hooks/         # Custom React hooks
│   │   └── lib/           # Utility functions
├── server/                 # Express backend
│   ├── index.ts           # Main server entry point
│   ├── routes.ts          # API route definitions
│   ├── storage.ts         # Database storage layer
│   ├── ssh-client.ts      # SSH communication with router
│   ├── router-sync.ts     # Data synchronization service
│   └── background-services.ts # Automated job management
├── shared/                 # Shared TypeScript types
│   └── schema.ts          # Database schema and types
└── README.md              # This file
```

## 🔧 Available Scripts

### Development
```bash
npm run dev              # Start development server with hot reload
npm run build            # Build for production
npm run start            # Start production server
```

### Database Management
```bash
npm run db:push          # Push schema changes to database
npm run db:studio        # Open Drizzle Studio (database GUI)
npm run db:generate      # Generate new migration files
npm run db:migrate       # Run pending migrations
```

### Testing & Debugging
```bash
npm run lint             # Run ESLint
npm run type-check       # Run TypeScript type checking
npm run test             # Run test suite (if configured)
```

## 🔐 SSH Configuration

### Router Setup
1. Enable SSH on your ASUS router:
   - Go to **Administration** > **System**
   - Set **Enable SSH** to **Yes**
   - Choose **LAN only** for security
   - Set SSH port (default: 22)

2. Create or use existing admin credentials
3. Test SSH connection manually:
```bash
ssh admin@192.168.1.1
```

### Application Configuration
- Use the web interface **System Settings** page
- All credentials are stored securely in the database
- Connection status is displayed in real-time
- Auto-reconnection on connection loss

## 📊 Background Services

The system runs 7 automated background jobs that continuously collect authentic data from your ASUS router:

### 1. Device Discovery (Every 60s)
**Purpose**: Scans for newly connected devices on your network
**Commands Used**:
```bash
# ARP table for all connected devices
arp -a

# DHCP leases for IP assignments
cat /var/lib/dhcp/dhcpd.leases

# Active network connections
netstat -an | grep ESTABLISHED
```

### 2. Device Detail Sync (Every 30s)
**Purpose**: Updates detailed information for each discovered device
**Commands Used**:
```bash
# Enhanced device information via MAC lookup
wl -i eth1 sta_info [MAC_ADDRESS]
wl -i eth2 sta_info [MAC_ADDRESS]

# Signal strength and connection quality
wl -i eth1 rssi [MAC_ADDRESS]
wl -i eth2 rssi [MAC_ADDRESS]

# Device manufacturer lookup via OUI database
```

### 3. Bandwidth Monitoring (Every 10s)
**Purpose**: Collects real-time traffic data for all network interfaces
**Commands Used**:
```bash
# Interface statistics
cat /proc/net/dev

# Per-device traffic via iptables
iptables -L FORWARD -v -n

# Wireless interface traffic
wl -i eth1 counters
wl -i eth2 counters
```

### 4. Router Health Check (Every 120s)
**Purpose**: Monitors overall router system health and performance
**Commands Used**:
```bash
# System uptime and load average
uptime
cat /proc/loadavg

# Memory usage
free -m
cat /proc/meminfo

# CPU temperature (if available)
cat /proc/dmu/temperature
```

### 5. Router Features Sync (Every 300s)
**Purpose**: Detects available router capabilities and Merlin-specific features
**Commands Used**:
```bash
# Hardware acceleration status
nvram get ctf_disable
nvram get runner_disable

# AiProtection status
nvram get wrs_protect_enable

# Adaptive QoS status
nvram get adaptive_qos_enable

# VPN server status
nvram get vpn_server_enable
```

### 6. AiMesh Nodes Sync (Every 180s)
**Purpose**: Updates mesh network topology and node status
**Commands Used**:
```bash
# AiMesh configuration
cfg_mnt

# Node list and status
nvram get cfg_group
nvram get cfg_alias

# Mesh topology information
amas_lib get_node_info
```

### 7. Client Associations Sync (Every 15s)
**Purpose**: Tracks wireless client connections and band assignments
**Commands Used**:
```bash
# 2.4GHz wireless clients
wl -i eth1 assoclist
wl -i eth1 sta_info

# 5GHz wireless clients  
wl -i eth2 assoclist
wl -i eth2 sta_info

# 6GHz wireless clients (if available)
wl -i eth3 assoclist
wl -i eth3 sta_info
```

### Managing Background Services
- **View Status**: Navigate to **Dashboard** > **Background Services**
- **Start/Stop Jobs**: Individual control for each service
- **Run Manually**: "Run Now" button for immediate execution
- **Monitor Performance**: Real-time execution logs and timing
- **Adjust Intervals**: Modify cron expressions in System Settings

### Background Service Configuration
```bash
# View current job status
GET /api/background/jobs

# Start a specific job
POST /api/background/jobs/device-discovery/start

# Stop a specific job
POST /api/background/jobs/bandwidth-monitoring/stop

# Run job immediately
POST /api/background/jobs/router-health-check/run
```

### Cron Schedule Format
```bash
# Format: "second minute hour day month weekday"
"*/10 * * * * *"    # Every 10 seconds
"0 */5 * * * *"     # Every 5 minutes  
"0 0 */2 * * *"     # Every 2 hours
```

### Performance Optimization
- **High Traffic Networks**: Increase intervals to reduce load
- **Large Device Count**: Enable batch processing for device sync
- **Router Performance**: Monitor CPU usage and adjust accordingly
- **Network Stability**: Reduce frequency during peak usage times

## 🌐 API Endpoints

### Router Management
```bash
GET  /api/router/status          # Router system information
POST /api/system/sync            # Manual data synchronization
POST /api/system/reboot          # Reboot router
POST /api/system/backup          # Create configuration backup
```

### Device Management
```bash
GET  /api/devices               # List all connected devices
GET  /api/devices/:id           # Get device details
GET  /api/device-groups         # List device groups
POST /api/device-groups         # Create device group
```

### Network Management
```bash
GET  /api/wifi                  # WiFi networks and settings
GET  /api/bandwidth             # Bandwidth usage data
GET  /api/topology              # Network topology
GET  /api/aimesh/nodes          # AiMesh node information
```

### SSH Configuration
```bash
GET  /api/ssh/config            # Get SSH configuration
POST /api/ssh/config            # Save SSH configuration
POST /api/ssh/test              # Test SSH connection
```

### Background Services
```bash
GET  /api/background/jobs       # List all background jobs
POST /api/background/jobs/:id/start  # Start specific job
POST /api/background/jobs/:id/stop   # Stop specific job
POST /api/background/jobs/:id/run    # Run job immediately
```

## 🔍 Troubleshooting

### Connection Issues
```bash
# Test SSH connection manually
ssh admin@192.168.1.1

# Check if SSH is enabled on router
telnet 192.168.1.1 22

# Verify credentials in System Settings
```

### Database Issues
```bash
# Reset database schema
npm run db:push

# Check database connection
npm run db:studio
```

### Development Issues
```bash
# Clear node modules and reinstall
rm -rf node_modules package-lock.json
npm install

# Check for TypeScript errors
npm run type-check

# Restart development server
npm run dev
```

### Performance Optimization
- Adjust background service intervals in **System Settings**
- Reduce sync frequency for large networks
- Monitor CPU usage in **System Details**
- Check memory usage and optimize as needed

## 🔒 Security Considerations

- SSH credentials are encrypted and stored securely
- All router communication is over SSH (encrypted)
- Database access is restricted to localhost
- No external dependencies for core functionality
- Regular security updates for dependencies

## 📝 Router Commands Reference

### Device Discovery
```bash
# Connected devices via ARP
arp -a

# DHCP leases
cat /var/lib/dhcp/dhcpd.leases

# Wireless clients
wl -i eth1 assoclist
wl -i eth2 assoclist
```

### System Information
```bash
# Router model and firmware
nvram get productid
nvram get buildinfo

# System uptime and load
uptime
cat /proc/loadavg

# Memory usage
free -m
cat /proc/meminfo
```

### Network Status
```bash
# Interface statistics
cat /proc/net/dev

# WiFi network information
nvram get wl0_ssid  # 2.4GHz SSID
nvram get wl1_ssid  # 5GHz SSID
nvram get wl2_ssid  # 6GHz SSID (if available)

# AiMesh node status
cfg_mnt
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature-name`
3. Make your changes and test thoroughly
4. Commit with descriptive messages: `git commit -m "Add feature description"`
5. Push to your fork: `git push origin feature-name`
6. Create a Pull Request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgments

- ASUS for their excellent router hardware
- RMerl for the amazing Merlin firmware
- The open-source community for the tools and libraries used

---

**Note**: This application is designed specifically for ASUS routers running Merlin firmware. Some features may not work with stock ASUS firmware or other router brands.

For support and feature requests, please open an issue on the project repository.