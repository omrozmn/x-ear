#!/bin/bash
# Refactor old API names to new clean names

# Function names (non-hooks)
sed -i '' 's/getAllInventoryApiInventoryGet/getAllInventory/g' src/**/*.ts src/**/*.tsx
sed -i '' 's/getInventoryItemApiInventoryItemIdGet/getInventoryItem/g' src/**/*.ts src/**/*.tsx
sed -i '' 's/getInventoryStatsApiInventoryStatsGet/getInventoryStats/g' src/**/*.ts src/**/*.tsx
sed -i '' 's/createInventoryApiInventoryPost/createInventory/g' src/**/*.ts src/**/*.tsx
sed -i '' 's/updateInventoryApiInventoryItemIdPut/updateInventory/g' src/**/*.ts src/**/*.tsx
sed -i '' 's/deleteInventoryApiInventoryItemIdDelete/deleteInventory/g' src/**/*.ts src/**/*.tsx
sed -i '' 's/addSerialsApiInventoryItemIdSerialsPost/addSerials/g' src/**/*.ts src/**/*.tsx
sed -i '' 's/getMovementsApiInventoryItemIdMovementsGet/getMovements/g' src/**/*.ts src/**/*.tsx

sed -i '' 's/patientDistributionApiDashboardChartsPatientDistributionGet/patientDistribution/g' src/**/*.ts src/**/*.tsx
sed -i '' 's/communicationStatsApiCommunicationsStatsGet/communicationStats/g' src/**/*.ts src/**/*.tsx
sed -i '' 's/listTemplatesApiCommunicationsTemplatesGet/listTemplates/g' src/**/*.ts src/**/*.tsx
sed -i '' 's/updateTemplateApiCommunicationsTemplatesTemplateIdPut/updateTemplate/g' src/**/*.ts src/**/*.tsx
sed -i '' 's/createTemplateApiCommunicationsTemplatesPost/createTemplate/g' src/**/*.ts src/**/*.tsx
sed -i '' 's/deleteTemplateApiCommunicationsTemplatesTemplateIdDelete/deleteTemplate/g' src/**/*.ts src/**/*.tsx
sed -i '' 's/listMessagesApiCommunicationsMessagesGet/listMessages/g' src/**/*.ts src/**/*.tsx
sed -i '' 's/sendSmsApiCommunicationsMessagesSendSmsPost/sendSms/g' src/**/*.ts src/**/*.tsx
sed -i '' 's/sendEmailApiCommunicationsMessagesSendEmailPost/sendEmail/g' src/**/*.ts src/**/*.tsx

sed -i '' 's/createPaymentRecordApiPaymentRecordsPost/createPaymentRecord/g' src/**/*.ts src/**/*.tsx
sed -i '' 's/getSalePromissoryNotesApiSalesSaleIdPromissoryNotesGet/getSalePromissoryNotes/g' src/**/*.ts src/**/*.tsx

sed -i '' 's/getPatientAppointmentsApiPatientsPatientIdAppointmentsGet/getPatientAppointments/g' src/**/*.ts src/**/*.tsx
sed -i '' 's/createAppointmentApiAppointmentsPost/createAppointment/g' src/**/*.ts src/**/*.tsx
sed -i '' 's/cancelAppointmentApiAppointmentsAppointmentIdCancelPost/cancelAppointment/g' src/**/*.ts src/**/*.tsx
sed -i '' 's/completeAppointmentApiAppointmentsAppointmentIdCompletePost/completeAppointment/g' src/**/*.ts src/**/*.tsx

sed -i '' 's/createDeviceApiDevicesPost/createDevice/g' src/**/*.ts src/**/*.tsx
sed -i '' 's/deleteDeviceApiDevicesDeviceIdDelete/deleteDevice/g' src/**/*.ts src/**/*.tsx

sed -i '' 's/createSaleApiSalesPost/createSale/g' src/**/*.ts src/**/*.tsx
sed -i '' 's/updateSaleApiSalesSaleIdPut/updateSale/g' src/**/*.ts src/**/*.tsx
sed -i '' 's/getSalesApiSalesGet/getSales/g' src/**/*.ts src/**/*.tsx

sed -i '' 's/getPatientDocumentsApiPatientsPatientIdDocumentsGet/getPatientDocuments/g' src/**/*.ts src/**/*.tsx
sed -i '' 's/addPatientDocumentApiPatientsPatientIdDocumentsPost/addPatientDocument/g' src/**/*.ts src/**/*.tsx
sed -i '' 's/deletePatientDocumentApiPatientsPatientIdDocumentsDocumentIdDelete/deletePatientDocument/g' src/**/*.ts src/**/*.tsx
sed -i '' 's/deleteSgkDocumentApiSgkDocumentsDocumentIdDelete/deleteSgkDocument/g' src/**/*.ts src/**/*.tsx

sed -i '' 's/getPatientTimelineApiPatientsPatientIdTimelineGet/getPatientTimeline/g' src/**/*.ts src/**/*.tsx
sed -i '' 's/addTimelineEventApiPatientsPatientIdTimelinePost/addTimelineEvent/g' src/**/*.ts src/**/*.tsx
sed -i '' 's/deleteTimelineEventApiPatientsPatientIdTimelineEventIdDelete/deleteTimelineEvent/g' src/**/*.ts src/**/*.tsx
sed -i '' 's/createPatientNoteApiPatientsPatientIdNotesPost/createPatientNote/g' src/**/*.ts src/**/*.tsx
sed -i '' 's/deletePatientNoteApiPatientsPatientIdNotesNoteIdDelete/deletePatientNote/g' src/**/*.ts src/**/*.tsx
sed -i '' 's/updatePatientNoteApiPatientsPatientIdNotesNoteIdPut/updatePatientNote/g' src/**/*.ts src/**/*.tsx
sed -i '' 's/getPatientNotesApiPatientsPatientIdNotesGet/getPatientNotes/g' src/**/*.ts src/**/*.tsx

sed -i '' 's/getPatientDevicesApiPatientsPatientIdDevicesGet/getPatientDevices/g' src/**/*.ts src/**/*.tsx
sed -i '' 's/logPatientActivityApiPatientsPatientIdActivitiesPost/logPatientActivity/g' src/**/*.ts src/**/*.tsx

sed -i '' 's/listPatientsApiPatientsGet/listPatients/g' src/**/*.ts src/**/*.tsx
sed -i '' 's/countPatientsApiPatientsCountGet/countPatients/g' src/**/*.ts src/**/*.tsx
sed -i '' 's/getPatientApiPatientsPatientIdGet/getPatient/g' src/**/*.ts src/**/*.tsx
sed -i '' 's/createPatientApiPatientsPost/createPatient/g' src/**/*.ts src/**/*.tsx
sed -i '' 's/updatePatientApiPatientsPatientIdPut/updatePatient/g' src/**/*.ts src/**/*.tsx
sed -i '' 's/deletePatientApiPatientsPatientIdDelete/deletePatient/g' src/**/*.ts src/**/*.tsx
sed -i '' 's/getPatientSgkDocumentsApiPatientsPatientIdSgkDocumentsGet/getPatientSgkDocuments/g' src/**/*.ts src/**/*.tsx
sed -i '' 's/getPatientHearingTestsApiPatientsPatientIdHearingTestsGet/getPatientHearingTests/g' src/**/*.ts src/**/*.tsx
sed -i '' 's/getPatientSalesApiAdminPatientsPatientIdSalesGet/getAdminPatientSales/g' src/**/*.ts src/**/*.tsx

sed -i '' 's/getBranchesApiBranchesGet/getBranches/g' src/**/*.ts src/**/*.tsx

sed -i '' 's/adminLoginApiAdminAuthLoginPost/adminLogin/g' src/**/*.ts src/**/*.tsx
sed -i '' 's/forgotPasswordApiAuthForgotPasswordPost/forgotPassword/g' src/**/*.ts src/**/*.tsx
sed -i '' 's/refreshTokenApiAuthRefreshPost/refreshToken/g' src/**/*.ts src/**/*.tsx
sed -i '' 's/sendVerificationOtpApiAuthSendVerificationOtpPost/sendVerificationOtp/g' src/**/*.ts src/**/*.tsx
sed -i '' 's/verifyOtpApiAuthVerifyOtpPost/verifyOtp/g' src/**/*.ts src/**/*.tsx

sed -i '' 's/getCurrentApiSubscriptionsCurrentGet/getCurrent/g' src/**/*.ts src/**/*.tsx

sed -i '' 's/createInvoiceApiEFaturaCreatePost/createEfaturaCreateInvoice/g' src/**/*.ts src/**/*.tsx
sed -i '' 's/cancelInvoiceApiEFaturaCancelInvoiceIdPost/cancelInvoice/g' src/**/*.ts src/**/*.tsx
sed -i '' 's/retryInvoiceApiEFaturaRetryInvoiceIdPost/retryInvoice/g' src/**/*.ts src/**/*.tsx
sed -i '' 's/getInvoiceApiInvoicesInvoiceIdGet/getInvoice/g' src/**/*.ts src/**/*.tsx
sed -i '' 's/getInvoicesApiInvoicesGet/getInvoices/g' src/**/*.ts src/**/*.tsx
sed -i '' 's/issueInvoiceApiInvoicesInvoiceIdIssuePost/issueInvoice/g' src/**/*.ts src/**/*.tsx
sed -i '' 's/serveInvoicePdfApiInvoicesInvoiceIdPdfGet/serveInvoicePdf/g' src/**/*.ts src/**/*.tsx

sed -i '' 's/createSgkWorkflowApiSgkWorkflowCreatePost/createSgkWorkflow/g' src/**/*.ts src/**/*.tsx
sed -i '' 's/getSgkWorkflowApiSgkWorkflowWorkflowIdGet/getSgkWorkflow/g' src/**/*.ts src/**/*.tsx
sed -i '' 's/updateSgkWorkflowApiSgkWorkflowWorkflowIdUpdatePut/updateSgkWorkflow/g' src/**/*.ts src/**/*.tsx
sed -i '' 's/queryPatientRightsApiSgkPatientRightsQueryPost/queryPatientRights/g' src/**/*.ts src/**/*.tsx
sed -i '' 's/uploadSgkDocumentApiSgkDocumentsPost/uploadSgkDocument/g' src/**/*.ts src/**/*.tsx

# Type aliases
sed -i '' 's/GetAllInventoryApiInventoryGetParams/GetAllInventoryParams/g' src/**/*.ts src/**/*.tsx
sed -i '' 's/CountPatientsApiPatientsCountGetParams/ListPatientsParams/g' src/**/*.ts src/**/*.tsx

# QueryKey functions
sed -i '' 's/getGetAllInventoryApiInventoryGetQueryKey/getGetAllInventoryQueryKey/g' src/**/*.ts src/**/*.tsx
sed -i '' 's/getGetBranchesApiBranchesGetQueryKey/getGetBranchesQueryKey/g' src/**/*.ts src/**/*.tsx
sed -i '' 's/getListPatientsApiPatientsGetQueryKey/getListPatientsQueryKey/g' src/**/*.ts src/**/*.tsx
sed -i '' 's/getCountPatientsApiPatientsCountGetQueryKey/getCountPatientsQueryKey/g' src/**/*.ts src/**/*.tsx
sed -i '' 's/getGetActivityLogsApiActivityLogsGetQueryKey/getGetActivityLogsQueryKey/g' src/**/*.ts src/**/*.tsx
sed -i '' 's/getGetRolePermissionsApiPermissionsRoleRoleNameGetQueryKey/getGetRolePermissionsQueryKey/g' src/**/*.ts src/**/*.tsx
sed -i '' 's/getReportFinancialApiReportsFinancialGetQueryKey/getReportFinancialQueryKey/g' src/**/*.ts src/**/*.tsx
sed -i '' 's/getReportOverviewApiReportsOverviewGetQueryKey/getReportOverviewQueryKey/g' src/**/*.ts src/**/*.tsx
sed -i '' 's/getReportPatientsApiReportsPatientsGetQueryKey/getReportPatientsQueryKey/g' src/**/*.ts src/**/*.tsx
sed -i '' 's/getListSmsHeadersApiSmsHeadersGetQueryKey/getListSmsHeadersQueryKey/g' src/**/*.ts src/**/*.tsx
sed -i '' 's/getGetSuppliersApiSuppliersGetQueryKey/getGetSuppliersQueryKey/g' src/**/*.ts src/**/*.tsx

echo "Refactoring complete!"
