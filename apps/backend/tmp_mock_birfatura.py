from flask import Flask, request, jsonify
app = Flask('mock_birfatura')

@app.route('/api/outEBelgeV2/SendDocument', methods=['POST'])
def send_document():
    data = request.get_json() or {}
    # Echo headers for diagnostics so the caller can verify forwarded headers
    return jsonify({'Success': True, 'Message': 'Mock SendDocument received', 'Received': data, 'Headers': dict(request.headers)}), 200

@app.route('/api/outEBelgeV2/SendBasicInvoiceFromModel', methods=['POST'])
def send_basic_invoice():
    data = request.get_json() or {}
    # Minimal validation
    if not data.get('invoiceNumber') and not data.get('items'):
        return jsonify({'Success': False, 'Message': 'Missing invoiceNumber or items'}), 400
    return jsonify({'Success': True, 'Message': 'Mock SendBasicInvoiceFromModel ok', 'data': {'providerId': 'mock-12345'}, 'Headers': dict(request.headers)}), 200

if __name__ == '__main__':
    app.run(host='127.0.0.1', port=5010)
