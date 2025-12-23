
import yaml
import os

# Relative path to root openapi.yaml
openapi_path = os.path.abspath(os.path.join(os.path.dirname(__file__), '../../../openapi.yaml'))
print(f"Updating OpenAPI spec at: {openapi_path}")

try:
    with open(openapi_path, 'r') as f:
        spec = yaml.safe_load(f)
except FileNotFoundError:
    print("Error: openapi.yaml not found at expected path.")
    exit(1)

# Define schemas
paytr_initiate_request = {
    'type': 'object',
    'required': ['amount'],
    'properties': {
        'sale_id': {'type': 'string'},
        'patient_id': {'type': 'string'}, 
        'installment_count': {'type': 'integer', 'default': 1},
        'amount': {'type': 'number'},
        'description': {'type': 'string'}
    }
}

paytr_initiate_response = {
    'type': 'object',
    'properties': {
        'success': {'type': 'boolean'},
        'token': {'type': 'string'},
        'iframe_url': {'type': 'string'},
        'payment_record_id': {'type': 'string'},
        'error': {'type': 'string'}
    }
}

# Add schemas to components
if 'components' not in spec:
    spec['components'] = {}
if 'schemas' not in spec['components']:
    spec['components']['schemas'] = {}

spec['components']['schemas']['PayTRInitiateRequest'] = paytr_initiate_request
spec['components']['schemas']['PayTRInitiateResponse'] = paytr_initiate_response

# Define Paths
paths = spec.get('paths', {})

# Validates paths
paths['/api/payments/pos/paytr/config'] = {
    'get': {
        'summary': 'Get PayTR Config',
        'operationId': 'get_paytr_config',
        'tags': ['PaymentIntegrations'],
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
                                        'merchant_id': {'type': 'string'},
                                        'merchant_key_masked': {'type': 'string'},
                                        'merchant_salt_masked': {'type': 'string'},
                                        'test_mode': {'type': 'boolean'},
                                        'enabled': {'type': 'boolean'}
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
        'summary': 'Update PayTR Config',
        'operationId': 'update_paytr_config',
        'tags': ['PaymentIntegrations'],
        'requestBody': {
            'content': {
                'application/json': {
                    'schema': {
                        'type': 'object',
                        'properties': {
                            'merchant_id': {'type': 'string'},
                            'merchant_key': {'type': 'string'},
                            'merchant_salt': {'type': 'string'},
                            'test_mode': {'type': 'boolean'},
                            'enabled': {'type': 'boolean'}
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
                                'success': {'type': 'boolean'}
                            }
                        }
                    }
                }
            }
        }
    }
}

paths['/api/payments/pos/paytr/initiate'] = {
    'post': {
        'summary': 'Initiate PayTR Payment',
        'operationId': 'paytr_initiate',
        'tags': ['PaymentIntegrations'],
        'requestBody': {
            'content': {
                'application/json': {
                    'schema': {'$ref': '#/components/schemas/PayTRInitiateRequest'}
                }
            }
        },
        'responses': {
            '200': {
                'description': 'Success',
                'content': {
                    'application/json': {
                        'schema': {'$ref': '#/components/schemas/PayTRInitiateResponse'}
                    }
                }
            }
        }
    }
}

paths['/api/payments/pos/paytr/callback'] = {
    'post': {
        'summary': 'PayTR Callback',
        'operationId': 'paytr_callback',
        'tags': ['PaymentIntegrations'],
        'requestBody': {
            'content': {
                'application/x-www-form-urlencoded': {
                    'schema': {
                        'type': 'object',
                        'properties': {
                            'merchant_oid': {'type': 'string'},
                            'status': {'type': 'string'},
                            'total_amount': {'type': 'string'},
                            'hash': {'type': 'string'}
                        }
                    }
                }
            }
        },
        'responses': {
            '200': {
                'description': 'OK response for PayTR',
                'content': {
                    'text/plain': {
                        'schema': {'type': 'string', 'example': 'OK'}
                    }
                }
            }
        }
    }
}

paths['/api/payments/pos/transactions'] = {
    'get': {
        'summary': 'POS Transactions Report',
        'operationId': 'get_pos_transactions',
        'tags': ['PaymentIntegrations'],
        'parameters': [
            {'name': 'provider', 'in': 'query', 'schema': {'type': 'string'}},
            {'name': 'start_date', 'in': 'query', 'schema': {'type': 'string'}},
            {'name': 'end_date', 'in': 'query', 'schema': {'type': 'string'}},
            {'name': 'limit', 'in': 'query', 'schema': {'type': 'integer', 'default': 50}}
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
                                    'type': 'array',
                                    'items': {
                                        'type': 'object',
                                        'properties': {
                                            'id': {'type': 'string'},
                                            'date': {'type': 'string'},
                                            'amount': {'type': 'number'},
                                            'status': {'type': 'string'},
                                            'pos_status': {'type': 'string'},
                                            'pos_provider': {'type': 'string'},
                                            'installment_count': {'type': 'integer'},
                                            'payment_record_id': {'type': 'string'}
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

spec['paths'] = paths

with open(openapi_path, 'w') as f:
    yaml.dump(spec, f, sort_keys=False)

print("OpenAPI spec updated successfully.")
