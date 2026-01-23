# Test Data Helpers Documentation

This document describes the database fixtures and test data seeding helpers available for AI Layer integration tests.

## Overview

The test fixtures provide:
1. **In-memory SQLite database** - Fast, isolated test database
2. **Test data factory** - Helper methods to create realistic test data
3. **Pre-seeded database** - Ready-to-use database with sample data
4. **Automatic cleanup** - Database is reset between tests

## Available Fixtures

### 1. `db_session`

Provides a clean in-memory SQLite database session for each test.

**Usage:**
```python
def test_something(db_session):
    # Database is empty and ready to use
    request = AIRequest(tenant_id="test-tenant", ...)
    db_session.add(request)
    db_session.commit()
```

**Features:**
- Creates all AI tables (ai_requests, ai_actions, ai_audit_logs, ai_usage)
- Automatically cleaned up after each test
- Function-scoped (new database for each test)

### 2. `auth_context`

Provides authentication context for tests.

**Usage:**
```python
def test_something(auth_context):
    tenant_id = auth_context["tenant_id"]  # "test-tenant"
    user_id = auth_context["user_id"]      # "test-user"
    permissions = auth_context["permissions"]  # ["ai.chat", "ai.admin", ...]
```

**Default Values:**
- `tenant_id`: "test-tenant"
- `user_id`: "test-user"
- `permissions`: ["ai.chat", "ai.admin", "ai.execute", "ai.view"]

### 3. `mock_auth_middleware`

Provides mock authentication middleware for FastAPI test apps.

**Usage:**
```python
def test_something(mock_auth_middleware):
    app = FastAPI()
    
    @app.middleware("http")
    async def auth_middleware(request: Request, call_next):
        return await mock_auth_middleware(request, call_next)
    
    # Now all requests will have auth context in request.state
```

### 4. `test_data_factory`

Provides `TestDataFactory` class with helper methods to create test data.

**Usage:**
```python
def test_something(db_session, test_data_factory):
    # Create an AI request
    request = test_data_factory.create_ai_request(
        db_session,
        tenant_id="tenant-123",
        user_id="user-456",
        prompt="Create a party named John Doe"
    )
    
    # Create an action for the request
    action = test_data_factory.create_ai_action(
        db_session,
        request_id=request.id,
        risk_level="high"
    )
```

### 5. `seeded_db_session`

Provides a database session with pre-seeded test data.

**Usage:**
```python
def test_something(seeded_db_session):
    session, request, action, audit_log, usage = seeded_db_session
    
    # Database already has:
    # - 1 AIRequest (pending)
    # - 1 AIAction (draft)
    # - 1 AIAuditLog (request_received)
    # - 1 AIUsage record
    
    # Use the pre-created objects
    assert request.status == "pending"
    assert action.request_id == request.id
```

## TestDataFactory Methods

### `create_ai_request()`

Creates an AIRequest for testing.

**Parameters:**
- `session` (Session, required): Database session
- `tenant_id` (str, default="test-tenant"): Tenant ID
- `user_id` (str, default="test-user"): User ID
- `prompt` (str, default="Test prompt"): User prompt
- `session_id` (str, optional): Session ID for conversation context
- `status` (str, default="pending"): Request status
- `intent_type` (str, optional): Intent type
- `**kwargs`: Additional fields to override

**Returns:** `AIRequest` instance

**Example:**
```python
request = test_data_factory.create_ai_request(
    db_session,
    tenant_id="tenant-123",
    user_id="user-456",
    prompt="Create a party named John Doe",
    status="completed",
    intent_type="action",
    intent_confidence=95
)
```

### `create_ai_action()`

Creates an AIAction for testing.

**Parameters:**
- `session` (Session, required): Database session
- `request_id` (str, required): Reference to AIRequest
- `tenant_id` (str, default="test-tenant"): Tenant ID
- `user_id` (str, default="test-user"): User ID
- `action_plan` (dict, optional): Action plan JSON
- `risk_level` (str, default="low"): Risk level (low/medium/high/critical)
- `status` (str, default="draft"): Action status
- `**kwargs`: Additional fields to override

**Returns:** `AIAction` instance

**Example:**
```python
action_plan = {
    "steps": [
        {
            "tool_id": "party_tool",
            "operation": "create_party",
            "parameters": {"name": "John Doe", "phone": "+1234567890"}
        }
    ]
}

action = test_data_factory.create_ai_action(
    db_session,
    request_id=request.id,
    action_plan=action_plan,
    risk_level="high",
    status="pending_approval"
)
```

### `create_ai_audit_log()`

Creates an AIAuditLog for testing.

**Parameters:**
- `session` (Session, required): Database session
- `tenant_id` (str, default="test-tenant"): Tenant ID
- `user_id` (str, default="test-user"): User ID
- `event_type` (str, default="request_received"): Event type
- `request_id` (str, optional): Reference to AIRequest
- `action_id` (str, optional): Reference to AIAction
- `**kwargs`: Additional fields to override

**Returns:** `AIAuditLog` instance

**Example:**
```python
audit_log = test_data_factory.create_ai_audit_log(
    db_session,
    tenant_id="tenant-123",
    user_id="user-456",
    event_type="action_planned",
    request_id=request.id,
    action_id=action.id,
    intent_type="action",
    risk_level="high",
    outcome="success"
)
```

### `create_ai_usage()`

Creates an AIUsage record for testing.

**Parameters:**
- `session` (Session, required): Database session
- `tenant_id` (str, default="test-tenant"): Tenant ID
- `usage_type` (str, default="chat"): Usage type
- `request_count` (int, default=1): Number of requests
- `token_count_input` (int, default=10): Input tokens
- `token_count_output` (int, default=20): Output tokens
- `**kwargs`: Additional fields to override

**Returns:** `AIUsage` instance

**Example:**
```python
usage = test_data_factory.create_ai_usage(
    db_session,
    tenant_id="tenant-123",
    usage_type="execution",
    request_count=5,
    token_count_input=1000,
    token_count_output=2000,
    quota_limit=100
)
```

## Common Test Patterns

### Pattern 1: Simple Test with Empty Database

```python
def test_create_request(db_session):
    """Test creating a request from scratch."""
    request = AIRequest(
        tenant_id="test-tenant",
        user_id="test-user",
        prompt_encrypted="encrypted_prompt",
        prompt_hash="hash123",
        status="pending"
    )
    db_session.add(request)
    db_session.commit()
    
    # Verify
    assert request.id is not None
```

### Pattern 2: Test with Factory-Created Data

```python
def test_action_workflow(db_session, test_data_factory):
    """Test action workflow with factory-created data."""
    # Create request
    request = test_data_factory.create_ai_request(
        db_session,
        prompt="Create a party"
    )
    
    # Create action
    action = test_data_factory.create_ai_action(
        db_session,
        request_id=request.id,
        risk_level="low"
    )
    
    # Test workflow
    action.mark_approved("approver-123", "token_hash")
    db_session.commit()
    
    assert action.status == "approved"
```

### Pattern 3: Test with Pre-Seeded Database

```python
def test_query_existing_data(seeded_db_session):
    """Test querying pre-existing data."""
    session, request, action, audit_log, usage = seeded_db_session
    
    # Data is already in the database
    all_requests = session.query(AIRequest).all()
    assert len(all_requests) >= 1
    assert request.id in [r.id for r in all_requests]
```

### Pattern 4: Test Tenant Isolation

```python
def test_tenant_isolation(db_session, test_data_factory):
    """Test that tenant isolation is enforced."""
    # Create data for tenant 1
    request1 = test_data_factory.create_ai_request(
        db_session,
        tenant_id="tenant-1",
        prompt="Tenant 1 request"
    )
    
    # Create data for tenant 2
    request2 = test_data_factory.create_ai_request(
        db_session,
        tenant_id="tenant-2",
        prompt="Tenant 2 request"
    )
    
    # Query by tenant
    tenant1_requests = db_session.query(AIRequest).filter_by(
        tenant_id="tenant-1"
    ).all()
    
    # Verify isolation
    assert len(tenant1_requests) == 1
    assert tenant1_requests[0].id == request1.id
```

### Pattern 5: Test Complete Audit Trail

```python
def test_complete_audit_trail(db_session, test_data_factory):
    """Test creating a complete audit trail."""
    # Create request
    request = test_data_factory.create_ai_request(db_session)
    
    # Create audit trail
    events = [
        "request_received",
        "intent_classified",
        "action_planned",
        "approval_requested",
        "approval_granted",
        "execution_started",
        "execution_completed"
    ]
    
    for event_type in events:
        test_data_factory.create_ai_audit_log(
            db_session,
            event_type=event_type,
            request_id=request.id
        )
    
    # Verify audit trail
    logs = db_session.query(AIAuditLog).filter_by(
        request_id=request.id
    ).all()
    
    assert len(logs) == len(events)
    log_types = [log.event_type for log in logs]
    assert set(log_types) == set(events)
```

## Best Practices

### 1. Use Factory Methods for Complex Objects

✅ **Good:**
```python
request = test_data_factory.create_ai_request(
    db_session,
    prompt="Create a party"
)
```

❌ **Avoid:**
```python
request = AIRequest(
    tenant_id="test-tenant",
    user_id="test-user",
    prompt_encrypted="...",
    prompt_hash="...",
    # ... many more fields
)
```

### 2. Use Seeded Database for Read-Only Tests

✅ **Good:**
```python
def test_query_performance(seeded_db_session):
    session, request, _, _, _ = seeded_db_session
    # Test query performance with existing data
```

❌ **Avoid:**
```python
def test_query_performance(db_session, test_data_factory):
    # Creating data just to query it
    request = test_data_factory.create_ai_request(db_session)
```

### 3. Test Tenant Isolation

Always test that tenant isolation is enforced:

```python
def test_tenant_isolation(db_session, test_data_factory):
    request1 = test_data_factory.create_ai_request(
        db_session, tenant_id="tenant-1"
    )
    request2 = test_data_factory.create_ai_request(
        db_session, tenant_id="tenant-2"
    )
    
    # Verify isolation
    tenant1_data = db_session.query(AIRequest).filter_by(
        tenant_id="tenant-1"
    ).all()
    assert len(tenant1_data) == 1
```

### 4. Clean Up Is Automatic

You don't need to manually clean up - the `db_session` fixture handles it:

✅ **Good:**
```python
def test_something(db_session):
    # Create data
    request = AIRequest(...)
    db_session.add(request)
    db_session.commit()
    # No cleanup needed - automatic
```

❌ **Avoid:**
```python
def test_something(db_session):
    request = AIRequest(...)
    db_session.add(request)
    db_session.commit()
    
    # Unnecessary cleanup
    db_session.delete(request)
    db_session.commit()
```

### 5. Use Realistic Test Data

Use realistic values that match production patterns:

✅ **Good:**
```python
request = test_data_factory.create_ai_request(
    db_session,
    tenant_id="tenant-abc123",
    user_id="user-xyz789",
    prompt="Create a party named John Doe with phone +1234567890"
)
```

❌ **Avoid:**
```python
request = test_data_factory.create_ai_request(
    db_session,
    tenant_id="t",
    user_id="u",
    prompt="x"
)
```

## Troubleshooting

### Issue: "Table does not exist"

**Cause:** Database tables not created.

**Solution:** Use the `db_session` fixture - it automatically creates all tables.

### Issue: "Data persists between tests"

**Cause:** Not using function-scoped fixtures.

**Solution:** The `db_session` fixture is function-scoped and automatically cleans up. Make sure you're using it correctly.

### Issue: "Foreign key constraint failed"

**Cause:** Creating an action without a request.

**Solution:** Always create the parent object first:
```python
request = test_data_factory.create_ai_request(db_session)
action = test_data_factory.create_ai_action(
    db_session,
    request_id=request.id  # Reference the parent
)
```

### Issue: "Unique constraint violation"

**Cause:** Creating duplicate records with same unique key.

**Solution:** Each factory method generates unique IDs automatically. If you're overriding IDs, make sure they're unique.

## See Also

- `test_fixtures.py` - Example tests using all fixtures
- `conftest.py` - Fixture implementations
- AI Layer models documentation
