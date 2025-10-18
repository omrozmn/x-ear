"""Prometheus metrics utilities for X-Ear Flask app

Provides guarded helpers to register histograms/counters and expose the /metrics endpoint.
"""
from typing import Optional
import time
import logging
from flask import request

logger = logging.getLogger(__name__)

try:
    from prometheus_client import Counter, Histogram, generate_latest, CONTENT_TYPE_LATEST
    PROM_AVAILABLE = True
except Exception:
    PROM_AVAILABLE = False


REQUEST_COUNT: Optional[Counter] = None
REQUEST_LATENCY: Optional[Histogram] = None


def init_metrics(app):
    global REQUEST_COUNT, REQUEST_LATENCY
    if not PROM_AVAILABLE:
        logger.info('Prometheus client not available; metrics disabled')
        return

    # Keep labels small to limit cardinality
    REQUEST_COUNT = Counter('http_requests_total', 'Total HTTP Requests', ['method', 'endpoint', 'status'])
    REQUEST_LATENCY = Histogram('http_request_latency_seconds', 'Request latency', ['method', 'endpoint'], buckets=(0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10))

    @app.before_request
    def _prom_before():
        request._start_time = time.time()

    @app.after_request
    def _prom_after(response):
        try:
            elapsed = (time.time() - getattr(request, '_start_time', time.time()))
            REQUEST_LATENCY.labels(request.method, request.path).observe(elapsed)
            REQUEST_COUNT.labels(request.method, request.path, str(response.status_code)).inc()
        except Exception:
            logger.debug('Failed to observe metrics for request')
        return response

    @app.route('/metrics', methods=['GET'])
    def metrics():
        return app.response_class(generate_latest(), mimetype=CONTENT_TYPE_LATEST)
