"""
Stripe Payment Service — US, UK, EU

Supports:
- Stripe Billing (subscriptions with auto-renewal)
- Stripe Connect (marketplace/platform payments)
- Charges, refunds, invoices
- Webhook handling

Environment Variables:
- STRIPE_SECRET_KEY
- STRIPE_WEBHOOK_SECRET
- STRIPE_CONNECT_CLIENT_ID (for marketplace)
"""

import logging
import os
from typing import Any, Dict, List, Optional

logger = logging.getLogger(__name__)


def _get_stripe():
    """Lazy import stripe SDK."""
    try:
        import stripe
        stripe.api_key = os.getenv("STRIPE_SECRET_KEY", "")
        return stripe
    except ImportError:
        raise ImportError("stripe package required: pip install stripe")


class StripeService:
    """Stripe payment gateway for US/EU markets."""

    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key or os.getenv("STRIPE_SECRET_KEY", "")

    def _stripe(self):
        stripe = _get_stripe()
        if self.api_key:
            stripe.api_key = self.api_key
        return stripe

    # ─── Customers ─────────────────────────────────────────────────

    def create_customer(self, email: str, name: str, metadata: Optional[Dict] = None) -> Dict[str, Any]:
        """Create a Stripe customer."""
        stripe = self._stripe()
        customer = stripe.Customer.create(
            email=email, name=name,
            metadata=metadata or {},
        )
        return {"customer_id": customer.id, "email": email}

    # ─── Subscriptions ─────────────────────────────────────────────

    def create_subscription(
        self,
        customer_id: str,
        price_id: str,
        trial_days: int = 0,
        payment_method_id: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Create a subscription with Stripe Billing."""
        stripe = self._stripe()
        params = {
            "customer": customer_id,
            "items": [{"price": price_id}],
            "payment_behavior": "default_incomplete",
            "expand": ["latest_invoice.payment_intent"],
        }
        if trial_days > 0:
            params["trial_period_days"] = trial_days
        if payment_method_id:
            params["default_payment_method"] = payment_method_id

        sub = stripe.Subscription.create(**params)
        return {
            "subscription_id": sub.id,
            "status": sub.status,
            "current_period_end": sub.current_period_end,
            "client_secret": sub.latest_invoice.payment_intent.client_secret if sub.latest_invoice and sub.latest_invoice.payment_intent else None,
        }

    def cancel_subscription(self, subscription_id: str, at_period_end: bool = True) -> Dict[str, Any]:
        """Cancel a subscription."""
        stripe = self._stripe()
        if at_period_end:
            sub = stripe.Subscription.modify(subscription_id, cancel_at_period_end=True)
        else:
            sub = stripe.Subscription.delete(subscription_id)
        return {"subscription_id": sub.id, "status": sub.status, "cancel_at_period_end": sub.cancel_at_period_end}

    def update_subscription(self, subscription_id: str, new_price_id: str) -> Dict[str, Any]:
        """Upgrade/downgrade a subscription."""
        stripe = self._stripe()
        sub = stripe.Subscription.retrieve(subscription_id)
        updated = stripe.Subscription.modify(
            subscription_id,
            items=[{"id": sub["items"]["data"][0].id, "price": new_price_id}],
            proration_behavior="create_prorations",
        )
        return {"subscription_id": updated.id, "status": updated.status}

    def get_subscription(self, subscription_id: str) -> Dict[str, Any]:
        """Get subscription details."""
        stripe = self._stripe()
        sub = stripe.Subscription.retrieve(subscription_id)
        return {
            "subscription_id": sub.id, "status": sub.status,
            "current_period_start": sub.current_period_start,
            "current_period_end": sub.current_period_end,
            "cancel_at_period_end": sub.cancel_at_period_end,
        }

    # ─── Prices (Plans) ────────────────────────────────────────────

    def create_price(
        self, product_id: str, amount: int, currency: str, interval: str = "month",
    ) -> Dict[str, Any]:
        """Create a recurring price."""
        stripe = self._stripe()
        price = stripe.Price.create(
            product=product_id, unit_amount=amount,
            currency=currency.lower(),
            recurring={"interval": interval},
        )
        return {"price_id": price.id, "amount": amount, "currency": currency}

    def create_product(self, name: str, description: str = "") -> Dict[str, Any]:
        """Create a Stripe product."""
        stripe = self._stripe()
        product = stripe.Product.create(name=name, description=description)
        return {"product_id": product.id, "name": name}

    # ─── Single Charge ─────────────────────────────────────────────

    def create_payment_intent(
        self, amount: int, currency: str, customer_id: Optional[str] = None,
        payment_method_id: Optional[str] = None, metadata: Optional[Dict] = None,
    ) -> Dict[str, Any]:
        """Create a PaymentIntent for a single charge."""
        stripe = self._stripe()
        params = {
            "amount": amount, "currency": currency.lower(),
            "metadata": metadata or {},
        }
        if customer_id:
            params["customer"] = customer_id
        if payment_method_id:
            params["payment_method"] = payment_method_id
            params["confirm"] = True
        intent = stripe.PaymentIntent.create(**params)
        return {
            "payment_intent_id": intent.id, "status": intent.status,
            "client_secret": intent.client_secret,
        }

    # ─── Refund ────────────────────────────────────────────────────

    def refund(self, payment_intent_id: str, amount: Optional[int] = None) -> Dict[str, Any]:
        """Refund a payment (full or partial)."""
        stripe = self._stripe()
        params = {"payment_intent": payment_intent_id}
        if amount:
            params["amount"] = amount
        refund = stripe.Refund.create(**params)
        return {"refund_id": refund.id, "status": refund.status, "amount": refund.amount}

    # ─── Connect (Marketplace) ─────────────────────────────────────

    def create_connect_account(self, email: str, country: str = "US") -> Dict[str, Any]:
        """Create a Stripe Connect account for a tenant."""
        stripe = self._stripe()
        account = stripe.Account.create(
            type="express", country=country, email=email,
            capabilities={"card_payments": {"requested": True}, "transfers": {"requested": True}},
        )
        return {"account_id": account.id, "email": email}

    def create_account_link(self, account_id: str, return_url: str, refresh_url: str) -> Dict[str, Any]:
        """Generate onboarding link for Connect account."""
        stripe = self._stripe()
        link = stripe.AccountLink.create(
            account=account_id, type="account_onboarding",
            return_url=return_url, refresh_url=refresh_url,
        )
        return {"url": link.url, "expires_at": link.expires_at}

    # ─── Webhook ───────────────────────────────────────────────────

    @staticmethod
    def verify_webhook(payload: bytes, sig_header: str, webhook_secret: Optional[str] = None) -> Dict[str, Any]:
        """Verify and parse a Stripe webhook event."""
        stripe = _get_stripe()
        secret = webhook_secret or os.getenv("STRIPE_WEBHOOK_SECRET", "")
        event = stripe.Webhook.construct_event(payload, sig_header, secret)
        return {"event_id": event.id, "type": event.type, "data": event.data.object}
