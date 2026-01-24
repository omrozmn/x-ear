"""
Device Tools for AI Layer

Contains tools for managing Device Inventory and Assignments.
"""
from typing import Any, Dict
from ai.tools import (
    register_tool,
    ToolParameter,
    ToolCategory,
    RiskLevel,
    ToolExecutionMode,
    ToolExecutionResult,
)
from core.database import SessionLocal
from models.inventory import InventoryItem
from models.device import Device
from models.sales import DeviceAssignment
from services.device_assignment_service import DeviceAssignmentService


# =============================================================================
# Device Read Tools
# =============================================================================

@register_tool(
    tool_id="listDevices",
    name="List Devices",
    description="List hearing aid devices in inventory",
    category=ToolCategory.READ,
    risk_level=RiskLevel.LOW,
    schema_version="1.0.0",
    parameters=[
        ToolParameter(
            name="tenant_id",
            type="string",
            description="Tenant ID (automatically injected)",
            required=False,
            default="default",
        ),
        ToolParameter(
            name="category",
            type="string",
            description="Filter by category (hearing_aid, accessory, etc.)",
            required=False,
        ),
        ToolParameter(
            name="page",
            type="integer",
            description="Page number",
            required=False,
            default=1,
        ),
        ToolParameter(
            name="per_page",
            type="integer",
            description="Items per page",
            required=False,
            default=20,
        ),
    ],
    returns="List of devices",
    requires_approval=False,
    requires_permissions=["devices.view"],
)
def listDevices(
    params: Dict[str, Any],
    mode: ToolExecutionMode,
) -> ToolExecutionResult:
    """List devices in inventory."""
    tenant_id = params.get("tenant_id", "default")
    category = params.get("category")
    page = params.get("page", 1)
    per_page = min(params.get("per_page", 20), 50)
    offset = (page - 1) * per_page

    try:
        db = SessionLocal()
        query = db.query(InventoryItem).filter(InventoryItem.tenant_id == tenant_id)
        if category:
            query = query.filter(InventoryItem.category == category)
        total = query.count()
        items = query.offset(offset).limit(per_page).all()
        db.close()

        return ToolExecutionResult(
            tool_id="listDevices",
            success=True,
            mode=mode,
            result={
                "items": [
                    {
                        "id": str(item.id),
                        "brand": item.brand,
                        "model": item.model,
                        "category": item.category,
                        "quantity": item.quantity,
                        "serialNumber": item.serial_number,
                    }
                    for item in items
                ],
                "total": total,
                "page": page,
                "perPage": per_page,
            },
        )
    except Exception as e:
        if 'db' in locals():
            db.close()
        return ToolExecutionResult(
            tool_id="listDevices",
            success=False,
            mode=mode,
            error=str(e),
        )


@register_tool(
    tool_id="getDeviceById",
    name="Get Device By ID",
    description="Retrieve a specific device by its ID",
    category=ToolCategory.READ,
    risk_level=RiskLevel.LOW,
    schema_version="1.0.0",
    parameters=[
        ToolParameter(
            name="device_id",
            type="string",
            description="ID of the device to retrieve",
            required=True,
        ),
        ToolParameter(
            name="tenant_id",
            type="string",
            description="Tenant ID (automatically injected)",
            required=False,
            default="default",
        ),
    ],
    returns="Device details",
    requires_approval=False,
    requires_permissions=["devices.view"],
)
def getDeviceById(
    params: Dict[str, Any],
    mode: ToolExecutionMode,
) -> ToolExecutionResult:
    """Get a device by ID."""
    device_id = params["device_id"]
    tenant_id = params.get("tenant_id", "default")

    try:
        db = SessionLocal()
        # Try inventory first
        item = db.query(InventoryItem).filter(
            InventoryItem.id == device_id,
            InventoryItem.tenant_id == tenant_id
        ).first()

        if not item:
            # Try device table
            device = db.query(Device).filter(Device.id == device_id).first()
            if device:
                db.close()
                return ToolExecutionResult(
                    tool_id="getDeviceById",
                    success=True,
                    mode=mode,
                    result={
                        "id": str(device.id),
                        "brand": device.brand,
                        "model": device.model,
                        "serialNumber": device.serial_number,
                        "status": device.status,
                    },
                )
            db.close()
            return ToolExecutionResult(
                tool_id="getDeviceById",
                success=False,
                mode=mode,
                error="Device not found",
            )

        db.close()
        return ToolExecutionResult(
            tool_id="getDeviceById",
            success=True,
            mode=mode,
            result={
                "id": str(item.id),
                "brand": item.brand,
                "model": item.model,
                "category": item.category,
                "quantity": item.quantity,
                "serialNumber": item.serial_number,
            },
        )
    except Exception as e:
        if 'db' in locals():
            db.close()
        return ToolExecutionResult(
            tool_id="getDeviceById",
            success=False,
            mode=mode,
            error=str(e),
        )


@register_tool(
    tool_id="checkDeviceStock",
    name="Check Device Stock",
    description="Check stock levels for devices",
    category=ToolCategory.READ,
    risk_level=RiskLevel.LOW,
    schema_version="1.0.0",
    parameters=[
        ToolParameter(
            name="tenant_id",
            type="string",
            description="Tenant ID (automatically injected)",
            required=False,
            default="default",
        ),
        ToolParameter(
            name="brand",
            type="string",
            description="Filter by brand",
            required=False,
        ),
        ToolParameter(
            name="model",
            type="string",
            description="Filter by model",
            required=False,
        ),
    ],
    returns="Stock summary",
    requires_approval=False,
    requires_permissions=["devices.view"],
)
def checkDeviceStock(
    params: Dict[str, Any],
    mode: ToolExecutionMode,
) -> ToolExecutionResult:
    """Check device stock levels."""
    tenant_id = params.get("tenant_id", "default")
    brand = params.get("brand")
    model = params.get("model")

    try:
        db = SessionLocal()
        query = db.query(InventoryItem).filter(InventoryItem.tenant_id == tenant_id)
        if brand:
            query = query.filter(InventoryItem.brand.ilike(f"%{brand}%"))
        if model:
            query = query.filter(InventoryItem.model.ilike(f"%{model}%"))

        items = query.all()
        db.close()

        total_quantity = sum(item.quantity or 0 for item in items)

        return ToolExecutionResult(
            tool_id="checkDeviceStock",
            success=True,
            mode=mode,
            result={
                "totalItems": len(items),
                "totalQuantity": total_quantity,
                "items": [
                    {
                        "brand": item.brand,
                        "model": item.model,
                        "quantity": item.quantity or 0,
                    }
                    for item in items[:10]  # Limit to 10 items
                ],
            },
        )
    except Exception as e:
        if 'db' in locals():
            db.close()
        return ToolExecutionResult(
            tool_id="checkDeviceStock",
            success=False,
            mode=mode,
            error=str(e),
        )


# =============================================================================
# Device Assignment Tools
# =============================================================================

@register_tool(
    tool_id="assignDevice",
    name="Assign Device",
    description="Assign a hearing aid device to a patient",
    category=ToolCategory.ADMIN,
    risk_level=RiskLevel.MEDIUM,
    schema_version="1.0.0",
    parameters=[
        ToolParameter(
            name="party_id",
            type="string",
            description="ID of the patient to assign device to",
            required=True,
        ),
        ToolParameter(
            name="device_id",
            type="string",
            description="ID of the device to assign",
            required=True,
        ),
        ToolParameter(
            name="user_id",
            type="string",
            description="User performing the assignment",
            required=False,
            default="system",
        ),
        ToolParameter(
            name="tenant_id",
            type="string",
            description="Tenant ID (automatically injected)",
            required=False,
            default="default",
        ),
    ],
    returns="Assignment details",
    requires_approval=False,
    requires_permissions=["devices.assign"],
)
def assignDevice(
    params: Dict[str, Any],
    mode: ToolExecutionMode,
) -> ToolExecutionResult:
    """Assign a device to a patient."""
    party_id = params["party_id"]
    device_id = params["device_id"]
    user_id = params.get("user_id", "system")
    tenant_id = params.get("tenant_id", "default")

    try:
        db = SessionLocal()

        # Get device
        device = db.query(Device).filter(Device.id == device_id).first()
        if not device:
            db.close()
            return ToolExecutionResult(
                tool_id="assignDevice",
                success=False,
                mode=mode,
                error="Device not found",
            )

        # Use service
        service = DeviceAssignmentService()
        assignment = service.assign_device(
            session=db,
            tenant_id=tenant_id,
            party_id=party_id,
            device=device,
            assigned_by_user_id=user_id,
        )

        db.commit()
        result = assignment.to_dict() if hasattr(assignment, 'to_dict') else {"id": str(assignment.id)}
        db.close()

        return ToolExecutionResult(
            tool_id="assignDevice",
            success=True,
            mode=mode,
            result=result,
        )
    except Exception as e:
        if 'db' in locals():
            db.rollback()
            db.close()
        return ToolExecutionResult(
            tool_id="assignDevice",
            success=False,
            mode=mode,
            error=str(e),
        )


@register_tool(
    tool_id="updateDeviceAssignment",
    name="Update Device Assignment",
    description="Update an existing device assignment",
    category=ToolCategory.CONFIG,
    risk_level=RiskLevel.MEDIUM,
    schema_version="1.0.0",
    parameters=[
        ToolParameter(
            name="assignment_id",
            type="string",
            description="ID of the assignment to update",
            required=True,
        ),
        ToolParameter(
            name="updates",
            type="object",
            description="Fields to update (status, notes, etc.)",
            required=True,
        ),
        ToolParameter(
            name="tenant_id",
            type="string",
            description="Tenant ID (automatically injected)",
            required=False,
            default="default",
        ),
    ],
    returns="Updated assignment details",
    requires_approval=False,
    requires_permissions=["devices.assign"],
)
def updateDeviceAssignment(
    params: Dict[str, Any],
    mode: ToolExecutionMode,
) -> ToolExecutionResult:
    """Update a device assignment."""
    assignment_id = params["assignment_id"]
    updates = params["updates"]
    tenant_id = params.get("tenant_id", "default")

    try:
        db = SessionLocal()
        assignment = db.query(DeviceAssignment).filter(
            DeviceAssignment.id == assignment_id,
            DeviceAssignment.tenant_id == tenant_id
        ).first()

        if not assignment:
            db.close()
            return ToolExecutionResult(
                tool_id="updateDeviceAssignment",
                success=False,
                mode=mode,
                error="Assignment not found",
            )

        # Apply updates
        for key, value in updates.items():
            if hasattr(assignment, key):
                setattr(assignment, key, value)

        db.commit()
        db.refresh(assignment)
        result = assignment.to_dict() if hasattr(assignment, 'to_dict') else {"id": str(assignment.id)}
        db.close()

        return ToolExecutionResult(
            tool_id="updateDeviceAssignment",
            success=True,
            mode=mode,
            result=result,
        )
    except Exception as e:
        if 'db' in locals():
            db.rollback()
            db.close()
        return ToolExecutionResult(
            tool_id="updateDeviceAssignment",
            success=False,
            mode=mode,
            error=str(e),
        )
