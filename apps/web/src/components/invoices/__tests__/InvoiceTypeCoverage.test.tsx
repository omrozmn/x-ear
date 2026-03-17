import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '../../../test/utils';
import { InvoiceTypeSection } from '../InvoiceTypeSection';
import { InvoiceProfileDetailsCard } from '../InvoiceProfileDetailsCard';

vi.mock('@x-ear/ui-web', () => ({
  Select: ({ label, options, value, onChange }: { label?: string; options: Array<{ value: string; label: string }>; value?: string; onChange: (event: React.ChangeEvent<HTMLSelectElement>) => void }) => (
    <label>
      {label}
      <select data-allow-raw="true" aria-label={label} value={value} onChange={onChange}>
        {options.map((option: { value: string; label: string }) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  ),
  Input: ({ label, ...props }: React.InputHTMLAttributes<HTMLInputElement> & { label?: string }) => (
    <label>
      {label}
      <input data-allow-raw="true" aria-label={label} {...props} />
    </label>
  ),
}));

describe('InvoiceType coverage', () => {
  it('shows extended invoice type options for the default scenario', () => {
    render(
      <InvoiceTypeSection
        invoiceType=""
        scenario="other"
        currency="TRY"
        onChange={vi.fn()}
      />
    );

    expect(screen.getByText('Konaklama Vergisi (HKS)')).toBeInTheDocument();
    expect(screen.getByText('Enerji Şarj')).toBeInTheDocument();
    expect(screen.getByText('E-Arşiv Fatura')).toBeInTheDocument();
    expect(screen.getByText('Yolcu Beraberi')).toBeInTheDocument();
    expect(screen.getByText('ÖTV')).toBeInTheDocument();
    expect(screen.getByText('E-İrsaliye / Sevk')).toBeInTheDocument();
  });

  it('captures special profile details for missing invoice families', () => {
    const onChange = vi.fn();
    render(<InvoiceProfileDetailsCard invoiceType="yolcu" onChange={onChange} value={{}} />);

    fireEvent.change(screen.getByLabelText('Pasaport No'), { target: { value: 'P12345' } });
    fireEvent.change(screen.getByLabelText('Uyruğu'), { target: { value: 'DE' } });

    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({
      passengerPassportNo: 'P12345',
    }));
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({
      passengerNationality: 'DE',
    }));
  });
});
