"""Cleanup manager for test resource removal."""
import requests
from typing import List, Dict
from .resource_manager import ResourceRegistry
from .logging_config import logger


class CleanupManager:
    """Manages cleanup of test resources."""
    
    def __init__(self, base_url: str, timeout: int = 15):
        """Initialize cleanup manager.
        
        Args:
            base_url: Base URL for API
            timeout: Request timeout in seconds
        """
        self.base_url = base_url.rstrip('/')
        self.timeout = timeout
    
    def cleanup(self, registry: ResourceRegistry, admin_token: str) -> None:
        """Clean up all created test resources.
        
        Args:
            registry: Resource registry with created resources
            admin_token: Admin token for deletion
        """
        logger.info("Cleanup DISABLED - resources will persist for next test run")
        logger.info("This improves test speed and consistency")
        # NO CLEANUP - resources stay in DB for reuse
        return
        
        # Delete in reverse order (children first)
        # NOTE: We do NOT delete TENANT - it's reused across test runs for consistency
        cleanup_order = [
            ("SMS_HEADER", f"/api/sms/headers/{registry.header_id}", None),
            ("INTEGRATION", f"/api/admin/marketplaces/integrations/{registry.integration_id}", "system"),
            ("PACKAGE", f"/api/admin/sms/packages/{registry.package_id}", "system"),
            ("INVOICE", f"/api/invoices/{registry.invoice_id}", None),
            ("TEMPLATE", f"/api/communications/templates/{registry.template_id}", None),
            ("NOTIFICATION", f"/api/notifications/{registry.notification_id}", None),
            ("APPOINTMENT", f"/api/appointments/{registry.appointment_id}", None),
            ("ASSIGNMENT", f"/api/parties/{registry.party_id}/device-assignments/{registry.assignment_id}", None),
            ("ROLE", f"/api/admin/roles/{registry.role_id}", "system"),
            ("ADDON", f"/api/admin/addons/{registry.addon_id}", "system"),
            ("ITEM", f"/api/inventory/items/{registry.item_id}", None),
            ("DEVICE", f"/api/devices/{registry.device_id}", None),
            ("SALE", f"/api/sales/{registry.sale_id}", None),
            ("CAMPAIGN", f"/api/campaigns/{registry.campaign_id}", None),
            ("BRANCH", f"/api/branches/{registry.branch_id}", None),
            ("PARTY", f"/api/parties/{registry.party_id}", None),
            ("USER", f"/api/admin/users/{registry.user_id}", "system"),
            # TENANT is NOT deleted - reused across test runs
            # ("TENANT", f"/api/admin/tenants/{registry.tenant_id}", "system"),
            ("PLAN", f"/api/admin/plans/{registry.plan_id}", "system"),
        ]
        
        deleted_count = 0
        failed_count = 0
        
        for resource_type, endpoint, effective_tenant in cleanup_order:
            # Check if resource ID exists and is not null
            if "null" in endpoint or "/None" in endpoint:
                continue
            
            try:
                headers = {
                    "Authorization": f"Bearer {admin_token}",
                    "Content-Type": "application/json"
                }
                
                if effective_tenant:
                    headers["X-Effective-Tenant-Id"] = effective_tenant
                
                response = requests.delete(
                    f"{self.base_url}{endpoint}",
                    headers=headers,
                    timeout=self.timeout
                )
                
                if response.status_code in [200, 204, 404]:
                    deleted_count += 1
                    logger.debug(f"✓ Deleted {resource_type}")
                else:
                    failed_count += 1
                    logger.warning(f"✗ Failed to delete {resource_type}: {response.status_code}")
                    
            except Exception as e:
                failed_count += 1
                logger.warning(f"✗ Failed to delete {resource_type}: {e}")
                # Continue with other resources
        
        logger.info(f"Cleanup complete: {deleted_count} deleted, {failed_count} failed")
