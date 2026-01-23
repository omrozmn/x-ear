# AI Layer Architecture

## Overview

The AI Layer is a horizontal platform component that provides intelligent assistance across the xear multi-product monorepo. It processes user requests through a three-agent pipeline while maintaining strict security boundaries, auditability, and cost controls.

## Key Principles

1. **Complete Isolation**: AI Layer is fully decoupled from core business logic
2. **Fail-Safe by Default**: System operates 100% without AI; AI failures never cascade
3. **Human-in-the-Loop**: High-risk actions require explicit approval
4. **Deterministic Guardrails**: LLM provides reasoning; Policy Engine makes decisions
5. **Bounded Capabilities**: AI operates only through Tool API allowlist
6. **Self-Hosted Models**: No external LLM APIs (OpenAI, Gemini, Claude)
7. **LLM Output is Untrusted**: All LLM outputs validated with Pydantic before use
8. **Hash-Bound Auditing**: Prompts and schemas bound by content hash for traceability
9. **AI is NOT Autonomous**: All AI actions are mediated through allow-listed Tool APIs with explicit permission checks. The AI cannot make decisions or take actions independently.

## Important Disclaimers

⚠️ **AI is Not Autonomous**: The AI Layer does not operate autonomously. All actions are:
- Mediated through allow-listed Tool APIs
- Subject to RBAC permission checks
- Logged with complete audit trail
- Reversible and traceable
- Bounded by deterministic policy rules

The AI provides reasoning and suggestions, but the Policy Engine makes all execution decisions based on deterministic rules.

## Directory Structure

```
ai/
├── __init__.py           # Module initialization
├── config.py             # AI configuration (phase, model, quotas)
├── README.md             # This file
│
├── api/                  # FastAPI routers (public contract)
│   ├── chat.py           # POST /ai/chat
│   ├── actions.py        # POST /ai/actions, /approve, /execute
│   ├── audit.py          # GET /ai/audit
│   ├── status.py         # GET /ai/status
│   └── admin.py          # POST /ai/admin/kill-switch
│
├── agents/               # Sub-agents (LLM logic)
│   ├── intent_refiner.py # Agent A: Parse & sanitize input
│   ├── action_planner.py # Agent B: Plan actions & analyze risk
│   └── executor.py       # Agent C: Simulate & execute
│
├── models/               # AI-only DB models (SQLAlchemy)
│   ├── ai_request.py     # Encrypted prompt storage
│   ├── ai_action.py      # Action plans with approval status
│   ├── ai_audit.py       # Immutable audit log
│   └── ai_usage.py       # Usage tracking per tenant
│
├── tools/                # Allow-listed executable tools
│   ├── __init__.py       # ToolDefinition schema
│   ├── allowlist.py      # Tool registry with schema versions
│   ├── feature_flags.py  # feature_flag_toggle tool
│   ├── tenant_config.py  # tenant_config_update tool
│   └── reports.py        # report_generate tool
│
├── policies/             # Deterministic guards (NO LLM)
│   ├── policy_engine.py  # Main policy evaluation
│   ├── rbac.py           # RBAC rule evaluation
│   ├── compliance.py     # Compliance rule evaluation
│   └── risk_matrix.py    # Risk threshold evaluation
│
├── runtime/              # Model loading & inference
│   ├── model_client.py   # LocalModelClient for Ollama
│   ├── model_registry.py # Model versions & A/B testing
│   ├── inference.py      # Guardrails & circuit breaker
│   └── prompt_registry.py# Versioned prompt templates
│
├── prompts/              # Versioned prompt templates (YAML)
│   ├── intent_refiner_v1.yaml
│   └── action_planner_v1.yaml
│
├── schemas/              # Pydantic schemas
│   └── llm_outputs.py    # LLM output validation models
│
├── utils/                # Helper modules
│   ├── pii_redactor.py   # PII/PHI detection & redaction
│   ├── prompt_sanitizer.py # Prompt injection prevention
│   ├── approval_token.py # HMAC-signed token generation
│   └── llm_validator.py  # LLM output validation
│
├── middleware/           # FastAPI middleware
│   └── rate_limiter.py   # Rate limiting middleware
│
└── services/             # Business logic services
    ├── usage_tracker.py  # Atomic usage counter updates
    ├── kill_switch.py    # Kill switch management
    ├── data_retention.py # Data deletion and retention policy
    └── prompt_anonymizer.py # (FUTURE) Prompt anonymization for model training
```

## Dead Code and Future Modules

### prompt_anonymizer.py (Not Currently Active)

**Status**: Reserved for future use, not currently imported or active.

**Purpose**: Anonymize prompts for model improvement and training pipelines by removing all PII/PHI while preserving semantic structure.

**Why Not Active**:
- Phase A (read-only) does not require model training/improvement
- Full anonymization requires NER model integration
- Current PII redaction in Intent Refiner is sufficient for operational needs
- Model improvement pipeline planned for Phase B/C rollout

**Planned Activation**: Q2 2025 (Phase B implementation)

**Decision**: File retained with comprehensive documentation rather than deleted, as it contains production-ready code for planned features. Removed from `services/__init__.py` exports to avoid confusion.

## Authentication & Authorization

### JWT Authentication (Requirement 2.1-2.10)

All AI endpoints require JWT authentication with tenant isolation:

**Authentication Flow**:
1. Client sends request with `Authorization: Bearer <token>` header
2. JWT middleware validates token signature and expiration
3. Middleware extracts `tenant_id` and `user_id` from JWT claims
4. Tenant context is set using `set_tenant_context(tenant_id)`
5. Request is processed with tenant isolation enforced
6. Context is reset in finally block using `reset_tenant_context(token)`

**JWT Requirements**:
- Token MUST include `tenant_id` claim (requests without it are rejected with HTTP 401)
- Token MUST include `user_id` claim for audit trail
- Token MUST be signed with shared secret key
- Token MUST NOT be expired
- `tenant_id` is ONLY accepted from JWT claims, never from request body or query parameters

**Protected Endpoints**:
- `POST /ai/chat` - Natural language chat interface
- `GET /ai/capabilities` - List available AI capabilities
- `GET /ai/status` - AI service status

**Example**:
```python
# JWT payload structure
{
    "sub": "user-123",
    "user_id": "user-123",
    "tenant_id": "tenant-456",
    "exp": 1706000000
}
```

### User Audit Trail (Requirement 2.7, 9.1)

Every AI request is logged with complete audit trail:
- `user_id` - Who made the request (from JWT)
- `tenant_id` - Which tenant (from JWT)
- `prompt` - User's input (encrypted at rest)
- `created_at` - Timestamp (UTC)
- `intent_type` - Classified intent
- `intent_confidence` - Confidence score
- `latency_ms` - Processing time
- `status` - Request status (completed, failed, rejected, timeout)

## Data Retention & Privacy

### Encrypted Prompt Retention Policy (Requirement 1.1-1.9)

**Retention Period**: 90 days (configurable via `AI_RETENTION_DAYS`)

**Automatic Deletion**:
- Daily cron job runs at 2 AM UTC
- Deletes AI requests older than retention period
- Uses batch deletion for efficiency (avoids N+1 problem)
- Respects legal hold flag (`legal_hold=True`)
- Logs all deletions with request count and timestamp
- Exposes Prometheus metric: `ai_prompts_deleted_total`

**Legal Hold**:
- Records marked with `legal_hold=True` are NEVER deleted automatically
- Used during compliance investigations or legal proceedings
- Must be manually cleared by compliance officer

**Database Schema**:
```python
class AIRequest:
    id: str
    tenant_id: str
    user_id: str
    prompt: str  # Encrypted with AES-256
    created_at: datetime  # UTC timestamp
    legal_hold: bool  # Prevents deletion
    status: RequestStatus
    intent_type: str
    intent_confidence: float
```

**Configuration**:
```bash
# Retention period in days (default: 90)
AI_RETENTION_DAYS=90
```

## AI Correctness Features

### Cancellation (Requirement 4.1-4.2, 4.7)

Users can cancel ongoing AI operations at any time:

**Cancellation Keywords**: "cancel", "stop", "nevermind", "abort", "quit"

**Behavior**:
1. Intent Refiner detects cancellation keywords
2. Current action plan is halted immediately
3. Conversation context is cleared
4. User receives confirmation: "Operation cancelled"
5. Cancellation event is logged with `conversation_id` and reason

**Example**:
```
User: "Create a new patient"
AI: "What is the patient's name?"
User: "cancel"
AI: "Operation cancelled"
```

### Slot-Filling (Requirement 4.3-4.6)

When required parameters are missing, AI prompts for them:

**Flow**:
1. Action Planner detects missing required parameter
2. Generates user-friendly slot-filling prompt
3. User provides the missing value
4. Intent Refiner extracts value and updates action plan
5. Process continues or prompts for next missing parameter

**Timeout**: Action plans expire after 5 minutes of inactivity

**Example**:
```
User: "Create a patient"
AI: "What is the patient's name?"
User: "Ahmet Yılmaz"
AI: "Creating patient Ahmet Yılmaz..."
```

**Timeout Handling**:
```
User: "Create a patient"
AI: "What is the patient's name?"
[5 minutes pass]
User: "Ahmet Yılmaz"
AI: "Action plan timed out. Please start over."
```

### Conversation Context (Requirement 4.6)

Conversation context is maintained across turns:
- Last 3 turns stored in memory
- Pending action plans tracked
- Slot-filling state preserved
- Context cleared on cancellation or timeout

### Meta-Intent Handling (Requirement 4.8)

Users can ask unrelated questions during active plans:
- Current plan is paused (not cancelled)
- New intent is processed
- User can return to original plan

**Example**:
```
User: "Create a patient"
AI: "What is the patient's name?"
User: "What can you do?"
AI: [Lists capabilities]
User: "Ahmet Yılmaz"
AI: "Creating patient Ahmet Yılmaz..."
```

## Capability Disclosure

### Capabilities Endpoint (Requirement 5.1-5.8)

`GET /ai/capabilities` - Lists available AI capabilities

**Filtering**:
- By user permissions (from JWT token)
- By AI phase (Phase A = read-only operations only)

**Response Structure**:
```json
{
  "capabilities": [
    {
      "name": "View Party Information",
      "description": "Look up details about a person or organization",
      "category": "Party Management",
      "examplePhrases": ["Show me John Doe's information"],
      "requiredPermissions": ["parties.view"],
      "toolOperations": ["get_party_by_id"],
      "limitations": ["Cannot access parties from other tenants"]
    }
  ],
  "aiPhase": "A",
  "disclaimer": "AI actions are always mediated through allow-listed Tool APIs and are not autonomous."
}
```

**Capability Inquiry in Chat**:
Users can ask "What can you do?" in chat:
- Intent Refiner detects capability inquiry
- Reuses capabilities endpoint logic (Single Source of Truth)
- Returns formatted list with disclaimer

**Important**: AI is NOT autonomous. All actions are mediated through allow-listed Tool APIs with explicit permission checks.

## Configuration

Environment variables:
```bash
# Phase control (A=read_only, B=proposal, C=execution)
AI_PHASE=A

# Local model configuration
AI_MODEL_PROVIDER=local
AI_MODEL_ID=qwen2.5-7b-instruct
AI_MODEL_BASE_URL=http://localhost:11434
AI_MODEL_TIMEOUT_SECONDS=30

# Data retention (default: 90 days)
AI_RETENTION_DAYS=90

# JWT authentication
JWT_SECRET_KEY=your-secret-key
JWT_ALGORITHM=HS256

# AI feature flags
AI_ENABLED=true
```

## Phases

- **Phase A (Read-Only)**: Suggestions only, no execution endpoints
- **Phase B (Proposal)**: Proposals with approval gates
- **Phase C (Execution)**: Approved actions via Tool API allowlist

## Testing

### Test Coverage

The AI Layer has comprehensive test coverage across multiple levels:

**Unit Tests**:
- JWT middleware edge cases (missing header, expired token, invalid signature)
- Data retention edge cases (zero requests, legal hold, database failures)
- Intent classification without LLM
- Action planning without LLM
- PII/PHI redaction

**Property-Based Tests** (using Hypothesis):
- JWT token extraction and validation (100 iterations)
- Data retention completeness (100 iterations)
- Cancellation keyword detection (50 iterations)
- Slot-filling prompt generation (50 iterations)
- Capability filtering by permissions (50 iterations)
- User audit trail completeness (100 iterations)

**Integration Tests**:
- JWT auth → chat → AI request creation → audit trail
- Cancellation flow end-to-end
- Slot-filling flow with timeout
- Capability inquiry flow
- Data retention with legal hold
- Conversation context persistence
- Error handling and recovery

**Test Files**:
```
tests/ai_tests/
├── test_jwt_middleware_properties.py    # Property tests for JWT
├── test_jwt_middleware_unit.py          # Unit tests for JWT
├── test_jwt_integration.py              # JWT integration tests
├── test_data_retention_properties.py    # Property tests for retention
├── test_data_retention_unit.py          # Unit tests for retention
├── test_ai_correctness_properties.py    # Property tests for correctness
├── test_capabilities_properties.py      # Property tests for capabilities
├── test_capabilities_integration.py     # Capability integration tests
├── test_user_audit_trail_properties.py  # Property tests for audit trail
└── test_integration_flows.py            # Complete integration flows
```

**Running Tests**:
```bash
# Run all AI tests
pytest tests/ai_tests/ -v

# Run specific test category
pytest tests/ai_tests/test_jwt_*.py -v
pytest tests/ai_tests/test_data_retention_*.py -v
pytest tests/ai_tests/test_integration_flows.py -v

# Run with coverage
pytest tests/ai_tests/ --cov=ai --cov-report=html
```

**Test Requirements**:
- All P0 requirements: 85%+ code coverage
- All P1 requirements: 80%+ code coverage
- Property tests: No failures across 50-100 iterations
- Integration tests: All flows pass end-to-end

## Phases

- **Phase A (Read-Only)**: Suggestions only, no execution endpoints
- **Phase B (Proposal)**: Proposals with approval gates
- **Phase C (Execution)**: Approved actions via Tool API allowlist

## Security Constraints

### AI Layer MUST DO
- Operate through Tool API only
- Log everything to AI_Audit_Storage with user_id for audit trail
- Respect RBAC and tenant boundaries
- Redact PII/PHI before LLM processing
- Require approval for high-risk actions
- Validate all LLM outputs with Pydantic
- Authenticate all requests with JWT tokens
- Extract tenant_id ONLY from JWT claims (never from request body)
- Set and reset tenant context for every request
- Delete expired prompts after retention period (respecting legal holds)
- Provide capability disclosure for transparency

### AI Layer MUST NEVER DO
- Direct database writes to core tables
- Schema modifications
- Bypass RBAC or cross-tenant access
- Execute without approval (high-risk)
- Make block decisions via LLM
- Call external LLM APIs
- Accept tenant_id from request body or query parameters
- Store prompts indefinitely without retention policy
- Delete records marked with legal_hold=True
- Operate autonomously without Tool API mediation

## Architecture Diagrams

### JWT Authentication Flow
```
┌─────────────┐                                    ┌─────────────┐
│   Client    │                                    │  AI Layer   │
└──────┬──────┘                                    └──────┬──────┘
       │                                                  │
       │  POST /ai/chat                                   │
       │  Authorization: Bearer <JWT>                     │
       ├─────────────────────────────────────────────────>│
       │                                                  │
       │                                    ┌─────────────┴─────────────┐
       │                                    │ JWT Middleware            │
       │                                    │ 1. Validate signature     │
       │                                    │ 2. Check expiration       │
       │                                    │ 3. Extract tenant_id      │
       │                                    │ 4. Extract user_id        │
       │                                    │ 5. Set tenant context     │
       │                                    └─────────────┬─────────────┘
       │                                                  │
       │                                    ┌─────────────┴─────────────┐
       │                                    │ Chat Router               │
       │                                    │ - Process with tenant     │
       │                                    │   isolation               │
       │                                    │ - Log with user_id        │
       │                                    └─────────────┬─────────────┘
       │                                                  │
       │                                    ┌─────────────┴─────────────┐
       │                                    │ Finally Block             │
       │                                    │ - Reset tenant context    │
       │                                    └─────────────┬─────────────┘
       │                                                  │
       │  Response with request_id                        │
       │<─────────────────────────────────────────────────┤
       │                                                  │
```

### Data Retention Flow
```
┌─────────────────────────────────────────────────────────────────┐
│                     Cron Job (Daily 2 AM UTC)                    │
└─────────────────────────┬───────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│              Data Retention Service                              │
│                                                                   │
│  1. Query: created_at < NOW() - 90 days                          │
│  2. Filter: legal_hold = False                                   │
│  3. Batch delete (single transaction)                            │
│  4. Log: deleted_count, legal_hold_count                         │
│  5. Increment Prometheus metric                                  │
└─────────────────────────┬───────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Database                                    │
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ ai_request                                                │   │
│  │ - id, tenant_id, user_id                                  │   │
│  │ - prompt (encrypted)                                      │   │
│  │ - created_at (indexed)                                    │   │
│  │ - legal_hold (indexed)                                    │   │
│  │ - status, intent_type, intent_confidence                  │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

### Cancellation and Slot-Filling Flow
```
User: "Create a patient"
       │
       ▼
┌─────────────────────────────────────────────────────────────────┐
│ Intent Refiner: ACTION intent detected                           │
└─────────────────────────┬───────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│ Action Planner: Missing parameter "patient_name"                 │
│ Generate slot-filling prompt                                     │
└─────────────────────────┬───────────────────────────────────────┘
                          │
                          ▼
AI: "What is the patient's name?"
       │
       ▼
User: "cancel"  OR  "Ahmet Yılmaz"  OR  [5 min timeout]
       │                 │                      │
       ▼                 ▼                      ▼
┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐
│ CANCEL       │  │ SLOT_FILL    │  │ TIMEOUT              │
│ - Clear ctx  │  │ - Extract    │  │ - Clear ctx          │
│ - Log event  │  │ - Continue   │  │ - Log event          │
│ - Return msg │  │ - Check next │  │ - Return timeout msg │
└──────────────┘  └──────────────┘  └──────────────────────┘
```

## Security Constraints

### AI Layer MUST DO
- Operate through Tool API only
- Log everything to AI_Audit_Storage with user_id for audit trail
- Respect RBAC and tenant boundaries
- Redact PII/PHI before LLM processing
- Require approval for high-risk actions
- Validate all LLM outputs with Pydantic
- Authenticate all requests with JWT tokens
- Extract tenant_id ONLY from JWT claims (never from request body)
- Set and reset tenant context for every request
- Delete expired prompts after retention period (respecting legal holds)
- Provide capability disclosure for transparency

### AI Layer MUST NEVER DO
- Direct database writes to core tables
- Schema modifications
- Bypass RBAC or cross-tenant access
- Execute without approval (high-risk)
- Make block decisions via LLM
- Call external LLM APIs
- Accept tenant_id from request body or query parameters
- Store prompts indefinitely without retention policy
- Delete records marked with legal_hold=True
- Operate autonomously without Tool API mediation


## Troubleshooting

### JWT Authentication Issues

**Problem**: "Missing or invalid authorization token"
- **Cause**: Authorization header is missing or malformed
- **Solution**: Ensure header format is `Authorization: Bearer <token>`

**Problem**: "Token expired or invalid"
- **Cause**: JWT token has expired or signature is invalid
- **Solution**: Refresh the JWT token and retry

**Problem**: "Token missing tenant_id claim"
- **Cause**: JWT token doesn't include tenant_id claim
- **Solution**: Ensure JWT token includes both `tenant_id` and `user_id` claims

### Data Retention Issues

**Problem**: Old prompts not being deleted
- **Cause**: Cron job not running or legal_hold flag set
- **Solution**: 
  - Check cron job is scheduled: `crontab -l`
  - Verify `AI_RETENTION_DAYS` environment variable
  - Check for legal_hold flags: `SELECT COUNT(*) FROM ai_request WHERE legal_hold = true`

**Problem**: Prometheus metric not updating
- **Cause**: Metric not registered or deletion failed
- **Solution**: Check logs for deletion errors, verify Prometheus endpoint

### Cancellation Issues

**Problem**: Cancellation not detected
- **Cause**: Keyword not in CANCELLATION_KEYWORDS list
- **Solution**: Add keyword to `IntentRefiner.CANCELLATION_KEYWORDS`

**Problem**: Context not cleared after cancellation
- **Cause**: ConversationMemory.clear_session() not called
- **Solution**: Verify cancellation handler calls clear_session()

### Slot-Filling Issues

**Problem**: Slot-filling prompt not generated
- **Cause**: Missing parameter not detected or prompt template missing
- **Solution**: 
  - Verify `_get_required_parameters()` returns correct parameters
  - Add prompt template to `_generate_slot_prompt()`

**Problem**: Timeout not working
- **Cause**: `is_expired()` not called or expires_at not set
- **Solution**: Verify ActionPlan includes expires_at timestamp

### Capability Disclosure Issues

**Problem**: No capabilities returned
- **Cause**: User has no permissions or AI_PHASE is too restrictive
- **Solution**: 
  - Verify user permissions in JWT token
  - Check AI_PHASE setting (Phase A only shows read operations)

**Problem**: Capability inquiry not detected
- **Cause**: Phrase not in CAPABILITY_KEYWORDS
- **Solution**: Add phrase to `IntentRefiner.CAPABILITY_KEYWORDS`

### Performance Issues

**Problem**: Slow response times
- **Cause**: LLM inference timeout or database query slow
- **Solution**:
  - Check `AI_MODEL_TIMEOUT_SECONDS` setting
  - Verify database indexes on `created_at` and `legal_hold`
  - Monitor Prometheus metrics for bottlenecks

**Problem**: High memory usage
- **Cause**: Too many conversation histories in memory
- **Solution**: Reduce `max_turns` in conversation memory or implement Redis backend

## Monitoring

### Key Metrics

**Prometheus Metrics**:
- `ai_prompts_deleted_total` - Total prompts deleted by retention service
- `ai_requests_total` - Total AI requests by tenant
- `ai_request_latency_seconds` - Request processing latency
- `ai_errors_total` - Total errors by type

**Log Events**:
- JWT authentication failures (401 errors)
- Cancellation events (with conversation_id)
- Timeout events (with plan_id)
- Data retention deletions (with count)
- Legal hold skips (with count)

**Audit Trail**:
- All AI requests logged with user_id and tenant_id
- Intent classification and confidence scores
- Action plans with risk levels
- Approval/rejection decisions

### Health Checks

**AI Service Health**:
```bash
curl http://localhost:5003/api/ai/status
```

**Database Health**:
```sql
-- Check recent AI requests
SELECT COUNT(*), status FROM ai_request 
WHERE created_at > NOW() - INTERVAL '1 hour'
GROUP BY status;

-- Check legal holds
SELECT COUNT(*) FROM ai_request WHERE legal_hold = true;

-- Check retention policy effectiveness
SELECT COUNT(*) FROM ai_request 
WHERE created_at < NOW() - INTERVAL '90 days';
```

## Migration Guide

### Upgrading from Pre-Security-Fixes Version

1. **Run Database Migration**:
```bash
cd x-ear/apps/api
alembic upgrade head
```

2. **Update Environment Variables**:
```bash
# Add JWT configuration
JWT_SECRET_KEY=your-secret-key
JWT_ALGORITHM=HS256

# Add retention configuration
AI_RETENTION_DAYS=90
```

3. **Update JWT Tokens**:
Ensure all JWT tokens include:
- `tenant_id` claim
- `user_id` claim

4. **Schedule Retention Cron Job**:
```bash
# Add to crontab
0 2 * * * cd /path/to/x-ear/apps/api && python -m ai.tasks.scheduled
```

5. **Verify Integration Tests**:
```bash
pytest tests/ai_tests/test_integration_flows.py -v
```

6. **Monitor Logs**:
Watch for:
- JWT authentication errors
- Data retention execution
- Cancellation events
- Slot-filling flows

## Support

For issues or questions:
1. Check this README for troubleshooting steps
2. Review test files for usage examples
3. Check logs for error details
4. Consult the AI Security Audit findings document

## References

- **AI Security Audit**: `.kiro/specs/ai-security-audit/`
- **Security Fixes Spec**: `.kiro/specs/ai-security-fixes/`
- **Requirements**: `.kiro/specs/ai-security-fixes/requirements.md`
- **Design**: `.kiro/specs/ai-security-fixes/design.md`
- **Tasks**: `.kiro/specs/ai-security-fixes/tasks.md`
