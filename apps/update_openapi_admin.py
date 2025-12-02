import yaml
import os

openapi_path = '/Users/omerozmen/Desktop/x-ear web app/x-ear/apps/openapi.yaml'

with open(openapi_path, 'r') as f:
    spec = yaml.safe_load(f)

# Define new schemas
new_schemas = {}
new_schemas['AdminUser'] = {
    'type': 'object',
    'properties': {
        'id': {'type': 'string'},
        'email': {'type': 'string'},
        'first_name': {'type': 'string'},
        'last_name': {'type': 'string'},
        'role': {'$ref': '#/components/schemas/AdminUserRole'},
        'is_active': {'type': 'boolean'},
        'isActive': {'type': 'boolean'},
        'last_login': {'type': 'string', 'format': 'date-time'},
        'created_at': {'type': 'string', 'format': 'date-time'},
        'tenant_id': {'type': 'string'},
        'tenant_name': {'type': 'string'}
    }
}
new_schemas['AdminUserRole'] = {
    'type': 'string',
    'enum': ['tenant_admin', 'admin', 'user', 'doctor', 'secretary', 'support']
}
new_schemas['Tenant'] = {
    'type': 'object',
    'properties': {
        'id': {'type': 'string'},
        'name': {'type': 'string'},
        'slug': {'type': 'string'},
        'owner_email': {'type': 'string'},
        'billing_email': {'type': 'string'},
        'status': {'type': 'string', 'enum': ['active', 'trial', 'suspended', 'cancelled']},
        'current_plan': {'type': 'string'},
        'current_plan_id': {'type': 'string'},
        'max_users': {'type': 'integer'},
        'current_users': {'type': 'integer'},
        'subscription_start_date': {'type': 'string', 'format': 'date-time'},
        'subscription_end_date': {'type': 'string', 'format': 'date-time'},
        'feature_usage': {'type': 'object'},
        'created_at': {'type': 'string', 'format': 'date-time'}
    }
}
new_schemas['TenantStatus'] = {
    'type': 'string',
    'enum': ['active', 'trial', 'suspended', 'cancelled']
}
new_schemas['Plan'] = {
    'type': 'object',
    'properties': {
        'id': {'type': 'string'},
        'name': {'type': 'string'},
        'description': {'type': 'string'},
        'plan_type': {'type': 'string'},
        'price': {'type': 'number'},
        'currency': {'type': 'string'},
        'billing_interval': {'type': 'string'},
        'features': {'type': 'object'},
        'max_users': {'type': 'integer'},
        'max_storage_gb': {'type': 'integer'},
        'is_active': {'type': 'boolean'},
        'is_public': {'type': 'boolean'},
        'created_at': {'type': 'string', 'format': 'date-time'}
    }
}
new_schemas['PlanInput'] = {
    'type': 'object',
    'properties': {
        'name': {'type': 'string'},
        'description': {'type': 'string'},
        'plan_type': {'type': 'string'},
        'price': {'type': 'number'},
        'billing_interval': {'type': 'string'},
        'features': {'type': 'object'},
        'max_users': {'type': 'integer'},
        'max_storage_gb': {'type': 'integer'},
        'is_active': {'type': 'boolean'}
    }
}
new_schemas['AddOn'] = {
    'type': 'object',
    'properties': {
        'id': {'type': 'string'},
        'name': {'type': 'string'},
        'slug': {'type': 'string'},
        'description': {'type': 'string'},
        'addon_type': {'type': 'string', 'enum': ['FLAT_FEE', 'PER_USER', 'USAGE_BASED']},
        'price': {'type': 'number'},
        'currency': {'type': 'string'},
        'limit_amount': {'type': 'integer'},
        'unit_name': {'type': 'string'},
        'is_active': {'type': 'boolean'}
    }
}
new_schemas['Pagination'] = {
    'type': 'object',
    'properties': {
        'page': {'type': 'integer'},
        'limit': {'type': 'integer'},
        'total': {'type': 'integer'},
        'totalPages': {'type': 'integer'}
    }
}

new_schemas['SupportTicket'] = {
    'type': 'object',
    'properties': {
        'id': {'type': 'string'},
        'title': {'type': 'string'},
        'description': {'type': 'string'},
        'status': {'type': 'string', 'enum': ['open', 'in_progress', 'resolved', 'closed']},
        'priority': {'type': 'string', 'enum': ['low', 'medium', 'high', 'critical']},
        'category': {'type': 'string'},
        'tenant_id': {'type': 'string'},
        'tenant_name': {'type': 'string'},
        'created_by': {'type': 'string'},
        'assigned_to': {'type': 'string'},
        'assigned_admin_name': {'type': 'string'},
        'created_at': {'type': 'string', 'format': 'date-time'},
        'sla_due_date': {'type': 'string', 'format': 'date-time'}
    }
}

new_schemas['SystemSettings'] = {
    'type': 'object',
    'properties': {
        'siteName': {'type': 'string'},
        'siteDescription': {'type': 'string'},
        'timezone': {'type': 'string'},
        'language': {'type': 'string'},
        'currency': {'type': 'string'},
        'maintenanceMode': {'type': 'boolean'},
        'registrationEnabled': {'type': 'boolean'},
        'emailNotifications': {'type': 'boolean'},
        'autoBackup': {'type': 'boolean'},
        'smtpHost': {'type': 'string'},
        'smtpPort': {'type': 'string'},
        'smtpUsername': {'type': 'string'},
        'smtpPassword': {'type': 'string'},
        'fromEmail': {'type': 'string'},
        'fromName': {'type': 'string'},
        'smtpSecure': {'type': 'boolean'},
        'sessionTimeout': {'type': 'string'},
        'maxLoginAttempts': {'type': 'string'},
        'passwordMinLength': {'type': 'string'},
        'jwtExpiry': {'type': 'string'},
        'twoFactorAuth': {'type': 'boolean'},
        'forcePasswordChange': {'type': 'boolean'},
        'ipWhitelist': {'type': 'boolean'},
        'auditLogging': {'type': 'boolean'},
        'backupSchedule': {'type': 'string'},
        'backupRetention': {'type': 'string'},
        'backupLocation': {'type': 'string'},
        'backupCompression': {'type': 'boolean'},
        'backupEncryptionKey': {'type': 'string'},
        'birFaturaApiKey': {'type': 'string'},
        'birFaturaApiSecret': {'type': 'string'},
        'smsProvider': {'type': 'string'},
        'smsUsername': {'type': 'string'},
        'smsPassword': {'type': 'string'},
        'smsHeader': {'type': 'string'},
        'paymentProvider': {'type': 'string'},
        'paymentApiKey': {'type': 'string'},
        'paymentSecretKey': {'type': 'string'}
    }
}

new_schemas['DashboardMetrics'] = {
    'type': 'object',
    'properties': {
        'overview': {
            'type': 'object',
            'properties': {
                'total_tenants': {'type': 'integer'},
                'active_tenants': {'type': 'integer'},
                'total_users': {'type': 'integer'},
                'active_users': {'type': 'integer'},
                'total_plans': {'type': 'integer'}
            }
        },
        'revenue': {
            'type': 'object',
            'properties': {
                'monthly_recurring_revenue': {'type': 'number'}
            }
        },
        'alerts': {
            'type': 'object',
            'properties': {
                'expiring_soon': {'type': 'integer'},
                'high_churn': {'type': 'integer'},
                'low_utilization': {'type': 'integer'}
            }
        },
        'health_metrics': {
            'type': 'object',
            'properties': {
                'churn_rate_percent': {'type': 'number'},
                'avg_seat_utilization_percent': {'type': 'number'}
            }
        },
        'recent_activity': {
            'type': 'object',
            'properties': {
                'new_tenants_7d': {'type': 'integer'},
                'expiring_memberships_30d': {'type': 'integer'}
            }
        }
    }
}

new_schemas['Invoice'] = {
    'type': 'object',
    'properties': {
        'id': {'type': 'string'},
        'invoice_number': {'type': 'string'},
        'tenant_id': {'type': 'string'},
        'tenant_name': {'type': 'string'},
        'status': {'type': 'string', 'enum': ['draft', 'open', 'paid', 'overdue', 'void']},
        'total': {'type': 'number'},
        'subtotal': {'type': 'number'},
        'tax_total': {'type': 'number'},
        'currency': {'type': 'string'},
        'paid_amount': {'type': 'number'},
        'issue_date': {'type': 'string', 'format': 'date'},
        'due_date': {'type': 'string', 'format': 'date'},
        'items': {
            'type': 'array',
            'items': {
                'type': 'object',
                'properties': {
                    'id': {'type': 'string'},
                    'description': {'type': 'string'},
                    'quantity': {'type': 'integer'},
                    'unit_price': {'type': 'number'},
                    'total': {'type': 'number'}
                }
            }
        }
    }
}

new_schemas['AnalyticsData'] = {
    'type': 'object',
    'properties': {
        'overview': {
            'type': 'object',
            'properties': {
                'total_revenue': {'type': 'number'},
                'revenue_growth': {'type': 'number'},
                'active_tenants': {'type': 'integer'},
                'tenants_growth': {'type': 'number'},
                'monthly_active_users': {'type': 'integer'},
                'mau_growth': {'type': 'number'},
                'churn_rate': {'type': 'number'},
                'churn_growth': {'type': 'number'}
            }
        },
        'revenue_trend': {
            'type': 'array',
            'items': {
                'type': 'object',
                'properties': {
                    'month': {'type': 'string'},
                    'revenue': {'type': 'number'},
                    'growth': {'type': 'number'}
                }
            }
        },
        'user_engagement': {
            'type': 'array',
            'items': {
                'type': 'object',
                'properties': {
                    'date': {'type': 'string'},
                    'dau': {'type': 'integer'},
                    'wau': {'type': 'integer'},
                    'mau': {'type': 'integer'}
                }
            }
        },
        'plan_distribution': {
            'type': 'array',
            'items': {
                'type': 'object',
                'properties': {
                    'name': {'type': 'string'},
                    'value': {'type': 'integer'},
                    'color': {'type': 'string'}
                }
            }
        },
        'top_tenants': {
            'type': 'array',
            'items': {
                'type': 'object',
                'properties': {
                    'id': {'type': 'string'},
                    'name': {'type': 'string'},
                    'revenue': {'type': 'number'},
                    'growth': {'type': 'number'},
                    'users': {'type': 'integer'}
                }
            }
        }
    }
}

# Helper variables for responses
admin_user_ref = {'$ref': '#/components/schemas/AdminUser'}
tenant_ref = {'$ref': '#/components/schemas/Tenant'}
plan_ref = {'$ref': '#/components/schemas/Plan'}
addon_ref = {'$ref': '#/components/schemas/AddOn'}
user_ref = {'$ref': '#/components/schemas/User'}
ticket_ref = {'$ref': '#/components/schemas/SupportTicket'}
settings_ref = {'$ref': '#/components/schemas/SystemSettings'}
metrics_ref = {'$ref': '#/components/schemas/DashboardMetrics'}
invoice_ref = {'$ref': '#/components/schemas/Invoice'}
analytics_ref = {'$ref': '#/components/schemas/AnalyticsData'}
pagination_ref = {'$ref': '#/components/schemas/Pagination'}

def create_list_response(item_schema, key_name):
    return {
        'type': 'object',
        'properties': {
            'success': {'type': 'boolean'},
            'data': {
                'type': 'object',
                'properties': {
                    key_name: {'type': 'array', 'items': item_schema},
                    'pagination': pagination_ref
                }
            }
        }
    }

def create_single_response(item_schema, key_name):
    return {
        'type': 'object',
        'properties': {
            'success': {'type': 'boolean'},
            'data': {
                'type': 'object',
                'properties': {
                    key_name: item_schema
                }
            }
        }
    }

# Define new paths
new_paths = {}

# /api/admin/auth/login
new_paths['/api/admin/auth/login'] = {}
new_paths['/api/admin/auth/login']['post'] = {
    'summary': 'Admin Login',
    'operationId': 'adminLogin',
    'tags': ['Admin'],
    'requestBody': {
        'content': {'application/json': {'schema': {'type': 'object', 'properties': {'email': {'type': 'string'}, 'password': {'type': 'string'}, 'mfa_token': {'type': 'string'}}}}}
    },
    'responses': {
        '200': {
            'description': 'Success',
            'content': {'application/json': {'schema': {'type': 'object', 'properties': {'token': {'type': 'string'}, 'user': {'$ref': '#/components/schemas/AdminUser'}, 'requires_mfa': {'type': 'boolean'}}}}}
        }
    }
}

# /api/admin/users
new_paths['/api/admin/users'] = {}
new_paths['/api/admin/users']['get'] = {
    'summary': 'List Admin Users',
    'operationId': 'getAdminUsers',
    'tags': ['Admin'],
    'parameters': [
        {'name': 'page', 'in': 'query', 'schema': {'type': 'integer'}},
        {'name': 'limit', 'in': 'query', 'schema': {'type': 'integer'}},
        {'name': 'search', 'in': 'query', 'schema': {'type': 'string'}},
        {'name': 'role', 'in': 'query', 'schema': {'type': 'string'}}
    ],
    'responses': {
        '200': {
            'description': 'Success',
            'content': {'application/json': {'schema': create_list_response(admin_user_ref, 'users')}}
        }
    }
}
new_paths['/api/admin/users']['post'] = {
    'summary': 'Create Admin User',
    'operationId': 'createAdminUser',
    'tags': ['Admin'],
    'requestBody': {
        'content': {'application/json': {'schema': admin_user_ref}}
    },
    'responses': {
        '201': {
            'description': 'Created',
            'content': {'application/json': {'schema': admin_user_ref}}
        }
    }
}

# /api/admin/users/all
new_paths['/api/admin/users/all'] = {}
new_paths['/api/admin/users/all']['get'] = {
    'summary': 'List All Tenant Users',
    'operationId': 'getAllTenantUsers',
    'tags': ['Admin'],
    'parameters': [
        {'name': 'page', 'in': 'query', 'schema': {'type': 'integer'}},
        {'name': 'limit', 'in': 'query', 'schema': {'type': 'integer'}},
        {'name': 'search', 'in': 'query', 'schema': {'type': 'string'}}
    ],
    'responses': {
        '200': {
            'description': 'Success',
            'content': {'application/json': {'schema': create_list_response(admin_user_ref, 'users')}}
        }
    }
}

# /api/admin/users/all/{id}
new_paths['/api/admin/users/all/{id}'] = {}
new_paths['/api/admin/users/all/{id}']['put'] = {
    'summary': 'Update Any Tenant User',
    'operationId': 'updateAnyTenantUser',
    'tags': ['Admin'],
    'parameters': [{'name': 'id', 'in': 'path', 'required': True, 'schema': {'type': 'string'}}],
    'requestBody': {
        'content': {'application/json': {'schema': {'type': 'object', 'properties': {
            'isActive': {'type': 'boolean'},
            'email': {'type': 'string'},
            'first_name': {'type': 'string'},
            'last_name': {'type': 'string'},
            'role': {'type': 'string'},
            'password': {'type': 'string'}
        }}}}
    },
    'responses': {
        '200': {
            'description': 'Success',
            'content': {'application/json': {'schema': admin_user_ref}}
        }
    }
}

# /api/admin/tenants
new_paths['/api/admin/tenants'] = {}
new_paths['/api/admin/tenants']['get'] = {
    'summary': 'List Tenants',
    'operationId': 'getAdminTenants',
    'tags': ['Admin'],
    'parameters': [
        {'name': 'page', 'in': 'query', 'schema': {'type': 'integer'}},
        {'name': 'limit', 'in': 'query', 'schema': {'type': 'integer'}},
        {'name': 'status', 'in': 'query', 'schema': {'type': 'string'}},
        {'name': 'search', 'in': 'query', 'schema': {'type': 'string'}}
    ],
    'responses': {
        '200': {
            'description': 'Success',
            'content': {'application/json': {'schema': create_list_response(tenant_ref, 'tenants')}}
        }
    }
}
new_paths['/api/admin/tenants']['post'] = {
    'summary': 'Create Tenant',
    'operationId': 'createTenant',
    'tags': ['Admin'],
    'requestBody': {
        'content': {'application/json': {'schema': tenant_ref}}
    },
    'responses': {
        '201': {
            'description': 'Created',
            'content': {'application/json': {'schema': tenant_ref}}
        }
    }
}

# /api/admin/tenants/{id}
new_paths['/api/admin/tenants/{id}'] = {}
new_paths['/api/admin/tenants/{id}']['get'] = {
    'summary': 'Get Tenant',
    'operationId': 'getTenant',
    'tags': ['Admin'],
    'parameters': [{'name': 'id', 'in': 'path', 'required': True, 'schema': {'type': 'string'}}],
    'responses': {
        '200': {
            'description': 'Success',
            'content': {'application/json': {'schema': create_single_response(tenant_ref, 'tenant')}}
        }
    }
}
new_paths['/api/admin/tenants/{id}']['put'] = {
    'summary': 'Update Tenant',
    'operationId': 'updateTenant',
    'tags': ['Admin'],
    'parameters': [{'name': 'id', 'in': 'path', 'required': True, 'schema': {'type': 'string'}}],
    'requestBody': {
        'content': {'application/json': {'schema': tenant_ref}}
    },
    'responses': {
        '200': {
            'description': 'Success',
            'content': {'application/json': {'schema': tenant_ref}}
        }
    }
}

# /api/admin/tenants/{id}/status
new_paths['/api/admin/tenants/{id}/status'] = {}
new_paths['/api/admin/tenants/{id}/status']['put'] = {
    'summary': 'Update Tenant Status',
    'operationId': 'updateTenantStatus',
    'tags': ['Admin'],
    'parameters': [{'name': 'id', 'in': 'path', 'required': True, 'schema': {'type': 'string'}}],
    'requestBody': {
        'content': {'application/json': {'schema': {'type': 'object', 'properties': {'status': {'type': 'string'}}}}}
    },
    'responses': {
        '200': {
            'description': 'Success',
            'content': {'application/json': {'schema': tenant_ref}}
        }
    }
}

# /api/admin/tenants/{id}/users
new_paths['/api/admin/tenants/{id}/users'] = {}
new_paths['/api/admin/tenants/{id}/users']['get'] = {
    'summary': 'Get Tenant Users',
    'operationId': 'getTenantUsers',
    'tags': ['Admin'],
    'parameters': [{'name': 'id', 'in': 'path', 'required': True, 'schema': {'type': 'string'}}],
    'responses': {
        '200': {
            'description': 'Success',
            'content': {'application/json': {'schema': create_list_response(user_ref, 'users')}}
        }
    }
}
new_paths['/api/admin/tenants/{id}/users']['post'] = {
    'summary': 'Create Tenant User',
    'operationId': 'createTenantUser',
    'tags': ['Admin'],
    'parameters': [{'name': 'id', 'in': 'path', 'required': True, 'schema': {'type': 'string'}}],
    'requestBody': {
        'content': {'application/json': {'schema': user_ref}}
    },
    'responses': {
        '201': {
            'description': 'Created',
            'content': {'application/json': {'schema': user_ref}}
        }
    }
}

# /api/admin/tenants/{id}/users/{userId}
new_paths['/api/admin/tenants/{id}/users/{userId}'] = {}
new_paths['/api/admin/tenants/{id}/users/{userId}']['put'] = {
    'summary': 'Update Tenant User',
    'operationId': 'updateTenantUser',
    'tags': ['Admin'],
    'parameters': [
        {'name': 'id', 'in': 'path', 'required': True, 'schema': {'type': 'string'}},
        {'name': 'userId', 'in': 'path', 'required': True, 'schema': {'type': 'string'}}
    ],
    'requestBody': {
        'content': {'application/json': {'schema': user_ref}}
    },
    'responses': {
        '200': {
            'description': 'Success',
            'content': {'application/json': {'schema': create_single_response(user_ref, 'user')}}
        }
    }
}

# /api/admin/tenants/{id}/subscribe
new_paths['/api/admin/tenants/{id}/subscribe'] = {}
new_paths['/api/admin/tenants/{id}/subscribe']['post'] = {
    'summary': 'Subscribe Tenant',
    'operationId': 'subscribeTenant',
    'tags': ['Admin'],
    'parameters': [{'name': 'id', 'in': 'path', 'required': True, 'schema': {'type': 'string'}}],
    'requestBody': {
        'content': {'application/json': {'schema': {'type': 'object', 'properties': {'plan_id': {'type': 'string'}, 'billing_interval': {'type': 'string'}}}}}
    },
    'responses': {
        '200': {
            'description': 'Success',
            'content': {'application/json': {'schema': tenant_ref}}
        }
    }
}

# /api/admin/tenants/{id}/addons
new_paths['/api/admin/tenants/{id}/addons'] = {}
new_paths['/api/admin/tenants/{id}/addons']['post'] = {
    'summary': 'Add Addon to Tenant',
    'operationId': 'addTenantAddon',
    'tags': ['Admin'],
    'parameters': [{'name': 'id', 'in': 'path', 'required': True, 'schema': {'type': 'string'}}],
    'requestBody': {
        'content': {'application/json': {'schema': {'type': 'object', 'properties': {'addon_id': {'type': 'string'}}}}}
    },
    'responses': {
        '200': {
            'description': 'Success',
            'content': {'application/json': {'schema': tenant_ref}}
        }
    }
}

# /api/admin/plans
new_paths['/api/admin/plans'] = {}
new_paths['/api/admin/plans']['get'] = {
    'summary': 'List Plans',
    'operationId': 'getAdminPlans',
    'tags': ['Admin'],
    'parameters': [
        {'name': 'limit', 'in': 'query', 'schema': {'type': 'integer'}}
    ],
    'responses': {
        '200': {
            'description': 'Success',
            'content': {'application/json': {'schema': create_list_response(plan_ref, 'plans')}}
        }
    }
}
new_paths['/api/admin/plans']['post'] = {
    'summary': 'Create Plan',
    'operationId': 'createPlan',
    'tags': ['Admin'],
    'requestBody': {
        'content': {'application/json': {'schema': {'$ref': '#/components/schemas/PlanInput'}}}
    },
    'responses': {
        '201': {
            'description': 'Created',
            'content': {'application/json': {'schema': plan_ref}}
        }
    }
}

# /api/admin/plans/{id}
new_paths['/api/admin/plans/{id}'] = {}
new_paths['/api/admin/plans/{id}']['get'] = {
    'summary': 'Get Plan',
    'operationId': 'getPlan',
    'tags': ['Admin'],
    'parameters': [{'name': 'id', 'in': 'path', 'required': True, 'schema': {'type': 'string'}}],
    'responses': {
        '200': {
            'description': 'Success',
            'content': {'application/json': {'schema': plan_ref}}
        }
    }
}
new_paths['/api/admin/plans/{id}']['put'] = {
    'summary': 'Update Plan',
    'operationId': 'updatePlan',
    'tags': ['Admin'],
    'parameters': [{'name': 'id', 'in': 'path', 'required': True, 'schema': {'type': 'string'}}],
    'requestBody': {
        'content': {'application/json': {'schema': {'$ref': '#/components/schemas/PlanInput'}}}
    },
    'responses': {
        '200': {
            'description': 'Success',
            'content': {'application/json': {'schema': plan_ref}}
        }
    }
}
new_paths['/api/admin/plans/{id}']['delete'] = {
    'summary': 'Delete Plan',
    'operationId': 'deletePlan',
    'tags': ['Admin'],
    'parameters': [{'name': 'id', 'in': 'path', 'required': True, 'schema': {'type': 'string'}}],
    'responses': {
        '200': {
            'description': 'Success',
            'content': {'application/json': {'schema': {'type': 'object', 'properties': {'success': {'type': 'boolean'}, 'message': {'type': 'string'}}}}}
        }
    }
}

# /api/admin/addons
new_paths['/api/admin/addons'] = {}
new_paths['/api/admin/addons']['get'] = {
    'summary': 'List Addons',
    'operationId': 'getAdminAddons',
    'tags': ['Admin'],
    'parameters': [
        {'name': 'limit', 'in': 'query', 'schema': {'type': 'integer'}}
    ],
    'responses': {
        '200': {
            'description': 'Success',
            'content': {'application/json': {'schema': create_list_response(addon_ref, 'addons')}}
        }
    }
}
new_paths['/api/admin/addons']['post'] = {
    'summary': 'Create Addon',
    'operationId': 'createAdminAddon',
    'tags': ['Admin'],
    'requestBody': {
        'content': {'application/json': {'schema': addon_ref}}
    },
    'responses': {
        '201': {
            'description': 'Created',
            'content': {'application/json': {'schema': addon_ref}}
        }
    }
}

# /api/admin/addons/{id}
new_paths['/api/admin/addons/{id}'] = {}
new_paths['/api/admin/addons/{id}']['get'] = {
    'summary': 'Get Addon',
    'operationId': 'getAdminAddon',
    'tags': ['Admin'],
    'parameters': [{'name': 'id', 'in': 'path', 'required': True, 'schema': {'type': 'string'}}],
    'responses': {
        '200': {
            'description': 'Success',
            'content': {'application/json': {'schema': create_single_response(addon_ref, 'addon')}}
        }
    }
}
new_paths['/api/admin/addons/{id}']['put'] = {
    'summary': 'Update Addon',
    'operationId': 'updateAdminAddon',
    'tags': ['Admin'],
    'parameters': [{'name': 'id', 'in': 'path', 'required': True, 'schema': {'type': 'string'}}],
    'requestBody': {
        'content': {'application/json': {'schema': addon_ref}}
    },
    'responses': {
        '200': {
            'description': 'Success',
            'content': {'application/json': {'schema': create_single_response(addon_ref, 'addon')}}
        }
    }
}
new_paths['/api/admin/addons/{id}']['delete'] = {
    'summary': 'Delete Addon',
    'operationId': 'deleteAdminAddon',
    'tags': ['Admin'],
    'parameters': [{'name': 'id', 'in': 'path', 'required': True, 'schema': {'type': 'string'}}],
    'responses': {
        '200': {
            'description': 'Success',
            'content': {'application/json': {'schema': {'type': 'object', 'properties': {'success': {'type': 'boolean'}, 'message': {'type': 'string'}}}}}
        }
    }
}

# /api/admin/tickets
new_paths['/api/admin/tickets'] = {}
new_paths['/api/admin/tickets']['get'] = {
    'summary': 'List Support Tickets',
    'operationId': 'getAdminTickets',
    'tags': ['Admin'],
    'parameters': [
        {'name': 'page', 'in': 'query', 'schema': {'type': 'integer'}},
        {'name': 'limit', 'in': 'query', 'schema': {'type': 'integer'}},
        {'name': 'search', 'in': 'query', 'schema': {'type': 'string'}},
        {'name': 'status', 'in': 'query', 'schema': {'type': 'string'}},
        {'name': 'priority', 'in': 'query', 'schema': {'type': 'string'}}
    ],
    'responses': {
        '200': {
            'description': 'Success',
            'content': {'application/json': {'schema': create_list_response(ticket_ref, 'tickets')}}
        }
    }
}
new_paths['/api/admin/tickets']['post'] = {
    'summary': 'Create Support Ticket',
    'operationId': 'createAdminTicket',
    'tags': ['Admin'],
    'requestBody': {
        'content': {'application/json': {'schema': {'type': 'object', 'properties': {'subject': {'type': 'string'}, 'description': {'type': 'string'}, 'priority': {'type': 'string'}, 'category': {'type': 'string'}, 'tenant_id': {'type': 'string'}}}}}
    },
    'responses': {
        '201': {
            'description': 'Created',
            'content': {'application/json': {'schema': create_single_response(ticket_ref, 'ticket')}}
        }
    }
}

new_paths['/api/admin/tickets/{id}/responses'] = {
    'post': {
        'summary': 'Create Ticket Response',
        'operationId': 'createTicketResponse',
        'tags': ['Admin'],
        'parameters': [{'name': 'id', 'in': 'path', 'required': True, 'schema': {'type': 'string'}}],
        'requestBody': {
            'content': {'application/json': {'schema': {'type': 'object', 'properties': {'message': {'type': 'string'}}}}}
        },
        'responses': {
            '201': {'description': 'Response created'},
            '404': {'description': 'Ticket not found'}
        }
    }
}

# /api/admin/tickets/{id}
new_paths['/api/admin/tickets/{id}'] = {}
new_paths['/api/admin/tickets/{id}']['put'] = {
    'summary': 'Update Support Ticket',
    'operationId': 'updateAdminTicket',
    'tags': ['Admin'],
    'parameters': [{'name': 'id', 'in': 'path', 'required': True, 'schema': {'type': 'string'}}],
    'requestBody': {
        'content': {'application/json': {'schema': {'type': 'object', 'properties': {'status': {'type': 'string'}, 'assigned_to': {'type': 'string'}}}}}
    },
    'responses': {
        '200': {
            'description': 'Success',
            'content': {'application/json': {'schema': create_single_response(ticket_ref, 'ticket')}}
        }
    }
}

# /api/admin/settings
new_paths['/api/admin/settings'] = {}
new_paths['/api/admin/settings']['get'] = {
    'summary': 'Get System Settings',
    'operationId': 'getAdminSettings',
    'tags': ['Admin'],
    'responses': {
        '200': {
            'description': 'Success',
            'content': {'application/json': {'schema': create_single_response(settings_ref, 'settings')}}
        }
    }
}
new_paths['/api/admin/settings']['post'] = {
    'summary': 'Update System Settings',
    'operationId': 'updateAdminSettings',
    'tags': ['Admin'],
    'requestBody': {
        'content': {'application/json': {'schema': settings_ref}}
    },
    'responses': {
        '200': {
            'description': 'Success',
            'content': {'application/json': {'schema': create_single_response(settings_ref, 'settings')}}
        }
    }
}
new_paths['/api/admin/settings']['patch'] = {
    'summary': 'Patch System Settings',
    'operationId': 'patchAdminSettings',
    'tags': ['Admin'],
    'requestBody': {
        'content': {'application/json': {'schema': {'type': 'object', 'properties': {'updates': {'type': 'object'}}}}}
    },
    'responses': {
        '200': {
            'description': 'Success',
            'content': {'application/json': {'schema': create_single_response(settings_ref, 'settings')}}
        }
    }
}

# /api/admin/dashboard/metrics
new_paths['/api/admin/dashboard/metrics'] = {}
new_paths['/api/admin/dashboard/metrics']['get'] = {
    'summary': 'Get Dashboard Metrics',
    'operationId': 'getAdminDashboardMetrics',
    'tags': ['Admin'],
    'responses': {
        '200': {
            'description': 'Success',
            'content': {'application/json': {'schema': create_single_response(metrics_ref, 'metrics')}}
        }
    }
}

# /api/admin/invoices
new_paths['/api/admin/invoices'] = {}
new_paths['/api/admin/invoices']['get'] = {
    'summary': 'List Invoices',
    'operationId': 'getAdminInvoices',
    'tags': ['Admin'],
    'parameters': [
        {'name': 'page', 'in': 'query', 'schema': {'type': 'integer'}},
        {'name': 'limit', 'in': 'query', 'schema': {'type': 'integer'}},
        {'name': 'search', 'in': 'query', 'schema': {'type': 'string'}},
        {'name': 'status', 'in': 'query', 'schema': {'type': 'string'}}
    ],
    'responses': {
        '200': {
            'description': 'Success',
            'content': {'application/json': {'schema': create_list_response(invoice_ref, 'invoices')}}
        }
    }
}
new_paths['/api/admin/invoices']['post'] = {
    'summary': 'Create Invoice',
    'operationId': 'createAdminInvoice',
    'tags': ['Admin'],
    'requestBody': {
        'content': {'application/json': {'schema': invoice_ref}}
    },
    'responses': {
        '201': {
            'description': 'Created',
            'content': {'application/json': {'schema': create_single_response(invoice_ref, 'invoice')}}
        }
    }
}

# /api/admin/invoices/{id}
new_paths['/api/admin/invoices/{id}'] = {}
new_paths['/api/admin/invoices/{id}']['get'] = {
    'summary': 'Get Invoice',
    'operationId': 'getAdminInvoice',
    'tags': ['Admin'],
    'parameters': [
        {'name': 'id', 'in': 'path', 'required': True, 'schema': {'type': 'string'}}
    ],
    'responses': {
        '200': {
            'description': 'Success',
            'content': {'application/json': {'schema': create_single_response(invoice_ref, 'invoice')}}
        }
    }
}

# /api/admin/invoices/{id}/payment
new_paths['/api/admin/invoices/{id}/payment'] = {}
new_paths['/api/admin/invoices/{id}/payment']['post'] = {
    'summary': 'Record Payment',
    'operationId': 'recordAdminInvoicePayment',
    'tags': ['Admin'],
    'parameters': [
        {'name': 'id', 'in': 'path', 'required': True, 'schema': {'type': 'string'}}
    ],
    'requestBody': {
        'content': {'application/json': {'schema': {'type': 'object', 'properties': {'amount': {'type': 'number'}}}}}
    },
    'responses': {
        '200': {
            'description': 'Success',
            'content': {'application/json': {'schema': create_single_response(invoice_ref, 'invoice')}}
        }
    }
}

# /api/admin/invoices/{id}/pdf
new_paths['/api/admin/invoices/{id}/pdf'] = {}
new_paths['/api/admin/invoices/{id}/pdf']['get'] = {
    'summary': 'Get Invoice PDF',
    'operationId': 'getAdminInvoicePdf',
    'tags': ['Admin'],
    'parameters': [
        {'name': 'id', 'in': 'path', 'required': True, 'schema': {'type': 'string'}}
    ],
    'responses': {
        '200': {
            'description': 'Success',
            'content': {'application/pdf': {'schema': {'type': 'string', 'format': 'binary'}}}
        }
    }
}

# /api/admin/analytics
new_paths['/api/admin/analytics'] = {}
new_paths['/api/admin/analytics']['get'] = {
    'summary': 'Get Analytics Data',
    'operationId': 'getAdminAnalytics',
    'tags': ['Admin'],
    'parameters': [
        {'name': 'start_date', 'in': 'query', 'schema': {'type': 'string', 'format': 'date'}},
        {'name': 'end_date', 'in': 'query', 'schema': {'type': 'string', 'format': 'date'}},
        {'name': 'metric', 'in': 'query', 'schema': {'type': 'string'}}
    ],
    'responses': {
        '200': {
            'description': 'Success',
            'content': {'application/json': {'schema': create_single_response(analytics_ref, 'data')}}
        }
    }
}

# /api/upload/presigned
new_paths['/api/upload/presigned'] = {}
new_paths['/api/upload/presigned']['post'] = {
    'summary': 'Get Presigned Upload URL',
    'operationId': 'getPresignedUploadUrl',
    'tags': ['Upload'],
    'requestBody': {
        'content': {
            'application/json': {
                'schema': {
                    'type': 'object',
                    'properties': {
                        'filename': {'type': 'string'},
                        'folder': {'type': 'string'},
                        'content_type': {'type': 'string'}
                    },
                    'required': ['filename']
                }
            }
        }
    },
    'responses': {
        '200': {
            'description': 'Success',
            'content': {
                'application/json': {
                    'schema': {
                        'type': 'object',
                        'properties': {
                            'success': {'type': 'boolean'},
                            'data': {
                                'type': 'object',
                                'properties': {
                                    'url': {'type': 'string'},
                                    'fields': {'type': 'object'},
                                    'key': {'type': 'string'}
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}

# /api/upload/files
new_paths['/api/upload/files'] = {}
new_paths['/api/upload/files']['get'] = {
    'summary': 'List Files',
    'operationId': 'listFiles',
    'tags': ['Upload'],
    'parameters': [
        {'name': 'folder', 'in': 'query', 'schema': {'type': 'string'}}
    ],
    'responses': {
        '200': {
            'description': 'Success',
            'content': {
                'application/json': {
                    'schema': {
                        'type': 'object',
                        'properties': {
                            'success': {'type': 'boolean'},
                            'data': {
                                'type': 'object',
                                'properties': {
                                    'files': {
                                        'type': 'array',
                                        'items': {
                                            'type': 'object',
                                            'properties': {
                                                'key': {'type': 'string'},
                                                'filename': {'type': 'string'},
                                                'size': {'type': 'integer'},
                                                'last_modified': {'type': 'string'},
                                                'url': {'type': 'string'}
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}

# /api/ocr/process
new_paths['/api/ocr/process'] = {}
new_paths['/api/ocr/process']['post'] = {
    'summary': 'Process Document OCR',
    'operationId': 'processDocumentOcr',
    'tags': ['OCR'],
    'requestBody': {
        'content': {
            'application/json': {
                'schema': {
                    'type': 'object',
                    'properties': {
                        'image_path': {'type': 'string'},
                        'text': {'type': 'string'},
                        'type': {'type': 'string'},
                        'auto_crop': {'type': 'boolean'}
                    }
                }
            }
        }
    },
    'responses': {
        '200': {
            'description': 'Success',
            'content': {
                'application/json': {
                    'schema': {
                        'type': 'object',
                        'properties': {
                            'success': {'type': 'boolean'},
                            'result': {'type': 'object'}
                        }
                    }
                }
            }
        }
    }
}

if 'components' not in spec:
    spec['components'] = {}
if 'schemas' not in spec['components']:
    spec['components']['schemas'] = {}

spec['components']['schemas'].update(new_schemas)
spec['paths'].update(new_paths)

with open(openapi_path, 'w') as f:
    yaml.dump(spec, f, sort_keys=False)

print("OpenAPI spec updated with Admin routes successfully.")
