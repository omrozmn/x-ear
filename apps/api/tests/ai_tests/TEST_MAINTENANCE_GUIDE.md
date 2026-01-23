# AI Test Suite - Maintenance Guide

**Version:** 1.0  
**Last Updated:** 2026-01-23

## Table of Contents

1. [Running Tests Locally](#running-tests-locally)
2. [Adding New Tests](#adding-new-tests)
3. [Debugging Test Failures](#debugging-test-failures)
4. [Updating Fixtures](#updating-fixtures)
5. [Test Organization](#test-organization)
6. [Best Practices](#best-practices)

---

## Running Tests Locally

### Prerequisites

```bash
# Ensure you're in the API directory
cd x-ear/apps/api

# Activate virtual environment
source .venv/bin/activate  # macOS/Linux
# or
.venv\Scripts\activate  # Windows

# Install dependencies
pip install -r requirements.txt
```

### Run All Tests

```bash
# Run all AI tests
pytest tests/ai_tests/ -v

# Run with quiet mode (summary only)
pytest tests/ai_tests/ -q

# Run without traceback (cleaner output)
pytest tests/ai_tests/ --tb=no
```

### Run Specific Tests

```bash
# Run a specific test file
pytest tests/ai_tests/test_intent_refiner.py -v

# Run a specific test class
pytest tests/ai_tests/test_api_endpoints.py::TestChatEndpoint -v

# Run a specific test method
pytest tests/ai_tests/test_api_endpoints.py::TestChatEndpoint::test_chat_endpoint_exists -v

# Run tests matching a pattern
pytest tests/ai_tests/ -k "property" -v
```

### Run Tests by Mark

```bash
# Run only property-based tests
pytest tests/ai_tests/ -m property_test -v

# Run only integration tests
pytest tests/ai_tests/ -m integration -v

# Run only slow tests
pytest tests/ai_tests/ -m slow -v

# Exclude slow tests
pytest tests/ai_tests/ -m "not slow" -v
```

### Performance Tips

```bash
# Run tests in parallel (requires pytest-xdist)
pytest tests/ai_tests/ -n auto

# Stop on first failure
pytest tests/ai_tests/ -x

# Show local variables on failure
pytest tests/ai_tests/ -l

# Increase verbosity
pytest tests/ai_tests/ -vv
```

---

## Adding New Tests

### Test File Structure

```python
"""
Module docstring explaining what this test file covers.

Requirements:
- X.Y: Requirement description
- Z.W: Another requirement
"""

import pytest
from unittest.mock import Mock, patch

# Import what you're testing
from ai.agents.intent_refiner import IntentRefiner


class TestIntentRefiner:
    """Test suite for IntentRefiner class."""
    
    def test_basic_functionality(self):
        """Test basic functionality with clear description."""
        # Arrange
        refiner = IntentRefiner()
        
        # Act
        result = refiner.classify_without_llm("hello")
        
        # Assert
        assert result.intent_type == IntentType.GREETING
        assert result.confidence > 0.5
```

### Test Naming Conventions

- **Test files:** `test_<module_name>.py`
- **Test classes:** `Test<ClassName>` (PascalCase)
- **Test methods:** `test_<what_it_tests>` (snake_case)
- **Property tests:** `test_property_<number>_<description>`

### Using Fixtures

```python
def test_with_database(db_session):
    """Test that uses database fixture."""
    # db_session is automatically provided and cleaned up
    request = AIRequest(
        tenant_id="test-tenant",
        user_id="test-user",
        prompt_encrypted="test",
        prompt_hash="hash123"
    )
    db_session.add(request)
    db_session.commit()
    
    # Test your logic
    assert request.id is not None
```

### Property-Based Tests

```python
from hypothesis import given, strategies as st

@given(
    message=st.text(min_size=1, max_size=100),
    confidence=st.floats(min_value=0.0, max_value=1.0)
)
@pytest.mark.property_test
def test_property_confidence_range(message, confidence):
    """Property: Confidence must always be between 0 and 1."""
    refiner = IntentRefiner()
    result = refiner.classify_without_llm(message)
    
    assert 0.0 <= result.confidence <= 1.0
```

### Integration Tests

```python
@pytest.mark.integration
def test_end_to_end_flow(client, db_session):
    """Test complete flow from API to database."""
    response = client.post(
        "/api/ai/chat",
        json={"prompt": "Hello"},
        headers={"Authorization": f"Bearer {token}"}
    )
    
    assert response.status_code == 200
    
    # Verify database state
    request = db_session.query(AIRequest).first()
    assert request is not None
```

---

## Debugging Test Failures

### Step 1: Read the Error Message

```bash
# Run with full traceback
pytest tests/ai_tests/test_failing.py -v --tb=long

# Show local variables
pytest tests/ai_tests/test_failing.py -v -l
```

### Step 2: Isolate the Failure

```bash
# Run only the failing test
pytest tests/ai_tests/test_failing.py::test_specific_failure -v

# Add print statements (use caplog for cleaner output)
def test_debug(caplog):
    with caplog.at_level(logging.DEBUG):
        # Your test code
        logger.debug("Debug info here")
```

### Step 3: Check Test Isolation

```bash
# Run test in isolation
pytest tests/ai_tests/test_failing.py::test_specific_failure -v

# Run with other tests to check for state leakage
pytest tests/ai_tests/test_failing.py -v
```

### Common Issues

#### Database State Issues

**Problem:** Test fails due to existing data in database

**Solution:** Ensure fixtures use transaction rollback

```python
@pytest.fixture
def db_session():
    session = SessionLocal()
    session.begin()  # Start transaction
    
    try:
        yield session
    finally:
        session.rollback()  # Rollback changes
        session.close()
```

#### Mock Not Working

**Problem:** Mock not being called or returning wrong value

**Solution:** Check mock path and ensure it's patched correctly

```python
# ❌ Wrong - patches the imported reference
from ai.agents.intent_refiner import IntentRefiner
@patch('ai.agents.intent_refiner.get_model_client')

# ✅ Correct - patches where it's used
@patch('ai.agents.intent_refiner.get_model_client')
def test_with_mock(mock_client):
    mock_client.return_value = Mock()
```

#### Async Test Issues

**Problem:** Async test not running properly

**Solution:** Use `@pytest.mark.asyncio` decorator

```python
@pytest.mark.asyncio
async def test_async_function():
    result = await some_async_function()
    assert result is not None
```

---

## Updating Fixtures

### Database Fixtures

Located in `conftest.py`:

```python
@pytest.fixture(scope="function")
def db_session() -> Session:
    """Provide test database session with transaction rollback."""
    db_path = Path(__file__).resolve().parent.parent.parent / "instance" / "xear_crm.db"
    
    engine = create_engine(
        f"sqlite:///{db_path}",
        connect_args={"check_same_thread": False},
        echo=False,
    )
    
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    session = SessionLocal()
    session.begin()
    
    try:
        yield session
    finally:
        session.rollback()
        session.close()
        engine.dispose()
```

### Authentication Fixtures

```python
@pytest.fixture
def auth_context():
    """Provide authentication context for tests."""
    return {
        "tenant_id": "test-tenant",
        "user_id": "test-user",
        "permissions": ["ai.chat", "ai.admin"],
    }

@pytest.fixture
def mock_auth_middleware(auth_context):
    """Provide mock authentication middleware."""
    async def middleware(request: Request, call_next):
        request.state.tenant_id = auth_context["tenant_id"]
        request.state.user_id = auth_context["user_id"]
        request.state.user_permissions = auth_context["permissions"]
        
        response = await call_next(request)
        return response
    
    return middleware
```

### Test Data Factory

```python
@pytest.fixture
def test_data_factory():
    """Provide TestDataFactory for creating test data."""
    return TestDataFactory

# Usage in tests
def test_with_data(db_session, test_data_factory):
    request = test_data_factory.create_ai_request(
        db_session,
        prompt="Test prompt"
    )
    assert request.id is not None
```

---

## Test Organization

### Directory Structure

```
tests/ai_tests/
├── conftest.py                          # Shared fixtures
├── test_intent_refiner.py              # Unit tests
├── test_action_planner.py              # Unit tests
├── test_api_endpoints.py               # API integration tests
├── test_integration_flows.py           # End-to-end tests
├── test_ai_correctness_properties.py   # Property-based tests
├── test_jwt_middleware_properties.py   # Property-based tests
└── TEST_MAINTENANCE_GUIDE.md           # This file
```

### Test Categories

1. **Unit Tests** - Test individual functions/classes in isolation
2. **Integration Tests** - Test multiple components working together
3. **Property-Based Tests** - Test properties that should hold for all inputs
4. **API Tests** - Test HTTP endpoints
5. **End-to-End Tests** - Test complete user flows

---

## Best Practices

### 1. Follow AAA Pattern

```python
def test_example():
    # Arrange - Set up test data
    refiner = IntentRefiner()
    message = "hello"
    
    # Act - Execute the code being tested
    result = refiner.classify_without_llm(message)
    
    # Assert - Verify the results
    assert result.intent_type == IntentType.GREETING
```

### 2. Use Descriptive Test Names

```python
# ❌ Bad
def test_1():
    pass

# ✅ Good
def test_greeting_intent_detected_for_hello_message():
    pass
```

### 3. Test One Thing Per Test

```python
# ❌ Bad - tests multiple things
def test_everything():
    assert refiner.classify("hello").intent_type == IntentType.GREETING
    assert refiner.classify("cancel").intent_type == IntentType.CANCEL
    assert refiner.classify("help").intent_type == IntentType.CAPABILITY_INQUIRY

# ✅ Good - separate tests
def test_greeting_intent():
    assert refiner.classify("hello").intent_type == IntentType.GREETING

def test_cancel_intent():
    assert refiner.classify("cancel").intent_type == IntentType.CANCEL

def test_capability_inquiry_intent():
    assert refiner.classify("help").intent_type == IntentType.CAPABILITY_INQUIRY
```

### 4. Use Fixtures for Setup

```python
# ❌ Bad - repeated setup
def test_1():
    refiner = IntentRefiner()
    # test code

def test_2():
    refiner = IntentRefiner()
    # test code

# ✅ Good - fixture
@pytest.fixture
def refiner():
    return IntentRefiner()

def test_1(refiner):
    # test code

def test_2(refiner):
    # test code
```

### 5. Clean Up After Tests

```python
# ✅ Use fixtures with cleanup
@pytest.fixture
def temp_file():
    file = create_temp_file()
    yield file
    file.delete()  # Cleanup

# ✅ Use context managers
def test_with_cleanup():
    with temporary_resource() as resource:
        # test code
    # resource automatically cleaned up
```

### 6. Mock External Dependencies

```python
# ✅ Mock LLM calls
@patch('ai.runtime.model_client.LocalModelClient.generate')
def test_with_mock_llm(mock_generate):
    mock_generate.return_value = ModelResponse(
        text='{"intent_type": "greeting"}',
        tokens_used=10
    )
    
    # Test code that uses LLM
```

### 7. Use Marks for Organization

```python
@pytest.mark.slow
def test_expensive_operation():
    pass

@pytest.mark.integration
def test_database_integration():
    pass

@pytest.mark.property_test
def test_property():
    pass
```

### 8. Document Test Requirements

```python
def test_feature():
    """
    Test feature X works correctly.
    
    Requirements:
    - 2.1: Parse user input
    - 2.4: Calculate confidence score
    
    Given: A user message "hello"
    When: Intent is classified
    Then: Intent type should be GREETING with confidence > 0.5
    """
    pass
```

---

## Troubleshooting

### Tests Pass Locally But Fail in CI

**Possible Causes:**
- Environment differences (Python version, dependencies)
- Timing issues (tests too fast/slow)
- Database state differences
- File path issues

**Solutions:**
- Check CI logs for specific errors
- Ensure same Python version
- Use `pytest-timeout` for hanging tests
- Use relative paths, not absolute

### Flaky Tests

**Symptoms:** Tests pass sometimes, fail other times

**Common Causes:**
- Race conditions in async code
- Shared state between tests
- Time-dependent logic
- Random data generation

**Solutions:**
- Add proper async synchronization
- Ensure test isolation with fixtures
- Mock time-dependent functions
- Use fixed seeds for random data

### Slow Tests

**Solutions:**
- Use `@pytest.mark.slow` to skip in development
- Mock expensive operations (LLM calls, external APIs)
- Use smaller test datasets
- Run tests in parallel with `pytest-xdist`

---

## Getting Help

1. **Check this guide** for common issues
2. **Read test docstrings** for context
3. **Check conftest.py** for available fixtures
4. **Ask team members** in #engineering channel
5. **Review recent PRs** for similar test patterns

---

## Appendix: Useful Commands

```bash
# Run tests with coverage (requires pytest-cov)
pytest tests/ai_tests/ --cov=ai --cov-report=html

# Run tests and generate JUnit XML report
pytest tests/ai_tests/ --junitxml=test-results.xml

# Run tests with detailed output
pytest tests/ai_tests/ -vv --tb=long

# Run tests and show durations
pytest tests/ai_tests/ --durations=10

# Run tests with specific log level
pytest tests/ai_tests/ --log-cli-level=DEBUG

# Run tests and drop into debugger on failure
pytest tests/ai_tests/ --pdb

# Run tests matching pattern
pytest tests/ai_tests/ -k "intent and not property"
```

---

**Maintained by:** Engineering Team  
**Questions?** Contact #engineering on Slack
