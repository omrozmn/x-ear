from datetime import datetime
from uuid import uuid4
import logging
import json
import os
from typing import Optional, Tuple, List, Dict, Any
from decimal import Decimal

from sqlalchemy.orm import Session
from models.device import Device
from models.inventory import InventoryItem
from models.sales import DeviceAssignment, Sale, PaymentRecord
from models.enums import DeviceSide, DeviceStatus, DeviceCategory
from services.stock_service import create_stock_movement

logger = logging.getLogger(__name__)


def ensure_loaner_serials_in_inventory(session: Session, assignment: DeviceAssignment, created_by: str = 'system'):
    """
    Ensure that any manually entered loaner serial numbers are added to the inventory.
    This supports the workflow where a user enters a serial number for a loaner device
    that hasn't been explicitly added to the system yet.
    
    We check available_serials to prevent duplicate additions.
    Note: Once a serial is loaned out, it's removed from available_serials but we still
    want to track it was added. We use a simple check against current available_serials.
    """
    if not assignment.loaner_inventory_id:
        return

    try:
        loaner_item = session.get(InventoryItem, assignment.loaner_inventory_id)
        if not loaner_item:
            return

        # Collect all serials from assignment
        serials_to_check = []
        if assignment.loaner_serial_number: 
            serials_to_check.append(assignment.loaner_serial_number)
        if hasattr(assignment, 'loaner_serial_number_left') and assignment.loaner_serial_number_left: 
            serials_to_check.append(assignment.loaner_serial_number_left)
        if hasattr(assignment, 'loaner_serial_number_right') and assignment.loaner_serial_number_right: 
            serials_to_check.append(assignment.loaner_serial_number_right)
        
        # Filter out empty or invalid values
        serials_to_check = [s for s in serials_to_check if s and str(s).lower() not in ['null', 'none', '-', '']]
        
        if not serials_to_check:
            return

        # Check available_serials - if serial is not there, add it
        available_serials = []
        if loaner_item.available_serials:
            try:
                available_serials = json.loads(loaner_item.available_serials)
            except (json.JSONDecodeError, TypeError):
                # Fallback for legacy CSV data
                available_serials = [s.strip() for s in str(loaner_item.available_serials).split(',') if s.strip()]
        
        for serial in serials_to_check:
            if serial not in available_serials:
                # This is a new serial - add to inventory
                if hasattr(loaner_item, 'add_serial_number') and loaner_item.add_serial_number(serial):
                    create_stock_movement(
                        inventory_id=loaner_item.id,
                        movement_type="manual_add",
                        quantity=1,
                        tenant_id=loaner_item.tenant_id,
                        serial_number=serial,
                        transaction_id=assignment.id,
                        created_by=created_by,
                        session=session
                    )
                    logger.info(f"📦 Manuel eklendi: {serial} -> {loaner_item.name}")
    except Exception as e:
        logger.error(f"Error ensuring loaner serials in inventory: {e}")


def load_sgk_amounts() -> Dict[str, float]:
    """Load SGK amounts from settings file or return defaults."""
    settings_path = os.path.join(os.path.dirname(__file__), '..', 'current_settings.json')
    sgk_amounts = {}
    try:
        with open(settings_path, 'r', encoding='utf-8') as f:
            settings = json.load(f)
            # Try both possible paths: settings.sgk.schemes or data.sgk.schemes
            sgk_config = settings.get('settings', {}).get('sgk', {}).get('schemes', {})
            if not sgk_config:
                sgk_config = settings.get('data', {}).get('sgk', {}).get('schemes', {})
            
            for scheme_key, scheme_data in sgk_config.items():
                if isinstance(scheme_data, dict) and 'coverage_amount' in scheme_data:
                    sgk_amounts[scheme_key] = float(scheme_data['coverage_amount'])
            
            logger.info(f"Loaded {len(sgk_amounts)} SGK schemes from settings")
    except Exception as e:
        logger.error(f"Failed to load SGK amounts from settings: {e}")
    
    # If no SGK amounts loaded, use hardcoded defaults matching JSON schema
    if not sgk_amounts:
        logger.warning("Using hardcoded SGK defaults")
        sgk_amounts = {
            # 0-4 yaş
            'under4_parent_working': 6104.44,
            'under4_parent_retired': 7630.56,
            # 5-12 yaş
            '5to12_parent_working': 5426.17,
            '5to12_parent_retired': 6782.72,
            # 13-18 yaş
            'age13_18_parent_working': 5087.04,
            'age13_18_parent_retired': 6358.88,
            # 18+ yaş
            'over18_working': 3391.36,
            'over18_retired': 4239.20,
            # Generic schemes
            'standard': 4239.20,
            'premium': 4239.20,
            'private': 4239.20,
        }
    return sgk_amounts


def recalculate_assignment_pricing(session: Session, assignment: DeviceAssignment) -> None:
    """
    Recalculate pricing for a device assignment based on SGK scheme and discounts.
    This is called when pricing-related fields change (base_price, discount, sgk_scheme).
    """
    list_price = float(assignment.list_price or 0)
    logger.info(f"💰 Starting pricing calculation: list_price={list_price}, sgk_scheme={assignment.sgk_scheme}")
    
    sgk_amounts = load_sgk_amounts()
    
    # Calculate SGK support (per ear)
    sgk_support_per_ear = 0
    if assignment.sgk_scheme and assignment.sgk_scheme != 'no_coverage':
        sgk_support_per_ear = sgk_amounts.get(assignment.sgk_scheme, 0)
        sgk_support_per_ear = min(sgk_support_per_ear, list_price)  # SGK can't be more than list price
    
    # Apply discount on price after SGK
    price_after_sgk = list_price - sgk_support_per_ear
    discount_amount = 0
    if assignment.discount_type == 'percentage' and assignment.discount_value:
        try:
            discount_amount = (price_after_sgk * float(assignment.discount_value)) / 100
        except (ValueError, TypeError):
            discount_amount = 0
    elif assignment.discount_type == 'amount' and assignment.discount_value:
        try:
            discount_amount = float(assignment.discount_value)
        except (ValueError, TypeError):
            discount_amount = 0
    
    # Re-calculate quantity after applying ear updates
    ear_val = str(assignment.ear or '').upper()
    quantity = 2 if ear_val in ['B', 'BOTH', 'BILATERAL'] else 1
    
    sale_price = max(0, price_after_sgk - discount_amount)
    
    # Handle bilateral (x2) - quantity affects net_payable only
    net_payable = sale_price * quantity
    
    # Update calculated fields - store per-ear amounts (per-unit storage)
    assignment.sgk_support = Decimal(str(sgk_support_per_ear))
    assignment.sale_price = Decimal(str(sale_price))
    assignment.net_payable = Decimal(str(net_payable))
    
    logger.info(f"✅ Pricing calculated: sgk_support={sgk_support_per_ear}, sale_price={sale_price}, net_payable={net_payable}, qty={quantity}")


def sync_sale_totals(session: Session, sale_id: str) -> None:
    """
    Synchronize sale totals by summing all device assignments.
    Called after assignment updates to keep sale record in sync.
    """
    sale = session.get(Sale, sale_id)
    if not sale:
        return
    
    # Sum all assignments for this sale
    all_assignments = session.query(DeviceAssignment).filter_by(sale_id=sale_id).all()
    
    total_list = 0.0
    total_final = 0.0
    total_sgk = 0.0
    
    for a in all_assignments:
        # Determine quantity for this assignment
        a_ear = str(a.ear or '').upper()
        a_qty = 2 if a_ear in ['B', 'BOTH', 'BILATERAL'] else 1
        
        total_list += float(a.list_price or 0) * a_qty
        total_final += float(a.net_payable or 0)
        total_sgk += float(a.sgk_support or 0) * a_qty
    
    # Update sale totals
    sale.total_amount = total_list
    sale.final_amount = total_final
    sale.sgk_coverage = total_sgk
    
    # Correct discount amount for Sale: Total List - SGK - Net Payable
    sale.discount_amount = max(0, float(sale.total_amount or 0) - float(sale.sgk_coverage or 0) - float(sale.final_amount or 0))
    
    # Ensure positive values
    sale.sgk_coverage = max(0, sale.sgk_coverage)
    sale.final_amount = max(0, sale.final_amount)

    session.add(sale)
    logger.info(f"🔄 Synced Sale {sale.id}: List={sale.total_amount}, Net={sale.final_amount}, SGK={sale.sgk_coverage}, Discount={sale.discount_amount}")

class DeviceAssignmentService:
    @staticmethod
    def assign_device(
        session: Session,
        tenant_id: str,
        party_id: str,
        device: Device,
        assigned_by_user_id: str
    ) -> Tuple[Optional[DeviceAssignment], Optional[str]]:
        """
        Assign an EXISTING device to a party.
        - Stock deduction (Serialized vs Quantity)
        - Bilateral logic (x2 deduction)
        - Full field population (assignment_uid, brands, etc)
        """
        try:
            device_data = {} # Fallback for any legacy dict usage, but we rely on 'device' object now.
            inventory_id = device.inventory_id
            
            # --- 1. Prepare Inventory Item ---
            inventory_item: Optional[InventoryItem] = None
            if inventory_id:
                inventory_item = session.get(InventoryItem, inventory_id)
                # If inventory item is missing but we have a device record, we proceed but can't deduct stock.
                if not inventory_item:
                    logger.warning(f"Inventory item {inventory_id} not found for device {device.id}")

            # --- 2. Create Device Assignment Record ---
            assignment_uid = f"ATM-{datetime.now().strftime('%y%m%d')}-{uuid4().hex[:4].upper()}"
            
            # Map Ear to single char for Assignment model
            ear_code = 'L'
            if device.ear == 'RIGHT': ear_code = 'R'
            elif device.ear == 'BILATERAL': ear_code = 'B'
            
            assignment = DeviceAssignment(
                id=f"assign_{uuid4().hex}",
                tenant_id=tenant_id,
                party_id=party_id,
                device_id=device.id,
                inventory_id=inventory_id,
                assignment_uid=assignment_uid,
                ear=ear_code, # Legacy parity
                reason='Assignment', # Default
                notes=device.notes,
                created_at=datetime.utcnow(),
                # Full Field Population
                brand=device.brand, 
                model=device.model,
                
                serial_number=device.serial_number,
                serial_number_left=device.serial_number_left,
                serial_number_right=device.serial_number_right,
                
                delivery_status='delivered', # Defaulting to delivered as per legacy behavior for stock deduction
                
                from_inventory=bool(inventory_id),
                
                # Pricing 
                sale_price=device.price,
                list_price=device.price
            )
            
            session.add(assignment)
            
            # --- 3. Stock Management ---
            # Logic: If delivered immediately (or if we treat assignment as reservation), deduct stock.
            
            if inventory_item:
                qty_to_deduct = 1
                is_bilateral = device.ear == 'BILATERAL'
                if is_bilateral:
                    qty_to_deduct = 2
                
                # Serial Management
                # Try to remove specific serials if provided
                consumed_serials = []
                serials_to_process = []
                
                if device.serial_number: serials_to_process.append(device.serial_number)
                if device.serial_number_left: serials_to_process.append(device.serial_number_left)
                if device.serial_number_right: serials_to_process.append(device.serial_number_right)
                
                for s in serials_to_process:
                    if s and inventory_item.remove_serial_number(s):
                        consumed_serials.append(s)
                
                # Deduct remaining needed
                remaining_deduction = qty_to_deduct - len(consumed_serials)
                if remaining_deduction > 0:
                    inventory_item.update_inventory(-remaining_deduction, allow_negative=True)
                
                # Log Movement
                create_stock_movement(
                    inventory_id=inventory_item.id,
                    movement_type="sale", # or assignment
                    quantity=-qty_to_deduct,
                    tenant_id=tenant_id,
                    serial_number=",".join(consumed_serials) if consumed_serials else None,
                    transaction_id=assignment.id,
                    created_by=assigned_by_user_id,
                    session=session
                )
                
                if inventory_item.available_inventory < 0:
                    logger.warning(f"Stock went negative for item {inventory_item.id}")

            return assignment, None

        except Exception as e:
            logger.error(f"Error in assign_device: {e}", exc_info=True)
            return None, str(e)

    @staticmethod
    def unassign_device(session: Session, assignment_id: str, user_id: str) -> bool:
        """
        Unassign/Return device to stock.
        """
        assignment = session.get(DeviceAssignment, assignment_id)
        if not assignment:
             return False
        
        # Restore stock if it came from inventory
        if assignment.inventory_id:
             inventory_item = session.get(InventoryItem, assignment.inventory_id)
             if inventory_item:
                 # Determine qty
                 qty = 2 if (assignment.ear == 'B' or assignment.ear == 'BILATERAL') else 1
                 
                 # Restore specific serials?
                 serials_to_restore = []
                 if assignment.serial_number: serials_to_restore.append(assignment.serial_number)
                 if assignment.serial_number_left: serials_to_restore.append(assignment.serial_number_left)
                 if assignment.serial_number_right: serials_to_restore.append(assignment.serial_number_right)
                 
                 for s in serials_to_restore:
                     inventory_item.add_serial_number(s)
                 
                 # The `add_serial_number` increments count. 
                 # If we had non-serialized deduction (remaining_deduction > 0 in assign), we need to restore general count too?
                 # This logic is tricky without knowing exactly how it was deducted.
                 # Simplified: Just rely on add_serial_number updating count for serials.
                 # If no serials were restored, add global count.
                 if not serials_to_restore:
                     inventory_item.update_inventory(qty)
                 elif len(serials_to_restore) < qty:
                     # Partial restore? (e.g. bilateral, 1 serial returned, 1 lost?)
                     # Assume restore remainder.
                     inventory_item.update_inventory(qty - len(serials_to_restore))
                 
                 # Log
                 create_stock_movement(
                    inventory_id=inventory_item.id,
                    movement_type="return",
                    quantity=qty,
                    tenant_id=inventory_item.tenant_id,
                    serial_number=",".join(serials_to_restore) if serials_to_restore else None,
                    transaction_id=assignment.id,
                    created_by=user_id,
                    session=session
                )

        session.delete(assignment)
        return True
