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
    └── kill_switch.py    # Kill switch management
```

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
```

## Phases

- **Phase A (Read-Only)**: Suggestions only, no execution endpoints
- **Phase B (Proposal)**: Proposals with approval gates
- **Phase C (Execution)**: Approved actions via Tool API allowlist

## Security Constraints

### AI Layer MUST DO
- Operate through Tool API only
- Log everything to AI_Audit_Storage
- Respect RBAC and tenant boundaries
- Redact PII/PHI before LLM processing
- Require approval for high-risk actions
- Validate all LLM outputs with Pydantic

### AI Layer MUST NEVER DO
- Direct database writes to core tables
- Schema modifications
- Bypass RBAC or cross-tenant access
- Execute without approval (high-risk)
- Make block decisions via LLM
- Call external LLM APIs
