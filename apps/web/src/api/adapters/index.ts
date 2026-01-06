/**
 * API Adapter Layer - Auto-generated
 * 
 * Bu dosya Orval tarafından üretilen API fonksiyonlarını stabil isimlerle re-export eder.
 * Orval isim değişikliklerinden tüketici kodunu korur.
 * 
 * ⚠️ BU DOSYA OTOMATİK ÜRETİLMİŞTİR - MANUEL DÜZENLEME YAPMAYIN!
 * 
 * Yeniden üretmek için: npm run gen:adapters
 * 
 * Generated at: 2026-01-05T23:01:03.753Z
 */

// ============================================================================
// ACTIVITY LOGS
// ============================================================================
export {
  getActivityLogs,
  getActivityStats,
  getActivityLogFilterOptions,
  useGetActivityLogs,
  useGetActivityStats,
  useGetActivityLogFilterOptions,
} from '../generated/activity-logs/activity-logs';

// ============================================================================
// ADDONS
// ============================================================================
export {
  getAddons,
  createAddon,
  useCreateAddon,
  getAdminAddons,
  updateAddon,
  useUpdateAddon,
  deleteAddon,
  useDeleteAddon,
  useGetAddons,
  useGetAdminAddons,
} from '../generated/addons/addons';

// ============================================================================
// ADMIN
// ============================================================================
export {
  adminLogin,
  useAdminLogin,
  createAdminUser,
  useCreateAdminUser,
  getAdminUsers,
  getAdminAllTenantUsers,
  updateAdminAnyTenantUser,
  useUpdateAdminAnyTenantUser,
  getAdminTickets,
  createAdminTicket,
  useCreateAdminTicket,
  updateAdminTicket,
  useUpdateAdminTicket,
  createAdminTicketResponse,
  useCreateAdminTicketResponse,
  debugSwitchRole,
  useDebugSwitchRole,
  debugAvailableRoles,
  debugSwitchTenant,
  useDebugSwitchTenant,
  debugExitImpersonation,
  useDebugExitImpersonation,
  debugPagePermissions,
  useGetAdminUsers,
  useGetAdminAllTenantUsers,
  useGetAdminTickets,
  useDebugAvailableRoles,
  useDebugPagePermissions,
} from '../generated/admin/admin';

// ============================================================================
// ADMIN ADDONS
// ============================================================================
export {
  listAdminAddons,
  createAdminAddon,
  useCreateAdminAddon,
  getAdminAddon,
  updateAdminAddon,
  useUpdateAdminAddon,
  deleteAdminAddon,
  useDeleteAdminAddon,
  useListAdminAddons,
  useGetAdminAddon,
} from '../generated/admin-addons/admin-addons';

// ============================================================================
// ADMIN ANALYTICS
// ============================================================================
export {
  getAdminAnalyticsOverview,
  getAdminAnalytics,
  getAdminRevenueAnalytics,
  getAdminUserAnalytics,
  getAdminTenantAnalytics,
  useGetAdminAnalyticsOverview,
  useGetAdminAnalytics,
  useGetAdminRevenueAnalytics,
  useGetAdminUserAnalytics,
  useGetAdminTenantAnalytics,
} from '../generated/admin-analytics/admin-analytics';

// ============================================================================
// ADMIN API KEYS
// ============================================================================
export {
  initAdminApiKeysDb,
  useInitAdminApiKeysDb,
  getAdminApiKeys,
  createAdminApiKey,
  useCreateAdminApiKey,
  revokeApiKey,
  useRevokeApiKey,
  useGetAdminApiKeys,
} from '../generated/admin-api-keys/admin-api-keys';

// ============================================================================
// ADMIN APPOINTMENTS
// ============================================================================
export {
  getAdminAllAppointments,
  useGetAdminAllAppointments,
} from '../generated/admin-appointments/admin-appointments';

// ============================================================================
// ADMIN BIRFATURA
// ============================================================================
export {
  getAdminStats,
  getAdminBirfaturaInvoices,
  getAdminLogs,
  useGetAdminStats,
  useGetAdminBirfaturaInvoices,
  useGetAdminLogs,
} from '../generated/admin-birfatura/admin-birfatura';

// ============================================================================
// ADMIN DASHBOARD
// ============================================================================
export {
  getAdminDashboardMetrics,
  getAdminDashboardStats,
  useGetAdminDashboardMetrics,
  useGetAdminDashboardStats,
} from '../generated/admin-dashboard/admin-dashboard';

// ============================================================================
// ADMIN INTEGRATIONS
// ============================================================================
export {
  getAdminIntegrationsIntegrations,
  initAdminIntegrationsDb,
  useInitAdminIntegrationsDb,
  getAdminVatanSmsConfig,
  updateAdminVatanSmsConfig,
  useUpdateAdminVatanSmsConfig,
  getAdminBirfaturaConfig,
  updateAdminBirfaturaConfig,
  useUpdateAdminBirfaturaConfig,
  useGetAdminIntegrationsIntegrations,
  useGetAdminVatanSmsConfig,
  useGetAdminBirfaturaConfig,
} from '../generated/admin-integrations/admin-integrations';

// ============================================================================
// ADMIN INVENTORY
// ============================================================================
export {
  getAdminAllInventory,
  useGetAdminAllInventory,
} from '../generated/admin-inventory/admin-inventory';

// ============================================================================
// ADMIN INVOICES
// ============================================================================
export {
  getAdminInvoices,
  createAdminInvoice,
  useCreateAdminInvoice,
  getAdminInvoice,
  recordPayment,
  useRecordPayment,
  getAdminInvoicePdf,
  useGetAdminInvoices,
  useGetAdminInvoice,
  useGetAdminInvoicePdf,
} from '../generated/admin-invoices/admin-invoices';

// ============================================================================
// ADMIN MARKETPLACES
// ============================================================================
export {
  initAdminMarketplacesDb,
  useInitAdminMarketplacesDb,
  getAdminMarketplacesIntegrations,
  createAdminIntegration,
  useCreateAdminIntegration,
  syncIntegration,
  useSyncIntegration,
  useGetAdminMarketplacesIntegrations,
} from '../generated/admin-marketplaces/admin-marketplaces';

// ============================================================================
// ADMIN NOTIFICATIONS
// ============================================================================
export {
  initAdminNotificationsDb,
  useInitAdminNotificationsDb,
  getAdminNotifications,
  sendAdminNotification,
  useSendAdminNotification,
  getAdminTemplates,
  createAdminTemplate,
  useCreateAdminTemplate,
  updateAdminTemplate,
  useUpdateAdminTemplate,
  deleteAdminTemplate,
  useDeleteAdminTemplate,
  useGetAdminNotifications,
  useGetAdminTemplates,
} from '../generated/admin-notifications/admin-notifications';

// ============================================================================
// ADMIN PATIENTS
// ============================================================================
export {
  getAdminAllPatients,
  getAdminPatientDetail,
  getAdminPatientDevices,
  getAdminPatientSales,
  getAdminPatientTimeline,
  getAdminPatientDocuments,
  useGetAdminAllPatients,
  useGetAdminPatientDetail,
  useGetAdminPatientDevices,
  useGetAdminPatientSales,
  useGetAdminPatientTimeline,
  useGetAdminPatientDocuments,
} from '../generated/admin-patients/admin-patients';

// ============================================================================
// ADMIN PAYMENTS
// ============================================================================
export {
  getAdminPosTransactions,
  useGetAdminPosTransactions,
} from '../generated/admin-payments/admin-payments';

// ============================================================================
// ADMIN PLANS
// ============================================================================
export {
  listAdminPlans,
  createAdminPlan,
  useCreateAdminPlan,
  getAdminPlan,
  updateAdminPlan,
  useUpdateAdminPlan,
  deleteAdminPlan,
  useDeleteAdminPlan,
  useListAdminPlans,
  useGetAdminPlan,
} from '../generated/admin-plans/admin-plans';

// ============================================================================
// ADMIN PRODUCTION
// ============================================================================
export {
  initAdminProductionDb,
  useInitAdminProductionDb,
  getAdminOrders,
  updateAdminOrderStatus,
  useUpdateAdminOrderStatus,
  useGetAdminOrders,
} from '../generated/admin-production/admin-production';

// ============================================================================
// ADMIN ROLES
// ============================================================================
export {
  getAdminRoles,
  createAdminRole,
  useCreateAdminRole,
  getAdminRole,
  updateAdminRole,
  useUpdateAdminRole,
  deleteAdminRole,
  useDeleteAdminRole,
  getAdminRolePermissions,
  updateAdminRolePermissions,
  useUpdateAdminRolePermissions,
  getAdminPermissions,
  getAdminUsersWithRoles,
  getAdminUserDetail,
  updateAdminUserRoles,
  useUpdateAdminUserRoles,
  getMyAdminPermissions,
  useGetAdminRoles,
  useGetAdminRole,
  useGetAdminRolePermissions,
  useGetAdminPermissions,
  useGetAdminUsersWithRoles,
  useGetAdminUserDetail,
  useGetMyAdminPermissions,
} from '../generated/admin-roles/admin-roles';

// ============================================================================
// ADMIN SCAN QUEUE
// ============================================================================
export {
  initAdminScanQueueDb,
  useInitAdminScanQueueDb,
  getAdminScanQueue,
  retryAdminScan,
  useRetryAdminScan,
  useGetAdminScanQueue,
} from '../generated/admin-scan-queue/admin-scan-queue';

// ============================================================================
// ADMIN SETTINGS
// ============================================================================
export {
  initAdminSettingsDb,
  useInitAdminSettingsDb,
  getAdminSettings,
  updateAdminSettings,
  useUpdateAdminSettings,
  clearCache,
  useClearCache,
  triggerAdminBackup,
  useTriggerAdminBackup,
  useGetAdminSettings,
} from '../generated/admin-settings/admin-settings';

// ============================================================================
// ADMIN SUPPLIERS
// ============================================================================
export {
  getAdminSuppliers,
  createAdminSupplier,
  useCreateAdminSupplier,
  getAdminSupplier,
  updateAdminSupplier,
  useUpdateAdminSupplier,
  deleteAdminSupplier,
  useDeleteAdminSupplier,
  useGetAdminSuppliers,
  useGetAdminSupplier,
} from '../generated/admin-suppliers/admin-suppliers';

// ============================================================================
// ADMIN TENANTS
// ============================================================================
export {
  listAdminTenants,
  createAdminTenant,
  useCreateAdminTenant,
  getAdminTenant,
  updateAdminTenant,
  useUpdateAdminTenant,
  deleteAdminTenant,
  useDeleteAdminTenant,
  getAdminTenantUsers,
  createAdminTenantUser,
  useCreateAdminTenantUser,
  updateAdminTenantUser,
  useUpdateAdminTenantUser,
  subscribeTenant,
  useSubscribeTenant,
  addTenantAddon,
  useAddTenantAddon,
  removeTenantAddon,
  useRemoveTenantAddon,
  updateAdminTenantStatus,
  useUpdateAdminTenantStatus,
  getAdminTenantSmsConfig,
  getAdminTenantSmsDocuments,
  downloadTenantSmsDocument,
  updateAdminTenantSmsDocumentStatus,
  useUpdateAdminTenantSmsDocumentStatus,
  sendAdminTenantSmsDocumentsEmail,
  useSendAdminTenantSmsDocumentsEmail,
  useListAdminTenants,
  useGetAdminTenant,
  useGetAdminTenantUsers,
  useGetAdminTenantSmsConfig,
  useGetAdminTenantSmsDocuments,
  useDownloadTenantSmsDocument,
} from '../generated/admin-tenants/admin-tenants';

// ============================================================================
// AFFILIATES
// ============================================================================
export {
  checkAffiliate,
  registerAffiliate,
  useRegisterAffiliate,
  loginAffiliate,
  useLoginAffiliate,
  getAffiliatesMeMe,
  updateAffiliatePayment,
  useUpdateAffiliatePayment,
  getAffiliateCommissions,
  getAffiliateDetails,
  toggleAffiliateStatus,
  useToggleAffiliateStatus,
  listAffiliates,
  lookupAffiliate,
  useCheckAffiliate,
  useGetAffiliatesMeMe,
  useGetAffiliateCommissions,
  useGetAffiliateDetails,
  useListAffiliates,
  useLookupAffiliate,
} from '../generated/affiliates/affiliates';

// ============================================================================
// APPOINTMENTS
// ============================================================================
export {
  getAppointments,
  createAppointment,
  useCreateAppointment,
  getAppointment,
  updateAppointment,
  useUpdateAppointment,
  deleteAppointment,
  useDeleteAppointment,
  rescheduleAppointment,
  useRescheduleAppointment,
  cancelAppointment,
  useCancelAppointment,
  completeAppointment,
  useCompleteAppointment,
  getAvailability,
  listAppointments,
  useGetAppointments,
  useGetAppointment,
  useGetAvailability,
  useListAppointments,
} from '../generated/appointments/appointments';

// ============================================================================
// APPS
// ============================================================================
export {
  listApps,
  createApp,
  useCreateApp,
  getApp,
  updateApp,
  useUpdateApp,
  deleteApp,
  useDeleteApp,
  assignUserToApp,
  useAssignUserToApp,
  transferAppOwnership,
  useTransferAppOwnership,
  useListApps,
  useGetApp,
} from '../generated/apps/apps';

// ============================================================================
// AUDIT
// ============================================================================
export {
  listAudit,
  useListAudit,
} from '../generated/audit/audit';

// ============================================================================
// AUTH
// ============================================================================
export {
  lookupPhone,
  useLookupPhone,
  forgotPassword,
  useForgotPassword,
  verifyOtp,
  useVerifyOtp,
  resetPassword,
  useResetPassword,
  login,
  useLogin,
  refreshToken,
  useRefreshToken,
  getCurrentUser,
  sendVerificationOtp,
  useSendVerificationOtp,
  setPassword,
  useSetPassword,
  useGetCurrentUser,
} from '../generated/auth/auth';

// ============================================================================
// AUTOMATION
// ============================================================================
export {
  getAutomationStatus,
  triggerSgkProcessing,
  useTriggerSgkProcessing,
  triggerBackup,
  useTriggerBackup,
  getAutomationLogs,
  useGetAutomationStatus,
  useGetAutomationLogs,
} from '../generated/automation/automation';

// ============================================================================
// BIR FATURA
// ============================================================================
export {
  sendDocument,
  useSendDocument,
  sendBasicInvoice,
  useSendBasicInvoice,
  createEfaturaCreateInvoice,
  useCreateEfaturaCreateInvoice,
  retryInvoice,
  useRetryInvoice,
  cancelInvoice,
  useCancelInvoice,
  syncInvoices,
  useSyncInvoices,
  sendDocumentV2,
  useSendDocumentV2,
  sendBasicInvoiceFromModel,
  useSendBasicInvoiceFromModel,
} from '../generated/bir-fatura/bir-fatura';

// ============================================================================
// BRANCHES
// ============================================================================
export {
  getBranches,
  createBranch,
  useCreateBranch,
  updateBranch,
  useUpdateBranch,
  deleteBranch,
  useDeleteBranch,
  useGetBranches,
} from '../generated/branches/branches';

// ============================================================================
// CAMPAIGNS
// ============================================================================
export {
  getCampaigns,
  createCampaign,
  useCreateCampaign,
  getCampaign,
  updateCampaign,
  useUpdateCampaign,
  deleteCampaign,
  useDeleteCampaign,
  adminGetCampaigns,
  useGetCampaigns,
  useGetCampaign,
  useAdminGetCampaigns,
} from '../generated/campaigns/campaigns';

// ============================================================================
// CASH RECORDS
// ============================================================================
export {
  getCashRecords,
  createCashRecord,
  useCreateCashRecord,
  deleteCashRecord,
  useDeleteCashRecord,
  useGetCashRecords,
} from '../generated/cash-records/cash-records';

// ============================================================================
// CHECKOUT
// ============================================================================
export {
  createCheckoutSession,
  useCreateCheckoutSession,
  confirmPayment,
  useConfirmPayment,
} from '../generated/checkout/checkout';

// ============================================================================
// COMMISSION LEDGER
// ============================================================================
export {
  createCommission,
  useCreateCommission,
  updateCommissionStatus,
  useUpdateCommissionStatus,
  getCommissionsByAffiliate,
  auditTrail,
  useGetCommissionsByAffiliate,
  useAuditTrail,
} from '../generated/commission-ledger/commission-ledger';

// ============================================================================
// COMMUNICATIONS
// ============================================================================
export {
  listMessages,
  sendSms,
  useSendSms,
  sendEmail,
  useSendEmail,
  listTemplates,
  createTemplate,
  useCreateTemplate,
  getTemplate,
  updateTemplate,
  useUpdateTemplate,
  deleteTemplate,
  useDeleteTemplate,
  listCommunicationHistory,
  createCommunicationHistory,
  useCreateCommunicationHistory,
  communicationStats,
  useListMessages,
  useListTemplates,
  useGetTemplate,
  useListCommunicationHistory,
  useCommunicationStats,
} from '../generated/communications/communications';

// ============================================================================
// CONFIG
// ============================================================================
export {
  getConfig,
  useGetConfig,
} from '../generated/config/config';

// ============================================================================
// DASHBOARD
// ============================================================================
export {
  getDashboard,
  getKpis,
  patientTrends,
  revenueTrends,
  recentActivity,
  patientDistribution,
  useGetDashboard,
  useGetKpis,
  usePatientTrends,
  useRevenueTrends,
  useRecentActivity,
  usePatientDistribution,
} from '../generated/dashboard/dashboard';

// ============================================================================
// DEVELOPER
// ============================================================================
export {
  schemaRegistry,
  useSchemaRegistry,
} from '../generated/developer/developer';

// ============================================================================
// DEVICES
// ============================================================================
export {
  getDevices,
  createDevice,
  useCreateDevice,
  getDeviceCategories,
  getDeviceBrands,
  createDeviceBrand,
  useCreateDeviceBrand,
  getLowStockDevices,
  getDevice,
  updateDevice,
  useUpdateDevice,
  deleteDevice,
  useDeleteDevice,
  updateDeviceStock,
  useUpdateDeviceStock,
  useGetDevices,
  useGetDeviceCategories,
  useGetDeviceBrands,
  useGetLowStockDevices,
  useGetDevice,
} from '../generated/devices/devices';

// ============================================================================
// DOCUMENTS
// ============================================================================
export {
  getPatientDocuments,
  addPatientDocument,
  useAddPatientDocument,
  getPatientDocument,
  deletePatientDocument,
  useDeletePatientDocument,
  useGetPatientDocuments,
  useGetPatientDocument,
} from '../generated/documents/documents';

// ============================================================================
// HEALTH
// ============================================================================
export {
  healthHealthCheck,
  readinessCheck,
  useHealthHealthCheck,
  useReadinessCheck,
} from '../generated/health/health';

// ============================================================================
// INVENTORY
// ============================================================================
export {
  getAllInventory,
  createInventory,
  useCreateInventory,
  advancedSearch,
  getInventoryStats,
  getLowStock,
  getInventoryItem,
  updateInventory,
  useUpdateInventory,
  deleteInventory,
  useDeleteInventory,
  addSerials,
  useAddSerials,
  getMovements,
  useGetAllInventory,
  useAdvancedSearch,
  useGetInventoryStats,
  useGetLowStock,
  useGetInventoryItem,
  useGetMovements,
} from '../generated/inventory/inventory';

// ============================================================================
// INVOICE ACTIONS
// ============================================================================
export {
  issueInvoice,
  useIssueInvoice,
  copyInvoice,
  useCopyInvoice,
  copyInvoiceCancel,
  useCopyInvoiceCancel,
  serveInvoicePdf,
  serveShippingPdf,
  useServeInvoicePdf,
  useServeShippingPdf,
} from '../generated/invoice-actions/invoice-actions';

// ============================================================================
// INVOICE MANAGEMENT
// ============================================================================
export {
  getInvoiceSchema,
  createDynamicInvoice,
  useCreateDynamicInvoice,
  generateInvoiceXml,
  sendInvoiceToGib,
  useSendInvoiceToGib,
  getInvoiceSettings,
  updateInvoiceSettings,
  useUpdateInvoiceSettings,
  useGetInvoiceSchema,
  useGenerateInvoiceXml,
  useGetInvoiceSettings,
} from '../generated/invoice-management/invoice-management';

// ============================================================================
// INVOICES
// ============================================================================
export {
  getInvoices,
  createInvoicesInvoice,
  useCreateInvoicesInvoice,
  getInvoice,
  updateInvoice,
  useUpdateInvoice,
  deleteInvoice,
  useDeleteInvoice,
  getPatientInvoices,
  sendToGib,
  useSendToGib,
  useGetInvoices,
  useGetInvoice,
  useGetPatientInvoices,
} from '../generated/invoices/invoices';

// ============================================================================
// NOTIFICATIONS
// ============================================================================
export {
  createNotification,
  useCreateNotification,
  listNotifications,
  markNotificationRead,
  useMarkNotificationRead,
  updateNotification,
  useUpdateNotification,
  deleteNotification,
  useDeleteNotification,
  notificationStats,
  getUserNotificationSettings,
  setUserNotificationSettings,
  useSetUserNotificationSettings,
  useListNotifications,
  useNotificationStats,
  useGetUserNotificationSettings,
} from '../generated/notifications/notifications';

// ============================================================================
// OCR
// ============================================================================
export {
  healthOcrHealthCheck,
  initDatabase,
  useInitDatabase,
  initializeNlpEndpoint,
  useInitializeNlpEndpoint,
  processDocument,
  useProcessDocument,
  calculateSimilarity,
  useCalculateSimilarity,
  extractEntities,
  useExtractEntities,
  extractPatientName,
  useExtractPatientName,
  debugNer,
  useDebugNer,
  listJobs,
  createJob,
  useCreateJob,
  getJob,
  useHealthOcrHealthCheck,
  useListJobs,
  useGetJob,
} from '../generated/ocr/ocr';

// ============================================================================
// PATIENT SUBRESOURCES
// ============================================================================
export {
  getPatientDevices,
  getPatientHearingTests,
  addPatientHearingTest,
  useAddPatientHearingTest,
  updatePatientHearingTest,
  useUpdatePatientHearingTest,
  deletePatientHearingTest,
  useDeletePatientHearingTest,
  getPatientNotes,
  createPatientNote,
  useCreatePatientNote,
  updatePatientNote,
  useUpdatePatientNote,
  deletePatientNote,
  useDeletePatientNote,
  getPatientEreceipts,
  createPatientEreceipt,
  useCreatePatientEreceipt,
  updatePatientEreceipt,
  useUpdatePatientEreceipt,
  deletePatientEreceipt,
  useDeletePatientEreceipt,
  getPatientAppointments,
  useGetPatientDevices,
  useGetPatientHearingTests,
  useGetPatientNotes,
  useGetPatientEreceipts,
  useGetPatientAppointments,
} from '../generated/patient-subresources/patient-subresources';

// ============================================================================
// PATIENTS
// ============================================================================
export {
  listPatients,
  createPatient,
  useCreatePatient,
  getPatient,
  updatePatient,
  useUpdatePatient,
  deletePatient,
  useDeletePatient,
  countPatients,
  useListPatients,
  useGetPatient,
  useCountPatients,
} from '../generated/patients/patients';

// ============================================================================
// PAYMENT INTEGRATIONS
// ============================================================================
export {
  getPaytrConfig,
  updatePaytrConfig,
  useUpdatePaytrConfig,
  initiatePaytrPayment,
  useInitiatePaytrPayment,
  paytrCallback,
  usePaytrCallback,
  getPosTransactions,
  useGetPaytrConfig,
  useGetPosTransactions,
} from '../generated/payment-integrations/payment-integrations';

// ============================================================================
// PAYMENTS
// ============================================================================
export {
  createPaymentRecord,
  useCreatePaymentRecord,
  getPatientPaymentRecords,
  updatePaymentRecord,
  useUpdatePaymentRecord,
  getPatientPromissoryNotes,
  createPromissoryNotes,
  useCreatePromissoryNotes,
  updatePromissoryNote,
  useUpdatePromissoryNote,
  collectPromissoryNote,
  useCollectPromissoryNote,
  getSalePromissoryNotes,
  useGetPatientPaymentRecords,
  useGetPatientPromissoryNotes,
  useGetSalePromissoryNotes,
} from '../generated/payments/payments';

// ============================================================================
// PERMISSIONS
// ============================================================================
export {
  listPermissions,
  createPermission,
  useCreatePermission,
  getMyPermissions,
  getRolePermissions,
  updateRolePermissions,
  useUpdateRolePermissions,
  useListPermissions,
  useGetMyPermissions,
  useGetRolePermissions,
} from '../generated/permissions/permissions';

// ============================================================================
// PLANS
// ============================================================================
export {
  getPlans,
  createPlan,
  useCreatePlan,
  getAdminPlans,
  updatePlan,
  useUpdatePlan,
  deletePlan,
  useDeletePlan,
  useGetPlans,
  useGetAdminPlans,
} from '../generated/plans/plans';

// ============================================================================
// POS COMMISSION
// ============================================================================
export {
  calculateCommissionEndpoint,
  useCalculateCommissionEndpoint,
  getCommissionRates,
  getInstallmentOptions,
  useGetInstallmentOptions,
  getTenantRatesAdmin,
  updateTenantRatesAdmin,
  useUpdateTenantRatesAdmin,
  getSystemRatesEndpoint,
  updateSystemRates,
  useUpdateSystemRates,
  useGetCommissionRates,
  useGetTenantRatesAdmin,
  useGetSystemRatesEndpoint,
} from '../generated/pos-commission/pos-commission';

// ============================================================================
// REGISTRATION
// ============================================================================
export {
  getTurnstileConfig,
  registerPhone,
  useRegisterPhone,
  verifyRegistrationOtp,
  useVerifyRegistrationOtp,
  useGetTurnstileConfig,
} from '../generated/registration/registration';

// ============================================================================
// REPLACEMENTS
// ============================================================================
export {
  getPatientReplacements,
  createPatientReplacement,
  useCreatePatientReplacement,
  getReplacement,
  patchReplacementStatus,
  usePatchReplacementStatus,
  createReplacementInvoice,
  useCreateReplacementInvoice,
  sendReturnInvoiceToGib,
  useSendReturnInvoiceToGib,
  useGetPatientReplacements,
  useGetReplacement,
} from '../generated/replacements/replacements';

// ============================================================================
// REPORTS
// ============================================================================
export {
  reportOverview,
  reportPatients,
  reportFinancial,
  reportCampaigns,
  reportRevenue,
  reportAppointments,
  reportPromissoryNotes,
  reportPromissoryNotesByPatient,
  reportPromissoryNotesList,
  reportRemainingPayments,
  reportCashflowSummary,
  reportPosMovements,
  useReportOverview,
  useReportPatients,
  useReportFinancial,
  useReportCampaigns,
  useReportRevenue,
  useReportAppointments,
  useReportPromissoryNotes,
  useReportPromissoryNotesByPatient,
  useReportPromissoryNotesList,
  useReportRemainingPayments,
  useReportCashflowSummary,
  useReportPosMovements,
} from '../generated/reports/reports';

// ============================================================================
// ROLES
// ============================================================================
export {
  listRoles,
  createRole,
  useCreateRole,
  updateRole,
  useUpdateRole,
  deleteRole,
  useDeleteRole,
  addPermissionToRole,
  useAddPermissionToRole,
  setRolePermissions,
  useSetRolePermissions,
  removePermissionFromRole,
  useRemovePermissionFromRole,
  useListRoles,
} from '../generated/roles/roles';

// ============================================================================
// SALES
// ============================================================================
export {
  getSales,
  createSale,
  useCreateSale,
  getSalePayments,
  recordSalePayment,
  useRecordSalePayment,
  getSalePaymentPlan,
  updateSale,
  useUpdateSale,
  useGetSales,
  useGetSalePayments,
  useGetSalePaymentPlan,
} from '../generated/sales/sales';

// ============================================================================
// SETTINGS
// ============================================================================
export {
  getPricingSettings,
  getSettings,
  updateSettings,
  useUpdateSettings,
  useGetPricingSettings,
  useGetSettings,
} from '../generated/settings/settings';

// ============================================================================
// SGK
// ============================================================================
export {
  listSgkDocuments,
  uploadSgkDocument,
  useUploadSgkDocument,
  getSgkDocument,
  deleteSgkDocument,
  useDeleteSgkDocument,
  uploadAndProcessFiles,
  useUploadAndProcessFiles,
  getPatientSgkDocuments,
  queryEReceipt,
  useQueryEReceipt,
  queryPatientRights,
  useQueryPatientRights,
  createSgkWorkflow,
  useCreateSgkWorkflow,
  updateSgkWorkflow,
  useUpdateSgkWorkflow,
  getSgkWorkflow,
  updateWorkflowStatus,
  useUpdateWorkflowStatus,
  downloadPatientForm,
  seedTestPatients,
  useSeedTestPatients,
  useListSgkDocuments,
  useGetSgkDocument,
  useGetPatientSgkDocuments,
  useGetSgkWorkflow,
  useDownloadPatientForm,
} from '../generated/sgk/sgk';

// ============================================================================
// SMS
// ============================================================================
export {
  listAdminPackages,
  createAdminPackage,
  useCreateAdminPackage,
  updateAdminPackage,
  useUpdateAdminPackage,
  useListAdminPackages,
} from '../generated/sms/sms';

// ============================================================================
// SMS INTEGRATION
// ============================================================================
export {
  getSmsConfig,
  updateSmsConfig,
  useUpdateSmsConfig,
  listSmsHeaders,
  requestSmsHeader,
  useRequestSmsHeader,
  setDefaultHeader,
  useSetDefaultHeader,
  listSmsPackages,
  getSmsCredit,
  listTargetAudiences,
  createTargetAudience,
  useCreateTargetAudience,
  uploadSmsDocument,
  useUploadSmsDocument,
  downloadSmsDocument,
  deleteSmsDocument,
  useDeleteSmsDocument,
  submitSmsDocuments,
  useSubmitSmsDocuments,
  uploadAudienceFile,
  useUploadAudienceFile,
  listAdminSmsHeaders,
  updateAdminHeaderStatus,
  useUpdateAdminHeaderStatus,
  getSmsDocumentFile,
  useGetSmsConfig,
  useListSmsHeaders,
  useListSmsPackages,
  useGetSmsCredit,
  useListTargetAudiences,
  useDownloadSmsDocument,
  useListAdminSmsHeaders,
  useGetSmsDocumentFile,
} from '../generated/sms-integration/sms-integration';

// ============================================================================
// SUBSCRIPTIONS
// ============================================================================
export {
  subscribe,
  useSubscribe,
  completeSignup,
  useCompleteSignup,
  getCurrent,
  registerAndSubscribe,
  useRegisterAndSubscribe,
  useGetCurrent,
} from '../generated/subscriptions/subscriptions';

// ============================================================================
// SUPPLIERS
// ============================================================================
export {
  getSuppliers,
  createSupplier,
  useCreateSupplier,
  searchSuppliers,
  getSupplierStats,
  getSupplier,
  updateSupplier,
  useUpdateSupplier,
  deleteSupplier,
  useDeleteSupplier,
  useGetSuppliers,
  useSearchSuppliers,
  useGetSupplierStats,
  useGetSupplier,
} from '../generated/suppliers/suppliers';

// ============================================================================
// TENANT USERS
// ============================================================================
export {
  listTenantUsers,
  inviteTenantUser,
  useInviteTenantUser,
  deleteTenantUser,
  useDeleteTenantUser,
  updateTenantUser,
  useUpdateTenantUser,
  getTenantCompany,
  updateTenantCompany,
  useUpdateTenantCompany,
  uploadTenantAsset,
  useUploadTenantAsset,
  deleteTenantAsset,
  useDeleteTenantAsset,
  getTenantAsset,
  getTenantAssetUrl,
  useListTenantUsers,
  useGetTenantCompany,
  useGetTenantAsset,
  useGetTenantAssetUrl,
} from '../generated/tenant-users/tenant-users';

// ============================================================================
// TIMELINE
// ============================================================================
export {
  getTimeline,
  getPatientTimeline,
  addTimelineEvent,
  useAddTimelineEvent,
  logPatientActivity,
  useLogPatientActivity,
  deleteTimelineEvent,
  useDeleteTimelineEvent,
  useGetTimeline,
  useGetPatientTimeline,
} from '../generated/timeline/timeline';

// ============================================================================
// UNIFIED CASH
// ============================================================================
export {
  getUnifiedCashRecords,
  getCashSummary,
  useGetUnifiedCashRecords,
  useGetCashSummary,
} from '../generated/unified-cash/unified-cash';

// ============================================================================
// UPLOAD
// ============================================================================
export {
  getPresignedUploadUrl,
  useGetPresignedUploadUrl,
  listFiles,
  deleteFile,
  useDeleteFile,
  useListFiles,
} from '../generated/upload/upload';

// ============================================================================
// USERS
// ============================================================================
export {
  listUsers,
  createUser,
  useCreateUser,
  getUsersMeMe,
  updateMe,
  useUpdateMe,
  changePassword,
  useChangePassword,
  updateUser,
  useUpdateUser,
  deleteUser,
  useDeleteUser,
  useListUsers,
  useGetUsersMeMe,
} from '../generated/users/users';

// ============================================================================
// UTS
// ============================================================================
export {
  listRegistrations,
  startBulkRegistration,
  useStartBulkRegistration,
  getJobStatus,
  cancelJob,
  useCancelJob,
  useListRegistrations,
  useGetJobStatus,
} from '../generated/uts/uts';

