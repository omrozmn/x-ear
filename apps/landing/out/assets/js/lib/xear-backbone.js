(function (root, factory) {
    if (typeof define === 'function' && define.amd) {
        define([], factory);
    } else if (typeof module === 'object' && module.exports) {
        module.exports = factory();
    } else {
        root.XEar = factory();
    }
})(typeof self !== 'undefined' ? self : this, function () {
    'use strict';

    // Feature flags
    var BACKBONE_DEBUG = false;
    var STRICT_MODE = false;

    // Constants / Enums
    var Ears = Object.freeze({ LEFT: 'left', RIGHT: 'right', BOTH: 'both' });
    var AssignmentReasons = Object.freeze({ SALE: 'Sale', SERVICE_LOANER: 'ServiceLoaner', NEW_TRIAL: 'NewTrial', FITTING: 'Fitting', OTHER: 'Other' });
    var DeviceStatus = Object.freeze({ TRIAL: 'trial', ACTIVE: 'active', COMPLETED: 'completed', SERVICE: 'service' });

    var DEFAULT_SGK_SCHEMES = {
        worker: { coveragePercent: 75, maxAmount: 15000 },
        retired: { coveragePercent: 85, maxAmount: 18000 },
        disabled: { coveragePercent: 90, maxAmount: 20000 }
    };

    // Category normalizer
    var CategoryNormalizer = (function () {
        // Legacy -> canonical map (EMPTY: legacy tokens removed)
        // Previously: 'isitme_cihazi': 'hearing_aid',
        var legacyToCanonical = {};
        

        function toCanonical(cat) {
            if (!cat && cat !== '') return undefined;
            var c = String(cat).trim();
            return legacyToCanonical[c] || c;
        }

        function isHearingAid(cat) {
            var c = toCanonical(cat);
            return c === 'hearing_aid';
        }

        function labelFor(cat) {
            var c = toCanonical(cat);
            switch (c) {
                case 'hearing_aid': return 'İşitme Cihazı';
                case 'battery': return 'Pil';
                case 'accessory': return 'Aksesuar';
                default: return c || '';
            }
        }

        return {
            toCanonical: toCanonical,
            isHearingAid: isHearingAid,
            labelFor: labelFor
        };
    }());

    // Canonicalizers: map various input shapes to canonical frontend DTOs
    function canonicalizeInventoryItem(raw) {
        if (!raw) return null;
        var item = {};
        item.id = raw.id || raw.inventoryId || raw.code || null;
        item.name = raw.name || raw.deviceName || raw.model || '';
        item.brand = raw.brand || raw.manufacturer || '';
        item.category = CategoryNormalizer.toCanonical(raw.category || raw.type || raw.deviceCategory);
        // stock normalization: support both variants
        item.availableInventory = raw.availableInventory != null ? raw.availableInventory : (raw.available != null ? raw.available : 0);
        item.totalInventory = raw.totalInventory != null ? raw.totalInventory : 0;
        item.usedInventory = raw.usedInventory != null ? raw.usedInventory : 0;
        // DO NOT emit legacy aliases back to clients. Clients must use canonical fields.
        // Legacy aliases (availableStock/totalStock/usedStock) were removed intentionally.
        item.price = raw.price != null ? raw.price : (raw.listPrice != null ? raw.listPrice : 0);
        item.availableSerials = raw.availableSerials || raw.serials || [];
        item.supplier = raw.supplier || raw.manufacturer || '';
        item.raw = raw; // keep raw for debugging
        return item;
    }

    function canonicalizeDevice(raw) {
        if (!raw) return null;
        return {
            id: raw.id || raw.deviceId || null,
            brand: raw.brand || '',
            model: raw.model || '',
            serialNumber: raw.serialNumber || raw.serial_number || null,
            type: raw.device_type || raw.type || 'hearing_aid',
            category: CategoryNormalizer.toCanonical(raw.category || raw.type),
            price: raw.price || 0,
            raw: raw
        };
    }

    function canonicalizeError(err) {
        if (!err) return { message: 'Unknown error' };
        if (typeof err === 'string') return { message: err };
        // Common patterns
        var message = err.message || err.error || err.msg || err.description || err.messageText;
        return { message: message || 'Unknown error', raw: err };
    }

    // Lightweight event bus
    var EventBus = (function () {
        var listeners = Object.create(null);
        function on(event, fn) {
            if (!listeners[event]) listeners[event] = [];
            listeners[event].push(fn);
        }
        function off(event, fn) {
            var arr = listeners[event] || [];
            var idx = arr.indexOf(fn);
            if (idx >= 0) arr.splice(idx, 1);
        }
        function emit(event) {
            var args = Array.prototype.slice.call(arguments, 1);
            var arr = listeners[event] || [];
            arr.forEach(function (f) { try { f.apply(null, args); } catch (e) { if (BACKBONE_DEBUG) console.error(e); } });
        }
        return { on: on, off: off, emit: emit };
    }());

    // Settings accessor (simple cache)
    var SettingsAccessor = (function () {
        var cache = null;
        function fetchSettings(baseUrl) {
            baseUrl = baseUrl || getBaseUrl();
            if (cache) return Promise.resolve(cache);
            return fetch(baseUrl + '/settings').then(function (r) { return r.json(); }).then(function (j) { cache = j; return j; }).catch(function (e) { if (BACKBONE_DEBUG) console.warn('Failed to fetch settings', e); return {}; });
        }
        function sgkSchemes(baseUrl) {
            return fetchSettings(baseUrl).then(function (s) { return (s && s.schemes) || DEFAULT_SGK_SCHEMES; });
        }
        return { fetchSettings: fetchSettings, sgkSchemes: sgkSchemes };
    }());

    // Pricing helper: list price -> apply SGK -> apply discount -> compute patient pays
    function PricingHelper(listPrice, quantity, sgkScheme, discountType, discountValue) {
        quantity = quantity || 1;
        listPrice = (listPrice || 0) * quantity;
        var sgkSupportAmount = 0;
        if (sgkScheme) {
            var percent = sgkScheme.coveragePercent || 0;
            var maxAmount = sgkScheme.maxAmount || Number.POSITIVE_INFINITY;
            sgkSupportAmount = Math.min(listPrice * (percent / 100), maxAmount);
        }
        var amountWithoutDiscount = listPrice - sgkSupportAmount;
        var discountAmount = 0;
        if (discountType === 'percent' && discountValue > 0) discountAmount = amountWithoutDiscount * (discountValue / 100);
        else if (discountType === 'amount' && discountValue > 0) discountAmount = Math.min(discountValue, amountWithoutDiscount);
        var finalPatientPays = amountWithoutDiscount - discountAmount;
        return {
            listPrice: listPrice,
            sgkSupportAmount: sgkSupportAmount,
            discountAmount: discountAmount,
            patientPays: finalPatientPays
        };
    }

    // API wrapper & canonicalization
    function getDefaultBaseUrl() {
        if (typeof window !== 'undefined') {
            // Detect api-config override if present
            if (window.API_BASE_URL) return window.API_BASE_URL;
            if (window.__XEarApiBase) return window.__XEarApiBase;
        }
        return '/api';
    }
    var baseUrl = getDefaultBaseUrl();

    function setBaseUrl(url) { baseUrl = url; }

    function ApiClient() {
        this.baseUrl = baseUrl;
    }
    ApiClient.prototype._makeUrl = function (path, params) {
        var url = this.baseUrl + path;
        if (params) {
            var esc = encodeURIComponent;
            var query = Object.keys(params).map(function (k) { return esc(k) + '=' + esc(params[k]); }).join('&');
            if (query) url += '?' + query;
        }
        return url;
    };

    ApiClient.prototype.getDevices = function (opts) {
        opts = opts || {};
        var params = {};
        if (opts.inventory_only) params.inventory_only = opts.inventory_only;
        if (opts.category) params.category = CategoryNormalizer.toCanonical(opts.category);
        var url = this._makeUrl('/devices', params);
        return fetch(url).then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); }).then(function (payload) {
            var items = (payload && payload.devices) || [];
            return { success: payload.success, devices: items.map(canonicalizeInventoryItem), raw: payload };
        }).catch(function (err) { return { success: false, error: canonicalizeError(err) }; });
    };

    ApiClient.prototype.getPatients = function () { var url = this._makeUrl('/patients'); return fetch(url).then(function (r) { return r.json(); }); };

    // Public API
    var XEar = {
        Ears: Ears,
        AssignmentReasons: AssignmentReasons,
        DeviceStatus: DeviceStatus,
        DEFAULT_SGK_SCHEMES: DEFAULT_SGK_SCHEMES,
        CategoryNormalizer: CategoryNormalizer,
        canonicalizeInventoryItem: canonicalizeInventoryItem,
        canonicalizeDevice: canonicalizeDevice,
        canonicalizeError: canonicalizeError,
        EventBus: EventBus,
        SettingsAccessor: SettingsAccessor,
        PricingHelper: PricingHelper,
        Api: new ApiClient(),
        setBaseUrl: setBaseUrl,
        BACKBONE_DEBUG: BACKBONE_DEBUG,
        STRICT_MODE: STRICT_MODE
    };

    // UMD / global
    return XEar;
});
