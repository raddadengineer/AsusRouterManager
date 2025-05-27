// ASUS routers with Merlin firmware do not have REST API endpoints
// All data access is through SSH only - no API integration needed

export class AsusRouterAPI {
  // Empty class - ASUS routers only support SSH access, not HTTP APIs
  async initialize() {
    // No initialization needed - SSH handles all communication
  }
}

export const asusAPI = new AsusRouterAPI();