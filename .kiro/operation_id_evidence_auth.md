# OperationId Evidence — Auth Router

Source file: [x-ear/apps/api/routers/auth.py](x-ear/apps/api/routers/auth.py)

Below are the exact router decorator lines and function signatures extracted from the auth router. These serve as canonical evidence linking OpenAPI `operationId`s to backend implementations.

- `createAuthLookupPhone`
```
@router.post("/auth/lookup-phone", operation_id="createAuthLookupPhone", response_model=ResponseEnvelope[LookupPhoneResponse])
def lookup_phone(
    request_data: LookupPhoneRequest,
    db_session: Session = Depends(get_db)
):
```

- `createAuthForgotPassword`
```
@router.post("/auth/forgot-password", operation_id="createAuthForgotPassword", response_model=ResponseEnvelope[MessageResponse])
def forgot_password(
    request_data: ForgotPasswordRequest,
    db_session: Session = Depends(get_db)
):
```

- `createAuthVerifyOtp`
```
@router.post("/auth/verify-otp", operation_id="createAuthVerifyOtp", response_model=ResponseEnvelope[VerifyOtpResponse])
def verify_otp(
    request_data: VerifyOtpRequest,
    authorization: Optional[str] = None,
    db_session: Session = Depends(get_db)
):
```

- `createAuthResetPassword`
```
@router.post("/auth/reset-password", operation_id="createAuthResetPassword", response_model=ResponseEnvelope[ResetPasswordResponse])
def reset_password(
    request_data: ResetPasswordRequest,
    db_session: Session = Depends(get_db)
):
```

- `createAuthLogin`
```
@router.post("/auth/login", operation_id="createAuthLogin", response_model=ResponseEnvelope[LoginResponse])
def login(
    request_data: LoginRequest,
    db_session: Session = Depends(get_db)
):
```

- `createAuthRefresh`
```
@router.post("/auth/refresh", operation_id="createAuthRefresh", response_model=ResponseEnvelope[RefreshTokenResponse])
def refresh_token(
    authorization: str = Depends(oauth2_scheme),
    db_session: Session = Depends(get_db)
):
```

- `getAuthMe`
```
@router.get("/auth/me", operation_id="getAuthMe", response_model=ResponseEnvelope[Union[AuthUserRead, AdminUserRead]])
def get_current_user(
    authorization: str = Depends(oauth2_scheme),
    db_session: Session = Depends(get_db)
):
```

- `createAuthSendVerificationOtp`
```
@router.post("/auth/send-verification-otp", operation_id="createAuthSendVerificationOtp", response_model=ResponseEnvelope[MessageResponse])
def send_verification_otp(
    request_data: SendVerificationOtpRequest,
    authorization: str = Depends(oauth2_scheme),
    db_session: Session = Depends(get_db)
):
```

- `createAuthSetPassword`
```
@router.post("/auth/set-password", operation_id="createAuthSetPassword", response_model=ResponseEnvelope[MessageResponse])
def set_password(
    request_data: SetPasswordRequest,
    authorization: str = Depends(oauth2_scheme),
    db_session: Session = Depends(get_db)
):
```

Note: There is also a test-only endpoint `toggle_verification` in this router (`include_in_schema=False`) which has no `operation_id` and is excluded from OpenAPI schema.
