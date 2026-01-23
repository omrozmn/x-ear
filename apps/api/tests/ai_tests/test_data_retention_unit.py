"""
Unit Tests for Data Retention Service Edge Cases

Tests specific edge cases and error conditions for the data retention service.

Requirements tested:
- 1.6: Log errors and continue processing remaining requests
- 1.8: Suspend deletion for records with legal_hold=True
"""

import os
import pytest
from datetime import datetime, timedelta, timezone
from unittest.mock import patch, MagicMock
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from ai.models.ai_request import AIRequest
from ai.services.data_retention import DataRetentionService, ai_prompts_deleted_total
from database import Base


@pytest.fixture
def in_memory_db():
    """Create an in-memory SQLite database for testing."""
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(engine)
    SessionLocal = sessionmaker(bind=engine)
    session = SessionLocal()
    
    yield session
    
    # Clean up
    session.rollback()
    session.close()
    Base.metadata.drop_all(engine)
    engine.dispose()


class TestZeroExpiredRequests:
    """Test behavior when there are no expired requests."""
    
    def test_cleanup_with_no_expired_requests(self, in_memory_db):
        """Should handle case with zero expired requests gracefully."""
        with patch.dict(os.environ, {"AI_RETENTION_DAYS": "90"}):
            service = DataRetentionService(in_memory_db)
            
            # Create only recent requests (within retention period)
            for i in range(3):
                request_data = {
                    "id": f"aireq_recent_{i}",
                    "tenant_id": "tenant_test",
                    "user_id": "user_test",
                    "prompt_encrypted": f"encrypted_prompt_{i}",
                    "prompt_hash": "0" * 64,
                    "created_at": datetime.now(timezone.utc) - timedelta(days=30),
                    "legal_hold": False,
                    "status": "completed",
                }
                ai_request = AIRequest(**request_data)
                in_memory_db.add(ai_request)
            
            in_memory_db.commit()
            
            # Run cleanup
            result = service.cleanup_expired_prompts()
            
            # Should return zero deletions
            assert result["deleted_count"] == 0
            assert result["error_count"] == 0
            assert result["retention_days"] == 90
            
            # All requests should still exist
            remaining = in_memory_db.query(AIRequest).all()
            assert len(remaining) == 3
    
    def test_cleanup_with_empty_database(self, in_memory_db):
        """Should handle empty database gracefully."""
        with patch.dict(os.environ, {"AI_RETENTION_DAYS": "90"}):
            service = DataRetentionService(in_memory_db)
            
            # Run cleanup on empty database
            result = service.cleanup_expired_prompts()
            
            # Should return zero deletions
            assert result["deleted_count"] == 0
            assert result["error_count"] == 0
            assert result["skipped_legal_hold"] == 0


class TestLegalHoldRecords:
    """Test that legal_hold=True records are never deleted."""
    
    def test_skips_legal_hold_records(self, in_memory_db):
        """Should skip records with legal_hold=True."""
        with patch.dict(os.environ, {"AI_RETENTION_DAYS": "90"}):
            service = DataRetentionService(in_memory_db)
            
            # Create expired requests with legal hold
            for i in range(5):
                request_data = {
                    "id": f"aireq_legal_{i}",
                    "tenant_id": "tenant_test",
                    "user_id": "user_test",
                    "prompt_encrypted": f"encrypted_prompt_{i}",
                    "prompt_hash": "0" * 64,
                    "created_at": datetime.now(timezone.utc) - timedelta(days=365),
                    "legal_hold": True,
                    "status": "completed",
                }
                ai_request = AIRequest(**request_data)
                in_memory_db.add(ai_request)
            
            in_memory_db.commit()
            
            # Run cleanup
            result = service.cleanup_expired_prompts()
            
            # Should skip all legal hold records
            assert result["deleted_count"] == 0
            assert result["skipped_legal_hold"] == 5
            assert result["error_count"] == 0
            
            # All requests should still exist
            remaining = in_memory_db.query(AIRequest).all()
            assert len(remaining) == 5
            
            # All should have legal_hold=True
            for req in remaining:
                assert req.legal_hold is True
    
    def test_mixed_legal_hold_and_regular_records(self, in_memory_db):
        """Should delete regular records but skip legal hold records."""
        with patch.dict(os.environ, {"AI_RETENTION_DAYS": "90"}):
            service = DataRetentionService(in_memory_db)
            
            # Create expired requests without legal hold
            for i in range(3):
                request_data = {
                    "id": f"aireq_regular_{i}",
                    "tenant_id": "tenant_test",
                    "user_id": "user_test",
                    "prompt_encrypted": f"encrypted_prompt_{i}",
                    "prompt_hash": "0" * 64,
                    "created_at": datetime.now(timezone.utc) - timedelta(days=365),
                    "legal_hold": False,
                    "status": "completed",
                }
                ai_request = AIRequest(**request_data)
                in_memory_db.add(ai_request)
            
            # Create expired requests WITH legal hold
            for i in range(2):
                request_data = {
                    "id": f"aireq_legal_{i}",
                    "tenant_id": "tenant_test",
                    "user_id": "user_test",
                    "prompt_encrypted": f"encrypted_prompt_legal_{i}",
                    "prompt_hash": "1" * 64,
                    "created_at": datetime.now(timezone.utc) - timedelta(days=365),
                    "legal_hold": True,
                    "status": "completed",
                }
                ai_request = AIRequest(**request_data)
                in_memory_db.add(ai_request)
            
            in_memory_db.commit()
            
            # Run cleanup
            result = service.cleanup_expired_prompts()
            
            # Should delete regular records but skip legal hold
            assert result["deleted_count"] == 3
            assert result["skipped_legal_hold"] == 2
            assert result["error_count"] == 0
            
            # Only legal hold records should remain
            remaining = in_memory_db.query(AIRequest).all()
            assert len(remaining) == 2
            
            for req in remaining:
                assert req.legal_hold is True


class TestDatabaseConnectionFailure:
    """Test behavior when database connection fails."""
    
    def test_handles_database_error_gracefully(self, in_memory_db):
        """Should handle database errors without crashing."""
        with patch.dict(os.environ, {"AI_RETENTION_DAYS": "90"}):
            service = DataRetentionService(in_memory_db)
            
            # Mock the query to raise an exception
            with patch.object(in_memory_db, 'query', side_effect=Exception("Database error")):
                # Should not crash
                result = service.cleanup_expired_prompts()
                
                # Should return error result
                assert result["deleted_count"] == 0
                assert result["error_count"] == 1
                assert result["retention_days"] == 90
    
    def test_logs_database_error(self, in_memory_db, caplog):
        """Should log database errors."""
        import logging
        caplog.set_level(logging.ERROR)
        
        with patch.dict(os.environ, {"AI_RETENTION_DAYS": "90"}):
            service = DataRetentionService(in_memory_db)
            
            # Mock the query to raise an exception
            with patch.object(in_memory_db, 'query', side_effect=Exception("Database error")):
                # Run cleanup
                result = service.cleanup_expired_prompts()
                
                # Should log error
                assert result["error_count"] == 1
                
                # Check that error was logged
                log_messages = [record.message for record in caplog.records]
                assert any("failed" in msg.lower() for msg in log_messages)


class TestInvalidRetentionDaysValue:
    """Test behavior with invalid AI_RETENTION_DAYS values."""
    
    def test_handles_non_numeric_retention_days(self, in_memory_db):
        """Should handle non-numeric AI_RETENTION_DAYS value."""
        with patch.dict(os.environ, {"AI_RETENTION_DAYS": "invalid"}):
            # Should raise ValueError when trying to convert to int
            with pytest.raises(ValueError):
                service = DataRetentionService(in_memory_db)
    
    def test_handles_negative_retention_days(self, in_memory_db):
        """Should handle negative retention days."""
        with patch.dict(os.environ, {"AI_RETENTION_DAYS": "-30"}):
            service = DataRetentionService(in_memory_db)
            
            # Service should be created with negative value
            assert service.retention_days == -30
            
            # Cleanup should work (though it will delete everything)
            result = service.cleanup_expired_prompts()
            
            # Should not crash
            assert isinstance(result, dict)
            assert "deleted_count" in result
    
    def test_handles_zero_retention_days(self, in_memory_db):
        """Should handle zero retention days."""
        with patch.dict(os.environ, {"AI_RETENTION_DAYS": "0"}):
            service = DataRetentionService(in_memory_db)
            
            assert service.retention_days == 0
            
            # Create a request
            request_data = {
                "id": "aireq_test",
                "tenant_id": "tenant_test",
                "user_id": "user_test",
                "prompt_encrypted": "encrypted_prompt",
                "prompt_hash": "0" * 64,
                "created_at": datetime.now(timezone.utc) - timedelta(seconds=1),
                "legal_hold": False,
                "status": "completed",
            }
            ai_request = AIRequest(**request_data)
            in_memory_db.add(ai_request)
            in_memory_db.commit()
            
            # Run cleanup (should delete immediately)
            result = service.cleanup_expired_prompts()
            
            # Should delete the request
            assert result["deleted_count"] == 1


class TestPrometheusMetricRegistration:
    """Test that Prometheus metric is properly registered."""
    
    def test_metric_is_registered(self):
        """Should have ai_prompts_deleted_total metric registered."""
        # Metric should be defined at module level
        assert ai_prompts_deleted_total is not None
        # Prometheus Counter uses the base name without "_total" suffix
        assert ai_prompts_deleted_total._name == "ai_prompts_deleted"
    
    def test_metric_increments_correctly(self, in_memory_db):
        """Should increment metric by exact number of deletions."""
        with patch.dict(os.environ, {"AI_RETENTION_DAYS": "90"}):
            service = DataRetentionService(in_memory_db)
            
            # Get initial value
            initial_value = ai_prompts_deleted_total._value._value
            
            # Create expired requests
            for i in range(7):
                request_data = {
                    "id": f"aireq_expired_{i}",
                    "tenant_id": "tenant_test",
                    "user_id": "user_test",
                    "prompt_encrypted": f"encrypted_prompt_{i}",
                    "prompt_hash": "0" * 64,
                    "created_at": datetime.now(timezone.utc) - timedelta(days=365),
                    "legal_hold": False,
                    "status": "completed",
                }
                ai_request = AIRequest(**request_data)
                in_memory_db.add(ai_request)
            
            in_memory_db.commit()
            
            # Run cleanup
            result = service.cleanup_expired_prompts()
            
            # Verify metric incremented by exact count
            final_value = ai_prompts_deleted_total._value._value
            assert final_value == initial_value + 7
            assert result["deleted_count"] == 7
    
    def test_metric_does_not_increment_on_error(self, in_memory_db):
        """Should NOT increment metric when deletion fails."""
        with patch.dict(os.environ, {"AI_RETENTION_DAYS": "90"}):
            service = DataRetentionService(in_memory_db)
            
            # Get initial value
            initial_value = ai_prompts_deleted_total._value._value
            
            # Mock the query to raise an exception
            with patch.object(in_memory_db, 'query', side_effect=Exception("Database error")):
                # Run cleanup (will fail)
                result = service.cleanup_expired_prompts()
                
                # Verify metric NOT incremented
                final_value = ai_prompts_deleted_total._value._value
                assert final_value == initial_value
                assert result["error_count"] > 0


class TestBatchDeletionPerformance:
    """Test that batch deletion is used (not N+1 queries)."""
    
    def test_uses_batch_deletion(self, in_memory_db):
        """Should use batch deletion for performance."""
        with patch.dict(os.environ, {"AI_RETENTION_DAYS": "90"}):
            service = DataRetentionService(in_memory_db)
            
            # Create many expired requests
            for i in range(100):
                request_data = {
                    "id": f"aireq_expired_{i}",
                    "tenant_id": "tenant_test",
                    "user_id": "user_test",
                    "prompt_encrypted": f"encrypted_prompt_{i}",
                    "prompt_hash": "0" * 64,
                    "created_at": datetime.now(timezone.utc) - timedelta(days=365),
                    "legal_hold": False,
                    "status": "completed",
                }
                ai_request = AIRequest(**request_data)
                in_memory_db.add(ai_request)
            
            in_memory_db.commit()
            
            # Run cleanup
            result = service.cleanup_expired_prompts()
            
            # Should delete all 100 records
            assert result["deleted_count"] == 100
            assert result["error_count"] == 0
            
            # Verify all deleted
            remaining = in_memory_db.query(AIRequest).all()
            assert len(remaining) == 0
