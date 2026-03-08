"""
Bulk Import and Rollback Tools for AI Layer
"""
import os
import pandas as pd
from typing import Any, Dict, List, Optional
from datetime import datetime, timezone
import logging

from ai.tools import (
    register_tool,
    ToolParameter,
    ToolCategory,
    RiskLevel,
    ToolExecutionMode,
    ToolExecutionResult,
    get_tool_registry,
)
from core.database import SessionLocal, unbound_session
from core.models.bulk_import import BulkImportBatch, BulkImportRecord
from core.models.user import ActivityLog

logger = logging.getLogger(__name__)

# Ensure temp directory exists for generated files
TEMP_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "instance", "temp")
os.makedirs(TEMP_DIR, exist_ok=True)

@register_tool(
    tool_id="generate_import_template",
    name="Generate Import Template",
    description="Generates an Excel template with the correct columns for a specific bulk import operation.",
    category=ToolCategory.REPORT,
    risk_level=RiskLevel.LOW,
    schema_version="1.0.0",
    parameters=[
        ToolParameter(
            name="target_tool_id",
            type="string",
            description="The tool ID to generate a template for (e.g., 'createParty', 'createSale')",
            required=True,
        ),
    ],
    returns="Download path or base64 URL for the Excel template",
    requires_approval=False,
)
def generate_import_template(
    params: Dict[str, Any],
    mode: ToolExecutionMode,
) -> ToolExecutionResult:
    """Generate an Excel template for a target tool."""
    target_tool_id = params["target_tool_id"]
    
    try:
        registry = get_tool_registry()
        tool = registry.get_tool(target_tool_id)
        
        # Filter out system parameters like tenant_id
        excluded_params = ["tenant_id", "user_id"]
        headers = [p.name for p in tool.parameters if p.name not in excluded_params]
        
        # Mark required fields with *
        display_headers = []
        for p in tool.parameters:
            if p.name in excluded_params:
                continue
            header = p.name
            if p.required:
                header += " *"
            display_headers.append(header)
            
        # Create empty DataFrame with headers
        df = pd.DataFrame(columns=display_headers)
        
        filename = f"template_{target_tool_id}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.xlsx"
        filepath = os.path.join(TEMP_DIR, filename)
        
        df.to_excel(filepath, index=False)
        
        # In a real environment, we'd return a URL. Here we return the filepath relative to instance
        relative_path = os.path.join("temp", filename)
        
        return ToolExecutionResult(
            tool_id="generate_import_template",
            success=True,
            mode=mode,
            result={
                "message": f"Template generated successfully for {target_tool_id}.",
                "headers": headers,
                "download_path": relative_path,
                "instructions": "Please fill the Excel file and provide it back for 'execute_smart_bulk_import'. Columns marked with * are required."
            },
        )
    except Exception as e:
        logger.error(f"Failed to generate template: {e}")
        return ToolExecutionResult(
            tool_id="generate_import_template",
            success=False,
            mode=mode,
            error=str(e),
        )

@register_tool(
    tool_id="execute_smart_bulk_import",
    name="Execute Smart Bulk Import",
    description="Processes an Excel file and executes a specific tool for each row to import data in bulk.",
    category=ToolCategory.ADMIN,
    risk_level=RiskLevel.HIGH,
    schema_version="1.0.0",
    parameters=[
        ToolParameter(
            name="file_path",
            type="string",
            description="Path to the uploaded Excel file",
            required=True,
        ),
        ToolParameter(
            name="target_tool_id",
            type="string",
            description="The tool ID to execute for each row (e.g., 'createParty')",
            required=True,
        ),
        ToolParameter(
            name="column_mapping",
            type="object",
            description="Mapping between tool parameters and Excel column names {tool_param: excel_col}",
            required=True,
        ),
        ToolParameter(
            name="tenant_id",
            type="string",
            description="Tenant ID",
            required=False,
            default="default",
        ),
    ],
    returns="Summary of the import operation",
    requires_approval=True,
)
def execute_smart_bulk_import(
    params: Dict[str, Any],
    mode: ToolExecutionMode,
) -> ToolExecutionResult:
    """Execute bulk import by calling a target tool for each row."""
    file_path = params["file_path"]
    target_tool_id = params["target_tool_id"]
    column_mapping = params["column_mapping"]
    tenant_id = params.get("tenant_id", "default")
    
    # Resolve absolute path for the file if it's relative to instance
    if not os.path.isabs(file_path):
        instance_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "instance")
        file_path = os.path.join(instance_dir, file_path)
    
    if not os.path.exists(file_path):
        return ToolExecutionResult(
            tool_id="execute_smart_bulk_import",
            success=False,
            mode=mode,
            error=f"File not found: {file_path}",
        )
        
    try:
        # 1. Read Excel
        df = pd.read_excel(file_path)
        total_rows = len(df)
        
        if mode == ToolExecutionMode.SIMULATE:
            return ToolExecutionResult(
                tool_id="execute_smart_bulk_import",
                success=True,
                mode=mode,
                result={
                    "message": f"Simulation complete. Will process {total_rows} rows.",
                    "total_rows": total_rows,
                    "target_tool": target_tool_id,
                },
            )
            
        # 2. Setup Batch
        db = SessionLocal()
        batch = BulkImportBatch(
            tenant_id=tenant_id,
            tool_id=target_tool_id,
            status="completed", # Default to completed, might change to 'failed' if all fail
            file_name=os.path.basename(file_path)
        )
        db.add(batch)
        db.commit()
        db.refresh(batch)
        
        success_count: int = 0
        error_count: int = 0
        errors: List[str] = []
        
        registry = get_tool_registry()
        
        # 3. Process Rows
        for index, row in df.iterrows():
            # Construct parameters for the target tool
            tool_params = {"tenant_id": tenant_id}
            for tool_param, excel_col in column_mapping.items():
                if excel_col in df.columns:
                    val = row[excel_col]
                    # Handle NaN and basic type normalization
                    if pd.isna(val):
                        val = None
                    elif isinstance(val, (int, float)):
                        # Excel often reads numbers (like phone numbers) as floats/ints
                        # Convert to string to avoid tool validation errors
                        if isinstance(val, float) and val.is_integer():
                            val = str(int(val))
                        else:
                            val = str(val)
                    tool_params[tool_param] = val
            
            try:
                # Execute target tool
                # We use ToolExecutionMode.EXECUTE here because this is the parent execution
                result = registry.execute_tool(target_tool_id, tool_params, mode=ToolExecutionMode.EXECUTE)
                
                if result.success:
                    success_count += 1
                    # Extract entity ID if possible
                    entity_id = None
                    if isinstance(result.result, dict):
                        entity_id = result.result.get("id") or result.result.get("party_id")
                    
                    # Record the successful operation for rollback
                    record = BulkImportRecord(
                        batch_id=batch.id,
                        tenant_id=tenant_id,
                        entity_id=str(entity_id) if entity_id else f"unknown_{index}",
                        entity_type=target_tool_id
                    )
                    db.add(record)
                else:
                    error_count += 1
                    errors.append(f"Row {index + 1}: {result.error}")
            except Exception as e:
                error_count += 1
                errors.append(f"Row {index + 1}: (Unexpected) {str(e)}")
            
            # Commit records periodically to avoid huge memory/transaction overhead
            if (index + 1) % 50 == 0:
                db.commit()
                
        db.commit()
        
        # Create Activity Log for the import
        try:
            log_entry = ActivityLog(
                tenant_id=tenant_id,
                action="TOPLU_YUKLEME",
                message=f"Toplu veri yükleme: {os.path.basename(file_path)} ({success_count} başarılı, {error_count} hatalı)",
                entity_type="bulk_import",
                entity_id=batch.id,
                is_critical=True
            )
            log_entry.data_json = {
                "batch_id": batch.id,
                "file_name": os.path.basename(file_path),
                "successful": success_count,
                "failed": error_count,
                "target_tool": target_tool_id
            }
            db.add(log_entry)
            db.commit()
        except Exception as log_err:
            print(f"Failed to create ActivityLog: {log_err}")
            db.rollback()

        return ToolExecutionResult(
            tool_id="execute_smart_bulk_import",
            success=True,
            mode=mode,
            result={
                "batch_id": batch.id,
                "total": total_rows,
                "successful": success_count,
                "failed": error_count,
                "errors": errors[:10], # Only return first 10 errors
                "message": f"Bulk import complete. {success_count} success, {error_count} failed."
            },
        )
        
    except Exception as e:
        logger.error(f"Bulk import failed: {e}")
        return ToolExecutionResult(
            tool_id="execute_smart_bulk_import",
            success=False,
            mode=mode,
            error=str(e),
        )
    finally:
        if 'db' in locals():
            db.close()

@register_tool(
    tool_id="rollback_bulk_import",
    name="Rollback Bulk Import",
    description="Reverses a bulk import operation by deleting all successfully created records.",
    category=ToolCategory.ADMIN,
    risk_level=RiskLevel.CRITICAL,
    schema_version="1.0.0",
    parameters=[
        ToolParameter(
            name="batch_id",
            type="string",
            description="The ID of the batch to rollback",
            required=True,
        ),
        ToolParameter(
            name="tenant_id",
            type="string",
            description="Tenant ID",
            required=False,
            default="default",
        ),
    ],
    returns="Summary of the rollback operation",
    requires_approval=True,
)
def rollback_bulk_import(
    params: Dict[str, Any],
    mode: ToolExecutionMode,
) -> ToolExecutionResult:
    """Rollback a previous bulk import batch."""
    batch_id = params["batch_id"]
    tenant_id = params.get("tenant_id", "default")
    
    try:
        db = SessionLocal()
        with unbound_session(reason="rollback-operation"):
            batch = db.query(BulkImportBatch).filter(
                BulkImportBatch.id == batch_id, 
                BulkImportBatch.tenant_id == tenant_id
            ).first()
            
            if not batch:
                return ToolExecutionResult(
                    tool_id="rollback_bulk_import",
                    success=False,
                    mode=mode,
                    error=f"Batch not found: {batch_id}",
                )
            
            if batch.status == "rolled_back":
                return ToolExecutionResult(
                    tool_id="rollback_bulk_import",
                    success=False,
                    mode=mode,
                    error=f"Batch {batch_id} has already been rolled back.",
                )
            
            records = db.query(BulkImportRecord).filter(BulkImportRecord.batch_id == batch_id).all()
            
            if mode == ToolExecutionMode.SIMULATE:
                return ToolExecutionResult(
                    tool_id="rollback_bulk_import",
                    success=True,
                    mode=mode,
                    result={
                        "message": f"Simulation complete. Will rollback {len(records)} records.",
                        "batch_id": batch_id,
                        "record_count": len(records),
                    },
                )
            
            # 1. Identify what to delete
            deleted_count: int = 0
            failed_count: int = 0
            
            # Map tool IDs to models for generic deletion (Simplified approach)
            # In a real production system, we'd have a registry of deletion handlers
            from sqlalchemy import text
            
            for record in records:
                if record.is_rolled_back:
                    continue
                
                try:
                    # Generic deletion attempt based on entity_type (which is the tool_id)
                    # This is a bit risky but follow the 'Hard Delete' requirement
                    # We need to find which table to delete from.
                    
                    # For now, we'll try to find the model based on the entity_type
                    # If entity_type is "createParty", we might need to map it to "parties"
                    
                    tool_id = record.entity_type
                    table_name = None
                    
                    if "Party" in tool_id:
                        table_name = "parties"
                    elif "Sale" in tool_id:
                        table_name = "sales"
                    elif "Inventory" in tool_id:
                        table_name = "inventory_items"
                    elif "Device" in tool_id:
                        table_name = "devices"
                    elif "Appointment" in tool_id:
                        table_name = "appointments"
                    
                    if table_name:
                        # Use raw SQL for simplicity in a generic tool
                        db.execute(text(f"DELETE FROM {table_name} WHERE id = :id AND tenant_id = :tid"), 
                                   {"id": record.entity_id, "tid": tenant_id})
                        record.is_rolled_back = True
                        deleted_count += 1
                    else:
                        failed_count += 1
                        
                except Exception as e:
                    logger.error(f"Failed to delete record {record.entity_id}: {e}")
                    failed_count += 1
            
            batch.status = "rolled_back"
            
            # Update ActivityLog to mark as rolled back
            try:
                log_entries = db.query(ActivityLog).filter(
                    ActivityLog.action == "TOPLU_YUKLEME",
                    ActivityLog.tenant_id == tenant_id
                ).all()
                for entry in log_entries:
                    if entry.data_json.get("batch_id") == batch_id:
                        entry_data = entry.data_json
                        entry_data["rolled_back"] = True
                        entry_data["rolled_back_at"] = datetime.now(timezone.utc).isoformat()
                        entry.data_json = entry_data
                        entry.message = f"[GERI ALINDI] {entry.message}"
            except Exception as log_update_err:
                logger.error(f"Failed to update ActivityLog after rollback: {log_update_err}")

            db.commit()
            
            return ToolExecutionResult(
                tool_id="rollback_bulk_import",
                success=True,
                mode=mode,
                result={
                    "batch_id": batch_id,
                    "deleted": deleted_count,
                    "failed": failed_count,
                    "message": f"Rollback complete. {deleted_count} records deleted."
                },
            )
            
    except Exception as e:
        logger.error(f"Rollback failed: {e}")
        return ToolExecutionResult(
            tool_id="rollback_bulk_import",
            success=False,
            mode=mode,
            error=str(e),
        )
    finally:
        if 'db' in locals():
            db.close()
