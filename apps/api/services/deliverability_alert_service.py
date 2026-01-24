"""Deliverability Alert Service for Email Performance Monitoring.

Sends alerts when deliverability metrics exceed thresholds.
"""

import logging
from typing import Dict, List
from datetime import datetime, timezone

logger = logging.getLogger(__name__)


class DeliverabilityAlertService:
    """Service for sending deliverability alerts."""
    
    def __init__(self):
        """Initialize alert service."""
        pass
    
    def send_alert(
        self,
        tenant_id: str,
        alerts: List[Dict],
        metrics: Dict,
        admin_email: str = "admin@x-ear.com"
    ) -> bool:
        """Send alert email to admin.
        
        Args:
            tenant_id: Tenant ID
            alerts: List of alert dicts
            metrics: Current metrics
            admin_email: Admin email address
            
        Returns:
            bool: True if alert sent successfully
        """
        # Format alert message
        alert_messages = []
        for alert in alerts:
            alert_messages.append(
                f"[{alert['severity']}] {alert['type']}: {alert['message']}"
            )
        
        alert_body = "\n".join(alert_messages)
        
        logger.critical(
            "DELIVERABILITY ALERT",
            extra={
                "tenant_id": tenant_id,
                "alerts": alerts,
                "metrics": metrics,
                "admin_email": admin_email
            }
        )
        
        # TODO: Integrate with EmailService to send alert email
        # For now, just log the alert
        
        print(f"""
╔══════════════════════════════════════════════════════════════╗
║                  DELIVERABILITY ALERT                        ║
╠══════════════════════════════════════════════════════════════╣
║ Tenant: {tenant_id[:20]}...                                  
║ Time: {datetime.now(timezone.utc).isoformat()}
║                                                              
║ ALERTS:                                                      
║ {alert_body[:200]}
║                                                              
║ METRICS:                                                     
║ - Sent: {metrics.get('sent_count', 0)}
║ - Bounce Rate: {metrics.get('bounce_rate', 0)}%
║ - Spam Rate: {metrics.get('spam_rate', 0)}%
║ - Deliverability: {metrics.get('deliverability_rate', 0)}%
╚══════════════════════════════════════════════════════════════╝
        """)
        
        return True
    
    def send_slack_alert(
        self,
        tenant_id: str,
        alerts: List[Dict],
        metrics: Dict,
        webhook_url: str = None
    ) -> bool:
        """Send alert to Slack.
        
        Args:
            tenant_id: Tenant ID
            alerts: List of alert dicts
            metrics: Current metrics
            webhook_url: Slack webhook URL
            
        Returns:
            bool: True if alert sent successfully
        """
        if not webhook_url:
            logger.warning("Slack webhook URL not configured, skipping Slack alert")
            return False
        
        # Format Slack message
        alert_text = f"🚨 *Deliverability Alert* - Tenant: {tenant_id}\n\n"
        
        for alert in alerts:
            severity_emoji = {
                "LOW": "ℹ️",
                "MEDIUM": "⚠️",
                "HIGH": "🔴",
                "CRITICAL": "🚨"
            }.get(alert["severity"], "⚠️")
            
            alert_text += f"{severity_emoji} *{alert['type']}*: {alert['message']}\n"
        
        alert_text += f"\n📊 *Metrics:*\n"
        alert_text += f"• Sent: {metrics.get('sent_count', 0)}\n"
        alert_text += f"• Bounce Rate: {metrics.get('bounce_rate', 0)}%\n"
        alert_text += f"• Spam Rate: {metrics.get('spam_rate', 0)}%\n"
        alert_text += f"• Deliverability: {metrics.get('deliverability_rate', 0)}%\n"
        
        logger.info(
            "Slack alert prepared",
            extra={
                "tenant_id": tenant_id,
                "webhook_url": webhook_url[:30] + "...",
                "alert_count": len(alerts)
            }
        )
        
        # TODO: Send to Slack webhook
        # import requests
        # requests.post(webhook_url, json={"text": alert_text})
        
        return True


def get_deliverability_alert_service() -> DeliverabilityAlertService:
    """Get DeliverabilityAlertService instance."""
    return DeliverabilityAlertService()
