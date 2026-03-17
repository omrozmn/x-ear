# Automated API Testing System

A comprehensive Pure Python automated API testing system for the X-Ear CRM backend. Tests all 513 endpoints with intelligent resource management, retry logic, and detailed reporting.

## Features

- ✅ **100% Endpoint Coverage**: Tests all 513 API endpoints
- ✅ **Smart Resource Management**: Automatic creation and cleanup of test resources
- ✅ **Retry Logic**: Configurable retries for transient failures
- ✅ **Multi-Tenant Support**: Tests admin, tenant, and affiliate endpoints
- ✅ **Schema-Based Data Generation**: Generates valid request bodies from OpenAPI schemas
- ✅ **Detailed Reporting**: Comprehensive test reports with failure analysis
- ✅ **Property-Based Testing**: 31 property tests using Hypothesis
- ✅ **Unit Tests**: 102 unit tests for all components

## Installation

### Prerequisites

- Python 3.10+
- Backend running on http://localhost:5003
- Admin credentials (default: admin@xear.com / admin123)

### Install Dependencies

```bash
cd x-ear/tests/api_testing
pip install -r requirements.txt
```

### Requirements

```
requests>=2.31.0
pytest>=7.4.0
hypothesis>=6.92.0
pyyaml>=6.0.1
```

## Usage

### Run All Tests

```bash
# From x-ear directory
python -m tests.api_testing.cli

# With verbose output
python -m tests.api_testing.cli --verbose

# Custom base URL
python -m tests.api_testing.cli --base-url http://localhost:8000

# Custom output report
python -m tests.api_testing.cli --output-report my_report.txt
```

### Run Unit Tests

```bash
# All unit tests
python -m pytest tests/api_testing/test_*_*.py -v

# Specific test file
python -m pytest tests/api_testing/test_auth_manager.py -v
```

### Run Property Tests

```bash
# All property tests
python -m pytest tests/api_testing/test_properties.py -v

# With more examples
python -m pytest tests/api_testing/test_properties.py -v --hypothesis-seed=12345
```

## Configuration

### Command Line Options

```bash
python -m tests.api_testing.cli --help

Options:
  --base-url TEXT         Backend base URL (default: http://localhost:5003)
  --openapi-file TEXT     OpenAPI schema file (default: openapi.yaml)
  --admin-email TEXT      Admin email (default: admin@xear.com)
  --admin-password TEXT   Admin password (default: admin123)
  --timeout INTEGER       Request timeout in seconds (default: 45)
  --max-retries INTEGER   Max retries for transient failures (default: 5)
  --output-report TEXT    Output report file path
  --verbose              Enable verbose logging
  --help                 Show this message and exit
```

### Configuration File

Create a `config.yaml` file:

```yaml
base_url: http://localhost:5003
openapi_file: openapi.yaml
admin_email: admin@xear.com
admin_password: admin123
timeout: 45
max_retries: 5
verbose: true
```

Then run:

```bash
python -m tests.api_testing.cli --config config.yaml
```

### Environment Variables

```bash
export API_BASE_URL=http://localhost:5003
export API_TIMEOUT=45
export API_MAX_RETRIES=5
export ADMIN_EMAIL=admin@xear.com
export ADMIN_PASSWORD=admin123

python -m tests.api_testing.cli
```

## Architecture

### Components

1. **OpenAPI Parser** (`openapi_parser.py`)
   - Loads and parses OpenAPI schema
   - Extracts endpoint definitions
   - Resolves $ref references

2. **Data Generator** (`data_generator.py`)
   - Generates unique test data
   - Turkish TCKN and phone number generation
   - Schema-based data generation

3. **Auth Manager** (`auth_manager.py`)
   - Admin, tenant, and affiliate authentication
   - Token management and selection
   - Tenant context switching

4. **Resource Manager** (`resource_manager.py`)
   - Creates prerequisite resources (tenant, user, party, etc.)
   - Tracks resource dependencies
   - Extracts resource IDs from responses

5. **Test Executor** (`test_executor.py`)
   - Executes API tests with retry logic
   - Builds request headers (auth, idempotency, etc.)
   - Handles timeouts and errors

6. **Failure Analyzer** (`failure_analyzer.py`)
   - Categorizes failures by status code
   - Groups by endpoint category
   - Identifies common failure patterns

7. **Report Generator** (`report_generator.py`)
   - Generates detailed test reports
   - Success rate calculation
   - Failure pattern analysis

8. **Cleanup Manager** (`cleanup_manager.py`)
   - Cleans up created resources
   - Reverse dependency order
   - Error resilience

## Test Results

### Current Status

- **Total Endpoints**: 513
- **Passed**: 262 (51.07%)
- **Failed**: 251 (48.93%)
- **Execution Time**: ~90 seconds
- **Unit Tests**: 102 passing
- **Property Tests**: 31 passing

### Failure Breakdown

- 118 Connection/Timeout errors (backend performance)
- 59 Not Found errors (missing resources)
- 28 HTTP 400 errors (validation issues)
- 26 Internal Server Errors (backend bugs)
- 13 Validation Errors (invalid request data)
- 4 Unauthorized errors
- 3 HTTP 403 errors

### Category Statistics

| Category | Passed | Failed | Total | Success Rate |
|----------|--------|--------|-------|--------------|
| ADMIN_PANEL | 70 | 69 | 139 | 50.4% |
| TENANT_WEB_APP | 178 | 154 | 332 | 53.6% |
| SYSTEM | 14 | 23 | 37 | 37.8% |
| AFFILIATE | 0 | 5 | 5 | 0.0% |

## Troubleshooting

### Backend Not Running

```
Error: Connection refused
```

**Solution**: Start the backend server:
```bash
cd x-ear/apps/api
python main.py
```

### Authentication Failed

```
Error: 401 Unauthorized
```

**Solution**: Check admin credentials in config or use correct credentials:
```bash
python -m tests.api_testing.cli --admin-email admin@xear.com --admin-password admin123
```

### Timeout Errors

```
Error: Request timeout
```

**Solution**: Increase timeout:
```bash
python -m tests.api_testing.cli --timeout 60
```

### Resource Creation Failed

```
Error: Failed to create tenant
```

**Solution**: Check backend logs and ensure database is accessible.

## Development

### Project Structure

```
tests/api_testing/
├── __init__.py
├── cli.py                      # CLI entry point
├── test_runner.py              # Main orchestrator
├── config.py                   # Configuration
├── openapi_parser.py           # OpenAPI parsing
├── data_generator.py           # Test data generation
├── schema_data_generator.py    # Schema-based generation
├── auth_manager.py             # Authentication
├── resource_manager.py         # Resource management
├── path_substitution.py        # Path parameter substitution
├── endpoint_categorizer.py     # Endpoint categorization
├── test_executor.py            # Test execution
├── failure_analyzer.py         # Failure analysis
├── report_generator.py         # Report generation
├── cleanup_manager.py          # Resource cleanup
├── logging_config.py           # Logging setup
├── test_properties.py          # Property-based tests (31 tests)
├── test_openapi_parser.py      # Unit tests (10 tests)
├── test_data_generator.py      # Unit tests (14 tests)
├── test_auth_manager.py        # Unit tests (9 tests)
├── test_resource_manager.py    # Unit tests (17 tests)
├── test_test_executor.py       # Unit tests (14 tests)
├── test_failure_analyzer.py    # Unit tests (21 tests)
├── test_report_generator.py    # Unit tests (11 tests)
└── test_cleanup_manager.py     # Unit tests (15 tests)
```

### Running Tests

```bash
# All tests (unit + property)
python -m pytest tests/api_testing/ -v

# Only unit tests
python -m pytest tests/api_testing/test_*_*.py -v

# Only property tests
python -m pytest tests/api_testing/test_properties.py -v

# With coverage
python -m pytest tests/api_testing/ --cov=tests/api_testing --cov-report=html
```

### Adding New Tests

1. **Unit Test**: Add to appropriate `test_*.py` file
2. **Property Test**: Add to `test_properties.py`
3. **Integration Test**: Add to `test_runner.py`

## Contributing

1. Follow existing code style
2. Add tests for new features
3. Update documentation
4. Run all tests before committing

## License

Internal use only - X-Ear CRM Project
