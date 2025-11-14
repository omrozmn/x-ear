import { Select, Input } from '@x-ear/ui-web';
import { AlertTriangle } from 'lucide-react';
import { InvoiceFormData } from '../../types/invoice';

interface GovernmentSectionProps {
  formData: InvoiceFormData;
  onChange: (field: string, value: any) => void;
  errors?: Record<string, string>;
}

// Kamu İstisna Sebepleri (Legacy'den tam liste)
const GOVERNMENT_EXEMPTION_REASONS = [
  { value: '0', label: 'Seçiniz' },
  { value: '101', label: '101 - İhracat İstisnası' },
  { value: '102', label: '102 - Diplomatik İstisna' },
  { value: '103', label: '103 - Askeri Amaçlı İstisna' },
  { value: '104', label: '104 - Petrol Arama Faaliyetlerinde Bulunanlara Yapılan Teslimler' },
  { value: '105', label: '105 - Uluslararası Anlaşmadan Doğan İstisna' },
  { value: '106', label: '106 - Diğer İstisnalar' },
  { value: '107', label: '107 - 7/a Maddesi Kapsamında Yapılan Teslimler' },
  { value: '108', label: '108 - Geçici 5. Madde Kapsamında Yapılan Teslimler' },
  { value: '151', label: '151 - ÖTV - İstisna Olmayan Diğer' },
  { value: '201', label: '201 - 17/1 Kültür ve Eğitim Amacı Taşıyan İşlemler' },
  { value: '202', label: '202 - 17/2-a Sağlık, Çevre Ve Sosyal Yardım Amaçlı İşlemler' },
  { value: '204', label: '204 - 17/2-c Yabancı Diplomatik Organ Ve Hayır Kurumlarının Yapacakları Bağışlarla İlgili Mal Ve Hizmet Alışları' },
  { value: '205', label: '205 - 17/2-d Taşınmaz Kültür Varlıklarına İlişkin Teslimler ve Mimarlık Hizmetleri' },
  { value: '206', label: '206 - 17/2-e Mesleki Kuruluşların İşlemleri' },
  { value: '207', label: '207 - 17/3 Askeri Fabrika, Tersane ve Atölyelerin İşlemleri' },
  { value: '208', label: '208 - 17/4-c Birleşme, Devir, Dönüşüm ve Bölünme İşlemleri' },
  { value: '209', label: '209 - 17/4-e Banka ve Sigorta Muameleleri Vergisi Kapsamına Giren İşlemler' },
  { value: '211', label: '211 - 17/4-h Zirai Amaçlı Su Teslimleri İle Köy Tüzel Kişiliklerince Yapılan İçme Suyu teslimleri' },
  { value: '212', label: '212 - 17/4-ı Serbest Bölgelerde Verilen Hizmetler' },
  { value: '213', label: '213 - 17/4-j Boru Hattı İle Yapılan Petrol Ve Gaz Taşımacılığı' },
  { value: '214', label: '214 - 17/4-k Organize Sanayi Bölgelerindeki Arsa ve İşyeri Teslimleri İle Konut Yapı Kooperatiflerinin Üyelerine Konut Teslimleri' },
  { value: '215', label: '215 - 17/4-l Varlık Yönetim Şirketlerinin İşlemleri' },
  { value: '216', label: '216 - 17/4-m Tasarruf Mevduatı Sigorta Fonunun İşlemleri' },
  { value: '217', label: '217 - 17/4-n Basın-Yayın ve Enformasyon Genel Müdürlüğüne Verilen Haber Hizmetleri' },
  { value: '218', label: '218 - KDV 17/4-o md. Gümrük Antrepoları, Geçici Depolama Yerleri ile Gümrüklü Sahalarda Vergisiz Satış Yapılan İşyeri, Depo ve Ardiye Gibi Bağımsız Birimlerin Kiralanması' },
  { value: '219', label: '219 - 17/4-p Hazine ve Arsa Ofisi Genel Müdürlüğünün işlemleri' },
  { value: '220', label: '220 - 17/4-r İki Tam Yıl Süreyle Sahip Olunan Taşınmaz ve İştirak Hisseleri Satışları' },
  { value: '221', label: '221 - Geçici 15 Konut Yapı Kooperatifleri, Belediyeler ve Sosyal Güvenlik Kuruluşlarına Verilen İnşaat Taahhüt Hizmeti' },
  { value: '223', label: '223 - Geçici 20/1 Teknoloji Geliştirme Bölgelerinde Yapılan İşlemler' },
  { value: '225', label: '225 - Geçici 23 Milli Eğitim Bakanlığına Yapılan Bilgisayar Bağışları İle İlgili Teslimler' },
  { value: '226', label: '226 - 17/2-b Özel Okulları, Üniversite ve Yüksekokullar Tarafından Verilen Bedelsiz Eğitim Ve Öğretim Hizmetleri' },
  { value: '227', label: '227 - 17/2-b Kanunların Gösterdiği Gerek Üzerine Bedelsiz Olarak Yapılan Teslim ve Hizmetler' },
  { value: '228', label: '228 - 17/2-b Kanunun (17/1) Maddesinde Sayılan Kurum ve Kuruluşlara Bedelsiz Olarak Yapılan Teslimler' },
  { value: '229', label: '229 - 17/2-b Gıda Bankacılığı Faaliyetinde Bulunan Dernek ve Vakıflara Bağışlanan Gıda, Temizlik, Giyecek ve Yakacak Maddeleri' },
  { value: '230', label: '230 - 17/4-g Külçe Altın, Külçe Gümüş Ve Kiymetli Taşlarin Teslimi' },
  { value: '231', label: '231 - 17/4-g Metal Plastik, Lastik, Kauçuk, Kağit, Cam Hurda Ve Atıkların Teslimi' },
  { value: '232', label: '232 - 17/4-g Döviz, Para, Damga Pulu, Değerli Kağıtlar, Hisse Senedi ve Tahvil Teslimleri' },
  { value: '234', label: '234 - 17/4-ş Konut Finansmanı Amacıyla Teminat Gösterilen ve İpotek Konulan Konutların Teslimi' },
  { value: '235', label: '235 - 16/1-c Transit ve Gümrük Antrepo Rejimleri İle Geçici Depolama ve Serbest Bölge Hükümlerinin Uygulandığiı Malların Teslimi' },
  { value: '236', label: '236 - 19/2 Usulüne Göre Yürürlüğe Girmiş Uluslararası Anlaşmalar Kapsamındaki İstisnalar (İade Hakkı Tanınmayan)' },
  { value: '237', label: '237 - 17/4-t 5300 Sayılı Kanuna Göre Düzenlenen Ürün Senetlerinin İhtisas/Ticaret Borsaları Aracılığıyla İlk Teslimlerinden Sonraki Teslim' },
  { value: '238', label: '238 - 17/4-u Varlıkların Varlık Kiralama Şirketlerine Devri İle Bu Varlıkların Varlık Kiralama Şirketlerince Kiralanması ve Devralınan Kuruma Devri' },
  { value: '239', label: '239 - 17/4-y Taşınmazların Finansal Kiralama Şirketlerine Devri, Finansal Kiralama Şirketi Tarafından Devredene Kiralanması ve Devri' },
  { value: '240', label: '240 - 17/4-z Patentli Veya Faydalı Model Belgeli Buluşa İlişkin Gayri Maddi Hakların Kiralanması, Devri ve Satışı' },
  { value: '241', label: '241 - TürkAkım Gaz Boru Hattı Projesine İlişkin Anlaşmanın (9/b) Maddesinde Yer Alan Hizmetler' },
  { value: '242', label: '242 - KDV 17/4-ö md. Gümrük Antrepoları, Geçici Depolama Yerleri ile Gümrüklü Sahalarda, İthalat ve İhracat İşlemlerine konu mallar ile transit rejim kapsamında işlem gören mallar için verilen ardiye, depolama ve terminal hizmetleri' },
  { value: '250', label: '250 - Diğerleri' },
  { value: '301', label: '301 - 11/1-a Mal İhracatı' },
  { value: '302', label: '302 - 11/1-a Hizmet İhracatı' },
  { value: '303', label: '303 - 11/1-a Roaming Hizmetleri' },
  { value: '304', label: '304 - 13/a Deniz Hava ve Demiryolu Taşıma Araçlarının Teslimi İle İnşa, Tadil, Bakım ve Onarımları' },
  { value: '305', label: '305 - 13/b Deniz ve Hava Taşıma Araçları İçin Liman Ve Hava Meydanlarında Yapılan Hizmetler' },
  { value: '306', label: '306 - 13/c Petrol Aramaları ve Petrol Boru Hatlarının İnşa ve Modernizasyonuna İlişkin Yapılan Teslim ve Hizmetler' },
  { value: '307', label: '307 - 13/c Maden Arama, Altın, Gümüş ve Platin Madenleri İçin İşletme, Zenginleştirme ve Rafinaj Faaliyetlerine İlişkin Teslim Ve Hizmetler' },
  { value: '308', label: '308 - 13/d Teşvikli Yatırım Mallarının Teslimi' },
  { value: '309', label: '309 - 13/e Liman Ve Hava Meydanlarının İnşası, Yenilenmesi Ve Genişletilmesi' },
  { value: '310', label: '310 - 13/f Ulusal Güvenlik Amaçlı Teslim ve Hizmetler' },
  { value: '311', label: '311 - 14/1 Uluslararası Taşımacılık' },
  { value: '312', label: '312 - 15/a Diplomatik Organ Ve Misyonlara Yapılan Teslim ve Hizmetler' },
  { value: '313', label: '313 - 15/b Uluslararası Kuruluşlara Yapılan Teslim ve Hizmetler' },
  { value: '314', label: '314 - 19/2 Usulüne Göre Yürürlüğe Girmiş Uluslar Arası Anlaşmalar Kapsamındaki İstisnalar' },
  { value: '315', label: '315 - 14/3 İhraç Konusu Eşyayı Taşıyan Kamyon, Çekici ve Yarı Romorklara Yapılan Motorin Teslimleri' },
  { value: '316', label: '316 - 11/1-a Serbest Bölgelerdeki Müşteriler İçin Yapılan Fason Hizmetler' },
  { value: '350', label: '350 - Diğerleri' },
  { value: '351', label: '351 - KDV - İstisna Olmayan Diğer' }
];

// Kamu İhraç Kayıtlı Sebepleri
const GOVERNMENT_EXPORT_REGISTERED_REASONS = [
  { value: '0', label: 'Seçiniz' },
  { value: '701', label: '701 - 3065 s. KDV Kanununun 11/1-c md. Kapsamındaki İhraç Kayıtlı Satış' },
  { value: '702', label: '702 - DİİB ve Geçici Kabul Rejimi Kapsamındaki Satışlar' },
  { value: '703', label: '703 - 4760 s. ÖTV Kanununun 8/2 Md. Kapsamındaki İhraç Kayıtlı Satış' },
  { value: '704', label: '704 - 3065 sayılı KDV Kanununun (11/1-c) maddesi ve 4760 s. Ötv Kanununun 8/2. Md. Kapsamındaki İhraç Kayıtlı Satış' }
];

export function GovernmentSection({
  formData,
  onChange,
  errors = {}
}: GovernmentSectionProps) {
  return (
    <div className="bg-white rounded-lg shadow p-6 mb-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Kamu Faturası Özel Bilgileri</h3>
      
      <div className="space-y-4">
        {/* Kamu Ödeme Yapacak Alıcı */}
        <div className="flex items-center">
          <input
            type="checkbox"
            id="governmentPayingCustomer"
            checked={formData.governmentPayingCustomer || false}
            onChange={(e) => onChange('governmentPayingCustomer', e.target.checked)}
            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
          />
          <label htmlFor="governmentPayingCustomer" className="ml-2 block text-sm text-gray-900">
            Kamu Ödeme Yapacak Alıcı
          </label>
        </div>

        {/* Kamu İstisna Sebebi */}
        <div>
          <Select
            label="Kamu İstisna Sebebi"
            value={formData.governmentExemptionReason || '0'}
            onChange={(e) => onChange('governmentExemptionReason', e.target.value)}
            options={GOVERNMENT_EXEMPTION_REASONS}
            error={errors.governmentExemptionReason}
            fullWidth
          />
          <p className="mt-1 text-sm text-gray-500">
            Kamu faturası için istisna sebebini seçiniz
          </p>
        </div>

        {/* Kamu İhraç Kayıtlı Sebebi */}
        <div>
          <Select
            label="Kamu İhraç Kayıtlı Sebebi"
            value={formData.governmentExportRegisteredReason || '0'}
            onChange={(e) => onChange('governmentExportRegisteredReason', e.target.value)}
            options={GOVERNMENT_EXPORT_REGISTERED_REASONS}
            error={errors.governmentExportRegisteredReason}
            fullWidth
          />
          <p className="mt-1 text-sm text-gray-500">
            İhraç kayıtlı satış için sebep seçiniz
          </p>
        </div>

        {/* Bilgilendirme */}
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <div className="flex items-start">
            <AlertTriangle className="text-amber-400 mr-2 flex-shrink-0" size={18} />
            <div>
              <h4 className="text-sm font-medium text-amber-800 mb-1">
                Kamu Faturası Uyarısı
              </h4>
              <p className="text-sm text-amber-700">
                Kamu faturalarında para birimi TRY olmalıdır. Ödeme bilgisi paneli otomatik olarak açılacaktır.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
