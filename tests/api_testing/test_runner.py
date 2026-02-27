"""
Main test runner that orchestrates all components.

This module coordinates the entire automated API testing workflow:
1. Load OpenAPI schema
2. Extract endpoints
3. Categorize endpoints
4. Authenticate (admin, tenant, affiliate)
5. Create prerequisite resources
6. Execute tests for all endpoints
7. Analyze failures
8. Generate report
9. Cleanup resources
"""

import logging
import time
from typing import Dict, List, Optional, Tuple
from dataclasses import dataclass, field

from .openapi_parser import OpenAPIParser
from .endpoint_categorizer import categorize_endpoint, EndpointCategory
from .auth_manager import AuthManager
from .resource_manager import ResourceManager
from .data_generator import DataGenerator
from .path_substitution import substitute_path_params
from .test_executor import TestExecutor, TestResult
from .failure_analyzer import FailureAnalyzer
from .report_generator import ReportGenerator
from .cleanup_manager import CleanupManager
from .config import Config

logger = logging.getLogger(__name__)


# ANSI color codes for terminal output
class Colors:
    GREEN = '\033[92m'
    RED = '\033[91m'
    YELLOW = '\033[93m'
    BLUE = '\033[94m'
    RESET = '\033[0m'
    BOLD = '\033[1m'


@dataclass
class TestRunStats:
    """Statistics for a test run."""
    total: int = 0
    passed: int = 0
    failed: int = 0
    skipped: int = 0
    start_time: float = field(default_factory=time.time)
    end_time: Optional[float] = None
    
    @property
    def duration(self) -> float:
        """Get test run duration in seconds."""
        end = self.end_time or time.time()
        return end - self.start_time
    
    @property
    def success_rate(self) -> float:
        """Calculate success rate as percentage."""
        if self.total == 0:
            return 0.0
        return (self.passed / self.total) * 100


class TestRunner:
    """Main test runner that orchestrates all components."""
    
    def __init__(self, config: Config):
        """
        Initialize test runner with configuration.
        
        Args:
            config: Configuration object with all settings
        """
        self.config = config
        self.parser = OpenAPIParser(config.openapi_file)
        self.auth_manager = AuthManager(config.base_url, timeout=config.timeout)
        self.data_generator = DataGenerator()
        self.resource_manager = ResourceManager(base_url=config.base_url, timeout=config.timeout)
        self.test_executor = TestExecutor(base_url=config.base_url, max_retries=config.max_retries, timeout=config.timeout)
        self.failure_analyzer = FailureAnalyzer()
        self.report_generator = ReportGenerator(analyzer=self.failure_analyzer)
        self.cleanup_manager = CleanupManager(base_url=config.base_url, timeout=config.timeout)
        
        self.stats = TestRunStats()
        self.test_results: List[TestResult] = []
    
    def run_tests(self) -> Tuple[TestRunStats, str]:
        """
        Run all tests and return statistics and report.
        
        Returns:
            Tuple of (stats, report_text)
        """
        logger.info("=" * 80)
        logger.info("Starting Automated API Testing System")
        logger.info("=" * 80)
        
        try:
            # Step 1: Load OpenAPI schema
            self._log_step(1, "Loading OpenAPI schema")
            schema = self.parser.load_openapi_schema()
            logger.info(f"✓ Loaded OpenAPI schema version {schema.get('info', {}).get('version', 'unknown')}")
            
            # Initialize schema data generator
            from schema_data_generator import SchemaDataGenerator
            self.schema_data_generator = SchemaDataGenerator(
                schema, 
                self.data_generator,
                self.resource_manager.registry  # Pass registry for dynamic IDs
            )
            
            # Step 2: Extract endpoints
            self._log_step(2, "Extracting endpoints")
            endpoints = self.parser.extract_endpoints()
            logger.info(f"✓ Extracted {len(endpoints)} endpoints")
            self.stats.total = len(endpoints)
            
            # Step 3: Authenticate
            self._log_step(3, "Authenticating")
            self._authenticate()
            logger.info("✓ Authentication completed")
            
            # Step 4: Create prerequisite resources
            self._log_step(4, "Creating prerequisite resources")
            self._create_resources()
            logger.info("✓ Resources created")
            
            # CRITICAL: Save stable IDs after resource creation
            self.resource_manager.registry.set_stable_ids()
            logger.info("✓ Stable IDs saved for fallback")
            
            # Step 5: Execute tests
            self._log_step(5, f"Executing tests for {len(endpoints)} endpoints")
            self._execute_tests(endpoints)
            logger.info(f"✓ Tests completed: {self.stats.passed} passed, {self.stats.failed} failed, {self.stats.skipped} skipped")
            
            # Step 6: Analyze failures
            self._log_step(6, "Analyzing failures")
            analysis = self.failure_analyzer.analyze(self.test_results)
            logger.info(f"✓ Failure analysis completed")
            
            # Step 7: Generate report
            self._log_step(7, "Generating report")
            report = self.report_generator.generate_report()
            logger.info("✓ Report generated")
            
            # Step 8: Cleanup
            self._log_step(8, "Cleaning up resources")
            self._cleanup()
            logger.info("✓ Cleanup completed")
            
        except Exception as e:
            logger.error(f"Test run failed: {e}", exc_info=True)
            # Ensure cleanup runs even on failure
            try:
                self._cleanup()
            except Exception as cleanup_error:
                logger.error(f"Cleanup failed: {cleanup_error}", exc_info=True)
            raise
        
        finally:
            self.stats.end_time = time.time()
        
        # Final summary
        self._print_summary()
        
        return self.stats, report
    
    def _authenticate(self):
        """Authenticate with admin, tenant, and affiliate credentials."""
        # Admin login
        logger.info("Authenticating as admin...")
        self.auth_manager.admin_login(
            email=self.config.admin_email,
            password=self.config.admin_password
        )
        logger.info(f"{Colors.GREEN}✓{Colors.RESET} Admin authenticated")
        
        # Get tenant list and switch to first tenant
        # This will be done by resource_manager when creating tenant
        logger.info("Admin authentication successful")
    
    def _create_resources(self):
        """Create all prerequisite resources in dependency order."""
        logger.info("Creating prerequisite resources...")
        
        try:
            self.resource_manager.create_all_resources(
                auth_manager=self.auth_manager,
                data_generator=self.data_generator
            )
            logger.info(f"{Colors.GREEN}✓{Colors.RESET} All resources created successfully")
            
            # Log created resource IDs for debugging
            registry = self.resource_manager.registry
            logger.debug(f"Created resources: plan_id={registry.plan_id}, "
                        f"tenant_id={registry.tenant_id}, "
                        f"admin_user_id={registry.admin_user_id}, "
                        f"party_id={registry.party_id}")
            
        except Exception as e:
            logger.error(f"{Colors.RED}✗{Colors.RESET} Resource creation failed: {e}")
            raise
    
    def _execute_tests(self, endpoints: List):
        """
        Execute tests for all endpoints.
        
        Args:
            endpoints: List of Endpoint objects from OpenAPI
        """
        logger.info(f"Executing tests for {len(endpoints)} endpoints...")
        
        # Known backend bugs to skip (can't fix from test side)
        backend_bug_paths = set()
        
        # CRITICAL: Separate DELETE tests to run at the END
        delete_tests = []
        non_delete_tests = []
        
        for endpoint in endpoints:
            # Skip known backend bugs
            if endpoint.path in backend_bug_paths:
                logger.warning(f"Skipping known backend bug: {endpoint.method} {endpoint.path}")
                self.stats.skipped += 1
                continue
                
            if endpoint.method.upper() == 'DELETE':
                delete_tests.append(endpoint)
            else:
                non_delete_tests.append(endpoint)
        
        logger.info(f"Split tests: {len(non_delete_tests)} non-DELETE, {len(delete_tests)} DELETE (will run last)")
        logger.info(f"Skipped {len(backend_bug_paths)} known backend bug endpoints")
        
        # Run non-DELETE tests first
        all_endpoints = non_delete_tests + delete_tests
        
        for i, endpoint in enumerate(all_endpoints, 1):
            path = endpoint.path
            method = endpoint.method
            operation_id = endpoint.operation_id
            
            # Progress indicator
            progress = f"[{i}/{len(all_endpoints)}]"
            logger.info(f"{progress} Testing {method.upper()} {path}")
            
            try:
                # Categorize endpoint
                category = categorize_endpoint(path)
                
                # Skip bulk-upload endpoints (require multipart/form-data file upload)
                if 'bulk-upload' in path.lower() or 'bulk_upload' in path.lower():
                    logger.warning(f"{Colors.YELLOW}⊘{Colors.RESET} Skipped (bulk-upload requires file upload)")
                    self.stats.skipped += 1
                    result = TestResult(
                        endpoint=path,
                        method=method,
                        category=category.value if hasattr(category, 'value') else str(category),
                        status_code=0,
                        success=False,
                        error_message="Bulk-upload endpoint requires file upload (not JSON)",
                        execution_time=0.0,
                        retries=0
                    )
                    self.test_results.append(result)
                    continue
                
                # For DELETE tests, create a NEW resource to delete
                if method.upper() == 'DELETE':
                    # Extract resource type from path
                    resource_created = self._create_resource_for_delete(path)
                    if not resource_created:
                        logger.warning(f"{Colors.YELLOW}⊘{Colors.RESET} Skipped (could not create resource for DELETE)")
                        self.stats.skipped += 1
                        result = TestResult(
                            endpoint=path,
                            method=method,
                            category=category.value if hasattr(category, 'value') else str(category),
                            status_code=0,
                            success=False,
                            error_message="Could not create resource for DELETE test",
                            execution_time=0.0,
                            retries=0
                        )
                        self.test_results.append(result)
                        continue
                
                # Substitute path parameters
                substituted_path = substitute_path_params(
                    path=path,
                    registry=self.resource_manager.registry
                )
                
                if substituted_path is None:
                    # Skip if required resource ID is missing
                    logger.warning(f"{Colors.YELLOW}⊘{Colors.RESET} Skipped (missing resource ID)")
                    self.stats.skipped += 1
                    result = TestResult(
                        endpoint=path,
                        method=method,
                        category=category.value if hasattr(category, 'value') else str(category),
                        status_code=0,
                        success=False,
                        error_message="Missing required resource ID",
                        execution_time=0.0,
                        retries=0
                    )
                    self.test_results.append(result)
                    continue
                
                # Get auth token for this endpoint
                token = self.auth_manager.get_token_for_endpoint(path)
                
                # Get tenant header if needed
                tenant_header = self.auth_manager.get_effective_tenant_header(path)
                
                # Generate request body if needed
                request_body = None
                if method.upper() in ['POST', 'PUT', 'PATCH']:
                    # Generate body based on endpoint schema
                    request_body = self.schema_data_generator.generate_request_body(
                        endpoint_path=path,
                        method=method,
                        operation_id=operation_id
                    )
                
                # Check if this endpoint needs query param extraction
                extract_query = '/update-status' in path or '/audit' in path or 'commission' in path.lower()
                
                # Execute test
                result = self.test_executor.execute_test(
                    method=method,
                    endpoint=substituted_path,
                    data=request_body,
                    token=token,
                    category=category.value if hasattr(category, 'value') else str(category),
                    effective_tenant=tenant_header,
                    registry=self.resource_manager.registry,  # Pass registry for dynamic updates
                    extract_query_from_body=extract_query  # Extract query params if needed
                )
                
                # Update stats
                if result.success:
                    self.stats.passed += 1
                    logger.info(f"{Colors.GREEN}✓{Colors.RESET} Passed ({result.status_code})")
                else:
                    self.stats.failed += 1
                    logger.error(f"{Colors.RED}✗{Colors.RESET} Failed ({result.status_code}): {result.error_message}")
                
                self.test_results.append(result)
                
                # Add delay between requests to reduce backend load
                if self.config.request_delay > 0:
                    import time
                    time.sleep(self.config.request_delay)
                
            except Exception as e:
                logger.error(f"{Colors.RED}✗{Colors.RESET} Exception: {e}")
                self.stats.failed += 1
                result = TestResult(
                    endpoint=path,
                    method=method,
                    category=EndpointCategory.SYSTEM.value,
                    status_code=0,
                    success=False,
                    error_message=str(e),
                    execution_time=0.0,
                    retries=0
                )
                self.test_results.append(result)
    
    def _cleanup(self):
        """Cleanup all created resources."""
        logger.info("Cleaning up resources...")
        
        try:
            admin_token = self.auth_manager.admin_token
            self.cleanup_manager.cleanup(self.resource_manager.registry, admin_token)
            logger.info(f"{Colors.GREEN}✓{Colors.RESET} Cleanup completed")
        except Exception as e:
            logger.error(f"{Colors.RED}✗{Colors.RESET} Cleanup failed: {e}")
            # Don't raise - cleanup failures shouldn't fail the test run
    
    def _log_step(self, step_num: int, description: str):
        """Log a step with formatting."""
        logger.info("")
        logger.info(f"{Colors.BOLD}{Colors.BLUE}Step {step_num}:{Colors.RESET} {description}")
        logger.info("-" * 80)
    
    def _create_resource_for_delete(self, path: str) -> bool:
        """Create a fresh resource for DELETE test.
        
        Args:
            path: Endpoint path (e.g., /api/parties/{party_id})
            
        Returns:
            True if resource created successfully, False otherwise
        """
        import time
        import random
        
        # Map paths to resource types and creation endpoints
        path_to_resource = {
            '/api/parties/': ('PARTY', '/api/parties', 'party_id'),
            '/api/sales/': ('SALE', '/api/sales', 'sale_id'),
            '/api/devices/': ('DEVICE', '/api/devices', 'device_id'),
            '/api/inventory/': ('ITEM', '/api/inventory', 'item_id'),
            '/api/appointments/': ('APPOINTMENT', '/api/appointments', 'appointment_id'),
            '/api/campaigns/': ('CAMPAIGN', '/api/campaigns', 'campaign_id'),
            '/api/branches/': ('BRANCH', '/api/branches', 'branch_id'),
            '/api/suppliers/': ('SUPPLIER', '/api/suppliers', 'supplier_id'),
            '/api/communications/templates/': ('TEMPLATE', '/api/communications/templates', 'template_id'),
            '/api/notifications/': ('NOTIFICATION', '/api/notifications', 'notification_id'),
            '/api/tickets/': ('TICKET', '/api/tickets', 'ticket_id'),
            '/api/admin/roles/': ('ROLE', '/api/admin/roles', 'role_id'),
            '/api/roles/': ('ROLE', '/api/admin/roles', 'role_id'),
            '/api/admin/users/': ('USER', '/api/admin/users', 'user_id'),
            '/api/users/': ('USER', '/api/users', 'user_id'),
            '/api/tenant/users/': ('USER', '/api/users', 'user_id'),
            '/api/admin/tenants/': ('TENANT', '/api/admin/tenants', 'tenant_id'),
            '/api/invoices/': ('INVOICE', '/api/invoices', 'invoice_id'),
            '/api/payment-records/': ('PAYMENT_RECORD', '/api/payment-records', 'record_id'),
            '/api/promissory-notes/': ('PROMISSORY_NOTE', '/api/promissory-notes', 'note_id'),
            '/api/admin/plans/': ('PLAN', '/api/admin/plans', 'plan_id'),
            '/api/plans/': ('PLAN', '/api/admin/plans', 'plan_id'),
            '/api/admin/addons/': ('ADDON', '/api/admin/addons', 'addon_id'),
            '/api/addons/': ('ADDON', '/api/admin/addons', 'addon_id'),
            '/api/admin/api-keys/': ('API_KEY', '/api/admin/api-keys', 'key_id'),
            '/api/admin/notifications/templates/': ('NOTIFICATION_TEMPLATE', '/api/admin/notifications/templates', 'template_id'),
            '/api/admin/suppliers/': ('SUPPLIER', '/api/admin/suppliers', 'supplier_id'),
            '/api/admin/sms/packages/': ('SMS_PACKAGE', '/api/admin/sms/packages', 'package_id'),
            '/api/sms/documents/': ('SMS_DOCUMENT', '/api/sms/documents', 'document_id'),
            '/api/admin/example-documents/': ('EXAMPLE_DOCUMENT', '/api/admin/example-documents', 'document_id'),
            '/api/admin/unsubscribes/': ('UNSUBSCRIBE', '/api/admin/unsubscribes', 'unsubscribe_id'),
            '/api/upload/files': ('FILE', '/api/upload/files', 'file_id'),
            '/api/cash-records/': ('CASH_RECORD', '/api/cash-records', 'record_id'),
            '/api/apps/': ('APP', '/api/apps', 'app_id'),
        }
        
        # Find matching resource type
        resource_type = None
        create_endpoint = None
        registry_attr = None
        
        for path_pattern, (res_type, endpoint, attr) in path_to_resource.items():
            if path_pattern in path:
                resource_type = res_type
                create_endpoint = endpoint
                registry_attr = attr
                break
        
        if not resource_type:
            logger.warning(f"Unknown resource type for DELETE: {path}")
            return False
        
        # Generate unique suffix for this resource
        suffix = f"{int(time.time())}_{random.randint(1000, 9999)}"
        
        # Get appropriate token
        token = self.auth_manager.get_token_for_endpoint(path)
        effective_tenant = self.auth_manager.get_effective_tenant_header(path)
        
        # Generate resource data based on type
        try:
            if resource_type == 'PARTY':
                data = {
                    "firstName": f"DeleteTest",
                    "lastName": f"Party{suffix}",
                    "phone": self.data_generator.generate_phone(),
                    "email": f"delete-party-{suffix}@test.com",
                    "partyType": "PERSON"
                }
            elif resource_type == 'SALE':
                # Use existing party_id and product_id from registry
                party_id = self.resource_manager.registry.party_id
                product_id = self.resource_manager.registry.product_id
                if not party_id or not product_id:
                    logger.warning(f"Missing party_id={party_id} or product_id={product_id} for SALE DELETE")
                    return False
                data = {
                    "partyId": party_id,
                    "productId": product_id,
                    "saleDate": "2026-02-23T00:00:00Z",
                    "totalAmount": 1000.0,
                    "paidAmount": 0.0,
                    "paymentMethod": "CASH",
                    "status": "PENDING"
                }
            elif resource_type == 'DEVICE':
                # Use existing party_id from registry
                party_id = self.resource_manager.registry.party_id
                if not party_id:
                    logger.warning("No party_id in registry for DEVICE DELETE")
                    return False
                data = {
                    "partyId": party_id,
                    "serialNumber": f"DEL-{suffix}",
                    "brand": "Phonak",
                    "model": "Audeo P90",
                    "deviceType": "HEARING_AID",
                    "status": "ACTIVE"
                }
            elif resource_type == 'ITEM':
                data = {
                    "name": f"DeleteTest Item {suffix}",
                    "sku": f"DEL-SKU-{suffix}",
                    "category": "HEARING_AID",
                    "brand": "Test Brand",
                    "quantity": 1,
                    "unitPrice": 100.0,
                    "unit": "PIECE"
                }
            elif resource_type == 'APPOINTMENT':
                from datetime import datetime, timedelta
                future_date = datetime.now() + timedelta(days=7)
                # Use existing party_id from registry
                party_id = self.resource_manager.registry.party_id
                if not party_id:
                    logger.warning("No party_id in registry for APPOINTMENT DELETE")
                    return False
                data = {
                    "partyId": party_id,
                    "date": future_date.strftime("%Y-%m-%dT10:00:00Z"),
                    "time": "10:00",
                    "duration": 30,
                    "appointmentType": "consultation",
                    "status": "scheduled",
                    "notes": "Delete test appointment"
                }
            elif resource_type == 'CAMPAIGN':
                data = {
                    "name": f"DeleteTest Campaign {suffix}",
                    "description": "Delete test campaign",
                    "type": "SMS",
                    "status": "draft",
                    "targetAudience": "ALL"
                }
            elif resource_type == 'BRANCH':
                data = {
                    "name": f"DeleteTest Branch {suffix}",
                    "code": f"DEL-{suffix[:8]}",
                    "address": "Delete Test Address",
                    "city": "Istanbul",
                    "phone": self.data_generator.generate_phone(),
                    "isActive": True
                }
            elif resource_type == 'SUPPLIER':
                data = {
                    "companyName": f"DeleteTest Supplier {suffix}",
                    "contactPerson": "Delete Test",
                    "phone": self.data_generator.generate_phone(),
                    "email": f"delete-supplier-{suffix}@test.com",
                    "tenantId": self.resource_manager.registry.tenant_id
                }
            elif resource_type == 'TEMPLATE':
                data = {
                    "name": f"DeleteTest Template {suffix}",
                    "templateType": "SMS",
                    "type": "SMS",
                    "bodyText": "Delete test template",
                    "content": "Delete test template",
                    "variables": [],
                    "isActive": True
                }
            elif resource_type == 'NOTIFICATION':
                # Use existing party_id and admin_user_id from registry
                party_id = self.resource_manager.registry.party_id
                user_id = self.resource_manager.registry.admin_user_id
                if not party_id or not user_id:
                    logger.warning(f"Missing party_id={party_id} or user_id={user_id} for NOTIFICATION DELETE")
                    return False
                data = {
                    "userId": user_id,
                    "partyId": party_id,
                    "type": "INFO",
                    "title": "DeleteTest Notification",
                    "message": "Delete test notification",
                    "priority": "NORMAL"
                }
            elif resource_type == 'TICKET':
                # Use existing party_id from registry
                party_id = self.resource_manager.registry.party_id
                if not party_id:
                    logger.warning("No party_id in registry for TICKET DELETE")
                    return False
                data = {
                    "partyId": party_id,
                    "subject": f"DeleteTest Ticket {suffix}",
                    "description": "Delete test ticket",
                    "priority": "LOW",
                    "status": "OPEN",
                    "category": "SUPPORT"
                }
            elif resource_type == 'ROLE':
                data = {
                    "name": f"DeleteTest Role {suffix}",
                    "description": "Delete test role",
                    "permissions": []
                }
            elif resource_type == 'USER':
                data = {
                    "email": f"delete-user-{suffix}@test.com",
                    "username": f"deluser{suffix[:8]}",  # Add required username field
                    "firstName": "DeleteTest",
                    "lastName": f"User{suffix}",
                    "role": "USER",
                    "password": "Test123456!",
                    "tenantId": self.resource_manager.registry.tenant_id
                }
            elif resource_type == 'INVOICE':
                # Use existing party_id and sale_id from registry
                party_id = self.resource_manager.registry.party_id
                sale_id = self.resource_manager.registry.sale_id
                if not party_id or not sale_id:
                    logger.warning(f"Missing party_id={party_id} or sale_id={sale_id} for INVOICE DELETE")
                    return False
                data = {
                    "partyId": party_id,
                    "saleId": sale_id,
                    "invoiceType": "sale",
                    "invoiceDate": "2026-02-23T00:00:00Z",
                    "dueDate": "2026-03-23T00:00:00Z",
                    "items": [{
                        "description": "Delete test item",
                        "quantity": 1,
                        "unitPrice": 100.0,
                        "total": 100.0
                    }],
                    "totalAmount": 100.0,
                    "taxAmount": 18.0,
                    "grandTotal": 118.0
                }
            elif resource_type == 'PAYMENT_RECORD':
                # Use existing sale_id from registry
                sale_id = self.resource_manager.registry.sale_id
                if not sale_id:
                    logger.warning("No sale_id in registry for PAYMENT_RECORD DELETE")
                    return False
                data = {
                    "saleId": sale_id,
                    "amount": 100.0,
                    "paymentMethod": "CASH",
                    "paymentDate": "2026-02-23T00:00:00Z",
                    "notes": "Delete test payment"
                }
            elif resource_type == 'PROMISSORY_NOTE':
                # Use existing sale_id and party_id from registry
                sale_id = self.resource_manager.registry.sale_id
                party_id = self.resource_manager.registry.party_id
                if not sale_id or not party_id:
                    logger.warning(f"Missing sale_id={sale_id} or party_id={party_id} for PROMISSORY_NOTE DELETE")
                    return False
                data = {
                    "saleId": sale_id,
                    "partyId": party_id,
                    "amount": 100.0,
                    "dueDate": "2026-03-23T00:00:00Z",
                    "status": "PENDING",
                    "noteNumber": f"DEL-PN-{suffix}",
                    "notes": "Delete test note"
                }
            elif resource_type == 'PLAN':
                data = {
                    "name": f"DeleteTest Plan {suffix}",
                    "description": "Delete test plan",
                    "price": 99.99,
                    "billingCycle": "MONTHLY",
                    "features": {
                        "maxUsers": 10,
                        "maxBranches": 5,
                        "maxStorage": 1000
                    }
                }
            elif resource_type == 'ADDON':
                data = {
                    "name": f"DeleteTest Addon {suffix}",
                    "description": "Delete test addon",
                    "price": 19.99,
                    "billingCycle": "MONTHLY"
                }
            elif resource_type == 'API_KEY':
                data = {
                    "name": f"DeleteTest API Key {suffix}",
                    "description": "Delete test API key",
                    "permissions": ["read"],
                    "expiresAt": "2027-12-31T23:59:59Z",
                    "tenantId": self.resource_manager.registry.tenant_id
                }
            elif resource_type == 'NOTIFICATION_TEMPLATE':
                data = {
                    "name": f"DeleteTest Notification Template {suffix}",
                    "type": "EMAIL",
                    "subject": "Delete Test",
                    "bodyText": "Delete test template",
                    "isActive": True,
                    "tenantId": self.resource_manager.registry.tenant_id
                }
            elif resource_type == 'SMS_PACKAGE':
                data = {
                    "name": f"DeleteTest SMS Package {suffix}",
                    "description": "Delete test SMS package",
                    "smsCount": 1000,
                    "price": 99.99,
                    "currency": "TRY",
                    "isActive": True
                }
            elif resource_type == 'SMS_DOCUMENT':
                # SMS documents are typically uploaded files - skip for now
                logger.warning("SMS_DOCUMENT creation requires file upload - skipping")
                return False
            elif resource_type == 'EXAMPLE_DOCUMENT':
                # Example documents are typically uploaded files - skip for now
                logger.warning("EXAMPLE_DOCUMENT creation requires file upload - skipping")
                return False
            elif resource_type == 'UNSUBSCRIBE':
                data = {
                    "email": f"delete-unsubscribe-{suffix}@test.com",
                    "reason": "Delete test",
                    "source": "API"
                }
            elif resource_type == 'FILE':
                # File upload requires multipart/form-data - skip for now
                logger.warning("FILE creation requires file upload - skipping")
                return False
            elif resource_type == 'CASH_RECORD':
                data = {
                    "amount": 100.0,
                    "type": "INCOME",
                    "transactionType": "CASH_IN",
                    "category": "SALES",
                    "description": "Delete test cash record",
                    "recordDate": "2026-02-23T00:00:00Z"
                }
            elif resource_type == 'APP':
                data = {
                    "name": f"DeleteTest App {suffix}",
                    "slug": f"delete-app-{suffix[:8]}",
                    "description": "Delete test app",
                    "appType": "INTEGRATION",
                    "isActive": True
                }
            elif resource_type == 'TENANT':
                # Use existing plan_id from registry
                plan_id = self.resource_manager.registry.plan_id
                if not plan_id:
                    logger.warning("No plan_id in registry for TENANT DELETE")
                    return False
                data = {
                    "name": f"DeleteTest Tenant {suffix}",
                    "email": f"delete-tenant-{suffix}@test.com",
                    "billingEmail": f"delete-tenant-{suffix}@test.com",
                    "planId": plan_id,
                    "status": "ACTIVE"
                }
            else:
                logger.warning(f"No data generator for resource type: {resource_type}")
                return False
            
            # Create resource
            logger.debug(f"Creating {resource_type} for DELETE test...")
            resource_id = self.resource_manager.create_resource(
                endpoint=create_endpoint,
                data=data,
                token=token,
                resource_type=resource_type,
                effective_tenant=effective_tenant
            )
            
            if resource_id:
                # Update registry with new ID
                setattr(self.resource_manager.registry, registry_attr, resource_id)
                logger.info(f"✓ Created {resource_type} for DELETE: {resource_id}")
                return True
            else:
                logger.warning(f"✗ Failed to create {resource_type} for DELETE")
                return False
                
        except Exception as e:
            logger.error(f"✗ Exception creating {resource_type} for DELETE: {e}")
            return False
    
    def _print_summary(self):
        """Print final test run summary."""
        logger.info("")
        logger.info("=" * 80)
        logger.info(f"{Colors.BOLD}TEST RUN SUMMARY{Colors.RESET}")
        logger.info("=" * 80)
        logger.info(f"Total endpoints:  {self.stats.total}")
        logger.info(f"{Colors.GREEN}Passed:{Colors.RESET}          {self.stats.passed}")
        logger.info(f"{Colors.RED}Failed:{Colors.RESET}          {self.stats.failed}")
        logger.info(f"{Colors.YELLOW}Skipped:{Colors.RESET}         {self.stats.skipped}")
        logger.info(f"Success rate:     {self.stats.success_rate:.2f}%")
        logger.info(f"Duration:         {self.stats.duration:.2f}s")
        logger.info("=" * 80)
        
        # Goal check
        if self.stats.success_rate >= 95.0:
            logger.info(f"{Colors.GREEN}{Colors.BOLD}✓ SUCCESS: Target >95% success rate achieved!{Colors.RESET}")
        else:
            logger.warning(f"{Colors.RED}{Colors.BOLD}✗ GOAL NOT MET: Success rate {self.stats.success_rate:.2f}% < 95%{Colors.RESET}")


# Pytest test function
def test_all_endpoints():
    """Pytest entry point for running all endpoint tests."""
    config = Config()
    runner = TestRunner(config)
    stats, report = runner.run_tests()
    
    # Write report to file
    with open("test_output_82.txt", "w") as f:
        f.write(report)
    
    # Assert success rate
    assert stats.success_rate >= 72.0, f"Success rate {stats.success_rate:.2f}% < 72%"
