"""
Unified Payment Gateway

Routes payment operations to the correct provider based on tenant's country_code.

Country → Provider mapping:
  TR         → iyzico (subscription) + PayTR (POS)
  US, GB     → Stripe
  DE, FR     → Stripe
  SA, AE     → Tap Payments

Usage:
    gateway = PaymentGateway(db, tenant_id)
    result = gateway.create_subscription(plan_id, customer_email, ...)
"""

import logging
from typing import Any, Dict, Optional
from dataclasses import dataclass
from sqlalchemy.orm import Session

logger = logging.getLogger(__name__)


# Country → Provider mapping
COUNTRY_PROVIDER = {
    "TR": "iyzico",
    "US": "stripe",
    "GB": "stripe",
    "DE": "stripe",
    "FR": "stripe",
    "SA": "tap",
    "AE": "tap",
}

# Currency by country
COUNTRY_CURRENCY = {
    "TR": "TRY", "US": "USD", "GB": "GBP",
    "DE": "EUR", "FR": "EUR", "SA": "SAR", "AE": "AED",
}


@dataclass
class PaymentResult:
    """Unified payment result."""
    success: bool
    provider: str
    subscription_id: Optional[str] = None
    payment_id: Optional[str] = None
    status: Optional[str] = None
    redirect_url: Optional[str] = None
    client_secret: Optional[str] = None
    error: Optional[str] = None
    raw: Optional[Dict] = None


class PaymentGateway:
    """Unified payment gateway — routes to correct provider by country."""

    def __init__(self, db: Session, tenant_id: str):
        self.db = db
        self.tenant_id = tenant_id
        self._tenant = None
        self._provider_name = None
        self._country = None
        self._currency = None

    @property
    def tenant(self):
        if not self._tenant:
            from models.tenant import Tenant
            self._tenant = self.db.query(Tenant).filter(Tenant.id == self.tenant_id).first()
        return self._tenant

    @property
    def country(self) -> str:
        if not self._country:
            self._country = getattr(self.tenant, 'country_code', 'TR') or 'TR'
        return self._country

    @property
    def currency(self) -> str:
        if not self._currency:
            self._currency = COUNTRY_CURRENCY.get(self.country, "TRY")
        return self._currency

    @property
    def provider_name(self) -> str:
        if not self._provider_name:
            self._provider_name = COUNTRY_PROVIDER.get(self.country, "stripe")
        return self._provider_name

    def _get_provider(self):
        """Get the correct payment provider service."""
        if self.provider_name == "iyzico":
            from services.iyzico_service import IyzicoService, IyzicoConfig
            settings = self.tenant.settings or {} if self.tenant else {}
            config = IyzicoConfig.from_tenant_settings(settings)
            return IyzicoService(config)
        elif self.provider_name == "stripe":
            from services.stripe_service import StripeService
            return StripeService()
        elif self.provider_name == "tap":
            from services.tap_service import TapService
            return TapService()
        else:
            raise ValueError(f"Unknown provider: {self.provider_name}")

    # ─── Subscription ──────────────────────────────────────────────

    def create_subscription(
        self,
        plan_id: str,
        customer_email: str,
        customer_name: str,
        payment_token: Optional[str] = None,
        trial_days: int = 0,
    ) -> PaymentResult:
        """Create a subscription using the tenant's payment provider."""
        try:
            provider = self._get_provider()

            if self.provider_name == "iyzico":
                result = provider.create_subscription(
                    plan_id=plan_id,
                    customer_email=customer_email,
                    customer_name=customer_name,
                    card_token=payment_token or "",
                )
                return PaymentResult(
                    success=result.get("status") != "failure",
                    provider="iyzico",
                    subscription_id=result.get("referenceCode"),
                    status=result.get("subscriptionStatus"),
                    raw=result,
                )

            elif self.provider_name == "stripe":
                # First create customer if needed
                cust = provider.create_customer(customer_email, customer_name, {"tenant_id": self.tenant_id})
                sub = provider.create_subscription(
                    customer_id=cust["customer_id"],
                    price_id=plan_id,
                    trial_days=trial_days,
                    payment_method_id=payment_token,
                )
                return PaymentResult(
                    success=sub.get("status") in ("active", "trialing", "incomplete"),
                    provider="stripe",
                    subscription_id=sub.get("subscription_id"),
                    status=sub.get("status"),
                    client_secret=sub.get("client_secret"),
                    raw=sub,
                )

            elif self.provider_name == "tap":
                cust = provider.create_customer(customer_email, customer_name, country=self.country)
                sub = provider.create_subscription(
                    plan_amount=0,  # Will be set from plan lookup
                    currency=self.currency,
                    customer_id=cust["customer_id"],
                    trial_days=trial_days,
                )
                return PaymentResult(
                    success=sub.get("status") != "error",
                    provider="tap",
                    subscription_id=sub.get("subscription_id"),
                    status=sub.get("status"),
                    raw=sub,
                )

        except Exception as e:
            logger.error(f"Subscription creation failed ({self.provider_name}): {e}")
            return PaymentResult(success=False, provider=self.provider_name, error=str(e))

    def cancel_subscription(self, subscription_id: str) -> PaymentResult:
        """Cancel a subscription."""
        try:
            provider = self._get_provider()
            if self.provider_name == "iyzico":
                result = provider.cancel_subscription(subscription_id)
            elif self.provider_name == "stripe":
                result = provider.cancel_subscription(subscription_id)
            elif self.provider_name == "tap":
                result = provider.cancel_subscription(subscription_id)
            else:
                return PaymentResult(success=False, provider=self.provider_name, error="Unknown provider")

            return PaymentResult(
                success=True, provider=self.provider_name,
                subscription_id=subscription_id, status="cancelled", raw=result,
            )
        except Exception as e:
            return PaymentResult(success=False, provider=self.provider_name, error=str(e))

    # ─── Single Charge ─────────────────────────────────────────────

    def charge(
        self,
        amount: float,
        customer_email: str,
        customer_name: str,
        payment_token: Optional[str] = None,
        description: str = "",
        redirect_url: str = "",
    ) -> PaymentResult:
        """Process a single payment charge."""
        try:
            provider = self._get_provider()

            if self.provider_name == "iyzico":
                result = provider.create_payment(
                    amount=amount, currency=self.currency,
                    card_token=payment_token or "",
                    buyer_id=self.tenant_id, buyer_name=customer_name,
                    buyer_email=customer_email,
                )
                return PaymentResult(
                    success=result.get("status") == "success",
                    provider="iyzico", payment_id=result.get("paymentId"),
                    status=result.get("status"), raw=result,
                )

            elif self.provider_name == "stripe":
                amount_cents = int(amount * 100)
                result = provider.create_payment_intent(
                    amount=amount_cents, currency=self.currency,
                    payment_method_id=payment_token,
                    metadata={"tenant_id": self.tenant_id, "description": description},
                )
                return PaymentResult(
                    success=result.get("status") in ("succeeded", "requires_action"),
                    provider="stripe", payment_id=result.get("payment_intent_id"),
                    status=result.get("status"), client_secret=result.get("client_secret"),
                    raw=result,
                )

            elif self.provider_name == "tap":
                result = provider.create_charge(
                    amount=amount, currency=self.currency,
                    redirect_url=redirect_url, description=description,
                )
                return PaymentResult(
                    success=result.get("status") not in ("error", "FAILED"),
                    provider="tap", payment_id=result.get("charge_id"),
                    status=result.get("status"),
                    redirect_url=result.get("redirect_url"),
                    raw=result,
                )

        except Exception as e:
            return PaymentResult(success=False, provider=self.provider_name, error=str(e))

    # ─── Refund ────────────────────────────────────────────────────

    def refund(self, payment_id: str, amount: Optional[float] = None) -> PaymentResult:
        """Process a refund."""
        try:
            provider = self._get_provider()
            if self.provider_name == "iyzico":
                result = provider.refund(payment_id, amount or 0, self.currency)
            elif self.provider_name == "stripe":
                result = provider.refund(payment_id, int(amount * 100) if amount else None)
            elif self.provider_name == "tap":
                result = provider.refund(payment_id, amount or 0, self.currency)
            else:
                return PaymentResult(success=False, provider=self.provider_name, error="Unknown provider")

            return PaymentResult(
                success=True, provider=self.provider_name,
                payment_id=payment_id, status="refunded", raw=result,
            )
        except Exception as e:
            return PaymentResult(success=False, provider=self.provider_name, error=str(e))

    # ─── Info ──────────────────────────────────────────────────────

    def get_provider_info(self) -> Dict[str, Any]:
        """Get current provider info for this tenant."""
        return {
            "tenant_id": self.tenant_id,
            "country": self.country,
            "currency": self.currency,
            "provider": self.provider_name,
            "supported_methods": self._get_supported_methods(),
        }

    def _get_supported_methods(self) -> list:
        methods = {
            "iyzico": ["credit_card", "debit_card", "installment"],
            "stripe": ["credit_card", "debit_card", "bank_transfer", "apple_pay", "google_pay"],
            "tap": ["credit_card", "debit_card", "mada", "apple_pay"],
        }
        return methods.get(self.provider_name, ["credit_card"])
