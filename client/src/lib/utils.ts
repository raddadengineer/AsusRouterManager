import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  
  return `${days}d ${hours}h ${minutes}m`;
}

export function formatBytes(bytes: number, decimals = 2): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];

  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

export function formatSpeed(mbps: number): string {
  if (mbps >= 1000) {
    return `${(mbps / 1000).toFixed(1)} Gbps`;
  }
  return `${mbps.toFixed(1)} Mbps`;
}

export function getDeviceIcon(deviceType: string): string {
  switch (deviceType.toLowerCase()) {
    case 'laptop':
      return 'laptop';
    case 'mobile':
    case 'phone':
      return 'mobile-alt';
    case 'desktop':
    case 'pc':
      return 'desktop';
    case 'tv':
    case 'television':
      return 'tv';
    case 'tablet':
      return 'tablet-alt';
    case 'router':
      return 'router';
    case 'printer':
      return 'print';
    case 'camera':
      return 'camera';
    case 'speaker':
      return 'volume-up';
    case 'gaming':
      return 'gamepad';
    default:
      return 'question';
  }
}

export function getDeviceColorClass(deviceType: string): string {
  switch (deviceType.toLowerCase()) {
    case 'laptop':
      return 'device-laptop';
    case 'mobile':
    case 'phone':
    case 'tablet':
      return 'device-mobile';
    case 'desktop':
    case 'pc':
    case 'gaming':
      return 'device-desktop';
    case 'tv':
    case 'television':
      return 'device-tv';
    default:
      return 'device-unknown';
  }
}

export function getStatusColor(isOnline: boolean): string {
  return isOnline ? 'status-online' : 'status-offline';
}

export function formatMacAddress(mac: string): string {
  return mac.toUpperCase().replace(/(.{2})(?=.)/g, '$1:');
}

export function generateRandomMacAddress(): string {
  const hexChars = '0123456789ABCDEF';
  let mac = '';
  for (let i = 0; i < 12; i++) {
    mac += hexChars[Math.floor(Math.random() * 16)];
    if (i % 2 === 1 && i < 11) mac += ':';
  }
  return mac;
}

export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}
