from flask import Blueprint, request, jsonify, make_response
import logging
from datetime import datetime

logger = logging.getLogger(__name__)

campaigns_bp = Blueprint('campaigns', __name__)

@campaigns_bp.route('/campaigns', methods=['GET'])
def get_campaigns():
    try:
        status = request.args.get('status')
        campaign_type = request.args.get('type')
        page = int(request.args.get('page', 1))
        per_page = int(request.args.get('per_page', 20))

        campaigns = [
            {
                "id": "camp_001",
                "name": "Yeni Hasta Kampanyası",
                "type": "sms",
                "status": "active",
                "targetAudience": "new_patients",
                "message": "İşitme testiniz için randevu alın!",
                "scheduledDate": "2024-01-20",
                "recipientCount": 150,
                "sentCount": 0,
                "createdAt": "2024-01-15T10:00:00Z"
            }
        ]

        return jsonify({
            "success": True,
            "data": campaigns,
            "meta": {
                "total": len(campaigns),
                "page": page,
                "perPage": per_page,
                "totalPages": 1
            },
             "timestamp": datetime.now().isoformat()
         })
    except Exception as e:
        logger.error(f"Get campaigns error: {str(e)}")
        return jsonify({"success": False, "error": str(e), "timestamp": datetime.now().isoformat()}), 500


@campaigns_bp.route('/campaigns', methods=['POST'])
def create_campaign():
    try:
        data = request.get_json() or {}
        if not data or 'name' not in data:
            return jsonify({"success": False, "error": "Invalid payload"}), 400

        camp = {
            'id': data.get('id') or f"camp_{datetime.now().strftime('%d%m%Y%H%M%S')}",
            'name': data.get('name'),
            'type': data.get('type', 'sms'),
            'status': data.get('status', 'draft'),
            'targetAudience': data.get('targetAudience')
        }

        # In real impl, persist to DB and schedule send
        resp = make_response(jsonify({"success": True, "data": camp, "timestamp": datetime.now().isoformat()}), 201)
        resp.headers['Location'] = f"/api/campaigns/{camp['id']}"
        return resp
    except Exception as e:
        logger.error(f"Create campaign error: {str(e)}")
        return jsonify({"success": False, "error": str(e), "timestamp": datetime.now().isoformat()}), 500


@campaigns_bp.route('/campaigns/<campaign_id>/send', methods=['POST'])
def send_campaign(campaign_id):
    try:
        data = request.get_json() or {}
        # In real implementation, you'd enqueue sending jobs
        return jsonify({"success": True, "message": f"Campaign {campaign_id} enqueued for send", "timestamp": datetime.now().isoformat()}), 200
    except Exception as e:
        logger.error(f"Send campaign error: {str(e)}")
        return jsonify({"success": False, "error": str(e), "timestamp": datetime.now().isoformat()}), 500
