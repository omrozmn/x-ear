import { useState } from 'react';
import { Card } from '@x-ear/ui-web';
import { Mail, Send, Users, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { adminApi } from '@/lib/api-client';

type SubTabId = 'single' | 'bulk';

interface SubTab {
    id: SubTabId;
    label: string;
    icon: React.ReactNode;
}

const SUB_TABS: SubTab[] = [
    { id: 'single', label: 'Tekil E-posta', icon: <Mail className="w-4 h-4" /> },
    { id: 'bulk', label: 'Toplu E-posta', icon: <Users className="w-4 h-4" /> },
];

export default function AdminEmailTab() {
    const [activeSubTab, setActiveSubTab] = useState<SubTabId>('single');

    return (
        <div className="space-y-6">
            {/* Sub-Tab Navigation */}
            <Card className="p-1 dark:bg-gray-800 dark:border-gray-700">
                <nav className="flex space-x-1" aria-label="E-posta Tabs">
                    {SUB_TABS.map((tab) => (
                        <button
                            data-allow-raw="true"
                            key={tab.id}
                            onClick={() => setActiveSubTab(tab.id)}
                            className={`
                                flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium rounded-2xl transition-all
                                ${activeSubTab === tab.id
                                    ? 'bg-sky-600 text-white shadow-sm dark:bg-sky-500'
                                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-gray-200'
                                }
                            `}
                        >
                            {tab.icon}
                            <span>{tab.label}</span>
                        </button>
                    ))}
                </nav>
            </Card>

            {/* Sub-Tab Content */}
            <div>
                {activeSubTab === 'single' && <SingleEmailForm />}
                {activeSubTab === 'bulk' && <BulkEmailForm />}
            </div>
        </div>
    );
}

function SingleEmailForm() {
    const [toEmail, setToEmail] = useState('');
    const [subject, setSubject] = useState('');
    const [body, setBody] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSend = async () => {
        if (!toEmail.trim() || !subject.trim() || !body.trim()) {
            toast.error('Alıcı, konu ve mesaj alanları zorunludur');
            return;
        }
        setLoading(true);
        try {
            await adminApi({
                url: '/admin/email/send',
                method: 'POST',
                data: { to: toEmail, subject, body, isHtml: false },
            });
            toast.success('E-posta başarıyla gönderildi');
            setToEmail('');
            setSubject('');
            setBody('');
        } catch {
            toast.error('E-posta gönderilemedi');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <Mail className="w-5 h-5 text-sky-500" />
                Tekil E-posta Gönder
            </h3>
            <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Alıcı E-posta</label>
                <input
                    type="email"
                    value={toEmail}
                    onChange={(e) => setToEmail(e.target.value)}
                    placeholder="ornek@email.com"
                    className="w-full rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white p-2.5 text-sm"
                />
            </div>
            <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Konu</label>
                <input
                    type="text"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="E-posta konusu"
                    className="w-full rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white p-2.5 text-sm"
                />
            </div>
            <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Mesaj</label>
                <textarea
                    rows={6}
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                    placeholder="E-posta içeriğini yazın..."
                    className="w-full rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white p-2.5 text-sm"
                />
            </div>
            <button
                onClick={handleSend}
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-sky-600 text-white rounded-xl hover:bg-sky-700 transition-colors disabled:opacity-50 text-sm font-medium"
            >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                {loading ? 'Gönderiliyor...' : 'E-posta Gönder'}
            </button>
        </div>
    );
}

function BulkEmailForm() {
    const [subject, setSubject] = useState('');
    const [body, setBody] = useState('');
    const [targetType, setTargetType] = useState<'all' | 'tenant'>('all');
    const [tenantId, setTenantId] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSend = async () => {
        if (!subject.trim() || !body.trim()) {
            toast.error('Konu ve mesaj alanları zorunludur');
            return;
        }
        setLoading(true);
        try {
            await adminApi({
                url: '/admin/email/bulk-send',
                method: 'POST',
                data: {
                    subject,
                    body,
                    isHtml: false,
                    targetType,
                    tenantId: targetType === 'tenant' ? tenantId : undefined,
                },
            });
            toast.success('Toplu e-posta gönderimi başlatıldı');
            setSubject('');
            setBody('');
        } catch {
            toast.error('Toplu e-posta gönderilemedi');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <Users className="w-5 h-5 text-sky-500" />
                Toplu E-posta Gönder
            </h3>
            <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Hedef Kitle</label>
                <select
                    value={targetType}
                    onChange={(e) => setTargetType(e.target.value as 'all' | 'tenant')}
                    className="w-full rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white p-2.5 text-sm"
                >
                    <option value="all">Tum Aboneler</option>
                    <option value="tenant">Belirli Bir Tenant</option>
                </select>
            </div>
            {targetType === 'tenant' && (
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Tenant ID</label>
                    <input
                        type="text"
                        value={tenantId}
                        onChange={(e) => setTenantId(e.target.value)}
                        placeholder="tnt_..."
                        className="w-full rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white p-2.5 text-sm"
                    />
                </div>
            )}
            <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Konu</label>
                <input
                    type="text"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="E-posta konusu"
                    className="w-full rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white p-2.5 text-sm"
                />
            </div>
            <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Mesaj</label>
                <textarea
                    rows={6}
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                    placeholder="E-posta icerigini yazin..."
                    className="w-full rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white p-2.5 text-sm"
                />
            </div>
            <button
                onClick={handleSend}
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-sky-600 text-white rounded-xl hover:bg-sky-700 transition-colors disabled:opacity-50 text-sm font-medium"
            >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                {loading ? 'Gonderiliyor...' : 'Toplu E-posta Gonder'}
            </button>
        </div>
    );
}
