// invoice-conditional.js (public copy)
// ES module that initializes legacy-style conditional logic (drpSenaryo, drpFaturaTipi, SGK swap, tevkifat/özel matrah/iade behavior)
// Responsibility: UI visibility and flag synchronization only (keeps FE-only behavior; no new endpoints)

export function initInvoiceConditional() {
  // minimal selectors
  const drpSenaryo = document.getElementById('drpSenaryo');
  const drpFaturaTipi = document.getElementById('drpFaturaTipi');
  const invoiceType = document.getElementById('invoiceType');

  // hidden flags
  const hdnIhracatMi = document.getElementById('hdnIhracatMi');
  const hdnIhracKayitliMi = document.getElementById('hdnIhracKayitliMi');
  const hdnTeknolojiDestekMi = document.getElementById('hdnTeknolojiDestekMi');
  const hdnIlacTibbiCihazMi = document.getElementById('hdnIlacTibbiCihazMi');

  const txtSGKAlici = document.getElementById('txtSGKAlici');
  const sgkCustomerDiv = document.getElementById('sgkCustomerDiv');
  const txtFaturaMusteri = document.getElementById('customerSearch');
  const divFaturaAdresler = document.getElementById('divFaturaAdresler');
  const drpFaturaAdresler = document.getElementById('drpFaturaAdresler');
  const divFaturaAliciEtiketi = document.getElementById('divFaturaAliciEtiketi');
  const drpFaturaAliciEtiketi = document.getElementById('drpFaturaAliciEtiketi');

  const IadeBilgisi = document.getElementById('IadeBilgisi');
  const OzelMatrahBilgisi = document.getElementById('OzelMatrahBilgisi');

  // class toggles map
  const tevkifatClass = '.tevkifat';
  const ozelMatrahClass = '.ozelMatrah';
  const ilacDetayClass = '.IlacTibbiCihazDetay';
  const tevkifatIadeClass = '.tevkifat-iade';
  const iadeKdvClass = '.iade-kdvler';
  const kdvClass = '.kdv';

  const tevkifatTipleri = ['11','18','24','32'];
  const ozelMatrahTipleri = ['12','19','25','33'];
  const sgk = ['14'];

  function show(selector) {
    if (!selector) return;
    const el = typeof selector === 'string' ? document.querySelector(selector) : selector;
    if (!el) return;
    el.style.display = '';
    el.classList && el.classList.remove('section-hidden');
  }
  function hide(selector) {
    if (!selector) return;
    const el = typeof selector === 'string' ? document.querySelector(selector) : selector;
    if (!el) return;
    el.style.display = 'none';
    el.classList && el.classList.add('section-hidden');
  }
  function showAll(selectors) { selectors.forEach(s => { document.querySelectorAll(s).forEach(el => el.style.display = '') }); }
  function hideAll(selectors) { selectors.forEach(s => { document.querySelectorAll(s).forEach(el => el.style.display = 'none') }); }

  // sync invoiceType <-> drpFaturaTipi mapping
  function syncInvoiceTypeToLegacy(selected) {
    // minimal mapping: map modern values to legacy numeric ids used by design example
    const map = {
      'satis': '0',
      'iade': '15', // use tevkifat-iade path
      'tevkifat': '11',
      'ozelmatrah': '12',
      'ihrac': '13',
      'istisna': '0'
    };
    const val = map[selected] || '0';
    if (drpFaturaTipi) drpFaturaTipi.value = val;
    // trigger change
    drpFaturaTipi && drpFaturaTipi.dispatchEvent(new Event('change'));
  }

  // handle scenario change
  drpSenaryo && drpSenaryo.addEventListener('change', function() {
    const val = this.value;
    // reset
    hide('#kamuOdemeYapacakAlici');
    hide('#divKamuIhracKayitliSebep');
    hide('#SGKFaturasiBilgisi');
    hideAll([tevkifatClass, ozelMatrahClass, ilacDetayClass, tevkifatIadeClass, iadeKdvClass]);

    if (val === '5') { // ihracat
      hdnIhracatMi && (hdnIhracatMi.value = 'true');
      hdnIhracKayitliMi && (hdnIhracKayitliMi.value = 'false');
      document.querySelectorAll('.IhracatDetay').forEach(e=> e.style.display='');
    } else {
      hdnIhracatMi && (hdnIhracatMi.value = 'false');
      document.querySelectorAll('.IhracatDetay').forEach(e=> e.style.display='none');
    }

    if (val === '7') { // kamu
      show('#kamuOdemeYapacakAlici');
      // force currency to TRY if needed
      const drpPara = document.getElementById('currency') || document.getElementById('drpParaBirimi');
      if (drpPara) drpPara.value = 'TRY';
    }

    if (val === '36') { // diger
      show('#divMevcutSenaryo');
    } else {
      hide('#divMevcutSenaryo');
    }

    if (val === '45') {
      hdnIlacTibbiCihazMi && (hdnIlacTibbiCihazMi.value = 'true');
      document.querySelectorAll(ilacDetayClass).forEach(e=> e.style.display='');
    } else {
      hdnIlacTibbiCihazMi && (hdnIlacTibbiCihazMi.value = 'false');
      document.querySelectorAll(ilacDetayClass).forEach(e=> e.style.display='none');
    }
  });

  // handle invoice type change
  drpFaturaTipi && drpFaturaTipi.addEventListener('change', function() {
    const val = this.value;
    // default resets
    hideAll([tevkifatClass, ozelMatrahClass]);
    hide('#btnIadeBilgisi');
    hide('#IadeBilgisi');
    showAll([kdvClass]);

    if (tevkifatTipleri.indexOf(val) >= 0) {
      showAll([tevkifatClass]);
      hideAll([ozelMatrahClass]);
    }

    if (ozelMatrahTipleri.indexOf(val) >= 0) {
      show('#btnOzelMatrahBilgisi');
      showAll([ozelMatrahClass]);
      hideAll([tevkifatClass]);
    }

    if (sgk.indexOf(val) >= 0) {
      // SGK swap
      hide('#customerSearch');
      hide('#divFaturaAdresler');
      show('#sgkCustomerDiv');
      if (txtSGKAlici) txtSGKAlici.value = 'Sosyal Güvenlik Kurumu - 7750409379 Çankaya/ ANKARA - TÜRKİYE V.D ÇANKAYA VERGİ DAİRESİ (6257)';
      show('#SGKFaturasiBilgisi');
      const drpPara = document.getElementById('currency') || document.getElementById('drpParaBirimi');
      if (drpPara) drpPara.value = 'TRY';
    } else {
      show('#customerSearch');
      hide('#sgkCustomerDiv');
      show('#divFaturaAdresler');
      hide('#SGKFaturasiBilgisi');
    }

    // iade-specific
    if (val === '15' || val === '49') {
      show('#btnIadeBilgisi');
      show('#IadeBilgisi');
      showAll([tevkifatIadeClass, iadeKdvClass]);
      // set kdv selects to 0
      document.querySelectorAll('.kdv select').forEach(s => { s.value = '0' });
      document.querySelectorAll('.kdv').forEach(e=> e.style.display='none');
    } else if (val === '50') {
      show('#btnIadeBilgisi');
      show('#IadeBilgisi');
      hideAll([tevkifatIadeClass, iadeKdvClass]);
      showAll([kdvClass]);
    }

    // teknolojik destek
    if (val === '35') {
      hdnTeknolojiDestekMi && (hdnTeknolojiDestekMi.value = 'true');
      document.querySelectorAll('.TeknolojiDestekDetay').forEach(e=> e.style.display='');
    } else {
      hdnTeknolojiDestekMi && (hdnTeknolojiDestekMi.value = 'false');
      document.querySelectorAll('.TeknolojiDestekDetay').forEach(e=> e.style.display='none');
    }
  });

  // sync modern invoiceType to legacy drpFaturaTipi mapping
  invoiceType && invoiceType.addEventListener('change', function() {
    syncInvoiceTypeToLegacy(this.value);
  });

  // customer search auto-detect TC/VKN
  const customerTaxId = document.getElementById('customerTaxId');
  const customerType = document.getElementById('customerType');
  const customerTaxOffice = document.getElementById('customerTaxOffice');
  if (customerTaxId) {
    customerTaxId.addEventListener('input', function() {
      const clean = this.value.replace(/\D/g,'');
      if (clean.length === 11) {
        customerType && (customerType.value = 'bireysel');
        if (customerTaxOffice) customerTaxOffice.parentElement.style.display = 'none';
      } else if (clean.length === 10) {
        customerType && (customerType.value = 'kurumsal');
        if (customerTaxOffice) customerTaxOffice.parentElement.style.display = '';
      }
    });
  }

  // initialize for current values (if any)
  drpSenaryo && drpSenaryo.dispatchEvent(new Event('change'));
  drpFaturaTipi && drpFaturaTipi.dispatchEvent(new Event('change'));
}

// auto-init if module loaded after DOMContent
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => initInvoiceConditional());
} else {
  initInvoiceConditional();
}
