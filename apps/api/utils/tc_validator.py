
def validate_tc_number(tc_number):
    """Simple TC number validation - returns (is_valid, error_msg)"""
    if not tc_number or not tc_number.strip():
        return True, None  # Optional field
    
    tc = tc_number.strip()
    
    # Basic length check
    if len(tc) != 11:
        return False, "TC Kimlik No 11 haneli olmalıdır"
    
    # Must be digits only
    if not tc.isdigit():
        return False, "TC Kimlik No sadece rakamlardan oluşmalıdır"
    
    # First digit cannot be 0
    if tc[0] == "0":
        return False, "TC Kimlik No 0 ile başlayamaz"
    
    return True, None
