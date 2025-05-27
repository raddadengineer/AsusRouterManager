import InteractiveTopology from "@/components/interactive-topology";
import TopBar from "@/components/top-bar";

export default function NetworkTopologyPage() {
  return (
    <div>
      <TopBar 
        title="Interactive Network Topology" 
        subtitle="Drag and explore your real network connections live"
      />
      <div className="p-6">
        <InteractiveTopology className="h-[700px]" />
      </div>
    </div>
  );
}
