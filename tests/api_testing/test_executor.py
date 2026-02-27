"""Test executor with retry logic and timeout handling."""
import requests
import time
from typing import Dict, Any, Optional
from dataclasses import dataclass
from .logging_config import logger
from .config import Config

# Load config
config = Config()


@dataclass
class TestResult:
    """Result of a single test execution."""
    endpoint: str
    method: str
    category: str
    status_code: int
    success: bool
    error_message: Optional[str]
    execution_time: float
    retries: int


class TestExecutor:
    """Executes API tests with retry logic."""
    
    def __init__(self, base_url: str, max_retries: int = 8, timeout: int = 45):
        """Initialize test executor.
        
        Args:
            base_url: Base URL for API
            max_retries: Maximum number of retries for transient failures (increased to 8)
            timeout: Request timeout in seconds (increased to 45)
        """
        self.base_url = base_url.rstrip('/')
        self.max_retries = max_retries
        self.timeout = timeout
    
    def execute_test(
        self,
        method: str,
        endpoint: str,
        data: Optional[Dict[str, Any]],
        token: str,
        category: str,
        effective_tenant: Optional[str] = None,
        registry=None,
        query_params: Optional[Dict[str, Any]] = None,
        extract_query_from_body: bool = False
    ) -> TestResult:
        """Execute a single API test with retry logic.
        
        Args:
            method: HTTP method (GET, POST, etc.)
            endpoint: Endpoint path
            data: Request body data (for POST/PUT/PATCH)
            token: Auth token
            category: Endpoint category
            effective_tenant: X-Effective-Tenant-Id header value
            registry: ResourceRegistry to update with created resource IDs
            query_params: Query parameters to append to URL
            extract_query_from_body: If True, extract query params from body data
            
        Returns:
            TestResult object
        """
        start_time = time.time()
        retries = 0
        last_error = None
        
        for attempt in range(self.max_retries):
            try:
                headers = self.build_request_headers(token, method, effective_tenant)
                
                # CRITICAL: Extract query params from body if needed (e.g., commission_id)
                if extract_query_from_body and data:
                    # Extract fields that should be query params
                    query_fields = ['commissionId', 'commission_id', 'status']
                    extracted_params = {}
                    for field in query_fields:
                        if field in data:
                            value = data.pop(field)
                            if value is not None:  # Only add non-None values
                                extracted_params[field] = value
                    if extracted_params:
                        if not query_params:
                            query_params = {}
                        query_params.update(extracted_params)
                
                # Build URL with query parameters
                url = f"{self.base_url}{endpoint}"
                if query_params:
                    from urllib.parse import urlencode
                    query_string = urlencode(query_params)
                    url = f"{url}?{query_string}"
                
                response = requests.request(
                    method=method,
                    url=url,
                    json=data if method in ['POST', 'PUT', 'PATCH'] else None,
                    headers=headers,
                    timeout=self.timeout
                )
                
                execution_time = time.time() - start_time
                
                # Check if successful
                if response.status_code in [200, 201, 204]:
                    # CRITICAL: Update registry with newly created resource IDs
                    if registry and method == 'POST' and response.status_code in [200, 201]:
                        self._update_registry_from_response(endpoint, response, registry)
                    
                    # CRITICAL: Clear registry ID after DELETE to force recreation
                    if registry and method == 'DELETE' and response.status_code in [200, 204]:
                        self._clear_registry_after_delete(endpoint, registry)
                    
                    return TestResult(
                        endpoint=endpoint,
                        method=method,
                        category=category,
                        status_code=response.status_code,
                        success=True,
                        error_message=None,
                        execution_time=execution_time,
                        retries=retries
                    )
                
                # Check if should retry (5xx errors)
                if response.status_code >= 500 and attempt < self.max_retries - 1:
                    retries += 1
                    logger.debug(f"Retry {retries}/{self.max_retries} for {method} {endpoint}")
                    time.sleep(0.5 * attempt)  # Exponential backoff
                    continue
                
                # Failed, extract error message
                try:
                    error_data = response.json()
                    error_msg = error_data.get('error', {}).get('message') or error_data.get('message') or 'Unknown error'
                except:
                    error_msg = response.text[:100] if response.text else 'No error message'
                
                return TestResult(
                    endpoint=endpoint,
                    method=method,
                    category=category,
                    status_code=response.status_code,
                    success=False,
                    error_message=error_msg,
                    execution_time=execution_time,
                    retries=retries
                )
                
            except requests.Timeout:
                if attempt < self.max_retries - 1:
                    retries += 1
                    logger.debug(f"Timeout retry {retries}/{self.max_retries} for {method} {endpoint}")
                    continue
                last_error = "Request timeout"
            except requests.ConnectionError:
                if attempt < self.max_retries - 1:
                    retries += 1
                    logger.debug(f"Connection retry {retries}/{self.max_retries} for {method} {endpoint}")
                    time.sleep(1)
                    continue
                last_error = "Connection error"
            except Exception as e:
                last_error = str(e)
                break
        
        # All retries exhausted
        execution_time = time.time() - start_time
        return TestResult(
            endpoint=endpoint,
            method=method,
            category=category,
            status_code=0,
            success=False,
            error_message=last_error or "Unknown error",
            execution_time=execution_time,
            retries=retries
        )
    
    def build_request_headers(
        self,
        token: str,
        method: str,
        effective_tenant: Optional[str] = None
    ) -> Dict[str, str]:
        """Build request headers.
        
        Args:
            token: Auth token
            method: HTTP method
            effective_tenant: X-Effective-Tenant-Id value
            
        Returns:
            Headers dictionary
        """
        headers = {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
        }
        
        # Add Idempotency-Key for write operations
        if method in ['POST', 'PUT', 'PATCH']:
            headers["Idempotency-Key"] = f"test-{int(time.time())}-{__import__('random').randint(1000,9999)}"
        
        # Add effective tenant header if specified
        if effective_tenant:
            headers["X-Effective-Tenant-Id"] = effective_tenant
        
        return headers
    
    def _update_registry_from_response(self, endpoint: str, response: requests.Response, registry) -> None:
        """Update resource registry with IDs from POST response.
        
        Args:
            endpoint: API endpoint that was called
            response: Response object from successful POST request
            registry: ResourceRegistry to update
        """
        try:
            response_data = response.json()
            data = response_data.get('data', {})
            
            if not data:
                return
            
            # Map endpoints to resource types
            endpoint_to_resource = {
                '/api/parties': 'PARTY',
                '/api/sales': 'SALE',
                '/api/devices': 'DEVICE',
                '/api/inventory': 'ITEM',
                '/api/appointments': 'APPOINTMENT',
                '/api/campaigns': 'CAMPAIGN',
                '/api/branches': 'BRANCH',
                '/api/suppliers': 'SUPPLIER',
                '/api/communications/templates': 'TEMPLATE',
                '/api/notifications': 'NOTIFICATION',
                '/api/tickets': 'TICKET',
                '/api/invoices': 'INVOICE',
                '/api/admin/roles': 'ROLE',
                '/api/admin/users': 'USER',
                '/api/admin/tenants': 'TENANT',
                '/api/promissory-notes': 'PROMISSORY_NOTE',
                '/api/payment-records': 'PAYMENT_RECORD',
                '/api/users': 'USER',
                '/api/apps': 'APP',
                '/api/admin/sms/packages': 'PACKAGE',
                '/api/sms/headers': 'SMS_HEADER',
                '/api/sms/audiences': 'AUDIENCE',
                '/api/commissions/create': 'COMMISSION',
                '/api/admin/marketplaces/integrations': 'INTEGRATION',
                '/api/ai/actions': 'ACTION',
                '/api/production/orders': 'ORDER',
                '/registrations/bulk': 'JOB',
                '/parties/{party_id}/replacements': 'REPLACEMENT',
                '/api/admin/plans': 'PLAN',
                '/api/admin/addons': 'ADDON',
                '/api/sgk/workflow': 'WORKFLOW',
                '/api/sgk/e-receipts': 'RECEIPT',
                '/api/admin/bounces': 'BOUNCE',
                '/api/admin/email-approvals': 'APPROVAL',
                '/api/ocr/jobs': 'OCR_JOB',
                '/api/parties/{party_id}/documents': 'DOCUMENT',
                '/api/parties/{party_id}/notes': 'NOTE',
            }
            
            # Check for device-assignments (special case with party_id in path)
            if '/device-assignments' in endpoint:
                # Response format: {"data": {"saleId": "...", "assignmentIds": ["id1", "id2"], ...}}
                assignment_ids = data.get('assignmentIds', [])
                if isinstance(assignment_ids, list) and len(assignment_ids) > 0:
                    assignment_id = assignment_ids[0]
                    if assignment_id:
                        registry.assignment_id = assignment_id
                        logger.info(f"✓ Updated registry: assignment_id = {assignment_id}")
                return
            
            # Check for payment-plan (special case with sale_id in path)
            if '/payment-plan' in endpoint:
                installments = data.get('installments', [])
                if installments and len(installments) > 0:
                    installment_id = installments[0].get('id')
                    if installment_id:
                        registry.installment_id = installment_id
                        logger.debug(f"✓ Updated registry: installment_id = {installment_id}")
                return
            
            # Check for tickets (special case - response might be in different format)
            if '/tickets' in endpoint and method == 'POST':
                # Try multiple extraction strategies for ticket
                ticket_id = (
                    data.get('id') or
                    data.get('ticketId') or
                    data.get('ticket', {}).get('id') if isinstance(data.get('ticket'), dict) else None
                )
                if ticket_id:
                    registry.ticket_id = ticket_id
                    logger.info(f"✓ Updated registry: ticket_id = {ticket_id}")
                return
            
            # Find matching resource type
            resource_type = None
            for ep_pattern, res_type in endpoint_to_resource.items():
                if endpoint.startswith(ep_pattern):
                    resource_type = res_type
                    break
            
            if not resource_type:
                return
            
            # Extract ID from response
            resource_id = None
            
            # Strategy 1: Direct data.id
            if 'id' in data:
                resource_id = str(data['id'])
            
            # Strategy 2: Nested resource object
            elif resource_type.lower() in data:
                nested = data[resource_type.lower()]
                if isinstance(nested, dict) and 'id' in nested:
                    resource_id = str(nested['id'])
            
            # Strategy 3: camelCase resource key
            elif resource_type.lower().replace('_', '') in data:
                key = resource_type.lower().replace('_', '')
                nested = data[key]
                if isinstance(nested, dict) and 'id' in nested:
                    resource_id = str(nested['id'])
            
            # Strategy 4: Special cases for specific resources
            if not resource_id:
                # Sale might return saleId or sale.id
                if resource_type == 'SALE':
                    resource_id = (
                        data.get('saleId') or
                        data.get('sale', {}).get('id') if isinstance(data.get('sale'), dict) else None
                    )
                # User might return userId or user.id
                elif resource_type == 'USER':
                    resource_id = (
                        data.get('userId') or
                        data.get('user', {}).get('id') if isinstance(data.get('user'), dict) else None
                    )
                # Ticket might return ticketId or ticket.id
                elif resource_type == 'TICKET':
                    resource_id = (
                        data.get('ticketId') or
                        data.get('ticket', {}).get('id') if isinstance(data.get('ticket'), dict) else None
                    )
            
            if resource_id and resource_id != "null":
                # Update registry
                attr_name = f"{resource_type.lower()}_id"
                if hasattr(registry, attr_name):
                    # CRITICAL: Don't overwrite stable IDs (party, device, item, sale)
                    # These should remain stable throughout test run
                    if resource_type in ['PARTY', 'DEVICE', 'ITEM', 'SALE']:
                        current_value = getattr(registry, attr_name, None)
                        if current_value:
                            # Already have a stable ID, don't overwrite
                            logger.debug(f"Keeping stable {attr_name}: {current_value} (not overwriting with {resource_id})")
                            return
                    
                    setattr(registry, attr_name, resource_id)
                    logger.info(f"✓ Updated registry: {attr_name} = {resource_id}")
                    
                    # Track for cleanup
                    registry.created_resources.append({
                        "type": resource_type,
                        "id": resource_id,
                        "endpoint": endpoint
                    })
        
        except Exception as e:
            logger.debug(f"Failed to update registry from response: {e}")
    
    def _clear_registry_after_delete(self, endpoint: str, registry) -> None:
        """Clear registry ID after successful DELETE to force recreation.
        
        Args:
            endpoint: API endpoint that was called
            registry: ResourceRegistry to update
        """
        try:
            # Map endpoints to registry attributes
            # CRITICAL: Only clear non-essential IDs. Keep party_id, tenant_id, etc.
            endpoint_to_attr = {
                '/api/campaigns/': 'campaign_id',
                '/api/suppliers/': 'supplier_id',
                '/api/communications/templates/': 'template_id',
                '/api/admin/roles/': 'role_id',
                '/api/admin/plans/': 'plan_id',
                '/api/admin/addons/': 'addon_id',
                # DO NOT clear: party_id, tenant_id, device_id, item_id, sale_id
                # These are needed by subsequent tests
            }
            
            # Find matching attribute
            for ep_pattern, attr_name in endpoint_to_attr.items():
                if ep_pattern in endpoint:
                    if hasattr(registry, attr_name):
                        old_value = getattr(registry, attr_name, None)
                        setattr(registry, attr_name, None)
                        logger.info(f"✓ Cleared registry after DELETE: {attr_name} (was {old_value})")
                    break
            
            # After DELETE, restore stable IDs to prevent 404s
            if hasattr(registry, 'restore_stable_ids'):
                registry.restore_stable_ids()
        
        except Exception as e:
            logger.debug(f"Failed to clear registry after DELETE: {e}")
