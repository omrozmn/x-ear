import yaml
import os

openapi_path = '/Users/omerozmen/Desktop/x-ear web app/x-ear/apps/openapi.yaml'

with open(openapi_path, 'r') as f:
    spec = yaml.safe_load(f)

# Define new schemas
new_schemas = {
    'SMSProviderConfig': {
        'type': 'object',
        'properties': {
            'id': {'type': 'string'},
            'tenantId': {'type': 'string'},
            'apiUsername': {'type': 'string'},
            'documentsEmail': {'type': 'string'},
            'isActive': {'type': 'boolean'},
            'documents': {'type': 'array', 'items': {'type': 'object'}}
        }
    },

    'SMSHeaderRequest': {
        'type': 'object',
        'properties': {
            'id': {'type': 'string'},
            'tenantId': {'type': 'string'},
            'headerText': {'type': 'string'},
            'headerType': {'type': 'string', 'enum': ['company_title', 'trademark', 'domain', 'other']},
            'status': {'type': 'string', 'enum': ['pending', 'approved', 'rejected']},
            'rejectionReason': {'type': 'string'},
            'documents': {'type': 'array', 'items': {'type': 'string'}},
            'createdAt': {'type': 'string', 'format': 'date-time'}
        }
    },
    'SMSPackage': {
        'type': 'object',
        'properties': {
            'id': {'type': 'string'},
            'name': {'type': 'string'},
            'description': {'type': 'string'},
            'smsCount': {'type': 'integer'},
            'price': {'type': 'number'},
            'currency': {'type': 'string'},
            'isActive': {'type': 'boolean'}
        }
    },
    'TenantSMSCredit': {
        'type': 'object',
        'properties': {
            'id': {'type': 'string'},
            'tenantId': {'type': 'string'},
            'balance': {'type': 'integer'},
            'totalPurchased': {'type': 'integer'},
            'totalUsed': {'type': 'integer'}
        }
    },
    'Campaign': {
        'type': 'object',
        'properties': {
            'id': {'type': 'string'},
            'tenantId': {'type': 'string'},
            'name': {'type': 'string'},
            'description': {'type': 'string'},
            'campaignType': {'type': 'string'},
            'targetSegment': {'type': 'string'},
            'targetCriteria': {'type': 'object'},
            'messageTemplate': {'type': 'string'},
            'status': {'type': 'string'},
            'totalRecipients': {'type': 'integer'},
            'successfulSends': {'type': 'integer'},
            'failedSends': {'type': 'integer'},
            'createdAt': {'type': 'string', 'format': 'date-time'},
            'sentAt': {'type': 'string', 'format': 'date-time'}
        }
    },
    'TargetAudience': {
        'type': 'object',
        'properties': {
            'id': {'type': 'string'},
            'tenantId': {'type': 'string'},
            'name': {'type': 'string'},
            'sourceType': {'type': 'string'},
            'totalRecords': {'type': 'integer'},
            'filterCriteria': {'type': 'object'},
            'createdAt': {'type': 'string', 'format': 'date-time'}
        }
    },
    'ActivityLog': {
        'type': 'object',
        'properties': {
            'id': {'type': 'string'},
            'userId': {'type': 'string'},
            'action': {'type': 'string'},
            'entityType': {'type': 'string'},
            'entityId': {'type': 'string'},
            'details': {'type': 'string'},
            'ipAddress': {'type': 'string'},
            'userAgent': {'type': 'string'},
            'createdAt': {'type': 'string', 'format': 'date-time'}
        }
    },
    'Notification': {
        'type': 'object',
        'properties': {
            'id': {'type': 'string'},
            'userId': {'type': 'string'},
            'title': {'type': 'string'},
            'message': {'type': 'string'},
            'type': {'type': 'string'},
            'read': {'type': 'boolean'},
            'createdAt': {'type': 'string', 'format': 'date-time'}
        }
    },
    'User': {
        'type': 'object',
        'properties': {
            'id': {'type': 'string'},
            'username': {'type': 'string'},
            'email': {'type': 'string'},
            'firstName': {'type': 'string'},
            'lastName': {'type': 'string'},
            'role': {'type': 'string'},
            'phone': {'type': 'string'},
            'isPhoneVerified': {'type': 'boolean'},
            'isActive': {'type': 'boolean'},
            'createdAt': {'type': 'string', 'format': 'date-time'}
        }
    },
    'CommunicationTemplate': {
        'type': 'object',
        'properties': {
            'id': {'type': 'string'},
            'name': {'type': 'string'},
            'description': {'type': 'string'},
            'templateType': {'type': 'string', 'enum': ['sms', 'email']},
            'category': {'type': 'string'},
            'subject': {'type': 'string'},
            'bodyText': {'type': 'string'},
            'bodyHtml': {'type': 'string'},
            'variables': {'type': 'array', 'items': {'type': 'string'}},
            'isActive': {'type': 'boolean'},
            'isSystem': {'type': 'boolean'},
            'createdAt': {'type': 'string', 'format': 'date-time'},
            'updatedAt': {'type': 'string', 'format': 'date-time'}
        }
    },
    'CommunicationTemplateCreateBody': {
        'type': 'object',
        'required': ['name', 'templateType', 'bodyText'],
        'properties': {
            'name': {'type': 'string'},
            'description': {'type': 'string'},
            'templateType': {'type': 'string', 'enum': ['sms', 'email']},
            'category': {'type': 'string'},
            'subject': {'type': 'string'},
            'bodyText': {'type': 'string'},
            'bodyHtml': {'type': 'string'},
            'variables': {'type': 'array', 'items': {'type': 'string'}},
            'isActive': {'type': 'boolean'}
        }
    },
    'InventoryItem': {
        'type': 'object',
        'properties': {
            'id': {'type': 'string'},
            'name': {'type': 'string'},
            'brand': {'type': 'string'},
            'model': {'type': 'string'},
            'category': {'type': 'string'},
            'barcode': {'type': 'string'},
            'stock': {'type': 'integer'},
            'price': {'type': 'number'},
            'currency': {'type': 'string'},
            'minStockLevel': {'type': 'integer'},
            'isActive': {'type': 'boolean'},
            'createdAt': {'type': 'string', 'format': 'date-time'},
            'updatedAt': {'type': 'string', 'format': 'date-time'}
        }
    }
}

# Define new paths
new_paths = {
    '/api/sms/audiences': {
        'get': {
            'summary': 'List Target Audiences',
            'tags': ['Sms'],
            'responses': {
                '200': {
                    'description': 'Success',
                    'content': {
                        'application/json': {
                            'schema': {
                                'type': 'object',
                                'properties': {
                                    'success': {'type': 'boolean'},
                                    'data': {'type': 'array', 'items': {'$ref': '#/components/schemas/TargetAudience'}}
                                }
                            }
                        }
                    }
                }
            }
        },
        'post': {
            'summary': 'Create Target Audience',
            'tags': ['Sms'],
            'requestBody': {
                'content': {
                    'application/json': {
                        'schema': {
                            'type': 'object',
                            'required': ['name', 'sourceType'],
                            'properties': {
                                'name': {'type': 'string'},
                                'sourceType': {'type': 'string', 'enum': ['excel', 'filter']},
                                'filePath': {'type': 'string'},
                                'totalRecords': {'type': 'integer'},
                                'filterCriteria': {'type': 'object'}
                            }
                        }
                    }
                }
            },
            'responses': {
                '201': {
                    'description': 'Created',
                    'content': {'application/json': {'schema': {'$ref': '#/components/schemas/TargetAudience'}}}
                }
            }
        }
    },
    '/api/sms/audiences/upload': {
        'post': {
            'summary': 'Upload Audience Excel',
            'tags': ['Sms'],
            'requestBody': {
                'content': {
                    'multipart/form-data': {
                        'schema': {
                            'type': 'object',
                            'properties': {
                                'file': {'type': 'string', 'format': 'binary'}
                            }
                        }
                    }
                }
            },
            'responses': {
                '201': {
                    'description': 'Created',
                    'content': {
                        'application/json': {
                            'schema': {
                                'type': 'object',
                                'properties': {
                                    'success': {'type': 'boolean'},
                                    'data': {'$ref': '#/components/schemas/TargetAudience'}
                                }
                            }
                        }
                    }
                }
            }
        }
    },
    '/api/campaigns': {
        'get': {
            'summary': 'Get Campaigns',
            'tags': ['Campaigns'],
            'parameters': [
                {'name': 'page', 'in': 'query', 'schema': {'type': 'integer'}},
                {'name': 'per_page', 'in': 'query', 'schema': {'type': 'integer'}},
                {'name': 'status', 'in': 'query', 'schema': {'type': 'string'}}
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
                                    'data': {'type': 'array', 'items': {'$ref': '#/components/schemas/Campaign'}},
                                    'meta': {
                                        'type': 'object',
                                        'properties': {
                                            'total': {'type': 'integer'},
                                            'page': {'type': 'integer'},
                                            'perPage': {'type': 'integer'},
                                            'totalPages': {'type': 'integer'}
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        },
        'post': {
            'summary': 'Create Campaign',
            'tags': ['Campaigns'],
            'requestBody': {
                'content': {
                    'application/json': {
                        'schema': {
                            'type': 'object',
                            'required': ['name', 'messageTemplate'],
                            'properties': {
                                'name': {'type': 'string'},
                                'description': {'type': 'string'},
                                'targetSegment': {'type': 'string', 'enum': ['all', 'filter', 'excel']},
                                'targetCriteria': {'type': 'object'},
                                'messageTemplate': {'type': 'string'}
                            }
                        }
                    }
                }
            },
            'responses': {
                '201': {
                    'description': 'Created',
                    'content': {'application/json': {'schema': {'$ref': '#/components/schemas/Campaign'}}}
                }
            }
        }
    },
    '/api/campaigns/{campaign_id}/send': {
        'post': {
            'summary': 'Send Campaign',
            'tags': ['Campaigns'],
            'parameters': [{'name': 'campaign_id', 'in': 'path', 'required': True, 'schema': {'type': 'string'}}],
            'requestBody': {
                'content': {
                    'application/json': {
                        'schema': {
                            'type': 'object',
                            'properties': {
                                'senderId': {'type': 'string'}
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
                                    'message': {'type': 'string'}
                                }
                            }
                        }
                    }
                }
            }
        }
    },
    '/api/sms/config': {
        'get': {
            'summary': 'Get SMS Provider Configuration',
            'tags': ['Sms'],
            'responses': {
                '200': {
                    'description': 'Success',
                    'content': {
                        'application/json': {
                            'schema': {
                                'type': 'object',
                                'properties': {
                                    'success': {'type': 'boolean'},
                                    'data': {'$ref': '#/components/schemas/SMSProviderConfig'}
                                }
                            }
                        }
                    }
                }
            }
        },
        'put': {
            'summary': 'Update SMS Provider Configuration',
            'tags': ['Sms'],
            'requestBody': {
                'content': {
                    'application/json': {
                        'schema': {
                            'type': 'object',
                            'properties': {
                                'apiUsername': {'type': 'string'},
                                'apiPassword': {'type': 'string'}
                            }
                        }
                    }
                }
            },
            'responses': {
                '200': {
                    'description': 'Success',
                    'content': {'application/json': {'schema': {'$ref': '#/components/schemas/SMSProviderConfig'}}}
                }
            }
        }
    },
    '/api/users/me/password': {
        'post': {
            'summary': 'Change Password',
            'operationId': 'users_change_password',
            'tags': ['Users'],
            'requestBody': {
                'content': {
                    'application/json': {
                        'schema': {
                            'type': 'object',
                            'required': ['currentPassword', 'newPassword'],
                            'properties': {
                                'currentPassword': {'type': 'string'},
                                'newPassword': {'type': 'string'}
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
                                    'message': {'type': 'string'}
                                }
                            }
                        }
                    }
                }
            }
        }
    },
    '/api/users/me': {
        'put': {
            'summary': 'Update My Profile',
            'operationId': 'users_update_me',
            'tags': ['Users'],
            'requestBody': {
                'content': {
                    'application/json': {
                        'schema': {
                            'type': 'object',
                            'properties': {
                                'firstName': {'type': 'string'},
                                'lastName': {'type': 'string'},
                                'username': {'type': 'string'},
                                'email': {'type': 'string'}
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
                                    'data': {'$ref': '#/components/schemas/User'}
                                }
                            }
                        }
                    }
                }
            }
        }
    },

    '/api/sms/headers': {
        'get': {
            'summary': 'List SMS Headers',
            'tags': ['Sms'],
            'responses': {
                '200': {
                    'description': 'Success',
                    'content': {'application/json': {'schema': {'type': 'array', 'items': {'$ref': '#/components/schemas/SMSHeaderRequest'}}}}
                }
            }
        },
        'post': {
            'summary': 'Request SMS Header',
            'tags': ['Sms'],
            'requestBody': {
                'content': {
                    'application/json': {
                        'schema': {
                            'type': 'object',
                            'required': ['headerText', 'headerType'],
                            'properties': {
                                'headerText': {'type': 'string'},
                                'headerType': {'type': 'string'},
                                'documents': {'type': 'array', 'items': {'type': 'string'}}
                            }
                        }
                    }
                }
            },
            'responses': {
                '201': {
                    'description': 'Created',
                    'content': {'application/json': {'schema': {'$ref': '#/components/schemas/SMSHeaderRequest'}}}
                }
            }
        }
    },
    '/api/sms/packages': {
        'get': {
            'summary': 'List SMS Packages',
            'tags': ['Sms'],
            'responses': {
                '200': {
                    'description': 'Success',
                    'content': {'application/json': {'schema': {'type': 'array', 'items': {'$ref': '#/components/schemas/SMSPackage'}}}}
                }
            }
        }
    },
    '/api/sms/credit': {
        'get': {
            'summary': 'Get Tenant SMS Credit',
            'tags': ['Sms'],
            'responses': {
                '200': {
                    'description': 'Success',
                    'content': {'application/json': {'schema': {'$ref': '#/components/schemas/TenantSMSCredit'}}}
                }
            }
        }
    },
    '/api/sms/documents/upload': {
        'post': {
            'summary': 'Upload SMS Document to S3',
            'operationId': 'sms_upload_document',
            'tags': ['Sms'],
            'requestBody': {
                'content': {
                    'multipart/form-data': {
                        'schema': {
                            'type': 'object',
                            'required': ['file', 'documentType'],
                            'properties': {
                                'file': {'type': 'string', 'format': 'binary'},
                                'documentType': {
                                    'type': 'string',
                                    'enum': ['contract', 'id_card', 'residence', 'tax_plate', 'activity_cert', 'signature_circular']
                                }
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
                                    'data': {
                                        'type': 'object',
                                        'properties': {
                                            'type': {'type': 'string'},
                                            'filename': {'type': 'string'},
                                            'size': {'type': 'integer'}
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    },
    '/api/sms/documents/{documentType}/download': {
        'get': {
            'summary': 'Get presigned URL for document download',
            'operationId': 'sms_download_document',
            'tags': ['Sms'],
            'parameters': [
                {
                    'name': 'documentType',
                    'in': 'path',
                    'required': True,
                    'schema': {'type': 'string'}
                }
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
                                    'url': {'type': 'string'}
                                }
                            }
                        }
                    }
                }
            }
        }
    },
    '/api/sms/documents/{documentType}': {
        'delete': {
            'summary': 'Delete SMS Document',
            'operationId': 'sms_delete_document',
            'tags': ['Sms'],
            'parameters': [
                {
                    'name': 'documentType',
                    'in': 'path',
                    'required': True,
                    'schema': {'type': 'string'}
                }
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
                                    'message': {'type': 'string'}
                                }
                            }
                        }
                    }
                }
            }
        }
    },

    '/api/admin/sms/packages': {
        'get': {
            'summary': 'Admin List SMS Packages',
            'tags': ['Sms'],
            'responses': {
                '200': {
                    'description': 'Success',
                    'content': {
                        'application/json': {
                            'schema': {
                                'type': 'object',
                                'properties': {
                                    'success': {'type': 'boolean'},
                                    'data': {'type': 'array', 'items': {'$ref': '#/components/schemas/SMSPackage'}}
                                }
                            }
                        }
                    }
                }
            }
        },
        'post': {
            'summary': 'Admin Create SMS Package',
            'tags': ['Sms'],
            'requestBody': {
                'content': {
                    'application/json': {
                        'schema': {
                            'type': 'object',
                            'required': ['name', 'smsCount', 'price'],
                            'properties': {
                                'name': {'type': 'string'},
                                'description': {'type': 'string'},
                                'smsCount': {'type': 'integer'},
                                'price': {'type': 'number'},
                                'currency': {'type': 'string'},
                                'isActive': {'type': 'boolean'}
                            }
                        }
                    }
                }
            },
            'responses': {
                '201': {
                    'description': 'Created',
                    'content': {'application/json': {'schema': {'$ref': '#/components/schemas/SMSPackage'}}}
                }
            }
        }
    },
    '/api/admin/sms/packages/{pkg_id}': {
        'put': {
            'summary': 'Admin Update SMS Package',
            'tags': ['Sms'],
            'parameters': [{'name': 'pkg_id', 'in': 'path', 'required': True, 'schema': {'type': 'string'}}],
            'requestBody': {
                'content': {
                    'application/json': {
                        'schema': {
                            'type': 'object',
                            'properties': {
                                'name': {'type': 'string'},
                                'description': {'type': 'string'},
                                'smsCount': {'type': 'integer'},
                                'price': {'type': 'number'},
                                'isActive': {'type': 'boolean'}
                            }
                        }
                    }
                }
            },
            'responses': {
                '200': {
                    'description': 'Success',
                    'content': {'application/json': {'schema': {'$ref': '#/components/schemas/SMSPackage'}}}
                }
            }
        }
    },
    '/api/admin/sms/headers': {
        'get': {
            'summary': 'Admin List SMS Headers',
            'tags': ['Sms'],
            'parameters': [{'name': 'status', 'in': 'query', 'schema': {'type': 'string'}}],
            'responses': {
                '200': {
                    'description': 'Success',
                    'content': {
                        'application/json': {
                            'schema': {
                                'type': 'object',
                                'properties': {
                                    'success': {'type': 'boolean'},
                                    'data': {'type': 'array', 'items': {'$ref': '#/components/schemas/SMSHeaderRequest'}}
                                }
                            }
                        }
                    }
                }
            }
        }
    },
    '/api/activity-logs': {
        'get': {
            'summary': 'Get Activity Logs',
            'tags': ['Admin'],
            'parameters': [
                {'name': 'entity_type', 'in': 'query', 'schema': {'type': 'string'}},
                {'name': 'entity_id', 'in': 'query', 'schema': {'type': 'string'}},
                {'name': 'user_id', 'in': 'query', 'schema': {'type': 'string'}},
                {'name': 'limit', 'in': 'query', 'schema': {'type': 'integer'}}
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
                                    'data': {'type': 'array', 'items': {'$ref': '#/components/schemas/ActivityLog'}},
                                    'count': {'type': 'integer'}
                                }
                            }
                        }
                    }
                }
            }
        }
    },
    '/api/notifications': {
        'get': {
            'summary': 'Get Notifications',
            'tags': ['Notifications'],
            'parameters': [
                {'name': 'user_id', 'in': 'query', 'required': True, 'schema': {'type': 'string'}},
                {'name': 'page', 'in': 'query', 'schema': {'type': 'integer'}},
                {'name': 'per_page', 'in': 'query', 'schema': {'type': 'integer'}}
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
                                    'data': {'type': 'array', 'items': {'$ref': '#/components/schemas/Notification'}},
                                    'meta': {'type': 'object'}
                                }
                            }
                        }
                    }
                }
            }
        }
    },
    '/api/notifications/stats': {
        'get': {
            'summary': 'Get Notification Stats',
            'tags': ['Notifications'],
            'parameters': [
                {'name': 'user_id', 'in': 'query', 'required': True, 'schema': {'type': 'string'}}
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
                                            'total': {'type': 'integer'},
                                            'unread': {'type': 'integer'}
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    },
    '/api/notifications/{notification_id}/read': {
        'put': {
            'summary': 'Mark Notification Read',
            'tags': ['Notifications'],
            'parameters': [{'name': 'notification_id', 'in': 'path', 'required': True, 'schema': {'type': 'string'}}],
            'responses': {
                '200': {
                    'description': 'Success',
                    'content': {'application/json': {'schema': {'$ref': '#/components/schemas/Notification'}}}
                }
            }
        }
    },
    "/api/birfatura/sync-invoices": {
        "post": {
            "summary": "Sync invoices from BirFatura",
            "operationId": "birfatura_sync_invoices",
            "tags": ["BirFatura"],
            "requestBody": {
                "required": False,
                "content": {
                    "application/json": {
                        "schema": {
                            "type": "object",
                            "properties": {
                                "start_date": {"type": "string", "format": "date-time"},
                                "end_date": {"type": "string", "format": "date-time"}
                            }
                        }
                    }
                }
            },
            "responses": {
                "200": {"description": "Success"},
                "401": {"description": "Unauthorized"},
                "500": {"description": "Internal Server Error"}
            }
        }
    },
    '/api/inventory': {
        'get': {
            'summary': 'Get all inventory items with optional filtering',
            'operationId': 'inventory_get_all_inventory',
            'tags': ['Inventory'],
            'parameters': [
                {'name': 'category', 'in': 'query', 'schema': {'type': 'string'}},
                {'name': 'search', 'in': 'query', 'schema': {'type': 'string'}},
                {'name': 'lowStock', 'in': 'query', 'schema': {'type': 'boolean'}},
                {'name': 'page', 'in': 'query', 'schema': {'type': 'integer'}},
                {'name': 'per_page', 'in': 'query', 'schema': {'type': 'integer'}}
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
                                            'items': {'type': 'array', 'items': {'$ref': '#/components/schemas/InventoryItem'}},
                                            'total': {'type': 'integer'},
                                            'page': {'type': 'integer'},
                                            'perPage': {'type': 'integer'},
                                            'totalPages': {'type': 'integer'}
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    },
    '/api/admin/sms/headers/{header_id}/status': {
        'put': {
            'summary': 'Admin Update SMS Header Status',
            'tags': ['Sms'],
            'parameters': [{'name': 'header_id', 'in': 'path', 'required': True, 'schema': {'type': 'string'}}],
            'requestBody': {
                'content': {
                    'application/json': {
                        'schema': {
                            'type': 'object',
                            'required': ['status'],
                            'properties': {
                                'status': {'type': 'string', 'enum': ['pending', 'approved', 'rejected']},
                                'rejectionReason': {'type': 'string'}
                            }
                        }
                    }
                }
            },
            'responses': {
                '200': {
                    'description': 'Success',
                    'content': {'application/json': {'schema': {'$ref': '#/components/schemas/SMSHeaderRequest'}}}
                }
            }
        }
    },
    '/api/communications/templates': {
        'get': {
            'summary': 'List Communication Templates',
            'operationId': 'communications_list_templates',
            'tags': ['Communications'],
            'parameters': [
                {'name': 'page', 'in': 'query', 'schema': {'type': 'integer'}},
                {'name': 'per_page', 'in': 'query', 'schema': {'type': 'integer'}},
                {'name': 'type', 'in': 'query', 'schema': {'type': 'string'}},
                {'name': 'category', 'in': 'query', 'schema': {'type': 'string'}},
                {'name': 'is_active', 'in': 'query', 'schema': {'type': 'string'}},
                {'name': 'search', 'in': 'query', 'schema': {'type': 'string'}}
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
                                    'data': {'type': 'array', 'items': {'$ref': '#/components/schemas/CommunicationTemplate'}},
                                    'meta': {'type': 'object'}
                                }
                            }
                        }
                    }
                }
            }
        },
        'post': {
            'summary': 'Create Communication Template',
            'operationId': 'communications_create_template',
            'tags': ['Communications'],
            'requestBody': {
                'content': {
                    'application/json': {
                        'schema': {'$ref': '#/components/schemas/CommunicationTemplateCreateBody'}
                    }
                }
            },
            'responses': {
                '201': {
                    'description': 'Created',
                    'content': {'application/json': {'schema': {'$ref': '#/components/schemas/CommunicationTemplate'}}}
                }
            }
        }
    },
    '/api/communications/templates/{template_id}': {
        'get': {
            'summary': 'Get Communication Template',
            'operationId': 'communications_get_template',
            'tags': ['Communications'],
            'parameters': [{'name': 'template_id', 'in': 'path', 'required': True, 'schema': {'type': 'string'}}],
            'responses': {
                '200': {
                    'description': 'Success',
                    'content': {'application/json': {'schema': {'$ref': '#/components/schemas/CommunicationTemplate'}}}
                }
            }
        },
        'put': {
            'summary': 'Update Communication Template',
            'operationId': 'communications_update_template',
            'tags': ['Communications'],
            'parameters': [{'name': 'template_id', 'in': 'path', 'required': True, 'schema': {'type': 'string'}}],
            'requestBody': {
                'content': {
                    'application/json': {
                        'schema': {'$ref': '#/components/schemas/CommunicationTemplateCreateBody'}
                    }
                }
            },
            'responses': {
                '200': {
                    'description': 'Success',
                    'content': {'application/json': {'schema': {'$ref': '#/components/schemas/CommunicationTemplate'}}}
                }
            }
        },
        'delete': {
            'summary': 'Delete Communication Template',
            'operationId': 'communications_delete_template',
            'tags': ['Communications'],
            'parameters': [{'name': 'template_id', 'in': 'path', 'required': True, 'schema': {'type': 'string'}}],
            'responses': {
                '200': {
                    'description': 'Success',
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
}

if 'components' not in spec:
    spec['components'] = {}
if 'schemas' not in spec['components']:
    spec['components']['schemas'] = {}

spec['components']['schemas'].update(new_schemas)
spec['paths'].update(new_paths)

with open(openapi_path, 'w') as f:
    yaml.dump(spec, f, sort_keys=False)

print("OpenAPI spec updated successfully.")
