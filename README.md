# ASUS Router Management Interface

A modern web interface for managing ASUS routers with Merlin firmware, featuring SSH connectivity and real-time data synchronization.

## Features

- 🖥️ Modern dark-themed UI inspired by Unifi
- 🔌 SSH connectivity to ASUS routers with Merlin firmware
- 📊 Real-time system monitoring and bandwidth tracking
- 📱 Connected device management
- 📡 WiFi network configuration
- 🔄 Port forwarding management
- 🛠️ System administration tools

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
- **PostgreSQL Database** (port 5432): Data persistence
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
- Check port 5000 is not in use
- Run `docker-compose logs` for error details

**Database Issues:**
- PostgreSQL data persists in Docker volumes
- Reset database: `docker-compose down -v && docker-compose up -d`

### Security Notes

- SSH credentials are stored securely in the database
- Passwords are not transmitted in API responses
- Run on trusted networks only
- Use strong router admin passwords

### Development

For development mode without Docker:
```bash
npm install
npm run dev
```

Access at `http://localhost:5010`