import sys
import os

# Add apps/backend to sys.path
sys.path.append(os.path.join(os.getcwd(), "apps/backend"))

from ai.capability_registry import get_all_capabilities
from ai.tools import get_tool_registry

def analyze_coverage():
    registry = get_tool_registry()
    capabilities = get_all_capabilities()
    
    # Get all registered tools
    registered_tools = {t['toolId'] for t in registry.list_tools(allowed_only=False)}
    allowlisted_tools = {t['toolId'] for t in registry.list_tools(allowed_only=True)}
    
    print("=" * 60)
    print("AI LAYER COVERAGE ANALYSIS")
    print("=" * 60)
    print(f"Total Registered Tools: {len(registered_tools)}")
    print(f"Total Allowlisted Tools: {len(allowlisted_tools)}")
    print(f"Total Capabilities: {len(capabilities)}")
    print("-" * 60)
    
    # 1. Intent -> Operator Mapping Table
    print("\n[1] Intent -> Tool Mapping Table")
    print(f"{'Capability Name':<30} | {'Tool Operations'}")
    print("-" * 60)
    
    mapped_tools = set()
    for cap in capabilities:
        tools_str = ", ".join(cap.tool_operations)
        print(f"{cap.name:<30} | {tools_str}")
        mapped_tools.update(cap.tool_operations)
    
    # 2. Identify Gaps
    print("\n[2] Gap Analysis")
    
    # Tools in capabilities but not registered
    missing_tools = mapped_tools - registered_tools
    if missing_tools:
        print(f"CRITICAL: Tools mentioned in capabilities but NOT REGISTERED: {missing_tools}")
    else:
        print("PASS: All tools mentioned in capabilities are registered.")
        
    # Registered tools not in any capability
    unused_tools = registered_tools - mapped_tools
    if unused_tools:
        print(f"WARNING: Registered tools NOT mapped to any capability: {unused_tools}")
    else:
        print("PASS: All registered tools are mapped to at least one capability.")
        
    # Tools registered but not allowlisted
    internal_tools = registered_tools - allowlisted_tools
    if internal_tools:
        print(f"NOTE: Tools registered but NOT allowlisted (Internal): {internal_tools}")
        
    # 3. Conflict Analysis
    print("\n[3] Conflict & Risk Analysis")
    
    # Check for same tool operation used in different categories (potential risk)
    tool_to_caps = {}
    for cap in capabilities:
        for tool in cap.tool_operations:
            if tool not in tool_to_caps:
                tool_to_caps[tool] = []
            tool_to_caps[tool].append(cap.category)
            
    overlapping_risks = {t: cats for t, cats in tool_to_caps.items() if len(set(cats)) > 1}
    if overlapping_risks:
        print(f"CAUTION: Tools mapped across multiple categories: {overlapping_risks}")
    else:
        print("PASS: No cross-category tool overlaps found.")

    print("\n" + "=" * 60)

if __name__ == "__main__":
    analyze_coverage()
