"""
Prompt Template Registry for AI Layer

Manages versioned prompt templates with hash verification.
Templates are loaded from ai/prompts/ directory.

Requirements:
- 20.1: Store prompt templates in a versioned registry at ai/prompts/
- 20.2: Each template has template_id, version, content, created_at, author
- 26.1: Each template has a content hash (SHA-256)
- 26.3: Verify hash matches on load
- 26.4: Reject request if hash mismatch detected
"""

import hashlib
import json
import os
from dataclasses import dataclass, field
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, Optional, List
from enum import Enum
import logging

logger = logging.getLogger(__name__)


class TemplateCategory(str, Enum):
    """Categories of prompt templates."""
    INTENT = "intent"  # Intent classification
    PLANNING = "planning"  # Action planning
    EXECUTION = "execution"  # Execution guidance
    VALIDATION = "validation"  # Output validation
    SYSTEM = "system"  # System prompts


@dataclass
class PromptTemplate:
    """
    A versioned prompt template with hash verification.
    
    Attributes:
        template_id: Unique identifier for the template
        version: Semantic version string (e.g., "1.0.0")
        category: Template category
        content: The actual prompt template content
        content_hash: SHA-256 hash of content for integrity verification
        description: Human-readable description
        author: Who created/modified this template
        created_at: When the template was created
        variables: List of variable names expected in the template
    """
    template_id: str
    version: str
    category: TemplateCategory
    content: str
    content_hash: str
    description: str = ""
    author: str = "system"
    created_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
    variables: List[str] = field(default_factory=list)
    
    @staticmethod
    def compute_hash(content: str) -> str:
        """Compute SHA-256 hash of content."""
        return hashlib.sha256(content.encode('utf-8')).hexdigest()
    
    def verify_hash(self) -> bool:
        """Verify that content hash matches computed hash."""
        computed = self.compute_hash(self.content)
        return computed == self.content_hash
    
    def render(self, **kwargs) -> str:
        """
        Render the template with provided variables.
        
        Args:
            **kwargs: Variable values to substitute
            
        Returns:
            Rendered template string
            
        Raises:
            ValueError: If required variables are missing
        """
        missing = set(self.variables) - set(kwargs.keys())
        if missing:
            raise ValueError(f"Missing template variables: {missing}")
        
        result = self.content
        for var, value in kwargs.items():
            result = result.replace(f"{{{{{var}}}}}", str(value))
        
        return result
    
    def to_dict(self) -> dict:
        """Convert to dictionary for serialization."""
        return {
            "templateId": self.template_id,
            "version": self.version,
            "category": self.category.value,
            "contentHash": self.content_hash,
            "description": self.description,
            "author": self.author,
            "createdAt": self.created_at.isoformat(),
            "variables": self.variables,
        }
    
    @classmethod
    def from_dict(cls, data: dict, content: str) -> "PromptTemplate":
        """Create from dictionary and content."""
        return cls(
            template_id=data["templateId"],
            version=data["version"],
            category=TemplateCategory(data["category"]),
            content=content,
            content_hash=data["contentHash"],
            description=data.get("description", ""),
            author=data.get("author", "system"),
            created_at=datetime.fromisoformat(data["createdAt"]) if "createdAt" in data else datetime.now(timezone.utc),
            variables=data.get("variables", []),
        )


class PromptTemplateHashMismatchError(Exception):
    """Raised when prompt template hash verification fails."""
    def __init__(self, template_id: str, expected_hash: str, actual_hash: str):
        self.template_id = template_id
        self.expected_hash = expected_hash
        self.actual_hash = actual_hash
        super().__init__(
            f"Prompt template hash mismatch for '{template_id}': "
            f"expected {expected_hash[:16]}..., got {actual_hash[:16]}..."
        )


class PromptTemplateNotFoundError(Exception):
    """Raised when a prompt template is not found."""
    def __init__(self, template_id: str, version: Optional[str] = None):
        self.template_id = template_id
        self.version = version
        msg = f"Prompt template not found: {template_id}"
        if version:
            msg += f" (version {version})"
        super().__init__(msg)


class PromptRegistry:
    """
    Registry for managing prompt templates.
    
    Templates are loaded from the prompts directory and cached.
    Hash verification is performed on load.
    """
    
    def __init__(self, prompts_dir: Optional[Path] = None):
        """
        Initialize the registry.
        
        Args:
            prompts_dir: Directory containing prompt templates.
                        Defaults to ai/prompts/ relative to this file.
        """
        if prompts_dir is None:
            # Default to ai/prompts/ directory
            prompts_dir = Path(__file__).parent.parent / "prompts"
        
        self.prompts_dir = Path(prompts_dir)
        self._templates: Dict[str, Dict[str, PromptTemplate]] = {}  # {template_id: {version: template}}
        self._loaded = False
    
    def _load_template_file(self, filepath: Path) -> Optional[PromptTemplate]:
        """Load a single template file."""
        try:
            # Read metadata from JSON sidecar file
            meta_path = filepath.with_suffix('.json')
            if not meta_path.exists():
                logger.warning(f"No metadata file for template: {filepath}")
                return None
            
            with open(meta_path, 'r', encoding='utf-8') as f:
                metadata = json.load(f)
            
            # Read content from template file
            with open(filepath, 'r', encoding='utf-8') as f:
                content = f.read()
            
            # Create template
            template = PromptTemplate.from_dict(metadata, content)
            
            # Verify hash
            if not template.verify_hash():
                actual_hash = PromptTemplate.compute_hash(content)
                raise PromptTemplateHashMismatchError(
                    template.template_id,
                    template.content_hash,
                    actual_hash
                )
            
            return template
            
        except PromptTemplateHashMismatchError:
            raise
        except Exception as e:
            logger.error(f"Failed to load template {filepath}: {e}")
            return None
    
    def load_templates(self, verify_hashes: bool = True) -> int:
        """
        Load all templates from the prompts directory.
        
        Args:
            verify_hashes: If True, verify content hashes on load
            
        Returns:
            Number of templates loaded
            
        Raises:
            PromptTemplateHashMismatchError: If hash verification fails
        """
        if not self.prompts_dir.exists():
            logger.warning(f"Prompts directory does not exist: {self.prompts_dir}")
            self._loaded = True
            return 0
        
        count = 0
        for filepath in self.prompts_dir.glob("*.txt"):
            template = self._load_template_file(filepath)
            if template:
                if template.template_id not in self._templates:
                    self._templates[template.template_id] = {}
                self._templates[template.template_id][template.version] = template
                count += 1
                logger.debug(f"Loaded template: {template.template_id} v{template.version}")
        
        self._loaded = True
        logger.info(f"Loaded {count} prompt templates")
        return count
    
    def get_template(
        self,
        template_id: str,
        version: Optional[str] = None,
    ) -> PromptTemplate:
        """
        Get a template by ID and optional version.
        
        Args:
            template_id: Template identifier
            version: Specific version (if None, returns latest)
            
        Returns:
            The requested template
            
        Raises:
            PromptTemplateNotFoundError: If template not found
        """
        if not self._loaded:
            self.load_templates()
        
        if template_id not in self._templates:
            raise PromptTemplateNotFoundError(template_id, version)
        
        versions = self._templates[template_id]
        
        if version:
            if version not in versions:
                raise PromptTemplateNotFoundError(template_id, version)
            return versions[version]
        
        # Return latest version (simple string sort, assumes semver)
        latest_version = sorted(versions.keys())[-1]
        return versions[latest_version]
    
    def get_template_with_hash(
        self,
        template_id: str,
        expected_hash: str,
    ) -> PromptTemplate:
        """
        Get a template by ID and verify its hash.
        
        Args:
            template_id: Template identifier
            expected_hash: Expected content hash
            
        Returns:
            The template if hash matches
            
        Raises:
            PromptTemplateNotFoundError: If template not found
            PromptTemplateHashMismatchError: If hash doesn't match
        """
        if not self._loaded:
            self.load_templates()
        
        if template_id not in self._templates:
            raise PromptTemplateNotFoundError(template_id)
        
        # Search all versions for matching hash
        for version, template in self._templates[template_id].items():
            if template.content_hash == expected_hash:
                return template
        
        # No matching hash found
        available_hashes = [t.content_hash[:16] for t in self._templates[template_id].values()]
        raise PromptTemplateHashMismatchError(
            template_id,
            expected_hash,
            f"none of {available_hashes}"
        )
    
    def register_template(self, template: PromptTemplate) -> None:
        """
        Register a template in the registry.
        
        Args:
            template: Template to register
            
        Raises:
            PromptTemplateHashMismatchError: If template hash is invalid
        """
        if not template.verify_hash():
            actual_hash = PromptTemplate.compute_hash(template.content)
            raise PromptTemplateHashMismatchError(
                template.template_id,
                template.content_hash,
                actual_hash
            )
        
        if template.template_id not in self._templates:
            self._templates[template.template_id] = {}
        
        self._templates[template.template_id][template.version] = template
    
    def list_templates(self) -> List[Dict]:
        """List all registered templates (metadata only)."""
        if not self._loaded:
            self.load_templates()
        
        result = []
        for template_id, versions in self._templates.items():
            for version, template in versions.items():
                result.append(template.to_dict())
        
        return result
    
    def create_template(
        self,
        template_id: str,
        version: str,
        category: TemplateCategory,
        content: str,
        description: str = "",
        author: str = "system",
        variables: Optional[List[str]] = None,
    ) -> PromptTemplate:
        """
        Create a new template with auto-computed hash.
        
        Args:
            template_id: Unique identifier
            version: Version string
            category: Template category
            content: Template content
            description: Human-readable description
            author: Author name
            variables: List of variable names
            
        Returns:
            The created template
        """
        content_hash = PromptTemplate.compute_hash(content)
        
        template = PromptTemplate(
            template_id=template_id,
            version=version,
            category=category,
            content=content,
            content_hash=content_hash,
            description=description,
            author=author,
            variables=variables or [],
        )
        
        self.register_template(template)
        return template


# Global registry instance
_registry: Optional[PromptRegistry] = None


def get_registry() -> PromptRegistry:
    """Get the global prompt registry instance."""
    global _registry
    if _registry is None:
        _registry = PromptRegistry()
    return _registry


def get_template(template_id: str, version: Optional[str] = None) -> PromptTemplate:
    """Convenience function to get a template."""
    return get_registry().get_template(template_id, version)


def get_template_by_hash(template_id: str, expected_hash: str) -> PromptTemplate:
    """Convenience function to get a template by hash."""
    return get_registry().get_template_with_hash(template_id, expected_hash)
