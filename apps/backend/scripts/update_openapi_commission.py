"""
Update OpenAPI spec with POS commission endpoints
"""

import yaml
import os

def update_openapi_commission():
    openapi_path = os.path.join(os.path.dirname(__file__), '..', '..', '..', 'openapi.yaml')
    
    with open(openapi_path, 'r', encoding='utf-8') as f:
        spec = yaml.safe_load(f)
    
    # Ensure components/schemas exists
    if 'components' not in spec:
        spec['components'] = {}
    if 'schemas' not in spec['components']:
        spec['components']['schemas'] = {}
    
    # Add schemas
    spec['components']['schemas']['CommissionCalculationRequest'] = {
        'type': 'object',
        'required': ['amount', 'installment_count'],
        'properties': {
            'amount': {'type': 'number', 'format': 'float'},
            'installment_count': {'type': 'integer'},
            'provider': {'type': 'string', 'default': 'xear_pos'}
        }
    }
    
    spec['components']['schemas']['CommissionCalculationResponse'] = {
        'type': 'object',
        'properties': {
            'success': {'type': 'boolean'},
            'data': {
                'type': 'object',
                'properties': {
                    'gross_amount': {'type': 'number'},
                    'commission_rate': {'type': 'number'},
                    'commission_amount': {'type': 'number'},
                    'net_amount': {'type': 'number'},
                    'provider': {'type': 'string'},
                    'installment_count': {'type': 'integer'}
                }
            }
        }
    }
    
    spec['components']['schemas']['InstallmentOptionsRequest'] = {
        'type': 'object',
        'required': ['amount'],
        'properties': {
            'amount': {'type': 'number', 'format': 'float'},
            'provider': {'type': 'string', 'default': 'xear_pos'}
        }
    }
    
    spec['components']['schemas']['InstallmentOption'] = {
        'type': 'object',
        'properties': {
            'installment_count': {'type': 'integer'},
            'label': {'type': 'string'},
            'gross_amount': {'type': 'number'},
            'commission_rate': {'type': 'number'},
            'commission_amount': {'type': 'number'},
            'net_amount': {'type': 'number'},
            'monthly_payment': {'type': 'number', 'nullable': True}
        }
    }
    
    spec['components']['schemas']['InstallmentOptionsResponse'] = {
        'type': 'object',
        'properties': {
            'success': {'type': 'boolean'},
            'data': {
                'type': 'object',
                'properties': {
                    'options': {
                        'type': 'array',
                        'items': {'$ref': '#/components/schemas/InstallmentOption'}
                    },
                    'provider': {'type': 'string'}
                }
            }
        }
    }
    
    spec['components']['schemas']['CommissionRates'] = {
        'type': 'object',
        'additionalProperties': {
            'type': 'object',
            'additionalProperties': {'type': 'number'}
        }
    }
    
    spec['components']['schemas']['CommissionRatesResponse'] = {
        'type': 'object',
        'properties': {
            'success': {'type': 'boolean'},
            'data': {
                'type': 'object',
                'properties': {
                    'rates': {'$ref': '#/components/schemas/CommissionRates'},
                    'is_custom': {'type': 'boolean'},
                    'available_providers': {
                        'type': 'array',
                        'items': {'type': 'string'}
                    }
                }
            }
        }
    }
    
    # Ensure paths exists
    if 'paths' not in spec:
        spec['paths'] = {}
    
    # Add commission endpoints
    spec['paths']['/api/pos/commission/calculate'] = {
        'post': {
            'tags': ['POS Commission'],
            'summary': 'Calculate commission for amount and installments',
            'operationId': 'calculateCommission',
            'security': [{'bearerAuth': []}],
            'requestBody': {
                'required': True,
                'content': {
                    'application/json': {
                        'schema': {'$ref': '#/components/schemas/CommissionCalculationRequest'}
                    }
                }
            },
            'responses': {
                '200': {
                    'description': 'Commission calculated',
                    'content': {
                        'application/json': {
                            'schema': {'$ref': '#/components/schemas/CommissionCalculationResponse'}
                        }
                    }
                }
            }
        }
    }
    
    spec['paths']['/api/pos/commission/installment-options'] = {
        'post': {
            'tags': ['POS Commission'],
            'summary': 'Get installment options with calculated amounts',
            'operationId': 'getInstallmentOptions',
            'security': [{'bearerAuth': []}],
            'requestBody': {
                'required': True,
                'content': {
                    'application/json': {
                        'schema': {'$ref': '#/components/schemas/InstallmentOptionsRequest'}
                    }
                }
            },
            'responses': {
                '200': {
                    'description': 'Installment options retrieved',
                    'content': {
                        'application/json': {
                            'schema': {'$ref': '#/components/schemas/InstallmentOptionsResponse'}
                        }
                    }
                }
            }
        }
    }
    
    spec['paths']['/api/pos/commission/rates'] = {
        'get': {
            'tags': ['POS Commission'],
            'summary': 'Get commission rates for current tenant',
            'operationId': 'getCommissionRates',
            'security': [{'bearerAuth': []}],
            'responses': {
                '200': {
                    'description': 'Commission rates retrieved',
                    'content': {
                        'application/json': {
                            'schema': {'$ref': '#/components/schemas/CommissionRatesResponse'}
                        }
                    }
                }
            }
        }
    }
    
    spec['paths']['/api/pos/commission/rates/system'] = {
        'get': {
            'tags': ['POS Commission Admin'],
            'summary': 'Get system-wide commission rates',
            'operationId': 'getSystemCommissionRates',
            'security': [{'bearerAuth': []}],
            'responses': {
                '200': {
                    'description': 'System rates retrieved',
                    'content': {
                        'application/json': {
                            'schema': {
                                'type': 'object',
                                'properties': {
                                    'success': {'type': 'boolean'},
                                    'data': {
                                        'type': 'object',
                                        'properties': {
                                            'rates': {'$ref': '#/components/schemas/CommissionRates'},
                                            'defaults': {'$ref': '#/components/schemas/CommissionRates'}
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        },
        'put': {
            'tags': ['POS Commission Admin'],
            'summary': 'Update system-wide commission rates',
            'operationId': 'updateSystemCommissionRates',
            'security': [{'bearerAuth': []}],
            'requestBody': {
                'required': True,
                'content': {
                    'application/json': {
                        'schema': {
                            'type': 'object',
                            'required': ['rates'],
                            'properties': {
                                'rates': {'$ref': '#/components/schemas/CommissionRates'}
                            }
                        }
                    }
                }
            },
            'responses': {
                '200': {
                    'description': 'Rates updated',
                    'content': {
                        'application/json': {
                            'schema': {
                                'type': 'object',
                                'properties': {
                                    'success': {'type': 'boolean'},
                                    'message': {'type': 'string'}
                                }
                            }
                        }
                    }
                }
            }
        }
    }
    
    spec['paths']['/api/pos/commission/rates/tenant/{tenant_id}'] = {
        'get': {
            'tags': ['POS Commission Admin'],
            'summary': 'Get tenant-specific commission rates',
            'operationId': 'getTenantCommissionRates',
            'security': [{'bearerAuth': []}],
            'parameters': [
                {
                    'name': 'tenant_id',
                    'in': 'path',
                    'required': True,
                    'schema': {'type': 'string'}
                }
            ],
            'responses': {
                '200': {
                    'description': 'Tenant rates retrieved',
                    'content': {
                        'application/json': {
                            'schema': {
                                'type': 'object',
                                'properties': {
                                    'success': {'type': 'boolean'},
                                    'data': {
                                        'type': 'object',
                                        'properties': {
                                            'tenant_rates': {'$ref': '#/components/schemas/CommissionRates'},
                                            'system_rates': {'$ref': '#/components/schemas/CommissionRates'},
                                            'effective_rates': {'$ref': '#/components/schemas/CommissionRates'}
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        },
        'put': {
            'tags': ['POS Commission Admin'],
            'summary': 'Update tenant-specific commission rates',
            'operationId': 'updateTenantCommissionRates',
            'security': [{'bearerAuth': []}],
            'parameters': [
                {
                    'name': 'tenant_id',
                    'in': 'path',
                    'required': True,
                    'schema': {'type': 'string'}
                }
            ],
            'requestBody': {
                'required': True,
                'content': {
                    'application/json': {
                        'schema': {
                            'type': 'object',
                            'required': ['rates'],
                            'properties': {
                                'rates': {'$ref': '#/components/schemas/CommissionRates'}
                            }
                        }
                    }
                }
            },
            'responses': {
                '200': {
                    'description': 'Tenant rates updated',
                    'content': {
                        'application/json': {
                            'schema': {
                                'type': 'object',
                                'properties': {
                                    'success': {'type': 'boolean'},
                                    'message': {'type': 'string'}
                                }
                            }
                        }
                    }
                }
            }
        }
    }
    
    # Save
    with open(openapi_path, 'w', encoding='utf-8') as f:
        yaml.dump(spec, f, default_flow_style=False, allow_unicode=True, sort_keys=False)
    
    print("✅ OpenAPI updated with POS commission endpoints")

if __name__ == '__main__':
    update_openapi_commission()
