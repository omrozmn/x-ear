// Mock Services - Basit implementasyonlar
export const mockServices = {
  // Communications
  getCommunications: () => Promise.resolve({ data: [], success: true }),
  createCommunication: () => Promise.resolve({ data: {}, success: true }),
  updateCommunication: () => Promise.resolve({ data: {}, success: true }),
  deleteCommunication: () => Promise.resolve({ success: true }),
  
  // Sales
  getSales: () => Promise.resolve({ data: [], success: true }),
  createSale: () => Promise.resolve({ data: {}, success: true }),
  updateSale: () => Promise.resolve({ data: {}, success: true }),
  deleteSale: () => Promise.resolve({ success: true }),
  
  // Timeline
  getTimeline: () => Promise.resolve({ data: [], success: true }),
  
  // SGK
  getSgk: () => Promise.resolve({ data: [], success: true }),
  
  // Appointments
  getAppointments: () => Promise.resolve({ data: [], success: true }),
  createAppointment: () => Promise.resolve({ data: {}, success: true }),
  updateAppointment: () => Promise.resolve({ data: {}, success: true }),
  deleteAppointment: () => Promise.resolve({ success: true }),
  
  // Hearing Tests
  getHearingTests: () => Promise.resolve({ data: [], success: true }),
  createHearingTest: () => Promise.resolve({ data: {}, success: true }),
  
  // Notes
  getNotes: () => Promise.resolve({ data: [], success: true }),
  createNote: () => Promise.resolve({ data: {}, success: true }),
  deleteNote: () => Promise.resolve({ success: true }),
  
  // Bulk operations
  bulkUpload: () => Promise.resolve({ success: true }),
  exportCsv: () => Promise.resolve({ success: true }),
  
  // Search
  search: () => Promise.resolve({ data: [], success: true }),
  
  // Generic API calls
  apiCall: () => Promise.resolve({ data: null, success: true })
};

export default mockServices;