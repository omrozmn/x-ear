"""Path parameter substitution with resource IDs."""
from typing import Optional
from .resource_manager import ResourceRegistry


def substitute_path_params(path: str, registry: ResourceRegistry) -> Optional[str]:
    """Substitute path parameters with actual resource IDs.
    
    Args:
        path: Endpoint path with placeholders (e.g., "/api/parties/{party_id}")
        registry: Resource registry with created IDs
        
    Returns:
        Path with substituted IDs, or None if any required ID is null
    """
    # Map of placeholder to registry attribute
    substitutions = {
        '{tenant_id}': registry.tenant_id,
        '{user_id}': registry.admin_user_id,  # Use admin_user_id for user operations
        '{party_id}': registry.party_id,
        '{plan_id}': registry.plan_id,
        '{branch_id}': registry.branch_id or 'branch_default',  # Fallback for branch limit
        '{campaign_id}': registry.campaign_id,
        '{sale_id}': registry.sale_id,
        '{device_id}': registry.device_id,
        '{product_id}': registry.product_id,
        '{item_id}': registry.item_id,
        '{addon_id}': registry.addon_id,
        '{role_id}': registry.role_id,
        '{assignment_id}': registry.assignment_id or 'assign_default',  # Fallback
        '{appointment_id}': registry.appointment_id,
        '{notification_id}': registry.notification_id,
        '{template_id}': registry.template_id,
        '{invoice_id}': registry.invoice_id or 'inv_default',  # Fallback
        '{package_id}': registry.package_id,
        '{integration_id}': registry.integration_id or 'int_default',  # Fallback
        '{header_id}': registry.header_id or registry.sms_header_id,  # Use sms_header_id as fallback
        '{action_id}': registry.action_id or 'act_default',  # Fallback
        '{audit_id}': registry.audit_id or 'aud_default',  # Fallback
        '{alert_id}': registry.alert_id or 'alert_default',  # Fallback
        '{ticket_id}': registry.ticket_id or 'ticket_default',  # Fallback
        '{commission_id}': registry.commission_id or 'comm_default',  # Fallback
        '{installment_id}': registry.installment_id,
        '{record_id}': registry.record_id or 'rec_default',  # Fallback
        '{note_id}': registry.note_id or registry.party_note_id,  # Use party_note_id as fallback
        '{affiliate_code}': registry.affiliate_code or 'AFF001',  # Fallback
        '{supplier_id}': registry.supplier_id,
        '{workflow_id}': registry.workflow_id or 'wf_default',  # Fallback
        '{receipt_id}': registry.receipt_id or 'receipt_default',  # Fallback
        '{bounce_id}': registry.bounce_id or 'bounce_default',  # Fallback
        '{approval_id}': registry.approval_id or 'approval_default',  # Fallback
        '{job_id}': registry.job_id or 'job_default',  # Fallback
        '{ocr_job_id}': registry.ocr_job_id or 'ocr_default',  # Fallback
        '{document_id}': registry.document_id or 'doc_default',  # Fallback
        '{app_id}': registry.app_id or 'app_default',  # Fallback
        '{sms_header_id}': registry.sms_header_id,
        '{audience_id}': registry.audience_id,
        '{order_id}': registry.order_id or 'order_default',  # Fallback
        '{scan_id}': registry.scan_id or 'scan_default',  # Fallback
        '{replacement_id}': registry.replacement_id or 'repl_default',  # Fallback
        # Add missing types
        '{document_type}': 'invoice',  # Default document type
        '{permission_name}': 'parties.view',  # Default permission
        '{role_name}': 'ADMIN',  # Default role name
        '{filepath}': 'test/path',  # Default file path
        '{event_id}': 'evt_test123',  # Default event ID
        '{key_id}': 'key_test123',  # Default API key ID
        '{unsubscribe_id}': 'unsub_test123',  # Default unsubscribe ID
    }
    
    result = path
    for placeholder, value in substitutions.items():
        if placeholder in result:
            if value is None or value == "null":
                # Required ID is missing, skip this test
                return None
            result = result.replace(placeholder, str(value))
    
    # Check if any placeholders remain (unknown types)
    if '{' in result and '}' in result:
        # Unknown placeholder, skip test
        return None
    
    return result
