from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
import uvicorn

app = FastAPI(title="mock_birfatura")


@app.post('/api/outEBelgeV2/SendDocument')
async def send_document(request: Request):
    try:
        data = await request.json()
    except Exception:
        data = {}

    return JSONResponse(
        {
            'Success': True,
            'Message': 'Mock SendDocument received',
            'Received': data,
            'Headers': dict(request.headers),
        },
        status_code=200,
    )


@app.post('/api/outEBelgeV2/SendBasicInvoiceFromModel')
async def send_basic_invoice(request: Request):
    try:
        data = await request.json()
    except Exception:
        data = {}

    if not data.get('invoiceNumber') and not data.get('items'):
        return JSONResponse({'Success': False, 'Message': 'Missing invoiceNumber or items'}, status_code=400)

    return JSONResponse(
        {
            'Success': True,
            'Message': 'Mock SendBasicInvoiceFromModel ok',
            'data': {'providerId': 'mock-12345'},
            'Headers': dict(request.headers),
        },
        status_code=200,
    )


if __name__ == '__main__':
    uvicorn.run(app, host='127.0.0.1', port=5010)
