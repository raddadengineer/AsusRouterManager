import NetworkTopology from "@/components/network-topology";
import TopBar from "@/components/top-bar";

export default function NetworkTopologyPage() {
  return (
    <div>
      <TopBar 
        title="Network Topology" 
        subtitle="Visual representation of your network structure"
      />
      <div className="p-6">
        <NetworkTopology className="h-[600px]" />
      </div>
    </div>
  );
}
