(function() {
  'use strict';
  
  console.log('🔄 Loading Orval API (Simple wrapper)...');
  
  // Check if already loaded
  if (window.orvalApiLoaded) {
    console.log('✅ Orval API already loaded');
    return;
  }

  // Define all API functions as empty stubs first
  const API_FUNCTIONS = [
    'adminPatchFeatures', 'appointmentsCreateAppointment', 'appointmentsDeleteAppointment',
    'appointmentsCancelAppointment', 'appointmentsCompleteAppointment', 'appointmentsRescheduleAppointment',
    'appointmentsGetAvailability', 'appointmentsListAppointments', 'appsCreateApp', 'appsDeleteApp',
    'appsAssignRoleToUser', 'appsTransferOwnership', 'auditListAudit', 'automationTriggerBackup',
    'automationGetAutomationLogs', 'automationTriggerSgkProcessing', 'automationGetAutomationStatus',
    'campaignsCreateCampaign', 'campaignsSendCampaign', 'cashRecordsCreateCashRecord', 'configGetConfig',
    'registrationGetTurnstileConfig', 'dashboardPatientTrends', 'dashboardRevenueTrends', 'dashboardGetKpis',
    'dashboardRecentActivity', 'devicesCreateDevice', 'devicesDeleteDevice', 'devicesUpdateDeviceStock',
    'devicesGetDeviceBrands', 'devicesGetDeviceCategories', 'devicesGetLowStockDevices', 'authForgotPassword',
    'healthCheck', 'inventoryCreateInventoryItem', 'inventoryDeleteInventoryItem', 'inventoryGetInventoryActivities',
    'inventoryAssignToPatient', 'inventoryAddSerialNumbers', 'inventoryGetLowStockItems', 'inventoryGetInventoryStats',
    'inventoryGetInventoryItems', 'inventoryGetInventoryItem',
    'invoicesGetInvoiceSchema', 'invoicesCreateInvoice', 'invoicesDeleteInvoice', 'invoicesSendInvoiceToGib',
    'invoicesCreateDynamicInvoice', 'authLogin', 'notificationsListNotifications', 'notificationsDeleteNotification',
    'notificationsMarkNotificationRead', 'notificationsSetUserNotificationSettings', 'notificationsNotificationStats',
    'sgkProcessOcr', 'serveOpenapiYaml', 'patientsCreatePatient', 'patientsDeletePatient', 'timelineLogPatientActivity',
    'salesAssignDevicesExtended', 'patientsGetPatientDevices', 'documentsAddPatientDocument', 'documentsDeletePatientDocument',
    'patientSubresourcesCreatePatientEreceipt', 'patientSubresourcesDeletePatientEreceipt', 'patientSubresourcesAddPatientHearingTest',
    'patientSubresourcesDeletePatientHearingTest', 'invoicesGetPatientInvoices', 'patientSubresourcesCreatePatientNote',
    'patientSubresourcesDeletePatientNote', 'paymentsGetPatientPaymentRecords', 'salesCreateProductSale',
    'proformasGetPatientProformas', 'paymentsGetPatientPromissoryNotes', 'replacementsCreateReplacement',
    'salesGetPatientSales', 'salesUpdateSalePartial', 'sgkGetPatientSgkDocuments', 'timelineAddTimelineEvent',
    'timelineDeleteTimelineEvent', 'patientsBulkUploadPatients', 'patientsExportPatientsCsv', 'patientsSearchPatients',
    'paymentsCreatePaymentRecord', 'paymentsUpdatePaymentRecord', 'permissionsCreatePermission', 'salesPricingPreview',
    'suppliersDeleteProductSupplier', 'suppliersAddProductSupplier', 'proformasCreateProforma', 'proformasGetProforma',
    'proformasConvertProformaToSale', 'paymentsCreatePromissoryNotes', 'paymentsUpdatePromissoryNote',
    'paymentsCollectPromissoryNote', 'registrationRegisterPhone', 'replacementsCreateReturnInvoice',
    'reportsReportAppointments', 'reportsReportCampaigns', 'reportsReportFinancial', 'reportsReportOverview',
    'reportsReportPatients', 'reportsReportRevenue', 'replacementsSendInvoiceToGib', 'rolesCreateRole',
    'rolesAddPermissionToRole', 'rolesRemovePermissionFromRole', 'invoicesGetSaleInvoice', 'salesCreateSalePaymentPlan',
    'paymentsGetSalePromissoryNotes', 'salesCreateSalesLog', 'salesRecalcSales', 'patchSettings', 'getPricingSettings',
    'sgkUploadSgkDocument', 'sgkDeleteSgkDocument', 'sgkSeedTestPatients', 'sgkUploadAndProcessFiles', 'smsMonitoring',
    'suppliersCreateSupplier', 'suppliersDeleteSupplier', 'suppliersGetSupplierProducts', 'suppliersSearchSuppliers',
    'suppliersGetSupplierStats', 'usersCreateUser', 'usersDeleteUser', 'usersGetMe', 'authVerifyOtp',
    'registrationVerifyRegistrationOtp', 'ocrDebugNer', 'ocrExtractEntities', 'ocrExtractPatientName', 'ocrHealthCheck',
    'ocrInitDatabase', 'ocrInitializeNlpEndpoint', 'ocrProcessDocument', 'ocrCalculateSimilarity', 'serveSwaggerUi'
  ];

  // Create stub functions that make actual API calls
  API_FUNCTIONS.forEach(funcName => {
    window[funcName] = async function(...args) {
      console.log(`🔄 Calling ${funcName} with args:`, args);
      
      // Extract endpoint from function name
      let endpoint = funcName;
      
      // Convert camelCase to kebab-case and determine HTTP method
      let method = 'GET';
      let path = '';
      
      // Special handling for inventory stats
      if (funcName === 'inventoryGetInventoryStats') {
        method = 'GET';
        path = 'inventory/stats';
        console.log(`🎯 Special handling for ${funcName}: ${method} ${path}`);
      } else if (funcName === 'inventoryGetInventoryItems') {
        method = 'GET';
        path = 'inventory';
        console.log(`🎯 Special handling for ${funcName}: ${method} ${path}`);
      } else if (funcName === 'inventoryGetInventoryItem') {
        method = 'GET';
        // First argument should be the item ID
        const itemId = args[0];
        path = `inventory/${itemId}`;
        console.log(`🎯 Special handling for ${funcName}: ${method} ${path}`);
      } else if (funcName.startsWith('create') || funcName.includes('Create')) {
        method = 'POST';
        path = funcName.replace(/create|Create/gi, '').toLowerCase();
      } else if (funcName.startsWith('delete') || funcName.includes('Delete')) {
        method = 'DELETE';
        path = funcName.replace(/delete|Delete/gi, '').toLowerCase();
      } else if (funcName.startsWith('patch') || funcName.includes('Patch') || funcName.includes('Update')) {
        method = 'PATCH';
        path = funcName.replace(/patch|Patch|update|Update/gi, '').toLowerCase();
      } else if (funcName.startsWith('get') || funcName.includes('Get') || funcName.includes('List')) {
        method = 'GET';
        path = funcName.replace(/get|Get|list|List/gi, '').toLowerCase();
      }
      
      // Make the actual API call
      try {
        // Use centralized base URL configuration
        const baseUrl = window.API_BASE_URL || 'http://localhost:5003';
        const fullUrl = `${baseUrl}/api/${path}`;
        console.log(`🔄 Making API call: ${method} ${fullUrl}`);
        console.log(`📋 Function name: ${funcName}`);
        console.log(`🛤️ Mapped path: ${path}`);
        console.log(`🌐 Base URL: ${baseUrl}`);
        
        const response = await fetch(fullUrl, {
          method: method,
          headers: {
            'Content-Type': 'application/json',
          },
          body: method !== 'GET' && args.length > 0 ? JSON.stringify(args[0]) : undefined
        });
        
        console.log(`📡 Response status: ${response.status} for ${funcName}`);
        console.log(`📡 Response ok: ${response.ok} for ${funcName}`);
        
        const responseData = await response.json();
        
        console.log(`📊 Response data for ${funcName}:`, responseData);
        
        // Return in Orval format with status and data
        const result = {
          status: response.status,
          data: responseData,
          headers: response.headers
        };
        
        console.log(`🎯 Final result for ${funcName}:`, result);
        return result;
      } catch (error) {
        console.error(`❌ API call failed for ${funcName}:`, error);
        
        // Return error in Orval format
        const errorResult = {
          status: error.message.includes('HTTP 500') ? 500 : 400,
          data: { success: false, error: error.message },
          headers: {}
        };
        
        console.log(`❌ Error result for ${funcName}:`, errorResult);
        return errorResult;
      }
    };
  });

  console.log(`✅ Orval API: Created ${API_FUNCTIONS.length} stub functions`);
  
  // Mark as loaded
  window.orvalApiLoaded = true;
  
  // Dispatch success event
  window.dispatchEvent(new CustomEvent('orvalApiLoaded', { 
    detail: { 
      count: API_FUNCTIONS.length,
      method: 'stub-functions'
    } 
  }));

})();