# E-Commerce AI Service - AI content generation for marketplace listings
import json
import logging
from typing import List, Optional

logger = logging.getLogger(__name__)

MARKETPLACE_PLATFORMS = ['trendyol', 'hepsiburada', 'n11', 'amazon', 'ciceksepeti']


def generate_marketplace_content(inventory_item, platform: Optional[str], db) -> List[dict]:
    """
    Generate marketplace listing content using AI.
    Uses the existing AI model client infrastructure.
    """
    from ai.runtime.model_client import get_model_client

    platforms = [platform] if platform else MARKETPLACE_PLATFORMS

    # Build product context
    product_info = {
        'name': inventory_item.name,
        'brand': getattr(inventory_item, 'brand', ''),
        'model': getattr(inventory_item, 'model', ''),
        'category': getattr(inventory_item, 'category', ''),
        'barcode': getattr(inventory_item, 'barcode', ''),
        'price': float(getattr(inventory_item, 'price', 0)),
        'description': getattr(inventory_item, 'description', ''),
        'features': getattr(inventory_item, 'features', ''),
    }

    results = []
    client = get_model_client()

    for p in platforms:
        prompt = f"""Sen bir e-ticaret pazaryeri uzmanısın. Aşağıdaki ürün bilgilerine göre {p.upper()} pazaryeri için ürün listesi içeriği oluştur.

Ürün Bilgileri:
- İsim: {product_info['name']}
- Marka: {product_info['brand']}
- Model: {product_info['model']}
- Kategori: {product_info['category']}
- Barkod: {product_info['barcode']}
- Fiyat: {product_info['price']} TL
- Açıklama: {product_info['description']}

JSON formatında yanıt ver:
{{
  "title": "Pazaryeri başlığı (SEO optimize, max 255 karakter)",
  "description": "Detaylı ürün açıklaması (HTML destekli, SEO optimize)",
  "price": {product_info['price']},
  "listingData": {{}}
}}

Sadece JSON döndür, başka bir şey yazma."""

        try:
            response = client.chat(
                messages=[{"role": "user", "content": prompt}],
                temperature=0.3,
                max_tokens=1000
            )
            content = response.get('content', '{}')
            # Try to parse JSON from response
            try:
                parsed = json.loads(content)
            except json.JSONDecodeError:
                # Try to extract JSON from markdown code blocks
                import re
                json_match = re.search(r'```(?:json)?\s*([\s\S]*?)\s*```', content)
                if json_match:
                    parsed = json.loads(json_match.group(1))
                else:
                    parsed = {}

            results.append({
                'platform': p,
                'marketplace_title': parsed.get('title', ''),
                'marketplace_description': parsed.get('description', ''),
                'marketplace_price': parsed.get('price', product_info['price']),
                'listing_data': json.dumps(parsed.get('listingData', {})),
            })
        except Exception as e:
            logger.error(f"AI content generation failed for {p}: {e}")
            results.append({
                'platform': p,
                'marketplace_title': product_info['name'],
                'marketplace_description': product_info['description'],
                'marketplace_price': product_info['price'],
                'listing_data': '{}',
            })

    return results
