import React from 'react';
import type { EditableFieldDefinition } from '@/lib/website-generator-client';

export function renderFieldInput(field: EditableFieldDefinition, value: unknown, onChange: (val: unknown) => void) {
    switch (field.field_type) {
        case 'textarea':
        case 'rich_text':
            return (
                <textarea
                    value={String(value ?? '')}
                    onChange={(e) => onChange(e.target.value)}
                    placeholder={field.placeholder ?? ''}
                    rows={3}
                    className="w-full rounded-2xl border border-gray-200 px-3 py-2 text-sm outline-none"
                />
            );
        case 'boolean':
            return (
                <button
                    onClick={() => onChange(!value)}
                    className={`rounded-2xl px-3 py-2 text-xs font-medium ${value ? 'bg-emerald-500 text-white' : 'bg-gray-200 text-gray-700'}`}
                >
                    {value ? 'Aktif' : 'Pasif'}
                </button>
            );
        case 'number':
            return (
                <input
                    type="number"
                    value={String(value ?? '')}
                    onChange={(e) => onChange(Number(e.target.value))}
                    placeholder={field.placeholder ?? ''}
                    className="w-full rounded-2xl border border-gray-200 px-3 py-2 text-sm outline-none"
                />
            );
        case 'select':
            return (
                <select
                    value={String(value ?? '')}
                    onChange={(e) => onChange(e.target.value)}
                    className="w-full rounded-2xl border border-gray-200 bg-white px-3 py-2 text-sm outline-none"
                >
                    <option value="">Seciniz</option>
                    {(field.options ?? []).map((opt) => (
                        <option key={opt} value={opt}>{opt}</option>
                    ))}
                </select>
            );
        case 'color':
            return (
                <div className="flex items-center gap-2">
                    <input
                        type="color"
                        value={String(value ?? '#000000')}
                        onChange={(e) => onChange(e.target.value)}
                        className="h-9 w-12 cursor-pointer rounded-xl border border-gray-200"
                    />
                    <input
                        type="text"
                        value={String(value ?? '')}
                        onChange={(e) => onChange(e.target.value)}
                        className="w-full rounded-2xl border border-gray-200 px-3 py-2 text-sm outline-none"
                    />
                </div>
            );
        default:
            return (
                <input
                    type={field.field_type === 'url' ? 'url' : 'text'}
                    value={String(value ?? '')}
                    onChange={(e) => onChange(e.target.value)}
                    placeholder={field.placeholder ?? ''}
                    className="w-full rounded-2xl border border-gray-200 px-3 py-2 text-sm outline-none"
                />
            );
    }
}
