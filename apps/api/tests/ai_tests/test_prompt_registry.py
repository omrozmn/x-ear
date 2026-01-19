"""
Property-based tests for Prompt Template Registry.

**Feature: ai-layer-architecture, Property 20: Prompt Template Hash Binding**
**Validates: Requirements 26.1, 26.2, 26.3**

Tests that:
- Templates have SHA-256 content hashes
- Hash verification works correctly
- Hash mismatch is detected and rejected
- Templates can be loaded from files
- Template rendering works with variables
"""

import sys
from pathlib import Path
import tempfile
import json

# Add the api directory to the path
_current_file = Path(__file__).resolve()
_api_dir = _current_file.parent.parent.parent
if str(_api_dir) not in sys.path:
    sys.path.insert(0, str(_api_dir))

import pytest
from hypothesis import given, strategies as st, settings

from ai.runtime.prompt_registry import (
    PromptTemplate,
    PromptRegistry,
    TemplateCategory,
    PromptTemplateHashMismatchError,
    PromptTemplateNotFoundError,
    get_registry,
)


# =============================================================================
# PromptTemplate Tests
# =============================================================================

class TestPromptTemplate:
    """Tests for PromptTemplate class."""
    
    def test_compute_hash_deterministic(self):
        """Hash computation is deterministic."""
        content = "Test prompt content"
        hash1 = PromptTemplate.compute_hash(content)
        hash2 = PromptTemplate.compute_hash(content)
        
        assert hash1 == hash2
        assert len(hash1) == 64  # SHA-256 hex length
    
    def test_compute_hash_different_content(self):
        """Different content produces different hashes."""
        hash1 = PromptTemplate.compute_hash("Content A")
        hash2 = PromptTemplate.compute_hash("Content B")
        
        assert hash1 != hash2
    
    def test_verify_hash_valid(self):
        """verify_hash returns True for valid hash."""
        content = "Test prompt content"
        content_hash = PromptTemplate.compute_hash(content)
        
        template = PromptTemplate(
            template_id="test",
            version="1.0.0",
            category=TemplateCategory.INTENT,
            content=content,
            content_hash=content_hash,
        )
        
        assert template.verify_hash() is True
    
    def test_verify_hash_invalid(self):
        """verify_hash returns False for invalid hash."""
        template = PromptTemplate(
            template_id="test",
            version="1.0.0",
            category=TemplateCategory.INTENT,
            content="Test content",
            content_hash="invalid_hash",
        )
        
        assert template.verify_hash() is False
    
    @given(st.text(min_size=1, max_size=1000))
    @settings(max_examples=50)
    def test_hash_verification_property(self, content: str):
        """
        Property: Hash verification is consistent.
        A template created with computed hash always verifies.
        """
        content_hash = PromptTemplate.compute_hash(content)
        
        template = PromptTemplate(
            template_id="test",
            version="1.0.0",
            category=TemplateCategory.INTENT,
            content=content,
            content_hash=content_hash,
        )
        
        assert template.verify_hash() is True
    
    def test_render_with_variables(self):
        """Template rendering substitutes variables."""
        template = PromptTemplate(
            template_id="test",
            version="1.0.0",
            category=TemplateCategory.INTENT,
            content="Hello {{name}}, your role is {{role}}.",
            content_hash=PromptTemplate.compute_hash("Hello {{name}}, your role is {{role}}."),
            variables=["name", "role"],
        )
        
        result = template.render(name="Alice", role="admin")
        
        assert result == "Hello Alice, your role is admin."
    
    def test_render_missing_variable_raises(self):
        """Rendering with missing variables raises ValueError."""
        template = PromptTemplate(
            template_id="test",
            version="1.0.0",
            category=TemplateCategory.INTENT,
            content="Hello {{name}}",
            content_hash=PromptTemplate.compute_hash("Hello {{name}}"),
            variables=["name"],
        )
        
        with pytest.raises(ValueError) as exc_info:
            template.render()  # Missing 'name'
        
        assert "name" in str(exc_info.value)
    
    def test_to_dict(self):
        """to_dict returns correct structure."""
        content = "Test content"
        template = PromptTemplate(
            template_id="test_template",
            version="1.0.0",
            category=TemplateCategory.INTENT,
            content=content,
            content_hash=PromptTemplate.compute_hash(content),
            description="Test description",
            author="test_author",
            variables=["var1", "var2"],
        )
        
        result = template.to_dict()
        
        assert result["templateId"] == "test_template"
        assert result["version"] == "1.0.0"
        assert result["category"] == "intent"
        assert result["description"] == "Test description"
        assert result["author"] == "test_author"
        assert result["variables"] == ["var1", "var2"]
        assert "contentHash" in result
        assert "createdAt" in result


# =============================================================================
# PromptRegistry Tests
# =============================================================================

class TestPromptRegistry:
    """Tests for PromptRegistry class."""
    
    def test_register_template(self):
        """Templates can be registered."""
        registry = PromptRegistry(prompts_dir=Path("/nonexistent"))
        
        content = "Test prompt"
        template = PromptTemplate(
            template_id="test",
            version="1.0.0",
            category=TemplateCategory.INTENT,
            content=content,
            content_hash=PromptTemplate.compute_hash(content),
        )
        
        registry.register_template(template)
        
        retrieved = registry.get_template("test")
        assert retrieved.template_id == "test"
        assert retrieved.content == content
    
    def test_register_template_invalid_hash_raises(self):
        """Registering template with invalid hash raises error."""
        registry = PromptRegistry(prompts_dir=Path("/nonexistent"))
        
        template = PromptTemplate(
            template_id="test",
            version="1.0.0",
            category=TemplateCategory.INTENT,
            content="Test content",
            content_hash="invalid_hash",
        )
        
        with pytest.raises(PromptTemplateHashMismatchError):
            registry.register_template(template)
    
    def test_get_template_not_found_raises(self):
        """Getting non-existent template raises error."""
        registry = PromptRegistry(prompts_dir=Path("/nonexistent"))
        registry._loaded = True  # Skip loading
        
        with pytest.raises(PromptTemplateNotFoundError) as exc_info:
            registry.get_template("nonexistent")
        
        assert "nonexistent" in str(exc_info.value)
    
    def test_get_template_specific_version(self):
        """Can get specific version of template."""
        registry = PromptRegistry(prompts_dir=Path("/nonexistent"))
        
        # Register two versions
        for version in ["1.0.0", "2.0.0"]:
            content = f"Content v{version}"
            template = PromptTemplate(
                template_id="test",
                version=version,
                category=TemplateCategory.INTENT,
                content=content,
                content_hash=PromptTemplate.compute_hash(content),
            )
            registry.register_template(template)
        
        # Get specific version
        v1 = registry.get_template("test", version="1.0.0")
        v2 = registry.get_template("test", version="2.0.0")
        
        assert "v1.0.0" in v1.content
        assert "v2.0.0" in v2.content
    
    def test_get_template_latest_version(self):
        """Getting without version returns latest."""
        registry = PromptRegistry(prompts_dir=Path("/nonexistent"))
        
        # Register versions out of order
        for version in ["1.0.0", "3.0.0", "2.0.0"]:
            content = f"Content v{version}"
            template = PromptTemplate(
                template_id="test",
                version=version,
                category=TemplateCategory.INTENT,
                content=content,
                content_hash=PromptTemplate.compute_hash(content),
            )
            registry.register_template(template)
        
        # Get latest (should be 3.0.0)
        latest = registry.get_template("test")
        assert latest.version == "3.0.0"
    
    def test_get_template_by_hash(self):
        """Can get template by content hash."""
        registry = PromptRegistry(prompts_dir=Path("/nonexistent"))
        
        content = "Specific content"
        content_hash = PromptTemplate.compute_hash(content)
        
        template = PromptTemplate(
            template_id="test",
            version="1.0.0",
            category=TemplateCategory.INTENT,
            content=content,
            content_hash=content_hash,
        )
        registry.register_template(template)
        
        # Get by hash
        retrieved = registry.get_template_with_hash("test", content_hash)
        assert retrieved.content == content
    
    def test_get_template_by_hash_mismatch_raises(self):
        """Getting by wrong hash raises error."""
        registry = PromptRegistry(prompts_dir=Path("/nonexistent"))
        
        content = "Test content"
        template = PromptTemplate(
            template_id="test",
            version="1.0.0",
            category=TemplateCategory.INTENT,
            content=content,
            content_hash=PromptTemplate.compute_hash(content),
        )
        registry.register_template(template)
        
        with pytest.raises(PromptTemplateHashMismatchError):
            registry.get_template_with_hash("test", "wrong_hash")
    
    def test_create_template(self):
        """create_template auto-computes hash."""
        registry = PromptRegistry(prompts_dir=Path("/nonexistent"))
        
        template = registry.create_template(
            template_id="new_template",
            version="1.0.0",
            category=TemplateCategory.PLANNING,
            content="New template content",
            description="A new template",
        )
        
        assert template.template_id == "new_template"
        assert template.verify_hash() is True
        
        # Should be retrievable
        retrieved = registry.get_template("new_template")
        assert retrieved.content == "New template content"
    
    def test_list_templates(self):
        """list_templates returns all templates."""
        registry = PromptRegistry(prompts_dir=Path("/nonexistent"))
        
        # Register some templates
        for i in range(3):
            content = f"Content {i}"
            template = PromptTemplate(
                template_id=f"template_{i}",
                version="1.0.0",
                category=TemplateCategory.INTENT,
                content=content,
                content_hash=PromptTemplate.compute_hash(content),
            )
            registry.register_template(template)
        
        templates = registry.list_templates()
        
        assert len(templates) == 3
        template_ids = {t["templateId"] for t in templates}
        assert template_ids == {"template_0", "template_1", "template_2"}


# =============================================================================
# File Loading Tests
# =============================================================================

class TestFileLoading:
    """Tests for loading templates from files."""
    
    def test_load_from_directory(self):
        """Templates can be loaded from directory."""
        with tempfile.TemporaryDirectory() as tmpdir:
            tmppath = Path(tmpdir)
            
            # Create template file
            content = "Test template content"
            content_hash = PromptTemplate.compute_hash(content)
            
            (tmppath / "test.txt").write_text(content)
            (tmppath / "test.json").write_text(json.dumps({
                "templateId": "test",
                "version": "1.0.0",
                "category": "intent",
                "contentHash": content_hash,
                "description": "Test template",
                "variables": [],
            }))
            
            # Load
            registry = PromptRegistry(prompts_dir=tmppath)
            count = registry.load_templates()
            
            assert count == 1
            
            template = registry.get_template("test")
            assert template.content == content
            assert template.verify_hash() is True
    
    def test_load_detects_hash_mismatch(self):
        """Loading detects tampered templates."""
        with tempfile.TemporaryDirectory() as tmpdir:
            tmppath = Path(tmpdir)
            
            # Create template with wrong hash
            content = "Test template content"
            wrong_hash = "0" * 64  # Wrong hash
            
            (tmppath / "test.txt").write_text(content)
            (tmppath / "test.json").write_text(json.dumps({
                "templateId": "test",
                "version": "1.0.0",
                "category": "intent",
                "contentHash": wrong_hash,
                "variables": [],
            }))
            
            # Load should raise
            registry = PromptRegistry(prompts_dir=tmppath)
            
            with pytest.raises(PromptTemplateHashMismatchError):
                registry.load_templates()
    
    def test_load_nonexistent_directory(self):
        """Loading from nonexistent directory returns 0."""
        registry = PromptRegistry(prompts_dir=Path("/nonexistent/path"))
        count = registry.load_templates()
        
        assert count == 0


# =============================================================================
# Hash Binding Property Tests
# =============================================================================

class TestHashBindingProperties:
    """Property-based tests for hash binding."""
    
    @given(st.text(min_size=1, max_size=500))
    @settings(max_examples=100)
    def test_hash_is_deterministic(self, content: str):
        """
        Property: Hash computation is deterministic.
        Same content always produces same hash.
        """
        hash1 = PromptTemplate.compute_hash(content)
        hash2 = PromptTemplate.compute_hash(content)
        
        assert hash1 == hash2
    
    @given(
        st.text(min_size=1, max_size=200),
        st.text(min_size=1, max_size=200).filter(lambda x: x != "")
    )
    @settings(max_examples=100)
    def test_different_content_different_hash(self, content1: str, content2: str):
        """
        Property: Different content produces different hashes.
        (With very high probability for non-trivial content)
        """
        if content1 == content2:
            return  # Skip if same
        
        hash1 = PromptTemplate.compute_hash(content1)
        hash2 = PromptTemplate.compute_hash(content2)
        
        assert hash1 != hash2
    
    @given(st.text(min_size=1, max_size=500))
    @settings(max_examples=50)
    def test_template_with_computed_hash_verifies(self, content: str):
        """
        Property: Template created with computed hash always verifies.
        """
        content_hash = PromptTemplate.compute_hash(content)
        
        template = PromptTemplate(
            template_id="test",
            version="1.0.0",
            category=TemplateCategory.INTENT,
            content=content,
            content_hash=content_hash,
        )
        
        assert template.verify_hash() is True
    
    @given(
        st.text(min_size=1, max_size=200),
        st.text(min_size=64, max_size=64, alphabet="0123456789abcdef")
    )
    @settings(max_examples=50)
    def test_wrong_hash_fails_verification(self, content: str, wrong_hash: str):
        """
        Property: Template with wrong hash fails verification.
        """
        correct_hash = PromptTemplate.compute_hash(content)
        
        if wrong_hash == correct_hash:
            return  # Skip if accidentally correct
        
        template = PromptTemplate(
            template_id="test",
            version="1.0.0",
            category=TemplateCategory.INTENT,
            content=content,
            content_hash=wrong_hash,
        )
        
        assert template.verify_hash() is False


# =============================================================================
# Integration with Real Templates
# =============================================================================

class TestRealTemplates:
    """Tests with real template files."""
    
    def test_load_intent_classifier_template(self):
        """Can load the intent_classifier template."""
        # Use the actual prompts directory
        prompts_dir = Path(__file__).parent.parent.parent / "ai" / "prompts"
        
        if not (prompts_dir / "intent_classifier.txt").exists():
            pytest.skip("intent_classifier template not found")
        
        registry = PromptRegistry(prompts_dir=prompts_dir)
        count = registry.load_templates()
        
        assert count >= 1
        
        template = registry.get_template("intent_classifier")
        assert template.verify_hash() is True
        assert "intent" in template.content.lower()
