// Global functions for document view/download/delete
function viewDocument(documentId, patientId) {
    if (window.documentManagement) {
        const pid = patientId || window.patientDetailsManager?.currentPatient?.id;
        window.documentManagement.viewDocument(documentId, pid);
    }
}

function downloadDocument(documentId, patientId) {
    if (window.documentManagement) {
        const pid = patientId || window.patientDetailsManager?.currentPatient?.id;
        window.documentManagement.downloadDocument(documentId, pid);
    }
}

function deleteDocument(documentId, patientId) {
    if (window.documentManagement) {
        const pid = patientId || window.patientDetailsManager?.currentPatient?.id;
        window.documentManagement.deleteDocument(documentId, pid);
    }
}

// Global functions for modal management
function uploadDocument() {
    if (window.documentManagement) {
        window.documentManagement.uploadDocument();
    }
}

function closeUploadModal() {
    if (window.documentManagement) {
        window.documentManagement.closeUploadModal();
    }
}

function handleFileSelect(event) {
    if (window.documentManagement && event.target.files.length > 0) {
        window.documentManagement.handleFile(event.target.files[0]);
    }
}
