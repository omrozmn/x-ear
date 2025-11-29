(function(){
  if (typeof SGKDocumentPipeline === 'undefined') return;
  const proto = SGKDocumentPipeline.prototype;

  proto.getSGKWorkflowStatuses = function() {
    return { 'inquiry_started':{label:'Sorgulandı',description:'SGK sorgusu yapıldı',color:'blue',order:1,nextActions:['prescription_saved']}, 'prescription_saved':{label:'Reçete Kaydedildi',description:'Reçete sisteme kaydedildi',color:'indigo',order:2,nextActions:['materials_delivered']}, 'materials_delivered':{label:'Malzeme Teslim Edildi',description:'Cihaz/malzeme hastaya teslim edildi',color:'purple',order:3,nextActions:['documents_uploaded']}, 'documents_uploaded':{label:'Belgeler Yüklendi',description:'Gerekli belgeler sisteme yüklendi',color:'green',order:4,nextActions:['invoiced']}, 'invoiced':{label:'Faturalandı',description:'Fatura kesildi ve gönderildi',color:'yellow',order:5,nextActions:['payment_received']}, 'payment_received':{label:'Ödemesi Alındı',description:'Ödeme tamamlandı',color:'emerald',order:6,nextActions:[]} };
  };

  proto.updatePatientSGKWorkflowStatus = function(patientId, status, notes='') {
    try {
      const workflowStatuses = this.getSGKWorkflowStatuses(); if (!workflowStatuses[status]) throw new Error(`Invalid workflow status: ${status}`);
      const patients = this.getAllPatients(); const patientIndex = patients.findIndex(p=>p.id===patientId); if (patientIndex === -1) throw new Error(`Patient not found: ${patientId}`);
      const patient = patients[patientIndex]; if (!patient.sgkWorkflow) { patient.sgkWorkflow = { currentStatus:null, statusHistory:[], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }; }
      const statusEntry = { status: status, label: workflowStatuses[status].label, description: workflowStatuses[status].description, timestamp: new Date().toISOString(), notes: notes, userId: 'current_user' };
      patient.sgkWorkflow.statusHistory.push(statusEntry); patient.sgkWorkflow.currentStatus = status; patient.sgkWorkflow.updatedAt = new Date().toISOString(); this.updateLegacySGKStatus(patient, status); this.savePatientData(patients); this.updateDocumentWorkflowStatus(patientId, status); return { success:true, patient:patient, statusEntry };
    } catch (error) { console.error('SGK workflow status update failed:', error); return { success:false, error: error.message }; }
  };

  proto.updateLegacySGKStatus = function(patient, workflowStatus) { const legacyMapping = { 'inquiry_started':'pending','prescription_saved':'approved','materials_delivered':'approved','documents_uploaded':'approved','invoiced':'approved','payment_received':'paid' }; patient.sgkStatus = legacyMapping[workflowStatus] || 'pending'; };

  proto.updateDocumentWorkflowStatus = function(patientId, status) { try { const sgkDocs = JSON.parse(localStorage.getItem('sgk_documents')||'[]'); sgkDocs.forEach(doc=>{ if (doc.patientId === patientId) { if (!doc.workflowStatus) doc.workflowStatus = { current: status, history: [] }; else doc.workflowStatus.current = status; doc.workflowStatus.history.push({ status, timestamp: new Date().toISOString() }); } }); localStorage.setItem('sgk_documents', JSON.stringify(sgkDocs)); const patientDocs = JSON.parse(localStorage.getItem('patient_documents')||'{}'); if (patientDocs[patientId]) { patientDocs[patientId].forEach(doc=>{ if (!doc.workflowStatus) doc.workflowStatus = { current: status, history: [] }; else doc.workflowStatus.current = status; doc.workflowStatus.history.push({ status, timestamp: new Date().toISOString() }); }); localStorage.setItem('patient_documents', JSON.stringify(patientDocs)); } } catch (error) { console.error('Document workflow status update failed:', error); } };

  proto.getPatientSGKWorkflowStatus = function(patientId) { const patients = this.getAllPatients(); const patient = patients.find(p=>p.id===patientId); if (!patient || !patient.sgkWorkflow) return null; const workflowStatuses = this.getSGKWorkflowStatuses(); const currentStatus = patient.sgkWorkflow.currentStatus; return { patient, currentStatus, currentStatusInfo: workflowStatuses[currentStatus], statusHistory: patient.sgkWorkflow.statusHistory, nextActions: workflowStatuses[currentStatus]?.nextActions || [] }; };

  proto.getAllPatientsWithSGKWorkflowSummary = function(){ const patients = this.getAllPatients(); const workflowStatuses = this.getSGKWorkflowStatuses(); return patients.map(patient => { const workflowInfo = this.getPatientSGKWorkflowStatus(patient.id); return { ...patient, sgkWorkflowSummary: workflowInfo ? { currentStatus: workflowInfo.currentStatus, currentStatusLabel: workflowInfo.currentStatusInfo?.label, currentStatusColor: workflowInfo.currentStatusInfo?.color, lastUpdated: patient.sgkWorkflow?.updatedAt, totalSteps: Object.keys(workflowStatuses).length, completedSteps: workflowInfo.statusHistory.length } : null }; }); };

})();