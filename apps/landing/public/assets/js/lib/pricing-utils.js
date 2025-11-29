// Shared Pricing Utilities
// Provides consistent KDV rate resolution and KDV-included price calculations

(function(global){
  function toCanonicalCategory(raw){
    try {
      const cat = (raw && (raw.category || raw.type || raw.deviceCategory || raw.device_type)) || '';
      if (global.XEar && global.XEar.CategoryNormalizer && typeof global.XEar.CategoryNormalizer.toCanonical === 'function') {
        return global.XEar.CategoryNormalizer.toCanonical(cat);
      }
      const t = String(cat).trim().toLowerCase();
      if (!t) return '';
      if (t === 'işitme cihazı' || t === 'isitme cihazı' || t === 'isitme_cihazi' || t === 'işitme_cihazı') return 'hearing_aid';
      return t;
    } catch (e) {
      return '';
    }
  }

  function resolveKdvRate(raw){
    const explicit = raw && raw.kdvRate;
    if (typeof explicit === 'number' && !isNaN(explicit)) return explicit;

    const price = raw && typeof raw.price === 'number' ? raw.price : parseFloat(raw && raw.price);
    const incl = raw && typeof raw.priceWithKdv === 'number' ? raw.priceWithKdv : parseFloat(raw && raw.priceWithKdv);
    if (!isNaN(price) && price > 0 && !isNaN(incl) && incl >= price) {
      const rate = ((incl - price) / price) * 100;
      return Math.max(0, Math.min(100, Number(rate.toFixed(2))));
    }

    const cat = toCanonicalCategory(raw);
    if (cat === 'hearing_aid') return 0;
    return 20;
  }

  function computePriceWithKdv(price, rate){
    const p = typeof price === 'number' ? price : parseFloat(price) || 0;
    const r = typeof rate === 'number' ? rate : parseFloat(rate) || 0;
    return p * (1 + r / 100);
  }

  function getKdvRateForItem(item){
    return resolveKdvRate(item || {});
  }

  function getKdvIncludedPrice(item){
    if (item && typeof item.priceWithKdv === 'number' && !isNaN(item.priceWithKdv)) return item.priceWithKdv;
    const base = item && typeof item.price === 'number' ? item.price : parseFloat(item && item.price) || 0;
    const rate = getKdvRateForItem(item || {});
    return computePriceWithKdv(base, rate);
  }

  global.PricingUtils = {
    toCanonicalCategory,
    resolveKdvRate,
    computePriceWithKdv,
    getKdvRateForItem,
    getKdvIncludedPrice
  };
})(window);