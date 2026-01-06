"""
Invoice Management API Routes
Handles dynamic invoice creation, XML generation, and e-invoice integration
"""
from flask import Blueprint, request, jsonify
from datetime import datetime, timezone
import json
import xml.etree.ElementTree as ET
from xml.dom import minidom
import uuid

from models.base import db
from models.invoice import Invoice
from models.patient import Patient
from models.system import Settings
from utils.idempotency import idempotent
from utils.optimistic_locking import optimistic_lock, with_transaction
from utils.authorization import permission_required

invoice_management_bp = Blueprint('invoice_management', __name__)

def now_utc():
    """Return current UTC timestamp"""
    return datetime.now(timezone.utc)

@invoice_management_bp.route('/invoice-schema', methods=['GET'])
def get_invoice_schema():
    """Get the invoice fields schema for dynamic form generation"""
    try:
        # Return the schema structure for frontend form generation
        schema = {
            "invoiceTypes": {
                "TEMEL": {
                    "name": "Temel Fatura",
                    "requiredFields": ["recipient", "invoiceDetails"],
                    "conditionalFields": ["products"]
                },
                "TICARI": {
                    "name": "Ticari Fatura", 
                    "requiredFields": ["recipient", "invoiceDetails", "products"],
                    "conditionalFields": ["discount"]
                },
                "IADE": {
                    "name": "İade Faturası",
                    "requiredFields": ["recipient", "invoiceDetails", "products"],
                    "conditionalFields": ["originalInvoice"]
                }
            },
            "fieldDefinitions": {
                "recipient": {
                    "name": "Alıcı Bilgileri",
                    "fields": {
                        "name": {
                            "id": "recipient_name",
                            "label": "Ad Soyad / Unvan",
                            "type": "text",
                            "required": True,
                            "placeholder": "Müşteri adı"
                        },
                        "taxNumber": {
                            "id": "recipient_tax_number", 
                            "label": "VKN/TCKN",
                            "type": "text",
                            "required": True,
                            "placeholder": "Vergi kimlik numarası"
                        },
                        "address": {
                            "id": "recipient_address",
                            "label": "Adres",
                            "type": "textarea",
                            "required": True,
                            "rows": 3,
                            "placeholder": "Fatura adresi"
                        },
                        "email": {
                            "id": "recipient_email",
                            "label": "E-posta",
                            "type": "email",
                            "required": False,
                            "placeholder": "ornek@email.com"
                        }
                    }
                },
                "invoiceDetails": {
                    "name": "Fatura Detayları",
                    "fields": {
                        "invoiceDate": {
                            "id": "invoice_date",
                            "label": "Fatura Tarihi",
                            "type": "date",
                            "required": True,
                            "defaultValue": datetime.now().strftime('%Y-%m-%d')
                        },
                        "dueDate": {
                            "id": "due_date",
                            "label": "Vade Tarihi",
                            "type": "date",
                            "required": False
                        },
                        "scenario": {
                            "id": "scenario",
                            "label": "Senaryo",
                            "type": "select",
                            "required": True,
                            "defaultValue": "36",
                            "options": [
                                {"value": "36", "text": "Temel Fatura"},
                                {"value": "37", "text": "Ticari Fatura"},
                                {"value": "38", "text": "İhracat Faturası"}
                            ]
                        },
                        "currency": {
                            "id": "currency",
                            "label": "Para Birimi",
                            "type": "select",
                            "required": True,
                            "defaultValue": "TRY",
                            "options": [
                                {"value": "TRY", "text": "Türk Lirası"},
                                {"value": "USD", "text": "Amerikan Doları"},
                                {"value": "EUR", "text": "Euro"}
                            ]
                        }
                    }
                },
                "products": {
                    "name": "Ürün/Hizmet Bilgileri",
                    "fields": {
                        "productName": {
                            "id": "product_name",
                            "label": "Ürün/Hizmet Adı",
                            "type": "text",
                            "required": True,
                            "placeholder": "Ürün veya hizmet adı"
                        },
                        "quantity": {
                            "id": "quantity",
                            "label": "Miktar",
                            "type": "number",
                            "required": True,
                            "min": 0.01,
                            "step": 0.01,
                            "defaultValue": "1"
                        },
                        "unitPrice": {
                            "id": "unit_price",
                            "label": "Birim Fiyat",
                            "type": "number",
                            "required": True,
                            "min": 0,
                            "step": 0.01,
                            "placeholder": "0.00"
                        },
                        "vatRate": {
                            "id": "vat_rate",
                            "label": "KDV Oranı (%)",
                            "type": "select",
                            "required": True,
                            "defaultValue": "20",
                            "options": [
                                {"value": "0", "text": "%0"},
                                {"value": "1", "text": "%1"},
                                {"value": "10", "text": "%10"},
                                {"value": "20", "text": "%20"}
                            ]
                        },
                        "unit": {
                            "id": "unit",
                            "label": "Birim",
                            "type": "select",
                            "required": True,
                            "defaultValue": "C62",
                            "options": [
                                {"value": "C62", "text": "Adet"},
                                {"value": "KGM", "text": "Kilogram"},
                                {"value": "GRM", "text": "Gram"},
                                {"value": "LTR", "text": "Litre"},
                                {"value": "MLT", "text": "Mililitre"},
                                {"value": "MTR", "text": "Metre"},
                                {"value": "CMT", "text": "Santimetre"},
                                {"value": "MMT", "text": "Milimetre"},
                                {"value": "MTK", "text": "Metrekare"},
                                {"value": "MTQ", "text": "Metreküp"},
                                {"value": "TNE", "text": "Ton"},
                                {"value": "BX", "text": "Kutu"},
                                {"value": "PA", "text": "Paket"},
                                {"value": "SET", "text": "Set"},
                                {"value": "PR", "text": "Çift"},
                                {"value": "DZN", "text": "Düzine"},
                                {"value": "MON", "text": "Ay"},
                                {"value": "DAY", "text": "Gün"},
                                {"value": "HUR", "text": "Saat"},
                                {"value": "ANN", "text": "Yıl"},
                                {"value": "KWH", "text": "Kilowatt Saat"},
                                {"value": "MWH", "text": "Megawatt Saat"}
                            ]
                        }
                    }
                }
            },
            "conditionalLogic": {
                "invoiceType": {
                    "TEMEL": {
                        "hide": [".field-discount", ".field-originalInvoice"]
                    },
                    "TICARI": {
                        "show": [".field-discount"],
                        "hide": [".field-originalInvoice"]
                    },
                    "IADE": {
                        "show": [".field-originalInvoice"],
                        "hide": [".field-discount"]
                    }
                },
                "scenario": {
                    "38": {
                        "show": [".field-exportInfo"]
                    }
                }
            }
        }
        
        return jsonify({
            'success': True,
            'data': schema,
            'requestId': str(uuid.uuid4()),
            'timestamp': now_utc().isoformat()
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e),
            'requestId': str(uuid.uuid4()),
            'timestamp': now_utc().isoformat()
        }), 500

@idempotent(methods=['POST'])
@invoice_management_bp.route('/invoices/create-dynamic', methods=['POST'])
@permission_required('invoice.create')
def create_dynamic_invoice():
    """Create invoice from dynamic form data"""
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({
                'success': False,
                'error': 'Request body is required',
                'requestId': str(uuid.uuid4()),
                'timestamp': now_utc().isoformat()
            }), 400
        
        # Validate required fields
        required_fields = ['recipient_name', 'recipient_tax_number', 'invoice_date']
        missing_fields = [field for field in required_fields if not data.get(field)]
        
        if missing_fields:
            return jsonify({
                'success': False,
                'error': f'Missing required fields: {", ".join(missing_fields)}',
                'requestId': str(uuid.uuid4()),
                'timestamp': now_utc().isoformat()
            }), 400
        
        # Generate invoice number
        year_month = datetime.utcnow().strftime('%Y%m')
        latest = Invoice.query.filter(
            Invoice.invoice_number.like(f'DYN{year_month}%')
        ).order_by(Invoice.created_at.desc()).first()
        
        if latest:
            last_num = int(latest.invoice_number[-4:])
            new_num = last_num + 1
        else:
            new_num = 1
        
        invoice_number = f"DYN{year_month}{new_num:04d}"
        
        # Create invoice record
        invoice = Invoice(
            invoice_number=invoice_number,
            patient_name=data.get('recipient_name'),
            patient_tc=data.get('recipient_tax_number'),
            patient_address=data.get('recipient_address', ''),
            device_name=data.get('product_name', 'Dinamik Fatura'),
            device_price=float(data.get('unit_price', 0)) * float(data.get('quantity', 1)),
            status='active',
            created_by=request.headers.get('X-User-ID', 'system')
        )
        
        db.session.add(invoice)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'data': {
                'invoiceId': invoice.id,
                'invoiceNumber': invoice.invoice_number,
                'status': invoice.status,
                'createdAt': invoice.created_at.isoformat()
            },
            'requestId': str(uuid.uuid4()),
            'timestamp': now_utc().isoformat()
        })
        
    except Exception as e:
        db.session.rollback()
        return jsonify({
            'success': False,
            'error': str(e),
            'requestId': str(uuid.uuid4()),
            'timestamp': now_utc().isoformat()
        }), 500

@invoice_management_bp.route('/invoices/<int:invoice_id>/xml', methods=['GET'])
@permission_required('invoice.view')
def generate_invoice_xml(invoice_id):
    """Generate XML for e-invoice integration"""
    try:
        invoice = db.session.get(Invoice, invoice_id)
        if not invoice:
            return jsonify({
                'success': False,
                'error': 'Invoice not found',
                'requestId': str(uuid.uuid4()),
                'timestamp': now_utc().isoformat()
            }), 404
        
        # Get company settings for XML generation
        company_settings = Settings.query.filter_by(key='company_info').first()
        company_info = json.loads(company_settings.value) if company_settings else {}
        
        # Create XML structure for e-invoice
        root = ET.Element('Invoice')
        root.set('xmlns', 'urn:oasis:names:specification:ubl:schema:xsd:Invoice-2')
        root.set('xmlns:cac', 'urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2')
        root.set('xmlns:cbc', 'urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2')
        
        # Invoice header
        id_elem = ET.SubElement(root, 'cbc:ID')
        id_elem.text = invoice.invoice_number
        
        issue_date = ET.SubElement(root, 'cbc:IssueDate')
        issue_date.text = invoice.created_at.strftime('%Y-%m-%d')
        
        invoice_type = ET.SubElement(root, 'cbc:InvoiceTypeCode')
        invoice_type.text = 'SATIS'
        
        # Currency
        currency_elem = ET.SubElement(root, 'cbc:DocumentCurrencyCode')
        currency_elem.text = 'TRY'
        
        # Supplier party (company)
        supplier_party = ET.SubElement(root, 'cac:AccountingSupplierParty')
        supplier = ET.SubElement(supplier_party, 'cac:Party')
        
        supplier_name = ET.SubElement(supplier, 'cac:PartyName')
        name_elem = ET.SubElement(supplier_name, 'cbc:Name')
        name_elem.text = company_info.get('title', 'X-Ear CRM')
        
        # Customer party
        customer_party = ET.SubElement(root, 'cac:AccountingCustomerParty')
        customer = ET.SubElement(customer_party, 'cac:Party')
        
        customer_name = ET.SubElement(customer, 'cac:PartyName')
        customer_name_elem = ET.SubElement(customer_name, 'cbc:Name')
        customer_name_elem.text = invoice.patient_name
        
        # Invoice lines
        invoice_line = ET.SubElement(root, 'cac:InvoiceLine')
        line_id = ET.SubElement(invoice_line, 'cbc:ID')
        line_id.text = '1'
        
        quantity = ET.SubElement(invoice_line, 'cbc:InvoicedQuantity')
        quantity.set('unitCode', 'C62')  # Unit code for pieces
        quantity.text = '1'
        
        line_amount = ET.SubElement(invoice_line, 'cbc:LineExtensionAmount')
        line_amount.set('currencyID', 'TRY')
        line_amount.text = str(invoice.device_price)
        
        item = ET.SubElement(invoice_line, 'cac:Item')
        item_name = ET.SubElement(item, 'cbc:Name')
        item_name.text = invoice.device_name or 'Ürün/Hizmet'
        
        price = ET.SubElement(invoice_line, 'cac:Price')
        price_amount = ET.SubElement(price, 'cbc:PriceAmount')
        price_amount.set('currencyID', 'TRY')
        price_amount.text = str(invoice.device_price)
        
        # Tax totals
        tax_total = ET.SubElement(root, 'cac:TaxTotal')
        tax_amount = ET.SubElement(tax_total, 'cbc:TaxAmount')
        tax_amount.set('currencyID', 'TRY')
        vat_amount = invoice.device_price * 0.20  # 20% VAT
        tax_amount.text = str(vat_amount)
        
        # Legal monetary total
        monetary_total = ET.SubElement(root, 'cac:LegalMonetaryTotal')
        
        line_total = ET.SubElement(monetary_total, 'cbc:LineExtensionAmount')
        line_total.set('currencyID', 'TRY')
        line_total.text = str(invoice.device_price)
        
        tax_exclusive = ET.SubElement(monetary_total, 'cbc:TaxExclusiveAmount')
        tax_exclusive.set('currencyID', 'TRY')
        tax_exclusive.text = str(invoice.device_price)
        
        tax_inclusive = ET.SubElement(monetary_total, 'cbc:TaxInclusiveAmount')
        tax_inclusive.set('currencyID', 'TRY')
        tax_inclusive.text = str(invoice.device_price + vat_amount)
        
        payable_amount = ET.SubElement(monetary_total, 'cbc:PayableAmount')
        payable_amount.set('currencyID', 'TRY')
        payable_amount.text = str(invoice.device_price + vat_amount)
        
        # Convert to pretty XML string
        rough_string = ET.tostring(root, 'utf-8')
        reparsed = minidom.parseString(rough_string)
        pretty_xml = reparsed.toprettyxml(indent='  ')
        
        return jsonify({
            'success': True,
            'data': {
                'invoiceId': invoice.id,
                'invoiceNumber': invoice.invoice_number,
                'xml': pretty_xml,
                'generatedAt': now_utc().isoformat()
            },
            'requestId': str(uuid.uuid4()),
            'timestamp': now_utc().isoformat()
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e),
            'requestId': str(uuid.uuid4()),
            'timestamp': now_utc().isoformat()
        }), 500

@idempotent(methods=['POST'])
@invoice_management_bp.route('/invoices/<int:invoice_id>/send-gib', methods=['POST'])
@permission_required('invoice.send_gib')
def send_invoice_to_gib(invoice_id):
    """Send invoice to GİB (Revenue Administration) for e-invoice"""
    try:
        invoice = db.session.get(Invoice, invoice_id)
        if not invoice:
            return jsonify({
                'success': False,
                'error': 'Invoice not found',
                'requestId': str(uuid.uuid4()),
                'timestamp': now_utc().isoformat()
            }), 404
        
        if invoice.sent_to_gib:
            return jsonify({
                'success': False,
                'error': 'Invoice already sent to GİB',
                'requestId': str(uuid.uuid4()),
                'timestamp': now_utc().isoformat()
            }), 400
        
        # TODO: Implement actual GİB integration
        # For now, simulate successful sending
        invoice.sent_to_gib = True
        invoice.sent_to_gib_at = now_utc()
        
        db.session.commit()
        
        return jsonify({
            'success': True,
            'data': {
                'invoiceId': invoice.id,
                'invoiceNumber': invoice.invoice_number,
                'sentToGib': True,
                'sentToGibAt': invoice.sent_to_gib_at.isoformat()
            },
            'requestId': str(uuid.uuid4()),
            'timestamp': now_utc().isoformat()
        })
        
    except Exception as e:
        db.session.rollback()
        return jsonify({
            'success': False,
            'error': str(e),
            'requestId': str(uuid.uuid4()),
            'timestamp': now_utc().isoformat()
        }), 500

@invoice_management_bp.route('/invoice-settings', methods=['GET'])
@permission_required('settings.view')
def get_invoice_settings():
    """Get invoice-related settings"""
    try:
        settings_keys = ['company_info', 'invoice_logo', 'invoice_signature']
        settings = {}
        
        for key in settings_keys:
            setting = Settings.query.filter_by(key=key).first()
            if setting:
                try:
                    settings[key] = json.loads(setting.value)
                except:
                    settings[key] = setting.value
            else:
                settings[key] = None
        
        return jsonify({
            'success': True,
            'data': settings,
            'requestId': str(uuid.uuid4()),
            'timestamp': now_utc().isoformat()
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e),
            'requestId': str(uuid.uuid4()),
            'timestamp': now_utc().isoformat()
        }), 500

@idempotent(methods=['POST'])
@invoice_management_bp.route('/invoice-settings', methods=['POST'])
@permission_required('settings.update')
def update_invoice_settings():
    """Update invoice-related settings"""
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({
                'success': False,
                'error': 'Request body is required',
                'requestId': str(uuid.uuid4()),
                'timestamp': now_utc().isoformat()
            }), 400
        
        updated_settings = []
        
        for key, value in data.items():
            if key in ['company_info', 'invoice_logo', 'invoice_signature']:
                setting = Settings.query.filter_by(key=key).first()
                
                if setting:
                    setting.value = json.dumps(value) if isinstance(value, (dict, list)) else str(value)
                    setting.updated_at = now_utc()
                else:
                    setting = Settings(
                        key=key,
                        value=json.dumps(value) if isinstance(value, (dict, list)) else str(value),
                        created_at=now_utc(),
                        updated_at=now_utc()
                    )
                    db.session.add(setting)
                
                updated_settings.append(key)
        
        db.session.commit()
        
        return jsonify({
            'success': True,
            'data': {
                'updatedSettings': updated_settings,
                'updatedAt': now_utc().isoformat()
            },
            'requestId': str(uuid.uuid4()),
            'timestamp': now_utc().isoformat()
        })
        
    except Exception as e:
        db.session.rollback()
        return jsonify({
            'success': False,
            'error': str(e),
            'requestId': str(uuid.uuid4()),
            'timestamp': now_utc().isoformat()
        }), 500