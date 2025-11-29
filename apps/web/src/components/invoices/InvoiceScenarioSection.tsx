import { Select } from '@x-ear/ui-web';
import { Info, AlertTriangle } from 'lucide-react';
import { InvoiceScenario, InvoiceScenarioData } from '../../types/invoice';
import { useState } from 'react';

interface InvoiceScenarioSectionProps {
    scenarioData?: InvoiceScenarioData;
    onChange: (data: InvoiceScenarioData) => void;
    disableSubScenario?: boolean; // Tip 14, 15, 35 için otomatik Temel
}

export function InvoiceScenarioSection({ scenarioData, onChange, disableSubScenario = false }: InvoiceScenarioSectionProps) {
    const [showSubScenario, setShowSubScenario] = useState(scenarioData?.scenario === 'other');

    const scenarios = [
        { code: 36, value: 'other', label: 'Diğer', description: 'Temel veya Ticari fatura (Alt senaryo seçimi gerekli)' },
        { code: 5, value: 'export', label: 'İhracat', description: 'İhracat faturası' },
        { code: 7, value: 'government', label: 'Kamu', description: 'Kamu kurumu faturası' },
        { code: 45, value: 'medical', label: 'İlaç/Tıbbi Cihaz', description: 'İlaç ve tıbbi cihaz faturası' }
    ];

    const subScenarios = [
        { code: 2, value: '2', label: 'Temel Fatura', description: 'Temel e-fatura senaryosu' },
        { code: 3, value: '3', label: 'Ticari Fatura', description: 'Ticari e-fatura senaryosu' }
    ];

    const handleScenarioChange = (value: string) => {
        const selected = scenarios.find(s => s.value === value);
        if (selected) {
            const isOther = selected.value === 'other';
            setShowSubScenario(isOther);
            
            onChange({
                scenario: selected.value as InvoiceScenario,
                scenarioCode: selected.code,
                scenarioName: selected.label,
                scenarioDescription: selected.description,
                currentScenarioType: isOther ? '2' : undefined // Varsayılan Temel
            });
        }
    };

    const handleSubScenarioChange = (value: '2' | '3') => {
        if (scenarioData) {
            onChange({
                ...scenarioData,
                currentScenarioType: value
            });
        }
    };

    return (
        <div className="space-y-4">
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

                {/* Alt Senaryo Seçimi - Sadece "Diğer" için */}
                {showSubScenario && (
                    <div>
                        <Select
                            label="Mevcut Fatura Senaryonuz"
                            value={scenarioData?.currentScenarioType || '2'}
                            onChange={(e) => handleSubScenarioChange(e.target.value as '2' | '3')}
                            options={subScenarios.map(s => ({ value: s.value, label: s.label }))}
                            disabled={disableSubScenario}
                            fullWidth
                            required
                        />
                        <p className="mt-2 text-sm text-gray-500">
                            {disableSubScenario 
                                ? 'Bu fatura tipi sadece Temel senaryo ile kullanılabilir.'
                                : 'Temel veya Ticari fatura senaryosu seçiniz.'}
                        </p>
                    </div>
                )}

                            {/* informational cards moved to form to appear under Invoice Type */}
        </div>
    );
}
