"""
iyzico Payment Service — Turkey

Supports:
- Subscription management (create, cancel, upgrade)
- Single charge (card payment with installments)
- Marketplace submerchant payments
- Refunds

API: iyzico REST API v2
Docs: https://dev.iyzipay.com/

Environment Variables:
- IYZICO_API_KEY
- IYZICO_SECRET_KEY
- IYZICO_BASE_URL (default: https://api.iyzipay.com)
"""

import hashlib
import base64
import json
import logging
import os
import time
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from dataclasses import dataclass

import requests

logger = logging.getLogger(__name__)


@dataclass
class IyzicoConfig:
    api_key: str
    secret_key: str
    base_url: str

    @classmethod
    def from_env(cls) -> "IyzicoConfig":
        return cls(
            api_key=os.getenv("IYZICO_API_KEY", ""),
            secret_key=os.getenv("IYZICO_SECRET_KEY", ""),
            base_url=os.getenv("IYZICO_BASE_URL", "https://api.iyzipay.com"),
        )

    @classmethod
    def from_tenant_settings(cls, settings: dict) -> "IyzicoConfig":
        iyzico = settings.get("iyzico", {})
        return cls(
            api_key=iyzico.get("api_key", os.getenv("IYZICO_API_KEY", "")),
            secret_key=iyzico.get("secret_key", os.getenv("IYZICO_SECRET_KEY", "")),
            base_url=iyzico.get("base_url", os.getenv("IYZICO_BASE_URL", "https://api.iyzipay.com")),
        )


class IyzicoService:
    """iyzico payment gateway service for Turkey."""

    def __init__(self, config: Optional[IyzicoConfig] = None):
        self.config = config or IyzicoConfig.from_env()

    def _generate_auth_header(self, uri: str, body: str = "") -> Dict[str, str]:
        """Generate iyzico v2 authorization header."""
        random_key = hashlib.md5(str(time.time()).encode()).hexdigest()[:8]
        payload = random_key + uri + body
        signature = base64.b64encode(
            hashlib.sha256((self.config.secret_key + payload).encode()).digest()
        ).decode()
        auth_value = f"IYZWSv2 {base64.b64encode(f'{self.config.api_key}:{random_key}:{signature}'.encode()).decode()}"
        return {
            "Authorization": auth_value,
            "Content-Type": "application/json",
            "x-iyzi-rnd": random_key,
        }

    def _post(self, path: str, data: dict) -> dict:
        """Make authenticated POST request to iyzico."""
        url = f"{self.config.base_url}{path}"
        body = json.dumps(data)
        headers = self._generate_auth_header(path, body)
        try:
            resp = requests.post(url, data=body, headers=headers, timeout=30)
            return resp.json()
        except Exception as e:
            logger.error(f"iyzico API error: {e}")
            return {"status": "failure", "errorMessage": str(e)}

    # ─── Subscription ──────────────────────────────────────────────

    def create_subscription(
        self,
        plan_id: str,
        customer_email: str,
        customer_name: str,
        card_token: str,
        billing_address: Optional[Dict] = None,
    ) -> Dict[str, Any]:
        """Create a recurring subscription via iyzico."""
        data = {
            "locale": "tr",
            "pricingPlanReferenceCode": plan_id,
            "subscriptionInitialStatus": "ACTIVE",
            "customer": {
                "name": customer_name.split()[0] if customer_name else "",
                "surname": customer_name.split()[-1] if customer_name else "",
                "email": customer_email,
                "gsmNumber": "",
                "identityNumber": "11111111111",
                "shippingContactName": customer_name,
                "shippingCity": billing_address.get("city", "Istanbul") if billing_address else "Istanbul",
                "shippingCountry": "Turkey",
                "shippingAddress": billing_address.get("address", "") if billing_address else "",
                "billingContactName": customer_name,
                "billingCity": billing_address.get("city", "Istanbul") if billing_address else "Istanbul",
                "billingCountry": "Turkey",
                "billingAddress": billing_address.get("address", "") if billing_address else "",
            },
            "paymentCard": {"cardToken": card_token},
        }
        return self._post("/v2/subscription/initialize", data)

    def cancel_subscription(self, subscription_reference: str) -> Dict[str, Any]:
        """Cancel an active subscription."""
        return self._post("/v2/subscription/cancel", {
            "locale": "tr",
            "subscriptionReferenceCode": subscription_reference,
        })

    def upgrade_subscription(self, subscription_reference: str, new_plan_id: str) -> Dict[str, Any]:
        """Upgrade/downgrade subscription to a new plan."""
        return self._post("/v2/subscription/upgrade", {
            "locale": "tr",
            "subscriptionReferenceCode": subscription_reference,
            "newPricingPlanReferenceCode": new_plan_id,
        })

    def get_subscription(self, subscription_reference: str) -> Dict[str, Any]:
        """Get subscription details."""
        return self._post("/v2/subscription/details", {
            "locale": "tr",
            "subscriptionReferenceCode": subscription_reference,
        })

    # ─── Pricing Plans ─────────────────────────────────────────────

    def create_pricing_plan(
        self,
        name: str,
        price: float,
        currency: str = "TRY",
        interval: str = "MONTHLY",
        trial_days: int = 0,
    ) -> Dict[str, Any]:
        """Create a pricing plan for subscriptions."""
        return self._post("/v2/subscription/pricing-plan", {
            "locale": "tr",
            "name": name,
            "price": str(price),
            "currencyCode": currency,
            "paymentInterval": interval,
            "paymentIntervalCount": 1,
            "trialPeriodDays": trial_days,
            "planPaymentType": "RECURRING",
        })

    # ─── Single Charge ─────────────────────────────────────────────

    def create_payment(
        self,
        amount: float,
        currency: str,
        card_token: str,
        buyer_id: str,
        buyer_name: str,
        buyer_email: str,
        installment: int = 1,
        basket_items: Optional[List[Dict]] = None,
    ) -> Dict[str, Any]:
        """Process a single card payment."""
        data = {
            "locale": "tr",
            "price": str(amount),
            "paidPrice": str(amount),
            "currency": currency,
            "installment": str(installment),
            "paymentChannel": "WEB",
            "paymentGroup": "PRODUCT",
            "paymentCard": {"cardToken": card_token},
            "buyer": {
                "id": buyer_id,
                "name": buyer_name.split()[0],
                "surname": buyer_name.split()[-1] if len(buyer_name.split()) > 1 else buyer_name,
                "email": buyer_email,
                "identityNumber": "11111111111",
                "registrationAddress": "Istanbul",
                "city": "Istanbul",
                "country": "Turkey",
            },
            "basketItems": basket_items or [
                {"id": "BI001", "name": "Subscription", "category1": "SaaS",
                 "itemType": "VIRTUAL", "price": str(amount)}
            ],
        }
        return self._post("/payment/auth", data)

    # ─── Refund ────────────────────────────────────────────────────

    def refund(self, payment_id: str, amount: float, currency: str = "TRY") -> Dict[str, Any]:
        """Process a refund."""
        return self._post("/payment/refund", {
            "locale": "tr",
            "paymentTransactionId": payment_id,
            "price": str(amount),
            "currency": currency,
        })

    # ─── Marketplace (Submerchant) ─────────────────────────────────

    def create_submerchant(
        self,
        external_id: str,
        name: str,
        email: str,
        iban: str,
        identity_number: str = "11111111111",
        submerchant_type: str = "PERSONAL",
    ) -> Dict[str, Any]:
        """Register a tenant as iyzico submerchant for marketplace payments."""
        return self._post("/onboarding/submerchant", {
            "locale": "tr",
            "subMerchantExternalId": external_id,
            "subMerchantType": submerchant_type,
            "contactName": name.split()[0],
            "contactSurname": name.split()[-1] if len(name.split()) > 1 else name,
            "email": email,
            "iban": iban,
            "identityNumber": identity_number,
            "address": "Turkey",
            "currency": "TRY",
        })
