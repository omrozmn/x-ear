"""
Kuveyt Turk Virtual POS - 3D Secure Integration Service

Two-phase XML-based 3D Secure payment flow:
  Request 1: Card validation → bank returns HTML → user enters 3D password
  Request 2: Provision (authorization) using MD value from callback

Hash: SHA1(MerchantId + MerchantOrderId + Amount + OkUrl + FailUrl + UserName + HashedPassword) → Base64
HashedPassword: SHA1(Password) → Base64
"""

import hashlib
import base64
import logging
import os
import uuid
from typing import Optional
from xml.etree import ElementTree as ET
from urllib.parse import unquote

import httpx

logger = logging.getLogger(__name__)


class KuveytTurkConfig:
    """Configuration from environment variables."""

    def __init__(self):
        self.merchant_id = os.getenv("KUVEYTTURK_MERCHANT_ID", "496")
        self.customer_id = os.getenv("KUVEYTTURK_CUSTOMER_ID", "400235")
        self.username = os.getenv("KUVEYTTURK_USERNAME", "apitest")
        self.password = os.getenv("KUVEYTTURK_PASSWORD", "api123")
        self.test_mode = os.getenv("KUVEYTTURK_TEST_MODE", "1") == "1"

        if self.test_mode:
            self.pay_gate_url = (
                "https://boatest.kuveytturk.com.tr/boa.virtualpos.services/Home/ThreeDModelPayGate"
            )
            self.provision_url = (
                "https://boatest.kuveytturk.com.tr/boa.virtualpos.services/Home/ThreeDModelProvisionGate"
            )
        else:
            self.pay_gate_url = (
                "https://sanalpos.kuveytturk.com.tr/ServiceGateWay/Home/ThreeDModelPayGate"
            )
            self.provision_url = (
                "https://sanalpos.kuveytturk.com.tr/ServiceGateWay/Home/ThreeDModelProvisionGate"
            )

    @property
    def hashed_password(self) -> str:
        """SHA1(Password) → Base64"""
        sha1 = hashlib.sha1(self.password.encode("iso-8859-9")).digest()
        return base64.b64encode(sha1).decode("ascii")


class KuveytTurkService:
    """Kuveyt Turk 3D Secure Payment Service."""

    def __init__(self, config: Optional[KuveytTurkConfig] = None):
        self.config = config or KuveytTurkConfig()

    # ─── Hash Calculation ───────────────────────────────────────────

    def _hash_data_request1(
        self, merchant_order_id: str, amount: int, ok_url: str, fail_url: str
    ) -> str:
        """Hash for Request 1 (card validation).
        SHA1(MerchantId + MerchantOrderId + Amount + OkUrl + FailUrl + UserName + HashedPassword) → Base64
        """
        raw = (
            f"{self.config.merchant_id}{merchant_order_id}{amount}"
            f"{ok_url}{fail_url}{self.config.username}{self.config.hashed_password}"
        )
        sha1 = hashlib.sha1(raw.encode("iso-8859-9")).digest()
        return base64.b64encode(sha1).decode("ascii")

    def _hash_data_request2(
        self, merchant_order_id: str, amount: int
    ) -> str:
        """Hash for Request 2 (provision) - no OkUrl/FailUrl.
        SHA1(MerchantId + MerchantOrderId + Amount + UserName + HashedPassword) → Base64
        """
        raw = (
            f"{self.config.merchant_id}{merchant_order_id}{amount}"
            f"{self.config.username}{self.config.hashed_password}"
        )
        sha1 = hashlib.sha1(raw.encode("iso-8859-9")).digest()
        return base64.b64encode(sha1).decode("ascii")

    # ─── Amount Helpers ─────────────────────────────────────────────

    @staticmethod
    def amount_to_kurus(amount: float) -> int:
        """Convert TRY amount to kurus (integer, no decimals).
        Example: 102.65 → 10265, 1.00 → 100
        """
        return int(round(amount * 100))

    @staticmethod
    def currency_code(currency: str = "TRY") -> str:
        codes = {"TRY": "0949", "USD": "0840", "EUR": "0978"}
        return codes.get(currency.upper(), "0949")

    # ─── XML Builders ───────────────────────────────────────────────

    def build_request1_xml(
        self,
        *,
        card_number: str,
        card_expire_month: str,
        card_expire_year: str,
        card_cvv: str,
        card_holder_name: str,
        amount_kurus: int,
        merchant_order_id: str,
        ok_url: str,
        fail_url: str,
        client_ip: str,
        email: str = "",
        phone: str = "",
        currency: str = "TRY",
    ) -> str:
        """Build XML for Request 1 (card validation / 3D redirect)."""
        hash_data = self._hash_data_request1(
            merchant_order_id, amount_kurus, ok_url, fail_url
        )

        # Detect card type
        card_type = "MasterCard"
        if card_number.startswith("4"):
            card_type = "Visa"
        elif card_number.startswith("9792") or card_number.startswith("65"):
            card_type = "Troy"

        # Phone parsing
        cc = "90"
        subscriber = phone.lstrip("+").lstrip("0")
        if subscriber.startswith("90"):
            subscriber = subscriber[2:]
        if len(subscriber) > 10:
            subscriber = subscriber[-10:]

        xml = f"""<KuveytTurkVPosMessage xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema">
<APIVersion>TDV2.0.0</APIVersion>
<OkUrl>{ok_url}</OkUrl>
<FailUrl>{fail_url}</FailUrl>
<HashData>{hash_data}</HashData>
<MerchantId>{self.config.merchant_id}</MerchantId>
<CustomerId>{self.config.customer_id}</CustomerId>
<DeviceData>
<DeviceChannel>02</DeviceChannel>
<ClientIP>{client_ip}</ClientIP>
</DeviceData>
<CardHolderData>
<BillAddrCity>Istanbul</BillAddrCity>
<BillAddrCountry>792</BillAddrCountry>
<BillAddrLine1>X-EAR SaaS</BillAddrLine1>
<BillAddrPostCode>34000</BillAddrPostCode>
<BillAddrState>40</BillAddrState>
<Email>{email or "noreply@x-ear.com"}</Email>
<MobilePhone>
<Cc>{cc}</Cc>
<Subscriber>{subscriber or "5000000000"}</Subscriber>
</MobilePhone>
</CardHolderData>
<UserName>{self.config.username}</UserName>
<CardNumber>{card_number}</CardNumber>
<CardExpireDateYear>{card_expire_year}</CardExpireDateYear>
<CardExpireDateMonth>{card_expire_month}</CardExpireDateMonth>
<CardCVV2>{card_cvv}</CardCVV2>
<CardHolderName>{card_holder_name}</CardHolderName>
<CardType>{card_type}</CardType>
<TransactionType>Sale</TransactionType>
<InstallmentCount>0</InstallmentCount>
<Amount>{amount_kurus}</Amount>
<DisplayAmount>{amount_kurus}</DisplayAmount>
<CurrencyCode>{self.currency_code(currency)}</CurrencyCode>
<MerchantOrderId>{merchant_order_id}</MerchantOrderId>
<TransactionSecurity>3</TransactionSecurity>
</KuveytTurkVPosMessage>"""
        return xml

    def build_request2_xml(
        self,
        *,
        amount_kurus: int,
        merchant_order_id: str,
        md_value: str,
    ) -> str:
        """Build XML for Request 2 (provision / payment capture)."""
        hash_data = self._hash_data_request2(merchant_order_id, amount_kurus)

        xml = f"""<KuveytTurkVPosMessage xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema">
<APIVersion>TDV2.0.0</APIVersion>
<HashData>{hash_data}</HashData>
<MerchantId>{self.config.merchant_id}</MerchantId>
<CustomerId>{self.config.customer_id}</CustomerId>
<UserName>{self.config.username}</UserName>
<TransactionType>Sale</TransactionType>
<InstallmentCount>0</InstallmentCount>
<Amount>{amount_kurus}</Amount>
<MerchantOrderId>{merchant_order_id}</MerchantOrderId>
<TransactionSecurity>3</TransactionSecurity>
<KuveytTurkVPosAdditionalData>
<AdditionalData>
<Key>MD</Key>
<Data>{md_value}</Data>
</AdditionalData>
</KuveytTurkVPosAdditionalData>
</KuveytTurkVPosMessage>"""
        return xml

    # ─── HTTP Calls ─────────────────────────────────────────────────

    async def initiate_3d_payment(
        self,
        *,
        card_number: str,
        card_expire_month: str,
        card_expire_year: str,
        card_cvv: str,
        card_holder_name: str,
        amount: float,
        merchant_order_id: Optional[str] = None,
        ok_url: str,
        fail_url: str,
        client_ip: str = "127.0.0.1",
        email: str = "",
        phone: str = "",
        currency: str = "TRY",
    ) -> dict:
        """Phase 1: Send card validation XML, get HTML response for 3D redirect."""
        if not merchant_order_id:
            merchant_order_id = uuid.uuid4().hex[:20]

        amount_kurus = self.amount_to_kurus(amount)

        xml_body = self.build_request1_xml(
            card_number=card_number,
            card_expire_month=card_expire_month,
            card_expire_year=card_expire_year,
            card_cvv=card_cvv,
            card_holder_name=card_holder_name,
            amount_kurus=amount_kurus,
            merchant_order_id=merchant_order_id,
            ok_url=ok_url,
            fail_url=fail_url,
            client_ip=client_ip,
            email=email,
            phone=phone,
            currency=currency,
        )

        logger.info(f"KuveytTurk Request 1 → {self.config.pay_gate_url}")
        logger.debug(f"XML body: {xml_body}")

        async with httpx.AsyncClient(timeout=30.0, verify=False) as client:
            response = await client.post(
                self.config.pay_gate_url,
                content=xml_body,
                headers={"Content-Type": "application/xml"},
            )

        html_body = response.text
        logger.info(f"KuveytTurk Response 1 status={response.status_code} len={len(html_body)}")

        return {
            "success": response.status_code == 200,
            "html": html_body,
            "merchant_order_id": merchant_order_id,
            "amount_kurus": amount_kurus,
        }

    async def complete_provision(
        self,
        *,
        amount_kurus: int,
        merchant_order_id: str,
        md_value: str,
    ) -> dict:
        """Phase 2: Send provision XML with MD value, complete payment."""
        xml_body = self.build_request2_xml(
            amount_kurus=amount_kurus,
            merchant_order_id=merchant_order_id,
            md_value=md_value,
        )

        logger.info(f"KuveytTurk Request 2 → {self.config.provision_url}")

        async with httpx.AsyncClient(timeout=30.0, verify=False) as client:
            response = await client.post(
                self.config.provision_url,
                content=xml_body,
                headers={"Content-Type": "application/xml"},
            )

        result = self.parse_provision_response(response.text)
        logger.info(f"KuveytTurk Provision result: {result}")
        return result

    # ─── Response Parsers ───────────────────────────────────────────

    @staticmethod
    def parse_callback_response(auth_response_encoded: str) -> dict:
        """Parse the AuthenticationResponse from OkUrl/FailUrl callback.
        The value is URL-encoded XML.
        """
        xml_str = unquote(auth_response_encoded)

        result = {
            "raw_xml": xml_str,
            "response_code": None,
            "response_message": None,
            "md": None,
            "order_id": None,
            "merchant_order_id": None,
            "hash_data": None,
        }

        try:
            root = ET.fromstring(xml_str)

            def find_text(tag: str) -> Optional[str]:
                el = root.find(f".//{tag}")
                return el.text if el is not None and el.text else None

            result["response_code"] = find_text("ResponseCode")
            result["response_message"] = find_text("ResponseMessage")
            result["md"] = find_text("MD")
            result["order_id"] = find_text("OrderId")
            result["merchant_order_id"] = find_text("MerchantOrderId")
            result["hash_data"] = find_text("HashData")
        except ET.ParseError as e:
            logger.error(f"Failed to parse callback XML: {e}")
            result["parse_error"] = str(e)

        return result

    @staticmethod
    def parse_provision_response(xml_str: str) -> dict:
        """Parse Response 2 (provision result)."""
        result = {
            "success": False,
            "response_code": None,
            "response_message": None,
            "order_id": None,
            "provision_number": None,
            "rrn": None,
            "merchant_order_id": None,
        }

        try:
            root = ET.fromstring(xml_str)

            def find_text(tag: str) -> Optional[str]:
                el = root.find(f".//{tag}")
                return el.text if el is not None and el.text else None

            result["response_code"] = find_text("ResponseCode")
            result["response_message"] = find_text("ResponseMessage")
            result["order_id"] = find_text("OrderId")
            result["provision_number"] = find_text("ProvisionNumber")
            result["rrn"] = find_text("RRN")
            result["merchant_order_id"] = find_text("MerchantOrderId")
            result["success"] = result["response_code"] == "00"
        except ET.ParseError as e:
            logger.error(f"Failed to parse provision XML: {e}")
            result["parse_error"] = str(e)

        return result

    @staticmethod
    def generate_order_id() -> str:
        """Generate a unique merchant order ID."""
        from datetime import datetime
        return datetime.now().strftime("%Y%m%d%H%M%S") + uuid.uuid4().hex[:6]
