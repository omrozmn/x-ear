"""
Tap Payments Service — Saudi Arabia & UAE

Supports:
- Subscriptions (recurring charges)
- Single charges (MADA, Visa, Mastercard)
- Refunds
- Customer management

API: Tap REST API v2
Docs: https://developers.tap.company/

Environment Variables:
- TAP_SECRET_KEY
- TAP_PUBLIC_KEY
- TAP_BASE_URL (default: https://api.tap.company/v2)
"""

import logging
import os
from typing import Any, Dict, Optional

import requests

logger = logging.getLogger(__name__)


class TapService:
    """Tap Payments gateway for Saudi Arabia and UAE."""

    def __init__(self, secret_key: Optional[str] = None):
        self.secret_key = secret_key or os.getenv("TAP_SECRET_KEY", "")
        self.base_url = os.getenv("TAP_BASE_URL", "https://api.tap.company/v2")

    def _headers(self) -> Dict[str, str]:
        return {
            "Authorization": f"Bearer {self.secret_key}",
            "Content-Type": "application/json",
        }

    def _post(self, path: str, data: dict) -> dict:
        try:
            resp = requests.post(f"{self.base_url}{path}", json=data, headers=self._headers(), timeout=30)
            return resp.json()
        except Exception as e:
            logger.error(f"Tap API error: {e}")
            return {"status": "error", "message": str(e)}

    def _get(self, path: str) -> dict:
        try:
            resp = requests.get(f"{self.base_url}{path}", headers=self._headers(), timeout=15)
            return resp.json()
        except Exception as e:
            return {"status": "error", "message": str(e)}

    # ─── Customers ─────────────────────────────────────────────────

    def create_customer(self, email: str, name: str, phone: str = "", country: str = "SA") -> Dict[str, Any]:
        """Create a Tap customer."""
        names = name.split(maxsplit=1)
        result = self._post("/customers", {
            "first_name": names[0],
            "last_name": names[1] if len(names) > 1 else names[0],
            "email": email,
            "phone": {"country_code": "966" if country == "SA" else "971", "number": phone},
        })
        return {"customer_id": result.get("id"), "email": email}

    # ─── Single Charge ─────────────────────────────────────────────

    def create_charge(
        self,
        amount: float,
        currency: str,
        customer_id: Optional[str] = None,
        source_id: str = "src_all",
        redirect_url: str = "",
        description: str = "",
        metadata: Optional[Dict] = None,
    ) -> Dict[str, Any]:
        """Create a payment charge."""
        data = {
            "amount": amount,
            "currency": currency,
            "source": {"id": source_id},
            "redirect": {"url": redirect_url},
            "description": description,
            "metadata": metadata or {},
        }
        if customer_id:
            data["customer"] = {"id": customer_id}

        result = self._post("/charges", data)
        return {
            "charge_id": result.get("id"),
            "status": result.get("status"),
            "redirect_url": result.get("transaction", {}).get("url"),
            "amount": amount,
            "currency": currency,
        }

    # ─── Subscriptions ─────────────────────────────────────────────

    def create_subscription(
        self,
        plan_amount: float,
        currency: str,
        customer_id: str,
        interval: str = "MONTHLY",
        trial_days: int = 0,
        name: str = "Subscription",
    ) -> Dict[str, Any]:
        """Create a recurring subscription via Tap's recurring charge API."""
        # Tap uses recurring charges with auto-debit
        data = {
            "term": {
                "interval": {"period": interval, "value": 1},
                "type": "UNENDING",
            },
            "charge": {
                "amount": plan_amount,
                "currency": currency,
                "description": name,
                "receipt": {"email": True, "sms": True},
            },
            "customer": {"id": customer_id},
        }
        if trial_days > 0:
            data["trial"] = {"days": trial_days}

        result = self._post("/recurring/v1", data)
        return {
            "subscription_id": result.get("id"),
            "status": result.get("status"),
            "next_charge": result.get("next_charge"),
        }

    def cancel_subscription(self, subscription_id: str) -> Dict[str, Any]:
        """Cancel a subscription."""
        try:
            resp = requests.delete(
                f"{self.base_url}/recurring/v1/{subscription_id}",
                headers=self._headers(), timeout=15,
            )
            return resp.json()
        except Exception as e:
            return {"status": "error", "message": str(e)}

    def get_subscription(self, subscription_id: str) -> Dict[str, Any]:
        """Get subscription details."""
        return self._get(f"/recurring/v1/{subscription_id}")

    # ─── Refund ────────────────────────────────────────────────────

    def refund(self, charge_id: str, amount: float, currency: str, reason: str = "requested_by_customer") -> Dict[str, Any]:
        """Refund a charge (full or partial)."""
        result = self._post("/refunds", {
            "charge_id": charge_id,
            "amount": amount,
            "currency": currency,
            "reason": reason,
        })
        return {"refund_id": result.get("id"), "status": result.get("status"), "amount": amount}

    # ─── Webhook Verification ──────────────────────────────────────

    @staticmethod
    def verify_webhook(payload: dict, signature: str, secret: Optional[str] = None) -> bool:
        """Verify Tap webhook signature."""
        import hmac
        import hashlib
        secret = secret or os.getenv("TAP_WEBHOOK_SECRET", "")
        import json
        expected = hmac.new(secret.encode(), json.dumps(payload, separators=(',', ':')).encode(), hashlib.sha256).hexdigest()
        return hmac.compare_digest(expected, signature)
