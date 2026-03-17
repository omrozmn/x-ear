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

// Kamu İstisna Sebepleri (GİB Resmi Kodları - İşletme Test Dosyalarından Doğrulanmış)
export const GOVERNMENT_EXEMPTION_REASONS: SelectOption[] = [
  { value: '0', label: 'Seçiniz' },
  // 300 Serisi - 0 KDV Oranı (En Sık Kullanılanlar)
  { value: '301', label: '301 - Mal İhracı (KDV Kanunu 11/1-a)' },
  { value: '302', label: '302 - Hizmet İhracı (KDV Kanunu 12/1)' },
  { value: '303', label: '303 - Roaming Hizmetleri (KDV Kanunu 12/2)' },
  { value: '304', label: '304 - Uluslararası Taşımacılık (KDV Kanunu 12/3)' },
  { value: '305', label: '305 - Diplomatik İstisna (KDV Kanunu 15/1-a)' },
  { value: '306', label: '306 - İhraç Kayıtlı Teslimler (KDV Kanunu 11/1-c)' },
  { value: '307', label: '307 - Serbest Bölge Fason Hizmetler (KDV Kanunu 16/1)' },
  { value: '308', label: '308 - Liman ve Havaalanı Hizmetleri (KDV Kanunu 13/g)' },
  { value: '309', label: '309 - Petrol Arama ve Boru Hattı (KDV Kanunu 15/1-c)' },
  { value: '310', label: '310 - Altın, Gümüş, Platin Arama (KDV Kanunu 13/h)' },
  { value: '311', label: '311 - Taşımacılık İstisnası (KDV Kanunu 17/4-c)' },
  { value: '312', label: '312 - İstisna Kapsamındaki Kuruluşlar (KDV Kanunu 17/4)' },
  { value: '313', label: '313 - Deniz/Hava/Demiryolu Araçları (KDV Kanunu 13/f)' },
  { value: '314', label: '314 - Liman ve Havaalanı İnşaatı (KDV Kanunu 13/g)' },
  { value: '315', label: '315 - Milli Güvenlik Amaçlı (KDV Kanunu 15/1-b)' },
  { value: '316', label: '316 - Ulusal Güvenlik Kuruluşları (KDV Kanunu 15/1-b)' },
  { value: '317', label: '317 - Engellilerin Eğitim, Meslek ve Günlük Yaşam Araç-Gereçleri (KDV Kanunu 17/4-s)' },
  { value: '318', label: '318 - Yatırım Teşvik Belgesi Makine/Teçhizat (KDV Kanunu 13/a)' },
  { value: '350', label: '350 - Diğer 0 KDV Resmi İstisna' },
  // 100 Serisi - Genel İstisnalar
  { value: '101', label: '101 - İhracat İstisnası (KDV Kanunu 11/1-a)' },
  { value: '102', label: '102 - Diplomatik İstisna (KDV Kanunu 15/1-a)' },
  { value: '103', label: '103 - Askeri Amaçlı İstisna (KDV Kanunu 15/1-b)' },
  { value: '104', label: '104 - Petrol Arama Faaliyetleri (KDV Kanunu 15/1-c)' },
  { value: '105', label: '105 - Uluslararası Anlaşmadan Doğan İstisna (KDV Kanunu 15/1-d)' },
  { value: '106', label: '106 - Diğer İstisnalar (KDV Kanunu 15/1-e)' },
  { value: '107', label: '107 - Yurt Dışındaki Müşteriler İçin Fason Hizmet (KDV Kanunu 12/2)' },
  { value: '108', label: '108 - Serbest Bölge İstisnası (KDV Kanunu 16)' },
  { value: '109', label: '109 - Gümrük Antrepo İstisnası (KDV Kanunu 16/1-a)' },
  { value: '110', label: '110 - Geçici Kabul İstisnası (KDV Kanunu 16/1-b)' },
  { value: '111', label: '111 - Dahilde İşleme İzin Belgesi (KDV Kanunu 11/1-c)' },
  { value: '112', label: '112 - Hariçte İşleme İzin Belgesi (KDV Kanunu 11/1-d)' },
  { value: '113', label: '113 - Gümrük Hizmetleri İstisnası (KDV Kanunu 17/4-a)' },
  { value: '114', label: '114 - Antrepo İşletim Hizmetleri (KDV Kanunu 17/4-b)' },
  { value: '115', label: '115 - Taşımacılık İstisnası (KDV Kanunu 17/4-c)' },
  { value: '116', label: '116 - Finansman Giderleri İstisnası (KDV Kanunu 17/4-d)' },
  { value: '117', label: '117 - Sigorta İşlemleri İstisnası (KDV Kanunu 17/4-e)' },
  { value: '118', label: '118 - Altın ve Döviz Teslimleri (KDV Kanunu 17/4-f)' },
  { value: '119', label: '119 - Menkul Kıymet Teslimleri (KDV Kanunu 17/4-g)' },
  { value: '120', label: '120 - Gayrimenkul Teslimleri (KDV Kanunu 17/4-h)' },
  { value: '121', label: '121 - Eğitim ve Öğretim Hizmetleri (KDV Kanunu 17/4-i)' },
  { value: '122', label: '122 - Sağlık Hizmetleri (KDV Kanunu 17/4-j)' },
  { value: '123', label: '123 - Sosyal Güvenlik Hizmetleri (KDV Kanunu 17/4-k)' },
  { value: '124', label: '124 - Posta Hizmetleri (KDV Kanunu 17/4-l)' },
  { value: '125', label: '125 - Radyo ve Televizyon Hizmetleri (KDV Kanunu 17/4-m)' },
  { value: '126', label: '126 - Kültür ve Sanat Hizmetleri (KDV Kanunu 17/4-n)' },
  { value: '127', label: '127 - Spor Hizmetleri (KDV Kanunu 17/4-o)' },
  { value: '128', label: '128 - Diğer Hizmet İstisnaları (KDV Kanunu 17/4-p)' },
  { value: '129', label: '129 - Yatırım Teşvik Belgesi Kapsamı (KDV Kanunu 13/a)' },
  { value: '130', label: '130 - Teknoloji Geliştirme Bölgesi (KDV Kanunu 13/b)' },
  { value: '131', label: '131 - Organize Sanayi Bölgesi (KDV Kanunu 13/c)' },
  { value: '132', label: '132 - Endüstri Bölgesi (KDV Kanunu 13/d)' },
  { value: '133', label: '133 - Küçük Sanayi Sitesi (KDV Kanunu 13/e)' },
  { value: '134', label: '134 - Tarım Satış Kooperatifleri (KDV Kanunu 17/1)' },
  { value: '135', label: '135 - Tarımsal Amaçlı Teslimler (KDV Kanunu 17/2)' },
  { value: '136', label: '136 - Deniz ve Hava Taşıtları Teslimi (KDV Kanunu 13/f)' },
  { value: '137', label: '137 - Yolcu Taşımacılığı (KDV Kanunu 17/4-c)' },
  { value: '138', label: '138 - Yük Taşımacılığı (KDV Kanunu 17/4-c)' },
  { value: '139', label: '139 - Liman ve Havaalanı Hizmetleri (KDV Kanunu 13/g)' },
  { value: '140', label: '140 - Diğer Ulaştırma Hizmetleri (KDV Kanunu 17/4-c)' },
  { value: '141', label: '141 - Basılı Kitap ve Süreli Yayınlar (KDV Kanunu 17/4-s)' },
  { value: '142', label: '142 - Kamu Kurum ve Kuruluşlarına Teslim (KDV Kanunu 17/4-t)' },
  { value: '143', label: '143 - Vakıflara Yapılan Teslimler (KDV Kanunu 17/4-u)' },
  { value: '144', label: '144 - Derneklere Yapılan Teslimler (KDV Kanunu 17/4-v)' },
  { value: '145', label: '145 - Kamu Yararına Çalışan Kuruluşlar (KDV Kanunu 17/4-w)' },
  { value: '146', label: '146 - Bağış ve Yardımlar (KDV Kanunu 17/4-x)' },
  { value: '147', label: '147 - Sponsorluk Harcamaları (KDV Kanunu 17/4-y)' },
  { value: '148', label: '148 - Diğer İstisnalar (KDV Kanunu 17/4-z)' },
  { value: '149', label: '149 - Geçici İstisna (Özel Kanun)' },
  { value: '150', label: '150 - Özel İstisna (Özel Kanun)' },
  // 200 Serisi - KDV Kanunu Madde 17 İstisnaları
  { value: '201', label: '201 - KDV Kanunu 17/1 - Kültür ve Eğitim Amaçlı' },
  { value: '202', label: '202 - KDV Kanunu 17/2 - Sosyal Amaçlı' },
  { value: '203', label: '203 - KDV Kanunu 17/3 - Askeri Amaçlı' },
  { value: '204', label: '204 - KDV Kanunu 17/4 - Diğer İstisna' },
  // 500 Serisi - Özel Durumlar
  { value: '501', label: '501 - Yolcu Beraberi Eşya İhracı (KDV Kanunu 11/1-a)' },
  // 700 Serisi - İhraç Kayıtlı Satışlar
  { value: '701', label: '701 - İhraç Kayıtlı Satış (KDV Kanunu 11/1-c)' },
  { value: '702', label: '702 - DİİB ve Geçici Kabul Rejimi Kapsamında Satışlar (KDV Kanunu 11/1-c)' },
  { value: '703', label: '703 - Dahilde İşleme Rejimi (KDV Kanunu 11/1-c)' },
  { value: '704', label: '704 - Tecil-Terkin Kapsamında (KDV Kanunu 11/1-c)' },
  { value: '705', label: '705 - Diğer İhraç Kayıtlı Satış (KDV Kanunu 11/1-c)' },
  // 800 Serisi - Özel Durumlar
  { value: '801', label: '801 - Kısmi İstisna (KDV Kanunu 17/4)' },
  { value: '802', label: '802 - Kısmi İstisna Diğer İşlem (KDV Kanunu 17/4)' },
  { value: '803', label: '803 - Vergiden Muaf Esnaf (KDV Kanunu 18)' },
  { value: '804', label: '804 - Basit Usul (Gelir Vergisi Kanunu)' },
  { value: '805', label: '805 - ÖTV Kapsamı Dışı İşlem' },
  { value: '806', label: '806 - Özel Matrah (KDV Kanunu 27)' },
] as const;

// Kamu İhraç Kayıtlı Sebepleri
export const GOVERNMENT_EXPORT_REGISTERED_REASONS: SelectOption[] = [
  { value: '0', label: 'Seçiniz' },
  { value: '701', label: '701 - 3065 s. KDV Kanununun 11/1-c md. Kapsamındaki İhraç Kayıtlı Satış' },
  { value: '702', label: '702 - 3065 s. KDV Kanununun 12/1 md. Kapsamındaki İhraç Kayıtlı Satış' },
  { value: '703', label: '703 - Diğer İhraç Kayıtlı Satışlar' },
] as const;
