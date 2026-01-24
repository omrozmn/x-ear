"""Spam Filter Service for Email Content Analysis.

Analyzes email content for spam indicators to prevent deliverability issues.
"""

import logging
import re
from typing import Dict

logger = logging.getLogger(__name__)


class SpamFilterService:
    """Service for analyzing email content for spam indicators."""
    
    # Spam keywords (English + Turkish)
    SPAM_KEYWORDS = [
        # English
        "free money", "click here", "act now", "limited time", "urgent",
        "winner", "congratulations", "prize", "cash", "bonus",
        "viagra", "cialis", "pharmacy", "pills", "medication",
        "weight loss", "diet", "lose weight", "miracle",
        "make money", "work from home", "earn cash", "income",
        "casino", "lottery", "jackpot", "gambling",
        # Turkish
        "ücretsiz para", "tıkla", "acele et", "sınırlı süre",
        "kazanan", "tebrikler", "ödül", "nakit", "bonus",
        "para kazan", "evden çalış", "gelir",
        "kumar", "piyango", "ikramiye"
    ]
    
    def __init__(self):
        """Initialize spam filter service."""
        self.spam_threshold = 10  # Score >= 10 = reject
    
    def check_spam_keywords(self, content: str) -> int:
        """Count spam trigger keywords.
        
        Args:
            content: Email content (subject + body)
            
        Returns:
            int: Spam score from keywords (0-10)
        """
        content_lower = content.lower()
        keyword_count = sum(1 for keyword in self.SPAM_KEYWORDS if keyword in content_lower)
        
        # Each keyword adds 2 points
        return min(keyword_count * 2, 10)
    
    def check_html_text_ratio(self, html: str, text: str) -> int:
        """Check if HTML/text ratio is suspicious.
        
        Args:
            html: HTML body
            text: Plain text body
            
        Returns:
            int: Spam score from ratio (0-3)
        """
        if not html or not text:
            return 0
        
        # Remove HTML tags
        text_from_html = re.sub(r'<[^>]+>', '', html)
        
        # If HTML has very little text, suspicious
        if len(text_from_html) < len(html) * 0.1:
            return 3
        
        return 0
    
    def check_link_density(self, html: str) -> int:
        """Check link density in HTML.
        
        Args:
            html: HTML body
            
        Returns:
            int: Spam score from links (0-3)
        """
        if not html:
            return 0
        
        # Count links
        link_count = len(re.findall(r'<a\s+href=', html, re.IGNORECASE))
        
        # High link density is suspicious
        if link_count > 10:
            return 3
        elif link_count > 5:
            return 2
        elif link_count > 3:
            return 1
        
        return 0
    
    def analyze_content(
        self,
        subject: str,
        html_body: str,
        text_body: str
    ) -> Dict:
        """Calculate spam score and return warnings.
        
        Args:
            subject: Email subject
            html_body: HTML body
            text_body: Plain text body
            
        Returns:
            Dict with spam_score, risk_level, warnings
        """
        # Combine subject and text for keyword analysis
        full_content = f"{subject} {text_body}"
        
        # Calculate individual scores
        keyword_score = self.check_spam_keywords(full_content)
        ratio_score = self.check_html_text_ratio(html_body, text_body)
        link_score = self.check_link_density(html_body)
        
        # Check ALL CAPS
        caps_score = 0
        if subject and subject.isupper() and len(subject) > 10:
            caps_score = 2
        
        # Check excessive punctuation
        punct_score = 0
        if subject and subject.count('!') > 2:
            punct_score = 1
        
        # Total score
        total_score = keyword_score + ratio_score + link_score + caps_score + punct_score
        
        # Determine risk level
        if total_score < 5:
            risk_level = "LOW"
        elif total_score < 10:
            risk_level = "MEDIUM"
        elif total_score < 15:
            risk_level = "HIGH"
        else:
            risk_level = "CRITICAL"
        
        # Generate warnings
        warnings = []
        if keyword_score > 0:
            warnings.append(f"Contains {keyword_score//2} spam keywords")
        if ratio_score > 0:
            warnings.append("Suspicious HTML/text ratio")
        if link_score > 0:
            warnings.append("High link density")
        if caps_score > 0:
            warnings.append("Subject is ALL CAPS")
        if punct_score > 0:
            warnings.append("Excessive punctuation in subject")
        
        logger.info(
            "Spam analysis complete",
            extra={
                "spam_score": total_score,
                "risk_level": risk_level,
                "warnings": warnings
            }
        )
        
        return {
            "spam_score": total_score,
            "risk_level": risk_level,
            "warnings": warnings,
            "should_reject": total_score >= self.spam_threshold
        }


def get_spam_filter_service() -> SpamFilterService:
    """Get SpamFilterService instance."""
    return SpamFilterService()
