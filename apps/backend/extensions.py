from flask import current_app
from services.otp_store import get_store
import os
import socket
import shutil
import subprocess
import tempfile
import atexit
import time

# Redis client for idempotency
redis_client = None

_local_redis_proc = None
_local_redis_tmpdir = None


def _is_port_open(host: str = '127.0.0.1', port: int = 6379, timeout: float = 0.3) -> bool:
	"""Return True when a TCP connection can be made to host:port."""
	try:
		s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
		s.settimeout(timeout)
		try:
			s.connect((host, port))
			return True
		finally:
			s.close()
	except Exception:
		return False


def _stop_local_redis():
	"""Terminate a locally spawned redis-server process and remove temp files."""
	global _local_redis_proc, _local_redis_tmpdir
	if _local_redis_proc:
		try:
			_local_redis_proc.terminate()
			_local_redis_proc.wait(timeout=3)
		except Exception:
			try:
				_local_redis_proc.kill()
			except Exception:
				pass
		_local_redis_proc = None
	if _local_redis_tmpdir:
		try:
			shutil.rmtree(_local_redis_tmpdir, ignore_errors=True)
		except Exception:
			pass
		_local_redis_tmpdir = None


def _start_local_redis_if_missing(app, port: int = 6379) -> bool:
	"""Attempt to start a short-lived local redis-server in development when no REDIS_URL is set.

	This is strictly a developer convenience: it will only run when FLASK_ENV != 'production'
	and when the `redis-server` binary is available on PATH. If the port is already in use
	we assume Redis is running and do nothing.
	"""
	global _local_redis_proc, _local_redis_tmpdir
	# Only auto-start in non-production to avoid surprises on servers
	if os.getenv('FLASK_ENV', 'production') == 'production':
		app.logger.debug('Production environment: not auto-starting local Redis.')
		return False
	# Honor explicit REDIS_URL if provided
	if os.getenv('REDIS_URL'):
		app.logger.debug('REDIS_URL present; skipping local Redis auto-start.')
		return False
	# Require redis-server binary
	if shutil.which('redis-server') is None:
		app.logger.info('redis-server binary not found on PATH; skipping auto-start.')
		return False
	# If something already listens on the default port, assume it's Redis
	if _is_port_open('127.0.0.1', port):
		app.logger.info(f'Port {port} already in use; assuming Redis is running.')
		return False

	# Create temporary config and data dir for this dev instance
	tmpdir = tempfile.mkdtemp(prefix='xear_redis_')
	conf_path = os.path.join(tmpdir, 'redis.conf')
	try:
		with open(conf_path, 'w', encoding='utf-8') as fh:
			fh.write(f"""port {port}
bind 127.0.0.1
daemonize no
save ""
appendonly no
dir {tmpdir}
logfile {tmpdir}/redis.log
protected-mode no
""")

		# Start redis-server in foreground so we can manage the subprocess
		proc = subprocess.Popen(['redis-server', conf_path], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, close_fds=True)
		# Wait briefly for the server to accept connections
		for _ in range(25):
			if _is_port_open('127.0.0.1', port, timeout=0.2):
				_local_redis_proc = proc
				_local_redis_tmpdir = tmpdir
				atexit.register(_stop_local_redis)
				app.logger.info(f'Started local redis-server (pid={proc.pid}) at port {port} for development')
				return True
			time.sleep(0.2)
		# Failed to start within the timeout
		try:
			proc.terminate()
		except Exception:
			pass
	except Exception as e:
		app.logger.warning(f'Failed to auto-start local redis-server: {e}')
	# Cleanup temporary directory if we failed
	try:
		shutil.rmtree(tmpdir, ignore_errors=True)
	except Exception:
		pass
	return False

# Import db from models
from models.base import db

def init_extensions(app):
	"""Initialize optional extensions and attach them to app.extensions."""
	global redis_client
	
	# Attempt to auto-start a local Redis for development when REDIS_URL is not provided.
	started_local = _start_local_redis_if_missing(app)

	# Initialize Redis client for idempotency
	redis_url = os.getenv('REDIS_URL') or ('redis://127.0.0.1:6379/0' if started_local else None)
	if redis_url:
		try:
			import redis
			redis_client = redis.from_url(redis_url, decode_responses=True)
			# Test connection
			redis_client.ping()
			app.logger.info("Redis client initialized successfully for idempotency")
		except Exception as e:
			app.logger.warning(f"Failed to initialize Redis client for idempotency: {e}")
			redis_client = None
	else:
		app.logger.info("No REDIS_URL provided, idempotency will not use Redis caching")
	
	# OTP store (Redis or in-memory fallback)
	try:
		app.extensions = getattr(app, 'extensions', {})
		store = get_store()
		app.extensions['otp_store'] = store
		# Expose redis availability for monitoring
		try:
			app.extensions['redis_available'] = bool(store.is_healthy())
		except Exception:
			app.extensions['redis_available'] = False
	except Exception:
		# Ensure app still starts even if Redis isn't available during init;
		# get_store already falls back to in-memory but be defensive here.
		store = get_store()
		app.extensions['otp_store'] = store
		try:
			app.extensions['redis_available'] = bool(store.is_healthy())
		except Exception:
			app.extensions['redis_available'] = False


def get_otp_store():
	"""Convenience accessor to read the otp_store for the current app context."""
	return current_app.extensions.get('otp_store')
