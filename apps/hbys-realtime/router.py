"""
Notification & Realtime Router - FastAPI endpoints and WebSocket handler.
"""
import json
import logging
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, WebSocket, WebSocketDisconnect, status
from sqlalchemy.orm import Session

from hbys_common.database import gen_id
from hbys_common.auth import get_current_user, CurrentUser
from hbys_common.schemas import ResponseEnvelope

import service
from handlers.code_blue_handler import handle_code_blue
from ws.connection_manager import manager, ConnectionInfo
from schemas import (
    NotificationCreate,
    NotificationRead,
    NotificationListResponse,
    NotificationMarkRead,
    NotificationMarkAllRead,
    CodeBlueRequest,
    CodeBlueResponse,
    PreferenceCreate,
    PreferenceUpdate,
    PreferenceRead,
    PreferenceListResponse,
    SendNotificationRequest,
)

logger = logging.getLogger(__name__)

router = APIRouter(tags=["HBYS - Notifications & Realtime"])


def _get_db():
    """Lazy import to avoid circular dependency with main.py."""
    from main import get_db
    return get_db


# ─── WebSocket Endpoint ──────────────────────────────────────────────────────


@router.websocket("/ws/clinical-notifications")
async def websocket_clinical_notifications(websocket: WebSocket):
    """
    WebSocket endpoint for real-time clinical notifications.

    Connection flow:
      1. Client connects to ws://host/api/hbys/notifications/ws/clinical-notifications
      2. Client sends auth message: {"type": "auth", "token": "<jwt>", "wardId": "<optional>"}
      3. Server validates token and registers the connection
      4. Server pushes notifications in real-time
      5. Client can send: {"type": "ping"} for keepalive
      6. Client can send: {"type": "mark_read", "notificationId": "<id>"} to mark as read
    """
    # Accept first, then wait for auth message
    await websocket.accept()

    try:
        # Wait for auth message (with 30s timeout via client contract)
        raw = await websocket.receive_text()
        auth_data = json.loads(raw)

        if auth_data.get("type") != "auth" or not auth_data.get("token"):
            await websocket.send_json({"type": "error", "message": "Invalid auth message. Send {type: 'auth', token: '<jwt>'}"})
            await websocket.close(code=4001, reason="Auth required")
            return

        # Validate JWT token
        token = auth_data["token"]
        try:
            from hbys_common.auth import JWT_SECRET, JWT_ALGORITHM
            from jose import jwt as jose_jwt

            token_data = jose_jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
            user_id = token_data.get("sub") or token_data.get("user_id")
            tenant_id = token_data.get("tenant_id") or token_data.get("tenantId")
            roles = set(token_data.get("roles", []))

            if not user_id or not tenant_id:
                raise ValueError("Missing user_id or tenant_id in token")
        except Exception as e:
            logger.warning("WS auth failed: %s", str(e))
            await websocket.send_json({"type": "error", "message": "Authentication failed"})
            await websocket.close(code=4003, reason="Auth failed")
            return

        ward_id = auth_data.get("wardId") or auth_data.get("ward_id")

        # Register with manager
        ws_id = id(websocket)
        info = ConnectionInfo(
            websocket=websocket,
            user_id=user_id,
            tenant_id=tenant_id,
            roles=roles,
            ward_id=ward_id,
        )
        manager._connections[ws_id] = info
        manager._by_tenant.setdefault(tenant_id, set()).add(ws_id)
        manager._by_user.setdefault(user_id, set()).add(ws_id)
        for role in roles:
            manager._by_role.setdefault(role, set()).add(ws_id)
        if ward_id:
            manager._by_ward.setdefault(ward_id, set()).add(ws_id)

        logger.info("WS authenticated: user=%s tenant=%s ward=%s", user_id, tenant_id, ward_id)

        await websocket.send_json({
            "type": "auth_success",
            "userId": user_id,
            "tenantId": tenant_id,
            "message": "Connected to clinical notifications",
        })

        # Main message loop
        while True:
            raw_msg = await websocket.receive_text()
            try:
                msg = json.loads(raw_msg)
            except json.JSONDecodeError:
                await websocket.send_json({"type": "error", "message": "Invalid JSON"})
                continue

            msg_type = msg.get("type")

            if msg_type == "ping":
                await websocket.send_json({"type": "pong"})

            elif msg_type == "mark_read":
                notif_id = msg.get("notificationId") or msg.get("notification_id")
                if notif_id:
                    db_gen = _get_db()()
                    db = next(db_gen)
                    try:
                        service.mark_notification_read(db, notif_id, tenant_id, user_id)
                        await websocket.send_json({
                            "type": "read_confirmed",
                            "notificationId": notif_id,
                        })
                    finally:
                        try:
                            next(db_gen)
                        except StopIteration:
                            pass

            else:
                await websocket.send_json({
                    "type": "error",
                    "message": f"Unknown message type: {msg_type}",
                })

    except WebSocketDisconnect:
        logger.info("WS client disconnected")
    except Exception as e:
        logger.error("WS error: %s", str(e), exc_info=True)
    finally:
        manager.disconnect(websocket)


# ─── List Notifications ──────────────────────────────────────────────────────


@router.get(
    "",
    response_model=ResponseEnvelope[NotificationListResponse],
    summary="List notifications",
    description="List notifications for the current user. Supports filtering by type, status, priority.",
)
def list_notifications(
    notification_type: Optional[str] = Query(None, description="Filter by notification type"),
    status_filter: Optional[str] = Query(None, alias="status", description="Filter by status"),
    priority: Optional[str] = Query(None, description="Filter by priority"),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(_get_db()),
    user: CurrentUser = Depends(get_current_user),
):
    result = service.list_notifications(
        db,
        tenant_id=user.tenant_id,
        user_id=user.user_id,
        notification_type=notification_type,
        status=status_filter,
        priority=priority,
        skip=skip,
        limit=limit,
    )
    return ResponseEnvelope.ok(data=result)


# ─── Get Notification ─────────────────────────────────────────────────────────


@router.get(
    "/{notification_id}",
    response_model=ResponseEnvelope[NotificationRead],
    summary="Get notification by ID",
)
def get_notification(
    notification_id: str,
    db: Session = Depends(_get_db()),
    user: CurrentUser = Depends(get_current_user),
):
    notif = service.get_notification(db, notification_id=notification_id, tenant_id=user.tenant_id)
    if not notif:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Notification '{notification_id}' not found.",
        )
    return ResponseEnvelope.ok(data=NotificationRead.model_validate(notif))


# ─── Mark Read ────────────────────────────────────────────────────────────────


@router.put(
    "/{notification_id}/read",
    response_model=ResponseEnvelope[NotificationRead],
    summary="Mark notification as read",
)
def mark_read(
    notification_id: str,
    db: Session = Depends(_get_db()),
    user: CurrentUser = Depends(get_current_user),
):
    notif = service.mark_notification_read(
        db, notification_id=notification_id, tenant_id=user.tenant_id, read_by=user.user_id
    )
    if not notif:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Notification '{notification_id}' not found.",
        )
    return ResponseEnvelope.ok(data=NotificationRead.model_validate(notif))


@router.put(
    "/read-all",
    response_model=ResponseEnvelope,
    summary="Mark all notifications as read",
)
def mark_all_read(
    db: Session = Depends(_get_db()),
    user: CurrentUser = Depends(get_current_user),
):
    count = service.mark_all_read(db, tenant_id=user.tenant_id, user_id=user.user_id)
    return ResponseEnvelope.ok(data={"message": f"{count} notification(s) marked as read."})


# ─── Send Notification ───────────────────────────────────────────────────────


@router.post(
    "/send",
    response_model=ResponseEnvelope[NotificationRead],
    status_code=status.HTTP_201_CREATED,
    summary="Send a notification",
    description="Create and dispatch a notification to target user/role/ward/all.",
)
async def send_notification(
    data: SendNotificationRequest,
    db: Session = Depends(_get_db()),
    user: CurrentUser = Depends(get_current_user),
):
    create_data = NotificationCreate(
        notification_type=data.notification_type,
        priority=data.priority,
        title=data.title,
        message=data.message,
        data=data.data,
        source_type=data.source_type,
        source_id=data.source_id,
        patient_id=data.patient_id,
        target_type=data.target_type,
        target_id=data.target_id,
        channel=data.channel,
        expires_at=data.expires_at,
    )

    notif, sent_count = await service.create_and_dispatch(
        db, data=create_data, tenant_id=user.tenant_id
    )

    return ResponseEnvelope.ok(data=NotificationRead.model_validate(notif))


# ─── Code Blue ────────────────────────────────────────────────────────────────


@router.post(
    "/code-blue",
    response_model=ResponseEnvelope[CodeBlueResponse],
    status_code=status.HTTP_201_CREATED,
    summary="Trigger Code Blue",
    description="Broadcast a Code Blue (cardiac/respiratory arrest) alert to all connected staff.",
)
async def trigger_code_blue(
    data: CodeBlueRequest,
    db: Session = Depends(_get_db()),
    user: CurrentUser = Depends(get_current_user),
):
    notif = await handle_code_blue(
        db,
        tenant_id=user.tenant_id,
        patient_id=data.patient_id,
        location=data.location,
        ward_id=data.ward_id,
        triggered_by=user.user_id,
        notes=data.notes,
    )

    # Dispatch via WebSocket
    sent_count = await service.dispatch_notification(db, notif)

    return ResponseEnvelope.ok(
        data=CodeBlueResponse(
            notification_id=notif.id,
            location=data.location,
            status="broadcast",
            connections_notified=sent_count,
        ),
    )


# ─── Notification Preferences ────────────────────────────────────────────────


@router.get(
    "/preferences",
    response_model=ResponseEnvelope[PreferenceListResponse],
    summary="List notification preferences",
    description="List all notification preferences for the current user.",
)
def list_preferences(
    db: Session = Depends(_get_db()),
    user: CurrentUser = Depends(get_current_user),
):
    result = service.list_preferences(db, user_id=user.user_id, tenant_id=user.tenant_id)
    return ResponseEnvelope.ok(data=result)


@router.post(
    "/preferences",
    response_model=ResponseEnvelope[PreferenceRead],
    status_code=status.HTTP_201_CREATED,
    summary="Create or update notification preference",
    description="Upsert a notification preference by type + channel.",
)
def create_preference(
    data: PreferenceCreate,
    db: Session = Depends(_get_db()),
    user: CurrentUser = Depends(get_current_user),
):
    pref = service.upsert_preference(
        db, user_id=user.user_id, tenant_id=user.tenant_id, data=data
    )
    return ResponseEnvelope.ok(data=PreferenceRead.model_validate(pref))


@router.put(
    "/preferences/{preference_id}",
    response_model=ResponseEnvelope[PreferenceRead],
    summary="Update notification preference",
)
def update_preference(
    preference_id: str,
    data: PreferenceUpdate,
    db: Session = Depends(_get_db()),
    user: CurrentUser = Depends(get_current_user),
):
    pref = service.update_preference(
        db, preference_id=preference_id, tenant_id=user.tenant_id, data=data
    )
    if not pref:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Preference '{preference_id}' not found.",
        )
    return ResponseEnvelope.ok(data=PreferenceRead.model_validate(pref))


@router.delete(
    "/preferences/{preference_id}",
    response_model=ResponseEnvelope,
    summary="Delete notification preference",
)
def delete_preference(
    preference_id: str,
    db: Session = Depends(_get_db()),
    user: CurrentUser = Depends(get_current_user),
):
    deleted = service.delete_preference(db, preference_id=preference_id, tenant_id=user.tenant_id)
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Preference '{preference_id}' not found.",
        )
    return ResponseEnvelope.ok(data={"message": "Preference deleted."})
