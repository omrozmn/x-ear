
import asyncio
import time
import sys
import os

# Add project root to path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '../..')))

from apps.api.ai.agents.intent_refiner import get_intent_refiner
from apps.api.ai.agents.action_planner import get_action_planner
from apps.api.ai.schemas.llm_outputs import IntentType

async def benchmark():
    print("🚀 Starting AI Layer Benchmark (7B Model)...")
    print("-" * 50)
    
    tenant_id = "bench_tenant"
    user_id = "bench_user"
    user_message = "Create new patient Ahmet Mehmet 5551234567"
    
    # 1. Benchmark Intent Refiner
    print(f"\n1️⃣  Testing Intent Refiner (Layer 1)...")
    start = time.time()
    try:
        refiner = get_intent_refiner()
        intent_result = await refiner.refine_intent(
            user_message=user_message,
            tenant_id=tenant_id,
            user_id=user_id
        )
        duration_intent = time.time() - start
        print(f"✅ Intent Refiner finished in {duration_intent:.2f}s")
        print(f"   Intent: {intent_result.intent.intent_type.value}")
        print(f"   Confidence: {intent_result.intent.confidence}")
    except Exception as e:
        print(f"❌ Intent Refiner failed: {e}")
        return

    # 2. Benchmark Action Planner
    print(f"\n2️⃣  Testing Action Planner (Layer 2)...")
    start = time.time()
    try:
        if intent_result.intent.intent_type == IntentType.ACTION:
            planner = get_action_planner()
            plan_result = await planner.create_plan(
                intent=intent_result.intent,
                tenant_id=tenant_id,
                user_id=user_id,
                user_permissions={"create_patient"}
            )
            duration_plan = time.time() - start
            print(f"✅ Action Planner finished in {duration_plan:.2f}s")
            print(f"   Steps: {len(plan_result.plan.steps) if plan_result.plan else 0}")
        else:
            print("⏭️  Skipping Planner (Intent was not ACTION)")
            duration_plan = 0
    except Exception as e:
        print(f"❌ Action Planner failed: {e}")
        return
        
    print("-" * 50)
    print(f"\n📊 Summary:")
    print(f"   Intent Refiner: {duration_intent:.2f}s")
    print(f"   Action Planner: {duration_plan:.2f}s")
    print(f"   Total AI Time:  {duration_intent + duration_plan:.2f}s")
    
    if duration_intent > 10:
        print("\n⚠️  Bottleneck Analysis:")
        print("   Intent Refiner is slow. This is likely purely model inference time on CPU.")
    
    if duration_plan > 10:
        print("   Action Planner is slow. Complex reasoning tasks take longer on 7B models.")

if __name__ == "__main__":
    asyncio.run(benchmark())
