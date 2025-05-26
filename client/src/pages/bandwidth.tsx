import BandwidthChart from "@/components/bandwidth-chart";
import TopBar from "@/components/top-bar";

export default function BandwidthMonitorPage() {
  return (
    <div>
      <TopBar 
        title="Bandwidth Monitor" 
        subtitle="Monitor network usage and performance"
      />
      <div className="p-6">
        <BandwidthChart className="h-[500px]" />
      </div>
    </div>
  );
}
