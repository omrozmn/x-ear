import { Select } from '@x-ear/ui-web';
import { InvoiceScenario, InvoiceScenarioData } from '../../types/invoice';

interface InvoiceScenarioSectionProps {
    scenarioData?: InvoiceScenarioData;
    onChange: (data: InvoiceScenarioData) => void;
}

export function InvoiceScenarioSection({ scenarioData, onChange }: InvoiceScenarioSectionProps) {
    const scenarios = [
        { code: 1, value: 'sale', label: 'Satış', description: 'İşitme cihazı satış faturası' },
        { code: 2, value: 'service', label: 'Hizmet Faturası', description: 'Bakım, onarım ve diğer hizmetler' },
        { code: 5, value: 'export', label: 'İhracat', description: 'İhracat faturası' },
        { code: 7, value: 'government', label: 'Kamu', description: 'Kamu kurumu faturası' },
        { code: 45, value: 'medical', label: 'İlaç/Tıbbi Cihaz', description: 'İlaç ve tıbbi cihaz faturası' }
    ];

    const handleScenarioChange = (value: string) => {
        const selected = scenarios.find(s => s.value === value);
        if (selected) {
            onChange({
                scenario: selected.value as InvoiceScenario,
                scenarioCode: selected.code,
                scenarioName: selected.label,
                scenarioDescription: selected.description
            });
        }
    };

    return (
        <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Senaryo</h3>

            <div className="grid grid-cols-1 gap-4">
                <div>
                    <Select
                        label="Fatura Senaryosu"
                        value={scenarioData?.scenario || ''}
                        onChange={(e) => handleScenarioChange(e.target.value)}
                        options={[
                            { value: '', label: 'Seçiniz' },
                            ...scenarios.map(s => ({ value: s.value, label: `${s.label} - ${s.description}` }))
                        ]}
                        fullWidth
                        required
                    />
                    <p className="mt-2 text-sm text-gray-500">
                        Fatura senaryosunu seçiniz. Bu alan zorunludur.
                    </p>
                </div>

                {scenarioData?.scenario && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <div className="flex items-start">
                            <span className="text-blue-400 mr-2">ℹ️</span>
                            <div>
                                <h4 className="text-sm font-medium text-blue-800 mb-1">
                                    {scenarioData.scenarioName}
                                </h4>
                                <p className="text-sm text-blue-700">
                                    {scenarioData.scenarioDescription}
                                </p>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
