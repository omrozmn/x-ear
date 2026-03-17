from __future__ import annotations

import json
import logging
import os
import shutil
import subprocess
import threading
import time
import uuid
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Dict, Optional


logger = logging.getLogger(__name__)


BRIDGE_SCRIPT = Path(__file__).resolve().parent.parent / "scripts" / "whatsapp_bridge.mjs"
STORAGE_ROOT = Path(__file__).resolve().parent.parent / "storage" / "whatsapp_sessions"
STALE_SESSION_SECONDS = 20.0


@dataclass
class WhatsAppSessionState:
    status: str = "idle"
    connected: bool = False
    qr_code: Optional[str] = None
    qr_updated_at: Optional[float] = None
    last_error: Optional[str] = None
    last_event_at: Optional[float] = None
    profile_path: Optional[str] = None
    bridge_pid: Optional[int] = None
    last_sync_at: Optional[float] = None
    sync_in_progress: bool = False

    def to_dict(self) -> Dict[str, Any]:
        return {
            "status": self.status,
            "connected": self.connected,
            "qrCode": self.qr_code,
            "qrUpdatedAt": self.qr_updated_at,
            "lastError": self.last_error,
            "lastEventAt": self.last_event_at,
            "profilePath": self.profile_path,
            "bridgePid": self.bridge_pid,
            "lastSyncAt": self.last_sync_at,
            "syncInProgress": self.sync_in_progress,
        }


@dataclass
class PendingRequest:
    event: threading.Event = field(default_factory=threading.Event)
    response: Optional[Dict[str, Any]] = None


class WhatsAppSessionProcess:
    def __init__(self, tenant_id: str):
        self.tenant_id = tenant_id
        self.profile_dir = STORAGE_ROOT / tenant_id
        self.profile_dir.mkdir(parents=True, exist_ok=True)
        self.state = WhatsAppSessionState(profile_path=str(self.profile_dir))
        self.process: Optional[subprocess.Popen[str]] = None
        self._pending: Dict[str, PendingRequest] = {}
        self._lock = threading.RLock()
        self._sync_lock = threading.Lock()
        self._request_lock = threading.Lock()
        self._stdout_thread: Optional[threading.Thread] = None
        self._stderr_thread: Optional[threading.Thread] = None

    def ensure_started(self) -> None:
        with self._lock:
            if self.process and self.process.poll() is None and not self._is_stale_locked():
                return
            if self.process and self.process.poll() is None:
                self._terminate_process_locked()

            node_path = shutil.which("node")
            if not node_path:
                raise RuntimeError("Node.js bulunamadi. WhatsApp bridge baslatilamadi.")

            env = os.environ.copy()
            env.setdefault("PW_TEST_HTML_REPORT_OPEN", "never")
            self.process = subprocess.Popen(
                [node_path, str(BRIDGE_SCRIPT), self.tenant_id, str(self.profile_dir)],
                stdin=subprocess.PIPE,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True,
                bufsize=1,
                env=env,
            )
            self.state.bridge_pid = self.process.pid
            self.state.status = "starting"
            self.state.last_event_at = time.time()

            self._stdout_thread = threading.Thread(target=self._read_stdout, daemon=True)
            self._stderr_thread = threading.Thread(target=self._read_stderr, daemon=True)
            self._stdout_thread.start()
            self._stderr_thread.start()

    def _is_stale_locked(self) -> bool:
        if not self.process or self.process.poll() is not None:
            return False
        if self.state.connected or self.state.status == "qr":
            return False
        if not self.state.last_event_at:
            return False
        return (time.time() - self.state.last_event_at) > STALE_SESSION_SECONDS

    def _terminate_process_locked(self) -> None:
        if not self.process:
            return
        try:
            if self.process.poll() is None:
                self.process.terminate()
                self.process.wait(timeout=5)
        except Exception:
            try:
                self.process.kill()
            except Exception:
                pass
        finally:
            self.process = None
            self.state.bridge_pid = None
            self.state.connected = False
            self.state.qr_code = None
            self.state.status = "idle"
            self.state.last_event_at = time.time()

    def reset_profile(self) -> None:
        with self._lock:
            self._terminate_process_locked()
            backup_dir = self.profile_dir.parent / f"{self.profile_dir.name}_backup_{int(time.time())}"
            if self.profile_dir.exists():
                try:
                    shutil.move(str(self.profile_dir), str(backup_dir))
                except Exception:
                    shutil.rmtree(self.profile_dir, ignore_errors=True)
            self.profile_dir.mkdir(parents=True, exist_ok=True)
            self.state.profile_path = str(self.profile_dir)
            self.state.qr_code = None
            self.state.qr_updated_at = None
            self.state.last_error = None
            self.state.status = "idle"
            self.state.connected = False
            self.state.last_event_at = time.time()

    def _read_stdout(self) -> None:
        process = self.process
        assert process and process.stdout
        for raw_line in process.stdout:
            line = raw_line.strip()
            if not line:
                continue
            try:
                payload = json.loads(line)
            except json.JSONDecodeError:
                logger.warning("WhatsApp bridge stdout parse edilemedi: %s", line)
                continue
            self._handle_payload(payload)
        with self._lock:
            if self.state.status not in {"disconnected", "stopped"}:
                self.state.status = "stopped"
                self.state.connected = False
                self.state.last_event_at = time.time()

    def _read_stderr(self) -> None:
        process = self.process
        assert process and process.stderr
        for raw_line in process.stderr:
            line = raw_line.strip()
            if not line:
                continue
            logger.info("WhatsApp bridge[%s]: %s", self.tenant_id, line)

    def _handle_payload(self, payload: Dict[str, Any]) -> None:
        payload_type = payload.get("type")
        now_ts = time.time()
        with self._lock:
            if payload_type == "state":
                self.state.status = payload.get("status", self.state.status)
                self.state.connected = bool(payload.get("connected", False))
                self.state.qr_code = payload.get("qrCode")
                self.state.qr_updated_at = now_ts if self.state.qr_code else self.state.qr_updated_at
                self.state.last_error = payload.get("error")
                self.state.last_event_at = now_ts
                return

            if payload_type == "response":
                request_id = payload.get("requestId")
                pending = self._pending.get(request_id)
                if pending:
                    pending.response = payload
                    pending.event.set()
                if payload.get("error"):
                    self.state.last_error = payload["error"]
                    self.state.last_event_at = now_ts
                return

            if payload_type == "log":
                self.state.last_event_at = now_ts
                return

    def request(self, action: str, payload: Optional[Dict[str, Any]] = None, timeout: float = 120.0, retry: bool = True) -> Dict[str, Any]:
        with self._request_lock:
            self.ensure_started()
            assert self.process and self.process.stdin
            if self.process.poll() is not None:
                raise RuntimeError("WhatsApp bridge calismiyor.")

            request_id = uuid.uuid4().hex
            pending = PendingRequest()
            with self._lock:
                self._pending[request_id] = pending

            command = {
                "requestId": request_id,
                "action": action,
                "payload": payload or {},
            }

            try:
                self.process.stdin.write(json.dumps(command) + "\n")
                self.process.stdin.flush()
            except Exception as exc:  # pragma: no cover
                with self._lock:
                    self._pending.pop(request_id, None)
                raise RuntimeError(f"WhatsApp bridge komutu gonderilemedi: {exc}") from exc

            if not pending.event.wait(timeout):
                with self._lock:
                    self._pending.pop(request_id, None)
                    self._terminate_process_locked()
                if retry:
                    logger.warning("WhatsApp bridge timeout tenant=%s action=%s, restarting once", self.tenant_id, action)
                    return self.request(action, payload=payload, timeout=timeout, retry=False)
                raise RuntimeError(f"WhatsApp bridge zaman asimi: {action}")

            with self._lock:
                self._pending.pop(request_id, None)
            assert pending.response is not None
            if pending.response.get("ok") is False:
                raise RuntimeError(pending.response.get("error") or "WhatsApp bridge hatasi")
            return pending.response.get("data", {})

    def wait_for_session(self, timeout: float = 25.0) -> Dict[str, Any]:
        self.ensure_started()
        end = time.time() + timeout
        restarted = False
        while time.time() < end:
            snapshot = self.get_state()
            if snapshot["status"] in {"qr", "connected"}:
                return snapshot
            if not restarted and snapshot["status"] in {"starting", "loading", "idle"}:
                last_event_at = snapshot.get("lastEventAt")
                if last_event_at and (time.time() - float(last_event_at)) > STALE_SESSION_SECONDS:
                    with self._lock:
                        self._terminate_process_locked()
                    self.ensure_started()
                    restarted = True
            time.sleep(1.0)
        snapshot = self.get_state()
        if snapshot["status"] in {"starting", "loading", "idle"} and not snapshot.get("connected"):
            snapshot["status"] = "error"
            snapshot["lastError"] = (
                "WhatsApp Web baslangic ekraninda takildi. QR olusmadi. "
                "Bu makinede Playwright/Chrome otomasyonu ile uyumluluk sorunu olabilir."
            )
            with self._lock:
                self.state.status = "error"
                self.state.last_error = snapshot["lastError"]
                self.state.last_event_at = time.time()
        return snapshot

    def disconnect(self) -> Dict[str, Any]:
        try:
            data = self.request("disconnect", timeout=30.0)
        finally:
            with self._lock:
                self._terminate_process_locked()
            self.state.status = "disconnected"
            self.state.connected = False
            self.state.last_event_at = time.time()
        return data

    def stop(self) -> None:
        with self._lock:
            self._terminate_process_locked()
            self.state.status = "stopped"
            self.state.connected = False
            self.state.last_event_at = time.time()

    def get_state(self) -> Dict[str, Any]:
        with self._lock:
            return self.state.to_dict()

    def has_persisted_profile(self) -> bool:
        if not self.profile_dir.exists():
            return False
        try:
            return any(self.profile_dir.iterdir())
        except OSError:
            return False

    def begin_sync(self) -> bool:
        acquired = self._sync_lock.acquire(blocking=False)
        if not acquired:
            return False
        with self._lock:
            self.state.sync_in_progress = True
        return True

    def end_sync(self, success: bool = True) -> None:
        with self._lock:
            self.state.sync_in_progress = False
            if success:
                self.state.last_sync_at = time.time()
        if self._sync_lock.locked():
            self._sync_lock.release()


class WhatsAppSessionManager:
    def __init__(self):
        self._sessions: Dict[str, WhatsAppSessionProcess] = {}
        self._lock = threading.RLock()

    def get_or_create(self, tenant_id: str) -> WhatsAppSessionProcess:
        with self._lock:
            session = self._sessions.get(tenant_id)
            if session is None:
                session = WhatsAppSessionProcess(tenant_id)
                self._sessions[tenant_id] = session
            return session

    def start(self, tenant_id: str) -> Dict[str, Any]:
        session = self.get_or_create(tenant_id)
        session.stop()
        return session.wait_for_session(timeout=15.0)

    def status(self, tenant_id: str) -> Dict[str, Any]:
        with self._lock:
            session = self._sessions.get(tenant_id)
        if session is None:
            session = self.get_or_create(tenant_id)
        return session.get_state()

    def send_message(self, tenant_id: str, phone_number: str, message: str) -> Dict[str, Any]:
        session = self.get_or_create(tenant_id)
        return session.request("send_message", {"phoneNumber": phone_number, "message": message}, timeout=180.0)

    def send_bulk(self, tenant_id: str, messages: list[dict[str, str]]) -> Dict[str, Any]:
        session = self.get_or_create(tenant_id)
        return session.request("send_bulk", {"messages": messages}, timeout=600.0)

    def sync_recent(self, tenant_id: str, limit: int = 10) -> Dict[str, Any]:
        session = self.get_or_create(tenant_id)
        return session.request("sync_recent", {"limit": limit}, timeout=240.0)

    def send_reply_to_chat(self, tenant_id: str, chat_id: str, message: str) -> Dict[str, Any]:
        session = self.get_or_create(tenant_id)
        return session.request("send_reply_to_chat", {"chatId": chat_id, "message": message}, timeout=180.0)

    def disconnect(self, tenant_id: str) -> Dict[str, Any]:
        with self._lock:
            session = self._sessions.get(tenant_id)
        if session is None:
            return {"disconnected": True}
        return session.disconnect()

    def list_connected_tenant_ids(self) -> list[str]:
        with self._lock:
            items = list(self._sessions.items())
        connected: list[str] = []
        for tenant_id, session in items:
            snapshot = session.get_state()
            if snapshot.get("connected"):
                connected.append(tenant_id)
        return connected

    def begin_sync(self, tenant_id: str) -> bool:
        session = self.get_or_create(tenant_id)
        return session.begin_sync()

    def end_sync(self, tenant_id: str, success: bool = True) -> None:
        session = self.get_or_create(tenant_id)
        session.end_sync(success=success)


_manager: Optional[WhatsAppSessionManager] = None


def get_whatsapp_session_manager() -> WhatsAppSessionManager:
    global _manager
    if _manager is None:
        STORAGE_ROOT.mkdir(parents=True, exist_ok=True)
        _manager = WhatsAppSessionManager()
    return _manager
