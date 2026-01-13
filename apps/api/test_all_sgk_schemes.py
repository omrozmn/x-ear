#!/usr/bin/env python3
"""
Test script to verify all SGK schemes return correct coverage amounts
"""

import json
import sys
import os

# Add the backend directory to the path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from services.pricing import calculate_device_pricing

def load_settings():
    """Load current settings"""
    with open('current_settings.json', 'r', encoding='utf-8') as f:
        return json.load(f)

def test_sgk_scheme(scheme_name, settings):
    """Test a specific SGK scheme with sample data"""
    print(f"\n=== Testing SGK Scheme: {scheme_name} ===")
    
    # Sample device assignments (bilateral hearing aids)
    device_assignments = [
        {
            'device_id': None,
            'base_price': 55000.0
        },
        {
            'device_id': None,
            'base_price': 55000.0
        }
    ]
    
    try:
        result = calculate_device_pricing(device_assignments, [], [], scheme_name, settings['settings'])
        
        if 'error' in result:
            print(f"❌ ERROR: {result['error']}")
            return False
        
        # Extract scheme info from settings
        scheme_info = settings['settings']['sgk']['schemes'].get(scheme_name, {})
        expected_coverage_per_device = scheme_info.get('coverage_amount', 0)
        expected_max_per_device = scheme_info.get('max_amount', 0)
        scheme_display_name = scheme_info.get('name', scheme_name)
        
        print(f"Scheme Display Name: {scheme_display_name}")
        print(f"Expected Coverage per Device: {expected_coverage_per_device} TL")
        print(f"Expected Max per Device: {expected_max_per_device} TL")
        
        # Check results
        total_sgk_coverage = result.get('sgk_coverage_amount', 0)
        patient_payment = result.get('patient_responsible_amount', 0)
        total_amount = result.get('total_amount', 0)
        
        print(f"Total Amount: {total_amount} TL")
        print(f"Total SGK Coverage: {total_sgk_coverage} TL")
        print(f"Patient Payment: {patient_payment} TL")
        
        # For bilateral devices, total coverage should be 2x coverage_amount (up to max_amount each)
        expected_total_coverage = min(expected_coverage_per_device * 2, expected_max_per_device * 2)
        
        if abs(total_sgk_coverage - expected_total_coverage) < 0.01:
            print(f"✅ SGK Coverage calculation is CORRECT")
            return True
        else:
            print(f"❌ SGK Coverage calculation is INCORRECT")
            print(f"   Expected: {expected_total_coverage} TL")
            print(f"   Got: {total_sgk_coverage} TL")
            return False
            
    except Exception as e:
        print(f"❌ EXCEPTION: {str(e)}")
        return False

def main():
    """Test all SGK schemes"""
    print("Testing all SGK schemes for correct coverage calculations...")
    
    # Load settings
    settings = load_settings()
    
    # Get all SGK schemes
    sgk_schemes = settings.get('settings', {}).get('sgk', {}).get('schemes', {})
    
    if not sgk_schemes:
        print("❌ No SGK schemes found in settings!")
        return
    
    print(f"Found {len(sgk_schemes)} SGK schemes to test:")
    for scheme_name in sgk_schemes.keys():
        print(f"  - {scheme_name}")
    
    # Test each scheme
    results = {}
    for scheme_name in sgk_schemes.keys():
        results[scheme_name] = test_sgk_scheme(scheme_name, settings)
    
    # Summary
    print("\n" + "="*60)
    print("SUMMARY OF ALL SGK SCHEME TESTS")
    print("="*60)
    
    passed = 0
    failed = 0
    
    for scheme_name, success in results.items():
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{scheme_name:<25} {status}")
        if success:
            passed += 1
        else:
            failed += 1
    
    print(f"\nTotal: {len(results)} schemes")
    print(f"Passed: {passed}")
    print(f"Failed: {failed}")
    
    if failed == 0:
        print("\n🎉 All SGK schemes are working correctly!")
    else:
        print(f"\n⚠️  {failed} SGK scheme(s) need attention!")

if __name__ == "__main__":
    main()