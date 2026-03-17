// Shared device canonicalizer
// Exports canonicalizeDevice(raw) and attaches to window.CanonicalizeDevice when run in browser.

function canonicalizeDevice(raw) {
    if (!raw) return raw;

    const d = Object.assign({}, raw);

    // Normalize ids
    d.id = d.id || d.deviceId || d.inventoryId || d.serialNumber || d._id || null;

    // Human-friendly name
    d.name = d.name || d.deviceName || `${d.brand || ''} ${d.model || ''}`.trim();

    // Brand/manufacturer
    d.brand = d.brand || d.manufacturer || '';

    // Inventory counts
    d.availableInventory = (d.availableInventory != null) ? d.availableInventory : ((d.inventory != null) ? d.inventory : 0);
    d.totalInventory = (d.totalInventory != null) ? d.totalInventory : ((d.totalInventory == null && d.totalInventory !== 0) ? d.totalInventory : d.totalInventory);
    d.usedInventory = (d.usedInventory != null) ? d.usedInventory : ((d.usedInventory == null && d.usedInventory !== 0) ? d.usedInventory : d.usedInventory);

    // Price normalization
    d.price = (d.price != null) ? d.price : (d.listPrice != null ? d.listPrice : 0);

    // Serial number aliases
    d.serialNumber = d.serialNumber || d.seriNo || d.serial || '';

    // Category canonicalization via XEar if available
    try {
        if (typeof window !== 'undefined' && window.XEar && window.XEar.CategoryNormalizer && typeof window.XEar.CategoryNormalizer.toCanonical === 'function') {
            d.category = window.XEar.CategoryNormalizer.toCanonical(d.category || d.type || d.deviceCategory);
        } else if (typeof d.category === 'string') {
            // Best-effort normalization: lowercase and replace spaces
            d.category = d.category.toLowerCase().replace(/\s+/g, '_');
        }
    } catch (e) {
        // ignore
    }

    // Ear normalization
    if (d.ear && typeof d.ear === 'string') {
        const ear = d.ear.toLowerCase();
        if (ear.startsWith('l') || ear === 'left') d.ear = 'left';
        else if (ear.startsWith('r') || ear === 'right') d.ear = 'right';
        else d.ear = 'both';
    }

    // Timestamps
    d.createdAt = d.createdAt || d.created_at || null;
    d.updatedAt = d.updatedAt || d.updated_at || null;

    return d;
}

// Node-compatible exports
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { canonicalizeDevice };
}

// Attach to window for browser usage
try {
    if (typeof window !== 'undefined') {
        window.CanonicalizeDevice = window.CanonicalizeDevice || { canonicalizeDevice };
    }
} catch (e) { /* ignore in non-browser envs */ }
