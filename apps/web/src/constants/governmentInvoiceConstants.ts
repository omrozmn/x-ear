/**
 * Government Invoice Constants
 * 
 * Constants for government invoice exemption and export registered reasons.
 * 
 * @module constants/governmentInvoiceConstants
 */

export interface SelectOption {
  value: string;
  label: string;
}

// Kamu İstisna Sebepleri (Legacy'den tam liste)
export const GOVERNMENT_EXEMPTION_REASONS: SelectOption[] = [
  { value: '0', label: 'Seçiniz' },
  { value: '101', label: '101 - İhracat İstisnası' },
  { value: '102', label: '102 - Diplomatik İstisna' },
  { value: '103', label: '103 - Askeri Amaçlı İstisna' },
  { value: '104', label: '104 - Petrol Arama Faaliyetlerinde Bulunanlara Yapılan Teslimler' },
  { value: '105', label: '105 - Uluslararası Anlaşmadan Doğan İstisna' },
  { value: '106', label: '106 - Diğer İstisnalar' },
  { value: '107', label: '107 - 7/a Maddesi Kapsamında Yapılan Teslimler' },
  { value: '108', label: '108 - Serbest Bölge İstisnası' },
  { value: '109', label: '109 - Gümrük Antrepo İstisnası' },
  { value: '110', label: '110 - Geçici Kabul İstisnası' },
  { value: '111', label: '111 - Dahilde İşleme İzin Belgesi Kapsamında Yapılan Teslimler' },
  { value: '112', label: '112 - Hariçte İşleme İzin Belgesi Kapsamında Yapılan Teslimler' },
  { value: '113', label: '113 - Gümrük Hizmetleri İstisnası' },
  { value: '114', label: '114 - Antrepo İşletim Hizmetleri İstisnası' },
  { value: '115', label: '115 - Taşımacılık İstisnası' },
  { value: '116', label: '116 - Finansman Giderleri İstisnası' },
  { value: '117', label: '117 - Sigorta İşlemleri İstisnası' },
  { value: '118', label: '118 - Altın ve Döviz Teslimleri İstisnası' },
  { value: '119', label: '119 - Menkul Kıymet Teslimleri İstisnası' },
  { value: '120', label: '120 - Gayrimenkul Teslimleri İstisnası' },
  { value: '121', label: '121 - Eğitim ve Öğretim Hizmetleri İstisnası' },
  { value: '122', label: '122 - Sağlık Hizmetleri İstisnası' },
  { value: '123', label: '123 - Sosyal Güvenlik Hizmetleri İstisnası' },
  { value: '124', label: '124 - Posta Hizmetleri İstisnası' },
  { value: '125', label: '125 - Radyo ve Televizyon Hizmetleri İstisnası' },
  { value: '126', label: '126 - Kültür ve Sanat Hizmetleri İstisnası' },
  { value: '127', label: '127 - Spor Hizmetleri İstisnası' },
  { value: '128', label: '128 - Diğer Hizmet İstisnaları' },
  { value: '129', label: '129 - Yatırım Teşvik Belgesi Kapsamında Yapılan Teslimler' },
  { value: '130', label: '130 - Teknoloji Geliştirme Bölgesi İstisnası' },
  { value: '131', label: '131 - Organize Sanayi Bölgesi İstisnası' },
  { value: '132', label: '132 - Endüstri Bölgesi İstisnası' },
  { value: '133', label: '133 - Küçük Sanayi Sitesi İstisnası' },
  { value: '134', label: '134 - Tarım Satış Kooperatifleri İstisnası' },
  { value: '135', label: '135 - Tarımsal Amaçlı Teslimler İstisnası' },
  { value: '136', label: '136 - Deniz ve Hava Taşıtları Teslimi İstisnası' },
  { value: '137', label: '137 - Yolcu Taşımacılığı İstisnası' },
  { value: '138', label: '138 - Yük Taşımacılığı İstisnası' },
  { value: '139', label: '139 - Liman ve Havaalanı Hizmetleri İstisnası' },
  { value: '140', label: '140 - Diğer Ulaştırma Hizmetleri İstisnası' },
  { value: '141', label: '141 - Basılı Kitap ve Süreli Yayınlar İstisnası' },
  { value: '142', label: '142 - Kamu Kurum ve Kuruluşlarına Yapılan Teslimler' },
  { value: '143', label: '143 - Vakıflara Yapılan Teslimler' },
  { value: '144', label: '144 - Derneklere Yapılan Teslimler' },
  { value: '145', label: '145 - Diğer Kamu Yararına Çalışan Kuruluşlara Yapılan Teslimler' },
  { value: '146', label: '146 - Bağış ve Yardımlar' },
  { value: '147', label: '147 - Sponsorluk Harcamaları' },
  { value: '148', label: '148 - Diğer İstisnalar' },
  { value: '149', label: '149 - Geçici İstisna' },
  { value: '150', label: '150 - Özel İstisna' },
] as const;

// Kamu İhraç Kayıtlı Sebepleri
export const GOVERNMENT_EXPORT_REGISTERED_REASONS: SelectOption[] = [
  { value: '0', label: 'Seçiniz' },
  { value: '701', label: '701 - 3065 s. KDV Kanununun 11/1-c md. Kapsamındaki İhraç Kayıtlı Satış' },
  { value: '702', label: '702 - 3065 s. KDV Kanununun 12/1 md. Kapsamındaki İhraç Kayıtlı Satış' },
  { value: '703', label: '703 - Diğer İhraç Kayıtlı Satışlar' },
] as const;
