"""Generate request bodies from OpenAPI schemas."""
from typing import Dict, Any, Optional
import random
import string
from datetime import datetime, timedelta


class SchemaDataGenerator:
    """Generate request data from OpenAPI schemas."""
    
    def __init__(self, openapi_schema: Dict[str, Any], data_generator, registry=None):
        """Initialize schema data generator.
        
        Args:
            openapi_schema: Full OpenAPI schema
            data_generator: DataGenerator instance for test data
            registry: ResourceRegistry for using current resource IDs
        """
        self.openapi_schema = openapi_schema
        self.data_generator = data_generator
        self.registry = registry
        self.schemas = openapi_schema.get('components', {}).get('schemas', {})
    
    def generate_request_body(
        self,
        endpoint_path: str,
        method: str,
        operation_id: str
    ) -> Optional[Dict[str, Any]]:
        """Generate request body for an endpoint.
        
        Args:
            endpoint_path: Endpoint path (e.g., "/api/parties")
            method: HTTP method
            operation_id: Operation ID
            
        Returns:
            Generated request body or None if no body needed
        """
        if method.upper() not in ['POST', 'PUT', 'PATCH']:
            return None
        
        # Get endpoint definition
        paths = self.openapi_schema.get('paths', {})
        endpoint_def = paths.get(endpoint_path, {})
        method_def = endpoint_def.get(method.lower(), {})
        
        # Get request body schema
        request_body = method_def.get('requestBody', {})
        content = request_body.get('content', {})
        json_content = content.get('application/json', {})
        schema = json_content.get('schema', {})
        
        if not schema:
            return {}
        
        # Generate data from schema
        return self.generate_from_schema(schema)
    
    def generate_from_schema(self, schema: Dict[str, Any], parent_schema: Dict[str, Any] = None) -> Any:
        """Generate data from a schema definition.
        
        Args:
            schema: Schema definition
            parent_schema: Parent object schema (for context)
            
        Returns:
            Generated data matching the schema
        """
        # Handle $ref
        if '$ref' in schema:
            ref_path = schema['$ref'].split('/')
            if ref_path[0] == '#' and ref_path[1] == 'components' and ref_path[2] == 'schemas':
                schema_name = ref_path[3]
                return self.generate_from_schema(self.schemas.get(schema_name, {}), parent_schema)
        
        # Handle anyOf - prefer non-null types
        if 'anyOf' in schema:
            options = schema['anyOf']
            # Filter out null types
            non_null_options = [opt for opt in options if opt.get('type') != 'null']
            if non_null_options:
                # Use the first non-null option
                return self.generate_from_schema(non_null_options[0], parent_schema)
            # If all options are null, return None
            return None
        
        schema_type = schema.get('type')
        
        if schema_type == 'object':
            return self.generate_object(schema)
        elif schema_type == 'array':
            return self.generate_array(schema)
        elif schema_type == 'string':
            return self.generate_string(schema, parent_schema)
        elif schema_type == 'integer':
            return self.generate_integer(schema)
        elif schema_type == 'number':
            return self.generate_number(schema)
        elif schema_type == 'boolean':
            return random.choice([True, False])
        else:
            return None
    
    def generate_object(self, schema: Dict[str, Any]) -> Dict[str, Any]:
        """Generate object from schema.
        
        Args:
            schema: Object schema
            
        Returns:
            Generated object
        """
        obj = {}
        properties = schema.get('properties', {})
        required = schema.get('required', [])
        schema_title = schema.get('title', '')
        
        # Special handling for DeviceCreate - always include brand/model/type
        # even though they're optional in schema (backend validation requires them)
        force_include = []
        if schema_title == 'DeviceCreate' or 'Device' in schema_title and 'Create' in schema_title:
            force_include = ['brand', 'model', 'deviceType']
        elif schema_title == 'InventoryItemCreate':
            # Include category and unit to avoid NOT NULL constraint
            force_include = ['category', 'unit']
        elif schema_title == 'TenantCreate':
            # Include billingEmail to avoid NOT NULL constraint
            force_include = ['billingEmail']
        elif 'MarketplaceIntegration' in schema_title or 'IntegrationCreate' in schema_title:
            # Include platform to avoid NOT NULL constraint
            force_include = ['platform']
        elif 'Supplier' in schema_title and 'Create' in schema_title:
            # Include tenantId to avoid NOT NULL constraint
            force_include = ['tenantId']
        elif 'ApiKey' in schema_title and 'Create' in schema_title:
            # Include name to avoid NOT NULL constraint
            force_include = ['name']
        elif 'User' in schema_title and 'Create' in schema_title:
            # Include tenantId to avoid NOT NULL constraint (for admin user creation)
            force_include = ['tenantId']
        elif 'DeviceAssignment' in schema_title and 'Create' in schema_title:
            # Include either inventoryId OR manualBrand+manualModel
            force_include = ['manualBrand', 'manualModel', 'assignmentType']
        elif 'Login' in schema_title or 'login' in schema_title.lower():
            # Auth login requires identifier (username/email/phone) and password
            force_include = ['identifier', 'password']
        elif 'SwitchTenant' in schema_title or 'switch' in schema_title.lower():
            # Switch tenant requires targetTenantId
            force_include = ['targetTenantId']
        elif 'KillSwitch' in schema_title or 'killswitch' in schema_title.lower():
            # Kill switch requires action field (activate/deactivate)
            force_include = ['action']
        elif 'EmailNotify' in schema_title or 'email' in schema_title.lower() and 'notify' in schema_title.lower():
            # Email notify requires scenario from allowlist
            force_include = ['scenario']
        elif 'CommissionAudit' in schema_title or 'commission' in schema_title.lower() and 'audit' in schema_title.lower():
            # Commission audit requires commission_id
            force_include = ['commissionId']
        elif 'AIAction' in schema_title or 'ai' in schema_title.lower() and 'action' in schema_title.lower():
            # AI action requires intentType
            force_include = ['intentType']
        
        for prop_name, prop_schema in properties.items():
            # Generate required fields or force-included fields
            if prop_name in required or prop_name in force_include:
                # Pass parent schema context for better generation
                value = self.generate_from_schema(prop_schema, parent_schema=schema)
                # Skip None values for force-included fields (they should have valid values)
                if value is not None or prop_name in required:
                    obj[prop_name] = value
        
        return obj
    
    def generate_array(self, schema: Dict[str, Any]) -> list:
        """Generate array from schema.
        
        Args:
            schema: Array schema
            
        Returns:
            Generated array
        """
        items_schema = schema.get('items', {})
        min_items = schema.get('minItems', 1)  # Default to 1 instead of 0
        max_items = schema.get('maxItems', min_items + 2)
        
        # Ensure at least 1 item for non-empty arrays
        if min_items == 0:
            min_items = 1
        
        count = random.randint(min_items, max_items) if max_items > min_items else min_items
        return [self.generate_from_schema(items_schema) for _ in range(count)]
    
    def generate_string(self, schema: Dict[str, Any], parent_schema: Dict[str, Any] = None) -> str:
        """Generate string from schema.
        
        Args:
            schema: String schema
            parent_schema: Parent object schema for context
            
        Returns:
            Generated string
        """
        # CRITICAL: Use registry IDs for foreign key fields
        title = schema.get('title', '').lower()
        
        # Map field names to registry attributes
        if self.registry:
            id_mappings = {
                'partyid': 'party_id',
                'party_id': 'party_id',
                'saleid': 'sale_id',
                'sale_id': 'sale_id',
                'deviceid': 'device_id',
                'device_id': 'device_id',
                'itemid': 'item_id',
                'item_id': 'item_id',
                'productid': 'product_id',
                'product_id': 'product_id',
                'inventoryid': 'item_id',  # inventory_id maps to item_id
                'appointmentid': 'appointment_id',
                'appointment_id': 'appointment_id',
                'campaignid': 'campaign_id',
                'campaign_id': 'campaign_id',
                'branchid': 'branch_id',
                'branch_id': 'branch_id',
                'supplierid': 'supplier_id',
                'supplier_id': 'supplier_id',
                'templateid': 'template_id',
                'template_id': 'template_id',
                'notificationid': 'notification_id',
                'notification_id': 'notification_id',
                'ticketid': 'ticket_id',
                'ticket_id': 'ticket_id',
                'invoiceid': 'invoice_id',
                'invoice_id': 'invoice_id',
                'roleid': 'role_id',
                'role_id': 'role_id',
                'userid': 'user_id',
                'user_id': 'user_id',
                'tenantid': 'tenant_id',
                'tenant_id': 'tenant_id',
            }
            
            # Check if this field is an ID field
            normalized_title = title.replace('_', '').replace(' ', '')
            if normalized_title in id_mappings:
                registry_attr = id_mappings[normalized_title]
                registry_value = getattr(self.registry, registry_attr, None)
                if registry_value:
                    from logging_config import logger
                    logger.debug(f"Using registry value for {title}: {registry_value}")
                    return registry_value
                else:
                    from logging_config import logger
                    logger.warning(f"Registry value for {title} ({registry_attr}) is None!")
        
            # Check for enum first (highest priority)
        if 'enum' in schema:
            enum_values = schema['enum']
            # Filter out null values
            valid_values = [v for v in enum_values if v is not None and v != 'null']
            if valid_values:
                # Special handling for status enums based on context
                if title == 'status' and parent_schema:
                    schema_title = parent_schema.get('title', '').lower()
                    if 'smsheader' in schema_title and 'pending' in valid_values:
                        return 'pending'  # Default to pending for SMS headers
                    if 'tenant' in schema_title and 'active' in valid_values:
                        return 'active'  # Default to active for tenants
                # CRITICAL: For intentType, ALWAYS use enum values
                if 'intent' in title.lower() or 'intenttype' in title.lower():
                    return random.choice(valid_values)
                return random.choice(valid_values)
            return random.choice(enum_values)  # Fallback to original if all null
        
        # Check for format
        format_type = schema.get('format')
        if format_type == 'email':
            # Generate unique email with timestamp
            import time
            timestamp = str(int(time.time() * 1000))[-8:]
            random_suffix = str(random.randint(1000, 9999))
            return f"test{timestamp}{random_suffix}@example.com"
        elif format_type == 'date':
            return (datetime.now() + timedelta(days=random.randint(1, 30))).strftime('%Y-%m-%d')
        elif format_type == 'date-time':
            return (datetime.now() + timedelta(days=random.randint(1, 30))).isoformat() + 'Z'
        elif format_type == 'uuid':
            import uuid
            return str(uuid.uuid4())
        
        # Check for pattern (phone, TCKN, time, etc.)
        pattern = schema.get('pattern', '')
        title = schema.get('title', '').lower()
        description = schema.get('description', '').lower()
        
        # Handle time pattern (HH:MM)
        if pattern == r'^\d{2}:\d{2}$':
            hour = random.randint(8, 17)  # Business hours
            minute = random.choice([0, 15, 30, 45])
            return f"{hour:02d}:{minute:02d}"
        
        # newTime field for appointment reschedule - must be HH:MM format
        if 'newtime' in title.replace('_', '').lower() or title == 'time':
            hour = random.randint(8, 17)
            minute = random.choice([0, 15, 30, 45])
            return f"{hour:02d}:{minute:02d}"
        
        if 'phone' in description or 'phone' in title:
            return self.data_generator.generate_phone()
        
        # Check for date/time fields by name (even without format)
        # issueDate, dueDate, paymentDate, etc.
        if any(keyword in title for keyword in ['issuedate', 'duedate', 'paymentdate', 'paiddate', 'startdate', 'enddate', 'assignedat', 'scheduledat']):
            # Return ISO date format
            return (datetime.now() + timedelta(days=random.randint(1, 30))).strftime('%Y-%m-%d')
        
        # Special handling for 'date' field in appointments - must be ISO datetime
        if title == 'date' and parent_schema and 'Appointment' in parent_schema.get('title', ''):
            return (datetime.now() + timedelta(days=random.randint(7, 30))).isoformat() + 'Z'
        
        # newDate field for appointment reschedule - must be ISO date (YYYY-MM-DD)
        if 'newdate' in title.replace('_', '').lower() or title == 'date':
            return (datetime.now() + timedelta(days=random.randint(7, 30))).strftime('%Y-%m-%d')
        
        # targetTenantId for switch-tenant
        if 'targettenantid' in title.replace('_', '').lower() or 'target_tenant' in title.lower():
            if self.registry and self.registry.tenant_id:
                return self.registry.tenant_id
            return "54e00319-e4fc-4fd3-9ad9-4f68e427e919"  # Fallback to known tenant
        
        # Action field for kill-switch (must be 'activate' or 'deactivate')
        if title == 'action' and parent_schema and 'killswitch' in parent_schema.get('title', '').lower():
            return random.choice(['activate', 'deactivate'])
        
        # Status field - check parent schema for valid enum values
        if title == 'status':
            # SMS Header status
            if parent_schema and 'smsheader' in parent_schema.get('title', '').lower():
                return random.choice(['pending', 'approved', 'rejected'])
            # Tenant status
            if parent_schema and 'tenant' in parent_schema.get('title', '').lower():
                return random.choice(['active', 'inactive', 'suspended', 'trial'])
            # Generic status fallback - avoid 'completed' for enums
            return random.choice(['active', 'pending', 'cancelled'])
        
        # Scenario field for email notify (must be from allowlist)
        if title == 'scenario' and parent_schema and 'email' in parent_schema.get('title', '').lower():
            return random.choice([
                'ai_action_completed',
                'ai_error_notification',
                'ai_execution_approval',
                'ai_proposal_created',
                'ai_quota_exceeded'
            ])
        
        # IntentType field for AI actions (must be valid intent)
        if 'intenttype' in title.replace('_', '').lower() or title == 'intent' or title == 'intenttype':
            return random.choice([
                'create_party',
                'update_party',
                'search_parties',
                'create_appointment',
                'update_appointment',
                'cancel_appointment',
                'create_sale',
                'update_sale',
                'create_device',
                'assign_device'
            ])
        
        # CommissionId field - SKIP for body (it's a query param)
        if 'commissionid' in title.replace('_', '').lower() or title == 'commission_id' or title == 'commissionid':
            # Don't generate - this is a query parameter
            return None
        
        # Check for specific field names that need special handling
        # Username field - make it unique with timestamp
        if title == 'username' or 'username' in title:
            import time
            timestamp = str(int(time.time() * 1000))[-8:]
            random_suffix = str(random.randint(1000, 9999))
            return f"user{timestamp}{random_suffix}"
        
        # Password field - return valid password
        if title == 'password' or title == 'currentpassword' or title == 'newpassword':
            return "Test123456!"
        
        # Identifier field for auth/login - can be username, email, or phone
        if title == 'identifier':
            import time
            timestamp = str(int(time.time() * 1000))[-8:]
            return f"test{timestamp}@example.com"
        
        # Company name - make it unique
        if 'companyname' in title.replace(' ', '').lower() or 'company_name' in title:
            import time
            timestamp = str(int(time.time() * 1000))[-8:]
            return f"Company {timestamp}"
        
        # Invoice number - make it unique
        if 'invoicenumber' in title.replace(' ', '').lower():
            import time
            timestamp = str(int(time.time() * 1000))[-10:]
            return f"INV{timestamp}"
        
        # SKU, barcode, stock code - make them unique
        if any(keyword in title for keyword in ['sku', 'barcode', 'stockcode']):
            import time
            timestamp = str(int(time.time() * 1000))[-10:]
            return f"SKU{timestamp}"
        
        # Device fields - CRITICAL: Always include brand, model, type
        if 'brand' in title or 'brand' in description:
            return random.choice(['Phonak', 'Oticon', 'Widex', 'Starkey', 'Signia', 'ReSound'])
        if 'model' in title and ('device' in description or 'model' in description or parent_schema and 'device' in parent_schema.get('title', '').lower()):
            return random.choice(['Audeo P90', 'Opn S1', 'Moment 440', 'Livio AI', 'Pure 7X'])
        if title == 'type' and (parent_schema and 'device' in parent_schema.get('title', '').lower()):
            return 'HEARING_AID'
        if title == 'devicetype' or 'devicetype' in title.lower():
            return 'HEARING_AID'
        
        # Manual brand/model for device assignments
        if 'manualbrand' in title.replace(' ', '').lower():
            return random.choice(['Phonak', 'Oticon', 'Widex'])
        if 'manualmodel' in title.replace(' ', '').lower():
            return random.choice(['Audeo P90', 'Opn S1', 'Moment 440'])
        
        # Role name field - check parent schema and make it unique
        if title == 'name' and parent_schema and 'RoleCreate' in parent_schema.get('title', ''):
            # Generate unique role name with timestamp
            import time
            timestamp = str(int(time.time() * 1000))[-6:]
            return f"ROLE_{timestamp}"
        
        # This helps with fields like "action" that must be specific values
        if 'action' in title or 'action' in description:
            return random.choice(['activate', 'deactivate', 'enable', 'disable'])
        
        # Scope field for kill switch - check description for valid values
        if title == 'scope' and ('global' in description or 'tenant' in description or 'capability' in description):
            return 'global'  # Always use 'global' to avoid target_id requirement
        
        # Target_id field for kill switch tenant scope
        if 'targetid' in title.replace('_', '').lower() or 'target_id' in title.lower():
            if self.registry and self.registry.tenant_id:
                return self.registry.tenant_id
            return "54e00319-e4fc-4fd3-9ad9-4f68e427e919"
        
        # Platform field for marketplace integrations
        if title == 'platform' or 'platform' in description:
            return random.choice(['trendyol', 'hepsiburada', 'n11', 'amazon', 'gittigidiyor'])
        
        # URL fields
        if 'url' in title or 'link' in title or 'href' in title:
            return f"https://example.com/test/{random.randint(1000, 9999)}"
        
        # Slug fields - lowercase with hyphens, make unique
        if 'slug' in title:
            import time
            timestamp = str(int(time.time() * 1000))[-8:]
            return f"test-slug-{timestamp}"
        
        # Code fields (not barcode/stockcode) - uppercase alphanumeric, make unique
        if title == 'code' and 'barcode' not in title and 'stock' not in title:
            import time
            timestamp = str(int(time.time() * 1000))[-6:]
            return f"CODE{timestamp}"
        
        # Color fields
        if 'color' in title or 'colour' in title:
            return random.choice(['#FF0000', '#00FF00', '#0000FF', '#FFFF00', '#FF00FF', '#00FFFF'])
        
        # Default string generation - add timestamp for uniqueness
        min_length = schema.get('minLength', 1)
        max_length = schema.get('maxLength', min_length + 20)
        length = min(random.randint(min_length, max(min_length, 10)), 50)
        
        # Add timestamp suffix for uniqueness
        import time
        timestamp = str(int(time.time() * 1000))[-6:]
        base_string = ''.join(random.choices(string.ascii_letters, k=max(1, length - 6)))
        return f"{base_string}{timestamp}"
    
    def generate_integer(self, schema: Dict[str, Any]) -> int:
        """Generate integer from schema.
        
        Args:
            schema: Integer schema
            
        Returns:
            Generated integer
        """
        minimum = schema.get('minimum', 0)
        maximum = schema.get('maximum', minimum + 1000)
        return random.randint(minimum, maximum)
    
    def generate_number(self, schema: Dict[str, Any]) -> float:
        """Generate number from schema.
        
        Args:
            schema: Number schema
            
        Returns:
            Generated number
        """
        minimum = schema.get('minimum', 0.0)
        maximum = schema.get('maximum', minimum + 1000.0)
        return round(random.uniform(minimum, maximum), 2)
