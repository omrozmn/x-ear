from ai.agents.intent_refiner import IntentRefiner, IntentType

def test_intent_followup_confirmations():
    refiner = IntentRefiner()
    
    # Simulate context with a pending plan
    context = {
        "conversation_history": [
            {
                "role": "user",
                "content": "cihaz ata"
            },
            {
                "role": "assistant",
                "content": "Cihaz atama işlemi için hazırlık yapıyorum.",
                "entities": {
                    "action_type": "device_assign",
                    "pending_plan_id": "plan_123"
                }
            }
        ]
    }
    
    # Test "ee"
    result = refiner.classify_without_llm("ee", context=context)
    assert result.intent_type == IntentType.ACTION
    assert result.entities.get("confirm_plan") == "plan_123"
    assert result.entities.get("action_type") == "device_assign"
    
    # Test "et"
    result = refiner.classify_without_llm("et", context=context)
    assert result.intent_type == IntentType.ACTION
    assert result.entities.get("confirm_plan") == "plan_123"
    
    # Test "devam"
    result = refiner.classify_without_llm("devam", context=context)
    assert result.intent_type == IntentType.ACTION
    assert result.entities.get("confirm_plan") == "plan_123"

def test_intent_followup_without_plan_id():
    refiner = IntentRefiner()
    
    # Simulate context with just a last action but no plan ID
    context = {
        "conversation_history": [
            {
                "role": "assistant",
                "entities": {
                    "action_type": "sale_create"
                }
            }
        ]
    }
    
    result = refiner.classify_without_llm("devam et", context=context)
    assert result.intent_type == IntentType.ACTION
    assert result.entities.get("action_type") == "sale_create"
    assert "confirm_plan" not in result.entities
