"""
Türkçe hata mesajları - Error message translations
"""

ERROR_MESSAGES = {
    # Auth errors
    "MISSING_CREDENTIALS": "Kullanıcı adı/e-posta/telefon ve şifre gereklidir",
    "INVALID_CREDENTIALS": "Geçersiz kullanıcı adı veya şifre",
    "ACCOUNT_INACTIVE": "Hesap aktif değil",
    "USER_NOT_FOUND": "Kullanıcı bulunamadı",
    "PHONE_NOT_REGISTERED": "Kayıtlı telefon numarası bulunamadı",
    
    # OTP errors
    "MISSING_PARAMS": "Gerekli parametreler eksik",
    "OTP_EXPIRED": "Doğrulama kodu geçersiz veya süresi dolmuş",
    "INVALID_OTP": "Geçersiz doğrulama kodu",
    "SMS_FAILED": "SMS gönderilemedi",
    
    # Token errors
    "TOKEN_EXPIRED": "Oturum süresi doldu",
    "INVALID_TOKEN": "Geçersiz token",
    "NO_REFRESH_TOKEN": "Yenileme token'ı bulunamadı",
    
    # Generic errors
    "INTERNAL_ERROR": "Bir hata oluştu. Lütfen tekrar deneyin",
    "VALIDATION_ERROR": "Geçersiz veri",
    "PERMISSION_DENIED": "Bu işlem için yetkiniz yok",
    "NOT_FOUND": "Kayıt bulunamadı",
}

def get_error_message(code: str, default: str = None) -> str:
    """Get Turkish error message by code"""
    return ERROR_MESSAGES.get(code, default or ERROR_MESSAGES["INTERNAL_ERROR"])
