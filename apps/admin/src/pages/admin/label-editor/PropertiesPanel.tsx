import React from 'react';
import type { ComponentConfig } from '@/services/label.service';
import type { EditorActions } from './useEditorState';

interface PropertiesPanelProps {
  editor: EditorActions;
}

const PropertiesPanel: React.FC<PropertiesPanelProps> = ({ editor }) => {
  const { selectedComponent, updateComponent, updateComponentProperties } = editor;

  if (!selectedComponent) {
    return (
      <div className="w-64 border-l dark:border-gray-700 bg-white dark:bg-gray-800 flex flex-col shrink-0">
        <div className="p-3 border-b dark:border-gray-700">
          <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
            Ozellikler
          </h3>
        </div>
        <div className="flex-1 flex items-center justify-center p-4">
          <p className="text-sm text-gray-400 dark:text-gray-500 text-center">
            Ozelliklerini duzenlemek icin bir bilesen secin
          </p>
        </div>
      </div>
    );
  }

  const comp = selectedComponent;
  const props = comp.properties;

  const setField = (field: keyof ComponentConfig, value: number | string) => {
    updateComponent(comp.id, { [field]: value });
  };

  const setProp = (key: string, value: unknown) => {
    updateComponentProperties(comp.id, { [key]: value });
  };

  return (
    <div className="w-64 border-l dark:border-gray-700 bg-white dark:bg-gray-800 flex flex-col shrink-0 overflow-y-auto">
      <div className="p-3 border-b dark:border-gray-700">
        <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
          Ozellikler
        </h3>
        <span className="text-xs text-blue-600 dark:text-blue-400 font-medium">
          {comp.type.toUpperCase()}
        </span>
      </div>

      <div className="p-3 space-y-4">
        {/* Position */}
        <Section title="Konum">
          <div className="grid grid-cols-2 gap-2">
            <NumberInput label="X" value={comp.x} onChange={(v) => setField('x', v)} step={0.5} />
            <NumberInput label="Y" value={comp.y} onChange={(v) => setField('y', v)} step={0.5} />
          </div>
        </Section>

        {/* Size */}
        <Section title="Boyut">
          <div className="grid grid-cols-2 gap-2">
            <NumberInput label="Genislik" value={comp.width} onChange={(v) => setField('width', v)} min={1} step={0.5} />
            <NumberInput label="Yukseklik" value={comp.height} onChange={(v) => setField('height', v)} min={1} step={0.5} />
          </div>
        </Section>

        {/* Rotation & zIndex */}
        <Section title="Donus ve Katman">
          <div className="grid grid-cols-2 gap-2">
            <NumberInput label="Donus" value={comp.rotation} onChange={(v) => setField('rotation', v)} min={-360} max={360} />
            <NumberInput label="Z-Indeks" value={comp.zIndex} onChange={(v) => setField('zIndex', v)} min={0} />
          </div>
        </Section>

        {/* Type-specific properties */}
        {comp.type === 'text' && <TextProperties props={props} onChange={setProp} />}
        {comp.type === 'barcode' && <BarcodeProperties props={props} onChange={setProp} />}
        {comp.type === 'qrcode' && <QRCodeProperties props={props} onChange={setProp} />}
        {comp.type === 'shape' && <ShapeProperties props={props} onChange={setProp} />}
        {comp.type === 'image' && <ImageProperties props={props} onChange={setProp} />}
      </div>
    </div>
  );
};

/* ─── Sub-sections ─── */

const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <div>
    <h4 className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2 uppercase tracking-wide">
      {title}
    </h4>
    {children}
  </div>
);

const NumberInput: React.FC<{
  label: string;
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  step?: number;
}> = ({ label, value, onChange, min, max, step = 1 }) => (
  <div>
    <label className="text-xs text-gray-400 dark:text-gray-500">{label}</label>
    <input
      type="number"
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
      min={min}
      max={max}
      step={step}
      className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white p-1.5 text-xs"
    />
  </div>
);

const TextInput: React.FC<{
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}> = ({ label, value, onChange, placeholder }) => (
  <div>
    <label className="text-xs text-gray-400 dark:text-gray-500">{label}</label>
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white p-1.5 text-xs"
    />
  </div>
);

const ColorInput: React.FC<{
  label: string;
  value: string;
  onChange: (v: string) => void;
}> = ({ label, value, onChange }) => (
  <div>
    <label className="text-xs text-gray-400 dark:text-gray-500">{label}</label>
    <div className="flex items-center gap-2">
      <input
        type="color"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-8 h-8 rounded border border-gray-300 dark:border-gray-600 cursor-pointer"
      />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="flex-1 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white p-1.5 text-xs font-mono"
      />
    </div>
  </div>
);

const SelectInput: React.FC<{
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (v: string) => void;
}> = ({ label, value, options, onChange }) => (
  <div>
    <label className="text-xs text-gray-400 dark:text-gray-500">{label}</label>
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white p-1.5 text-xs"
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  </div>
);

const ToggleInput: React.FC<{
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
}> = ({ label, value, onChange }) => (
  <div className="flex items-center justify-between">
    <label className="text-xs text-gray-400 dark:text-gray-500">{label}</label>
    <button
      type="button"
      onClick={() => onChange(!value)}
      className={`relative w-9 h-5 rounded-full transition-colors ${
        value ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-600'
      }`}
    >
      <div
        className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${
          value ? 'translate-x-4' : 'translate-x-0.5'
        }`}
      />
    </button>
  </div>
);

/* ─── Type-specific property forms ─── */

const TextProperties: React.FC<{
  props: Record<string, unknown>;
  onChange: (key: string, value: unknown) => void;
}> = ({ props, onChange }) => (
  <Section title="Metin Ozellikleri">
    <div className="space-y-2">
      <div>
        <label className="text-xs text-gray-400 dark:text-gray-500">Icerik</label>
        <textarea
          value={(props.text as string) || ''}
          onChange={(e) => onChange('text', e.target.value)}
          rows={3}
          className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white p-1.5 text-xs resize-none"
        />
      </div>
      <SelectInput
        label="Yazi Tipi"
        value={(props.fontFamily as string) || 'Arial'}
        options={[
          { value: 'Arial', label: 'Arial' },
          { value: 'Helvetica', label: 'Helvetica' },
          { value: 'Times New Roman', label: 'Times New Roman' },
          { value: 'Courier New', label: 'Courier New' },
          { value: 'Georgia', label: 'Georgia' },
          { value: 'Verdana', label: 'Verdana' },
        ]}
        onChange={(v) => onChange('fontFamily', v)}
      />
      <NumberInput
        label="Yazi Boyutu"
        value={(props.fontSize as number) || 12}
        onChange={(v) => onChange('fontSize', v)}
        min={4}
        max={200}
      />
      <SelectInput
        label="Yazi Kalınlığı"
        value={(props.fontWeight as string) || 'normal'}
        options={[
          { value: 'normal', label: 'Normal' },
          { value: 'bold', label: 'Kalin' },
        ]}
        onChange={(v) => onChange('fontWeight', v)}
      />
      <ColorInput
        label="Renk"
        value={(props.color as string) || '#000000'}
        onChange={(v) => onChange('color', v)}
      />
      <SelectInput
        label="Hizalama"
        value={(props.align as string) || 'left'}
        options={[
          { value: 'left', label: 'Sola' },
          { value: 'center', label: 'Ortala' },
          { value: 'right', label: 'Saga' },
        ]}
        onChange={(v) => onChange('align', v)}
      />
    </div>
  </Section>
);

const BarcodeProperties: React.FC<{
  props: Record<string, unknown>;
  onChange: (key: string, value: unknown) => void;
}> = ({ props, onChange }) => (
  <Section title="Barkod Ozellikleri">
    <div className="space-y-2">
      <TextInput
        label="Veri"
        value={(props.data as string) || ''}
        onChange={(v) => onChange('data', v)}
        placeholder="123456789"
      />
      <SelectInput
        label="Semboloji"
        value={(props.symbology as string) || 'code128'}
        options={[
          { value: 'code128', label: 'Code 128' },
          { value: 'code39', label: 'Code 39' },
          { value: 'ean13', label: 'EAN-13' },
          { value: 'ean8', label: 'EAN-8' },
          { value: 'upc', label: 'UPC-A' },
          { value: 'itf14', label: 'ITF-14' },
        ]}
        onChange={(v) => onChange('symbology', v)}
      />
      <ToggleInput
        label="Metni Goster"
        value={(props.showText as boolean) !== false}
        onChange={(v) => onChange('showText', v)}
      />
      <ColorInput
        label="Cubuk Rengi"
        value={(props.barColor as string) || '#000000'}
        onChange={(v) => onChange('barColor', v)}
      />
    </div>
  </Section>
);

const QRCodeProperties: React.FC<{
  props: Record<string, unknown>;
  onChange: (key: string, value: unknown) => void;
}> = ({ props, onChange }) => (
  <Section title="QR Kod Ozellikleri">
    <div className="space-y-2">
      <TextInput
        label="Veri"
        value={(props.data as string) || ''}
        onChange={(v) => onChange('data', v)}
        placeholder="https://example.com"
      />
      <SelectInput
        label="Hata Duzeltme"
        value={(props.errorCorrectionLevel as string) || 'M'}
        options={[
          { value: 'L', label: 'L (Dusuk ~7%)' },
          { value: 'M', label: 'M (Orta ~15%)' },
          { value: 'Q', label: 'Q (Ceyrek ~25%)' },
          { value: 'H', label: 'H (Yuksek ~30%)' },
        ]}
        onChange={(v) => onChange('errorCorrectionLevel', v)}
      />
      <ColorInput
        label="Renk"
        value={(props.color as string) || '#000000'}
        onChange={(v) => onChange('color', v)}
      />
    </div>
  </Section>
);

const ShapeProperties: React.FC<{
  props: Record<string, unknown>;
  onChange: (key: string, value: unknown) => void;
}> = ({ props, onChange }) => (
  <Section title="Sekil Ozellikleri">
    <div className="space-y-2">
      <SelectInput
        label="Sekil Tipi"
        value={(props.shape as string) || 'rect'}
        options={[
          { value: 'rect', label: 'Dikdortgen' },
          { value: 'circle', label: 'Daire' },
          { value: 'line', label: 'Cizgi' },
        ]}
        onChange={(v) => onChange('shape', v)}
      />
      {(props.shape as string) !== 'line' && (
        <ColorInput
          label="Dolgu"
          value={(props.fill as string) || '#3b82f6'}
          onChange={(v) => onChange('fill', v)}
        />
      )}
      <ColorInput
        label="Kenar Rengi"
        value={(props.stroke as string) || '#1e40af'}
        onChange={(v) => onChange('stroke', v)}
      />
      <NumberInput
        label="Kenar Kalinligi"
        value={(props.strokeWidth as number) || 1}
        onChange={(v) => onChange('strokeWidth', v)}
        min={0}
        max={20}
      />
      {(props.shape as string) === 'rect' && (
        <NumberInput
          label="Kose Yuvarlama"
          value={(props.cornerRadius as number) || 0}
          onChange={(v) => onChange('cornerRadius', v)}
          min={0}
          max={50}
        />
      )}
    </div>
  </Section>
);

const ImageProperties: React.FC<{
  props: Record<string, unknown>;
  onChange: (key: string, value: unknown) => void;
}> = ({ props, onChange }) => (
  <Section title="Gorsel Ozellikleri">
    <div className="space-y-2">
      <TextInput
        label="URL"
        value={(props.src as string) || ''}
        onChange={(v) => onChange('src', v)}
        placeholder="https://..."
      />
      <SelectInput
        label="Sigdirma"
        value={(props.objectFit as string) || 'contain'}
        options={[
          { value: 'contain', label: 'Icine Sigdir' },
          { value: 'cover', label: 'Kapla' },
          { value: 'fill', label: 'Doldur' },
        ]}
        onChange={(v) => onChange('objectFit', v)}
      />
    </div>
  </Section>
);

export default PropertiesPanel;
