# ASUS Router Management Interface

A comprehensive web application for managing ASUS routers with Merlin firmware, providing advanced network monitoring and configuration tools with enhanced connection reliability and diagnostic capabilities.

## Features

### Core Functionality
- 🖥️ Modern responsive UI with dark/light theme support
- 🔌 Secure SSH connectivity to ASUS routers with Merlin firmware
- 📊 Real-time system monitoring and bandwidth tracking
- 📱 Advanced connected device management with grouping and tagging
- 📡 WiFi network configuration and monitoring
- 🔄 Port forwarding rule management
- 🛠️ Comprehensive system administration tools

### Advanced Features
- 🤖 Automated background services for continuous monitoring
- 🔍 Device discovery and network topology mapping
- 📈 Historical bandwidth usage analytics
- 🚨 Router health monitoring and alerts
- 🏷️ Device organization with custom groups and tags
- 📋 Detailed device information and connection analysis
- 🔐 Encrypted storage of sensitive configuration data
- ⚡ Real-time data synchronization with configurable intervals

### Technical Capabilities
- Network topology visualization
- Device type detection and classification
- WiFi network scanning and analysis
- Router feature detection (QoS, AI Protection, etc.)
- Background job scheduling and management
- Comprehensive error handling and diagnostics

## Technology Stack

### Frontend
- **React.js** with TypeScript for type-safe development
- **Vite** for fast development and optimized builds
- **Tailwind CSS** for responsive, utility-first styling
- **shadcn/ui** component library for consistent UI design
- **Wouter** for lightweight client-side routing
- **TanStack Query** for efficient data fetching and caching
- **React Hook Form** with Zod validation for form management
- **Lucide React** icons for visual consistency

### Backend
- **Node.js** with Express.js framework
- **TypeScript** for full-stack type safety
- **SSH2** library for secure router communication
- **Drizzle ORM** with PostgreSQL for data persistence
- **Express Session** for user session management
- **Cron** for automated background job scheduling

### Database & Storage
- **PostgreSQL** for reliable data persistence
- **Drizzle ORM** for type-safe database operations
- **Encrypted storage** for sensitive SSH credentials
- **In-memory caching** for frequently accessed data

### Security & Reliability
- **AES-256-GCM encryption** for sensitive data storage
- **Connection pooling** for database optimization
- **Error boundaries** and comprehensive error handling
- **Background service management** with automatic recovery
- **Input validation** with Zod schemas throughout the stack

## Local Docker Deployment

### Prerequisites

1. **Docker** and **Docker Compose** installed on your system
2. **ASUS router with Merlin firmware** with SSH enabled
3. Network access to your router

### Quick Start

1. **Clone or download** the project files
2. **Navigate** to the project directory
3. **Start the application** with Docker Compose:

```bash
docker-compose up -d
```

4. **Access the interface** at `http://localhost:5010`

### What You Need

#### Software Requirements:
- Docker Desktop (Windows/Mac) or Docker Engine + Docker Compose (Linux)
- Web browser (Chrome, Firefox, Safari, Edge)

#### Network Requirements:
- Your computer and ASUS router on the same network
- SSH access enabled on your ASUS router
- Router admin credentials

### Router Setup

Before connecting, ensure your ASUS router has SSH enabled:

1. Log into your router's web interface
2. Go to **Administration** → **System**
3. Enable **SSH Daemon** 
4. Set SSH port (default: 22)
5. Note your router's IP address (usually 192.168.1.1)

### Configuration

Once the application is running:

1. Navigate to **System Settings**
2. Find the **ASUS Router SSH Connection** section
3. Enter your router details:
   - **Router IP**: Your router's local IP (e.g., 192.168.1.1)
   - **SSH Port**: Usually 22
   - **Username**: Your router admin username
   - **Password**: Your router admin password
4. Click **Test Connection** to verify
5. Enable **SSH connection for real-time data**
6. Click **Save Configuration**

### Docker Services

The deployment includes:

- **Web Application** (port 5010): Router management interface
- **PostgreSQL Database** (port 5433): Data persistence
- **Automatic networking**: Services can communicate securely

### Useful Commands

```bash
# Start services
docker-compose up -d

# Stop services
docker-compose down

# View logs
docker-compose logs -f

# Rebuild after changes
docker-compose up -d --build

# Remove everything (including data)
docker-compose down -v
```

### Accessing Your Router Data

After successful SSH connection, the interface will:
- Pull real system information (CPU, memory, temperature)
- Display actual connected devices
- Show current WiFi network status
- Monitor real bandwidth usage
- Sync router configuration

### Troubleshooting

**Connection Issues:**
- Verify SSH is enabled on your router
- Check router IP address and credentials
- Ensure firewall allows SSH connections
- Try connecting manually via SSH first

**Docker Issues:**
- Ensure Docker is running
- Check port 5010 is not in use
- Run `docker-compose logs` for error details

**Database Issues:**
- PostgreSQL data persists in Docker volumes
- Reset database: `docker-compose down -v && docker-compose up -d`

### Security Notes

- SSH credentials are stored securely in the database
- Passwords are not transmitted in API responses
- Run on trusted networks only
- Use strong router admin passwords

## Application Features

### Dashboard Overview
- Real-time router status monitoring (CPU, memory, temperature)
- Live bandwidth usage charts and historical data
- Connected device count and network health indicators
- Router feature status (QoS, AI Protection, Guest Networks)

### Device Management
- **Device Discovery**: Automatic detection of all connected devices
- **Device Grouping**: Organize devices into custom groups (Family, Work, IoT, etc.)
- **Device Tagging**: Apply custom tags for better organization and filtering
- **Enhanced Device Info**: Detailed information including connection type, IP assignment, and signal strength
- **Connection Analysis**: Monitor device connection patterns and bandwidth usage
- **Device Type Detection**: Automatic classification (Phone, Laptop, Smart TV, etc.)

### Network Monitoring
- **WiFi Network Management**: View and configure all WiFi networks (2.4GHz, 5GHz, Guest)
- **Network Topology**: Visual representation of network structure
- **Bandwidth Analytics**: Historical usage tracking with configurable intervals
- **Router Health Checks**: Continuous monitoring with alert capabilities
- **Port Forwarding**: Manage and configure port forwarding rules

### Background Services
The application includes automated background jobs that run continuously:

- **Device Discovery** (every 2 minutes): Scans for new devices on the network
- **Device Detail Sync** (every 5 minutes): Updates detailed device information
- **Bandwidth Monitoring** (every minute): Collects bandwidth usage data
- **Router Health Check** (every 5 minutes): Monitors router performance
- **WiFi Network Scan** (every 10 minutes): Updates WiFi network information

### Security Features
- **Encrypted Credential Storage**: SSH passwords and sensitive data encrypted with AES-256-GCM
- **Secure SSH Communication**: All router communication over encrypted SSH connections
- **Input Validation**: Comprehensive validation using Zod schemas
- **Error Boundaries**: Graceful error handling throughout the application

### API Endpoints

#### Router Management
- `GET /api/router/status` - Current router status and system information
- `GET /api/router/features` - Router capabilities and feature status
- `POST /api/router/test-connection` - Test SSH connection to router

#### Device Management
- `GET /api/devices` - List all connected devices
- `GET /api/devices/:id` - Get specific device details
- `POST /api/devices` - Add new device manually
- `PUT /api/devices/:id` - Update device information
- `DELETE /api/devices/:id` - Remove device

#### Network Configuration
- `GET /api/wifi` - List all WiFi networks
- `POST /api/wifi` - Create new WiFi network
- `PUT /api/wifi/:id` - Update WiFi network settings
- `DELETE /api/wifi/:id` - Remove WiFi network

#### Port Forwarding
- `GET /api/port-forwarding` - List port forwarding rules
- `POST /api/port-forwarding` - Create new rule
- `PUT /api/port-forwarding/:id` - Update existing rule
- `DELETE /api/port-forwarding/:id` - Remove rule

#### Analytics
- `GET /api/bandwidth` - Bandwidth usage data
- `POST /api/bandwidth` - Add bandwidth data point

#### System Management
- `GET /api/ssh-config` - Current SSH configuration (passwords excluded)
- `POST /api/ssh-config` - Save SSH configuration
- `DELETE /api/ssh-config` - Clear SSH configuration
- `POST /api/clear-data` - Clear all application data

### Development

#### Prerequisites for Development
- Node.js 18+ and npm
- PostgreSQL database (or use Docker for database only)
- Access to an ASUS router with Merlin firmware

#### Local Development Setup
```bash
# Install dependencies
npm install

# Set up environment variables (copy from .env.example if available)
# DATABASE_URL=postgresql://username:password@localhost:5432/router_management

# Initialize database (if using local PostgreSQL)
npm run db:push

# Start development server
npm run dev
```

#### Development Commands
```bash
# Start development server with hot reload
npm run dev

# Build for production
npm run build

# Database operations
npm run db:push          # Push schema changes to database
npm run db:studio        # Open Drizzle Studio for database management

# Type checking
npm run type-check
```

#### Environment Variables
- `DATABASE_URL` - PostgreSQL connection string
- `SSH_ENCRYPTION_KEY` - Key for encrypting SSH credentials (auto-generated if not provided)
- `NODE_ENV` - Environment mode (development/production)

Access development server at `http://localhost:5010`
