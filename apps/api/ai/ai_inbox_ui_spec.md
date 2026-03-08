# AI Inbox UI Specification (v2)

The AI Inbox is the **discovery layer** for proactive opportunities.

## 🎴 Insight Card Component (Refined)

### 📊 Scoring & Importance
- **Confidence Badge**: Numerical % or progress bar (Color: Blue-to-Green).
- **Impact Badge**: Numerical or semantic label (Color: Yellow-to-Red).
- **Urgency/Priority**: Visual indicator (Icon: Flame/Clock).

### 📖 Explainability Block
- **Explanation List**: Renders the `explanation` array as bullet points.
- **Evidence Table**: Key-value pairs from the `evidence` object for transparency.

### 🔄 Lifecycle & Actions
- **New/Visible**: Default state with "Acknowledge" or "Action" buttons.
- **Alternative Actions**: Dropdown menu if `alternative_capabilities` are available.
- **Progress Tracking**: Shows when an action is "In Progress" (ActionPlan execution).

## 💬 Chatbot Integration
- **Deep Link**: "Explain in Chat" button opens the composer with:
  `@ai explain opportunity:opp_123`
- **Context Injection**: When discussing an opportunity, the sidebar shows relevant evidence.

## 🧩 Refined API Contracts

### 📋 List View (`GET /ai/opportunities`)
Fast/lightweight payload for the inbox feed.
```json
{
  "items": [
    {
      "id": "opp_123",
      "scope": "single",
      "title": "Stock Alert: PowerOne 13",
      "priority": "high",
      "state": "NEW",
      "confidence_score": 0.95,
      "impact_score": 0.88,
      "recommended_action_label": "Create Draft PO",
      "is_acknowledged": false,
      "is_stale": false
    }
  ]
}
```

### 🔍 Detail View (`GET /ai/opportunities/{id}`)
Comprehensive payload for the insight modal.
```json
{
  "id": "opp_123",
  "why_now": "Sales spike detected in Branch A",
  "explanation": ["Stock is critically below reorder trajectory"],
  "evidence": { "available": 24, "reorder_level": 20 },
  "recommended_capability": "create_purchase_order_draft",
  "recommended_action_label": "Create Draft PO",
  "alternative_actions": [
    { "capability": "notify_manager", "label": "Notify Manager" }
  ],
  "action_status": {
    "mode": "SIMULATE",
    "status": "READY_FOR_APPROVAL",
    "plan_id": "plan_789",
    "approval_required": true
  },
  "user_decision_options": ["acknowledge", "dismiss", "simulate", "open_in_chat"]
}
```
