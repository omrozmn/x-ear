"""AI Email Safety Service for Risk Classification.

Enforces safety controls on AI-generated emails to prevent abuse and maintain reputation.
"""

import logging
import re
from typing import List, Tuple

logger = logging.getLogger(__name__)


class AIEmailSafetyService:
    """Service for enforcing safety controls on AI-generated emails."""
    
    # Blocked patterns for AI emails
    BLOCKED_PATTERNS = [
        # Financial offers
        r'\b(loan|credit|mortgage|investment|bitcoin|crypto)\b',
        # Urgent actions
        r'\b(urgent|immediately|act now|limited time|expires)\b',
        # External links (suspicious)
        r'http[s]?://(?!x-ear\.com)',
        # Attachments (not allowed in AI emails)
        r'\b(attachment|attached|download)\b',
        # Personal info requests
        r'\b(password|credit card|ssn|social security)\b',
    ]
    
    def __init__(self):
        """Initialize AI email safety service."""
        pass
    
    def check_blocked_patterns(self, content: str) -> List[str]:
        """Check for blocked patterns in content.
        
        Args:
            content: Email content (subject + body)
            
        Returns:
            List[str]: List of matched blocked patterns
        """
        content_lower = content.lower()
        matched_patterns = []
        
        for pattern in self.BLOCKED_PATTERNS:
            if re.search(pattern, content_lower, re.IGNORECASE):
                matched_patterns.append(pattern)
        
        return matched_patterns
    
    def classify_risk_level(
        self,
        content: str,
        scenario: str
    ) -> str:
        """Classify AI email as LOW, MEDIUM, HIGH, CRITICAL.
        
        Args:
            content: Email content
            scenario: Email scenario
            
        Returns:
            str: Risk level (LOW, MEDIUM, HIGH, CRITICAL)
        """
        blocked_patterns = self.check_blocked_patterns(content)
        
        # CRITICAL: Contains blocked patterns
        if len(blocked_patterns) >= 3:
            return "CRITICAL"
        
        # HIGH: Contains some blocked patterns
        if len(blocked_patterns) >= 1:
            return "HIGH"
        
        # MEDIUM: Long content or promotional scenario
        if len(content) > 1000 or "promotional" in scenario.lower():
            return "MEDIUM"
        
        # LOW: Short transactional emails
        return "LOW"
    
    def requires_approval(self, risk_level: str) -> bool:
        """Check if risk level requires human approval.
        
        Args:
            risk_level: Risk level (LOW, MEDIUM, HIGH, CRITICAL)
            
        Returns:
            bool: True if approval required
        """
        return risk_level in ["HIGH", "CRITICAL"]


def get_ai_email_safety_service() -> AIEmailSafetyService:
    """Get AIEmailSafetyService instance."""
    return AIEmailSafetyService()
