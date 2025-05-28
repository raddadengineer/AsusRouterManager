import { sshClient } from './ssh-client';
import { storage } from './storage';

export class AiMeshSyncService {
  
  async syncAiMeshNodes() {
    try {
      console.log("Syncing AiMesh nodes using ASUS-specific commands...");
      
      // Use your normalized tab-separated AiMesh discovery command
      const aimeshCommand = `{ [ -f /etc/dnsmasq.leases ] && cat /etc/dnsmasq.leases || cat /var/lib/misc/dnsmasq.leases; } 2>/dev/null | grep -Ei "aimesh|rt-|rp-|asus" | awk '{ printf "%s\\t%s\\t%s\\n", $2, $4, ($3 == "*" ? "" : $3) }'`;
      const aimeshResult = await sshClient.executeCommand(aimeshCommand);
      
      const nodes: any[] = [];
      const lines = aimeshResult.split('\n').filter(line => line.trim().length > 0);
      
      for (const line of lines) {
        const parts = line.split('\t');
        if (parts.length >= 2) {
          const [macAddress, hostname, ipAddress] = parts;
          
          nodes.push({
            name: hostname || `AiMesh-${macAddress.slice(-5)}`,
            ipAddress: ipAddress || '',
            macAddress: macAddress.toLowerCase(),
            isOnline: true,
            nodeType: hostname.toLowerCase().includes('aimesh') ? 'aimesh' : 'router',
            lastSeen: new Date()
          });
        }
      }
      
      // Also get main router info
      try {
        const mainRouterResult = await sshClient.executeCommand(`
          echo "$(nvram get lan_ipaddr) $(nvram get lan_hwaddr) $(nvram get productid)"
        `);
        
        const [ip, mac, model] = mainRouterResult.trim().split(' ');
        if (ip && mac) {
          nodes.push({
            name: model || 'Main Router',
            ipAddress: ip,
            macAddress: mac.toLowerCase(),
            isOnline: true,
            nodeType: 'main',
            lastSeen: new Date()
          });
        }
      } catch (error) {
        console.log('Could not get main router info');
      }
      
      console.log(`Found ${nodes.length} AiMesh nodes`);
      
      // Store nodes (you would implement storage methods for this)
      for (const node of nodes) {
        // Store each node in your database
        console.log(`AiMesh Node: ${node.name} (${node.ipAddress}) - ${node.nodeType}`);
      }
      
      return nodes;
    } catch (error) {
      console.error("Error syncing AiMesh nodes:", error);
      return [];
    }
  }
}

export const aiMeshSync = new AiMeshSyncService();