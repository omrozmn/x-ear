"""
WebSocket Connection Manager (Singleton)
Manages active WebSocket connections, grouped by tenant, user, and role/ward.
Provides targeted send methods for clinical notification delivery.
"""
import asyncio
import json
import logging
from dataclasses import dataclass, field
from typing import Dict, Set, Optional

from fastapi import WebSocket

logger = logging.getLogger(__name__)


@dataclass
class ConnectionInfo:
    """Metadata associated with a single WebSocket connection."""
    websocket: WebSocket
    user_id: str
    tenant_id: str
    roles: Set[str] = field(default_factory=set)
    ward_id: Optional[str] = None


class ConnectionManager:
    """
    Singleton manager for all active WebSocket connections.

    Connections are indexed by:
      - tenant_id -> set of ConnectionInfo
      - user_id   -> set of ConnectionInfo  (a user may have multiple tabs)
      - role      -> set of ConnectionInfo
      - ward_id   -> set of ConnectionInfo
    """

    _instance: Optional["ConnectionManager"] = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance._initialized = False
        return cls._instance

    def __init__(self):
        if self._initialized:
            return
        self._initialized = True

        # Primary store: ws id -> ConnectionInfo
        self._connections: Dict[int, ConnectionInfo] = {}

        # Lookup indices
        self._by_tenant: Dict[str, Set[int]] = {}
        self._by_user: Dict[str, Set[int]] = {}
        self._by_role: Dict[str, Set[int]] = {}
        self._by_ward: Dict[str, Set[int]] = {}

    # ── Connection lifecycle ──────────────────────────────────────────────

    async def connect(
        self,
        websocket: WebSocket,
        user_id: str,
        tenant_id: str,
        roles: Optional[Set[str]] = None,
        ward_id: Optional[str] = None,
    ) -> int:
        """Accept a WebSocket and register it in all indices. Returns ws id."""
        await websocket.accept()
        ws_id = id(websocket)

        info = ConnectionInfo(
            websocket=websocket,
            user_id=user_id,
            tenant_id=tenant_id,
            roles=roles or set(),
            ward_id=ward_id,
        )
        self._connections[ws_id] = info

        # Index by tenant
        self._by_tenant.setdefault(tenant_id, set()).add(ws_id)

        # Index by user
        self._by_user.setdefault(user_id, set()).add(ws_id)

        # Index by roles
        for role in info.roles:
            self._by_role.setdefault(role, set()).add(ws_id)

        # Index by ward
        if ward_id:
            self._by_ward.setdefault(ward_id, set()).add(ws_id)

        logger.info(
            "WS connected: ws_id=%s user=%s tenant=%s roles=%s ward=%s",
            ws_id, user_id, tenant_id, roles, ward_id,
        )
        return ws_id

    def disconnect(self, websocket: WebSocket) -> None:
        """Remove a WebSocket from all indices."""
        ws_id = id(websocket)
        info = self._connections.pop(ws_id, None)
        if info is None:
            return

        # Remove from tenant index
        tenant_set = self._by_tenant.get(info.tenant_id)
        if tenant_set:
            tenant_set.discard(ws_id)
            if not tenant_set:
                del self._by_tenant[info.tenant_id]

        # Remove from user index
        user_set = self._by_user.get(info.user_id)
        if user_set:
            user_set.discard(ws_id)
            if not user_set:
                del self._by_user[info.user_id]

        # Remove from role indices
        for role in info.roles:
            role_set = self._by_role.get(role)
            if role_set:
                role_set.discard(ws_id)
                if not role_set:
                    del self._by_role[role]

        # Remove from ward index
        if info.ward_id:
            ward_set = self._by_ward.get(info.ward_id)
            if ward_set:
                ward_set.discard(ws_id)
                if not ward_set:
                    del self._by_ward[info.ward_id]

        logger.info("WS disconnected: ws_id=%s user=%s", ws_id, info.user_id)

    # ── Sending helpers ───────────────────────────────────────────────────

    async def _send_to_ids(self, ws_ids: Set[int], payload: dict) -> int:
        """Send JSON payload to a set of ws_ids. Returns count of successful sends."""
        message = json.dumps(payload, ensure_ascii=False, default=str)
        sent = 0
        stale: list[int] = []

        for ws_id in ws_ids:
            info = self._connections.get(ws_id)
            if info is None:
                stale.append(ws_id)
                continue
            try:
                await info.websocket.send_text(message)
                sent += 1
            except Exception:
                logger.warning("Failed to send to ws_id=%s, marking stale", ws_id)
                stale.append(ws_id)

        # Clean up stale connections
        for ws_id in stale:
            info = self._connections.get(ws_id)
            if info:
                self.disconnect(info.websocket)

        return sent

    async def send_to_user(
        self, user_id: str, payload: dict, tenant_id: Optional[str] = None
    ) -> int:
        """Send to all connections of a specific user. Optionally scoped to tenant."""
        ws_ids = self._by_user.get(user_id, set()).copy()
        if tenant_id:
            tenant_ids = self._by_tenant.get(tenant_id, set())
            ws_ids = ws_ids & tenant_ids
        return await self._send_to_ids(ws_ids, payload)

    async def send_to_role(
        self, role: str, payload: dict, tenant_id: Optional[str] = None
    ) -> int:
        """Send to all connections that have a specific role."""
        ws_ids = self._by_role.get(role, set()).copy()
        if tenant_id:
            tenant_ids = self._by_tenant.get(tenant_id, set())
            ws_ids = ws_ids & tenant_ids
        return await self._send_to_ids(ws_ids, payload)

    async def send_to_ward(
        self, ward_id: str, payload: dict, tenant_id: Optional[str] = None
    ) -> int:
        """Send to all connections assigned to a specific ward."""
        ws_ids = self._by_ward.get(ward_id, set()).copy()
        if tenant_id:
            tenant_ids = self._by_tenant.get(tenant_id, set())
            ws_ids = ws_ids & tenant_ids
        return await self._send_to_ids(ws_ids, payload)

    async def broadcast_tenant(self, tenant_id: str, payload: dict) -> int:
        """Broadcast to all connections in a tenant."""
        ws_ids = self._by_tenant.get(tenant_id, set()).copy()
        return await self._send_to_ids(ws_ids, payload)

    # ── Stats ─────────────────────────────────────────────────────────────

    def get_connection_count(self, tenant_id: Optional[str] = None) -> int:
        """Return total active connections, optionally filtered by tenant."""
        if tenant_id:
            return len(self._by_tenant.get(tenant_id, set()))
        return len(self._connections)

    def get_online_users(self, tenant_id: str) -> Set[str]:
        """Return set of user_ids currently connected for a tenant."""
        ws_ids = self._by_tenant.get(tenant_id, set())
        return {
            self._connections[ws_id].user_id
            for ws_id in ws_ids
            if ws_id in self._connections
        }


# Module-level singleton instance
manager = ConnectionManager()
