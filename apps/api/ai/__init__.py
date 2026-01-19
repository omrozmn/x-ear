"""
AI Layer - Horizontal Platform Component

This module provides intelligent assistance across the xear multi-product monorepo.
The AI Layer processes requests through a three-agent pipeline:
- Intent Refiner (Agent A): Parses and sanitizes user input
- Action Planner (Agent B): Generates action plans with risk analysis
- Executor (Agent C): Simulates and executes approved actions

Key Principles:
- Complete isolation from core business logic
- Fail-safe by default (system works 100% without AI)
- Human-in-the-loop for high-risk actions
- Deterministic guardrails (LLM reasons, Policy Engine decides)
- Bounded capabilities via Tool API allowlist
- Self-hosted models only (no external LLM APIs)

Location: apps/api/ai/
"""

__version__ = "0.1.0"
__all__ = []
