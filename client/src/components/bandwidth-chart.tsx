import { useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import type { BandwidthData } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";

// Chart.js imports
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { Line } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface BandwidthChartProps {
  className?: string;
}

export default function BandwidthChart({ className }: BandwidthChartProps) {
  const { data: bandwidthData, isLoading } = useQuery<BandwidthData[]>({
    queryKey: ["/api/bandwidth"],
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>Bandwidth Usage</CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-64 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!bandwidthData || bandwidthData.length === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>Bandwidth Usage</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 flex items-center justify-center text-muted-foreground">
            No bandwidth data available
          </div>
        </CardContent>
      </Card>
    );
  }

  // Prepare chart data
  const sortedData = [...bandwidthData].sort((a, b) => 
    new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );

  const labels = sortedData.map(data => 
    new Date(data.timestamp).toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit' 
    })
  );

  const downloadData = sortedData.map(data => data.downloadSpeed);
  const uploadData = sortedData.map(data => data.uploadSpeed);

  const chartData = {
    labels,
    datasets: [
      {
        label: 'Download',
        data: downloadData,
        borderColor: '#0066CC',
        backgroundColor: 'rgba(0, 102, 204, 0.1)',
        tension: 0.4,
        fill: true,
      },
      {
        label: 'Upload',
        data: uploadData,
        borderColor: '#00d4aa',
        backgroundColor: 'rgba(0, 212, 170, 0.1)',
        tension: 0.4,
        fill: true,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleColor: '#ffffff',
        bodyColor: '#ffffff',
        borderColor: '#0066CC',
        borderWidth: 1,
      },
    },
    scales: {
      x: {
        grid: {
          color: 'rgba(255, 255, 255, 0.1)',
        },
        ticks: {
          color: '#b0b0b0',
        },
      },
      y: {
        grid: {
          color: 'rgba(255, 255, 255, 0.1)',
        },
        ticks: {
          color: '#b0b0b0',
          callback: function(value: any) {
            return value + ' Mbps';
          },
        },
      },
    },
  };

  const peakDownload = Math.max(...downloadData);
  const peakUpload = Math.max(...uploadData);

  return (
    <Card className={className}>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Bandwidth Usage</CardTitle>
        <Select defaultValue="24h">
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="24h">Last 24 hours</SelectItem>
            <SelectItem value="7d">Last 7 days</SelectItem>
            <SelectItem value="30d">Last 30 days</SelectItem>
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent>
        <div className="h-64">
          <Line data={chartData} options={options} />
        </div>
        
        <div className="flex items-center justify-between mt-4 text-sm">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-[#0066CC] rounded-full"></div>
              <span className="text-muted-foreground">Download</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-[#00d4aa] rounded-full"></div>
              <span className="text-muted-foreground">Upload</span>
            </div>
          </div>
          <div className="text-muted-foreground">
            Peak: <span className="text-foreground font-medium">
              {Math.max(peakDownload, peakUpload).toFixed(1)} Mbps
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
