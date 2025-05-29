// Quick debug script to show AiMesh devices
const fetch = require('node:fetch');

async function showAiMeshDevices() {
  try {
    const response = await fetch('http://localhost:3000/api/aimesh/nodes');
    const data = await response.json();
    
    console.log('\n=== AiMesh Devices Detected ===');
    console.log(`Command: cat /var/lib/misc/dnsmasq.leases | grep -Ei 'rp-|rt-|aimesh|asus'`);
    console.log(`Total devices found: ${data.nodes?.length || 0}\n`);
    
    if (data.nodes && data.nodes.length > 0) {
      data.nodes.forEach((node, i) => {
        console.log(`${i + 1}. Device Name: ${node.name}`);
        console.log(`   MAC Address: ${node.macAddress}`);
        console.log(`   IP Address: ${node.ipAddress}`);
        console.log(`   Role: ${node.role}`);
        console.log(`   Detection: ${node.detectionMethod}`);
        console.log('');
      });
    } else {
      console.log('No AiMesh nodes detected');
    }
  } catch (error) {
    console.error('Error:', error.message);
  }
}

showAiMeshDevices();