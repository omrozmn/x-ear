# API Response Standards

This document defines the standardized response format for all API endpoints in the X-Ear web application.

## Standard Response Format

All API endpoints should follow this consistent response structure:

### Success Response Format

```json
{
  "success": true,
  "data": [...], // or {} for single objects
  "meta": {      // For paginated responses only
    "page": 1,
    "perPage": 50,
    "total": 150,
    "totalPages": 3
  },
  "timestamp": "2025-10-06T21:08:48.138655" // Optional
}
```

### Error Response Format

```json
{
  "success": false,
  "error": "Error message description",
  "timestamp": "2025-10-06T21:08:48.138655" // Optional
}
```

## Field Naming Convention

### Use camelCase for all JSON field names

**✅ Correct:**
```json
{
  "companyName": "Example Corp",
  "contactPerson": "John Doe",
  "createdAt": "2023-10-30T19:51:14.432567",
  "isActive": true,
  "paymentTerms": "NET30"
}
```

**❌ Incorrect:**
```json
{
  "company_name": "Example Corp",
  "contact_person": "John Doe", 
  "created_at": "2023-10-30T19:51:14.432567",
  "is_active": true,
  "payment_terms": "NET30"
}
```

## Pagination Standards

For endpoints that return lists of data, always include pagination metadata:

### Required Pagination Fields
- `page`: Current page number (1-based)
- `perPage`: Number of items per page
- `total`: Total number of items
- `totalPages`: Total number of pages

### Example Paginated Response
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "Item 1"
    }
  ],
  "meta": {
    "page": 1,
    "perPage": 50,
    "total": 150,
    "totalPages": 3
  }
}
```

## Enum Value Standards

### Use UPPERCASE for enum values in the database
- Database enum values should be stored in UPPERCASE (e.g., `COMPLETED`, `SCHEDULED`, `CANCELLED`)
- API responses should return enum values as stored in the database

### Example
```json
{
  "status": "COMPLETED",
  "appointmentType": "CONSULTATION"
}
```

## Date and Time Format

### Use ISO 8601 format for all dates and timestamps
- Format: `YYYY-MM-DDTHH:mm:ss.ssssss`
- Example: `"2023-10-30T19:51:14.432567"`

## Model Serialization Guidelines

### Implement `to_dict()` methods in all models
Each model should have a `to_dict()` method that:
1. Converts all field names to camelCase
2. Formats dates using ISO 8601
3. Handles null values appropriately
4. Includes computed fields when necessary

### Example Model Implementation
```python
def to_dict(self):
    return {
        'id': self.id,
        'companyName': self.company_name,
        'isActive': self.is_active,
        'createdAt': self.created_at.isoformat() if self.created_at else None,
        'updatedAt': self.updated_at.isoformat() if self.updated_at else None
    }
```

## HTTP Status Codes

### Use appropriate HTTP status codes
- `200 OK`: Successful GET, PUT, PATCH requests
- `201 Created`: Successful POST requests that create resources
- `204 No Content`: Successful DELETE requests
- `400 Bad Request`: Invalid request data
- `401 Unauthorized`: Authentication required
- `403 Forbidden`: Access denied
- `404 Not Found`: Resource not found
- `422 Unprocessable Entity`: Validation errors
- `500 Internal Server Error`: Server errors

## Validation and Error Handling

### Consistent error messages
- Always include a descriptive error message
- Use the `success: false` flag for all error responses
- Include field-specific validation errors when applicable

### Example Validation Error Response
```json
{
  "success": false,
  "error": "Validation failed",
  "details": {
    "email": ["Email is required"],
    "phone": ["Phone number must be valid"]
  }
}
```

## Implementation Checklist

When creating or updating API endpoints, ensure:

- [ ] Response follows the standard format with `success`, `data`, and optional `meta` fields
- [ ] All field names use camelCase convention
- [ ] Pagination metadata is included for list endpoints
- [ ] Enum values are in UPPERCASE format
- [ ] Dates use ISO 8601 format
- [ ] Appropriate HTTP status codes are used
- [ ] Error responses include descriptive messages
- [ ] Model `to_dict()` methods follow the standards

## Migration Notes

When updating existing endpoints to follow these standards:

1. Update model `to_dict()` methods to use camelCase
2. Ensure enum values are stored and returned in UPPERCASE
3. Add pagination metadata to list endpoints
4. Update error handling to use the standard format
5. Test all endpoints to verify compliance

## Compliance Status

### ✅ Compliant Endpoints
- `/api/inventory` - Standardized pagination and camelCase
- `/api/sales` - Standardized pagination and camelCase  
- `/api/suppliers` - Standardized pagination and camelCase
- `/api/appointments` - Standardized pagination and camelCase
- `/api/devices` - Standardized pagination and camelCase
- `/api/campaigns` - Standardized pagination and camelCase
- `/api/reports/overview` - Standardized response format

### 🔄 Endpoints Requiring Review
- `/api/documents` - Returns internal server error
- `/api/replacements` - Returns internal server error
- `/api/users` - Requires authentication
- `/api/notifications` - Requires user_id parameter

---

**Last Updated:** October 6, 2025  
**Version:** 1.0