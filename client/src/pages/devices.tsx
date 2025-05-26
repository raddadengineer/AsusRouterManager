import DeviceTable from "@/components/device-table";
import TopBar from "@/components/top-bar";

export default function ConnectedDevicesPage() {
  return (
    <div>
      <TopBar 
        title="Connected Devices" 
        subtitle="Manage and monitor all connected devices"
      />
      <div className="p-6">
        <DeviceTable />
      </div>
    </div>
  );
}
