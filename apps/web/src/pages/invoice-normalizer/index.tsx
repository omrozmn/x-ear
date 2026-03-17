import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Plus,
  FileSpreadsheet,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';
import { Button, Card } from '@x-ear/ui-web';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { NormalizerTemplateCard } from '../../components/invoice-normalizer/NormalizerTemplateCard';
import { CreateTemplateModal } from '../../components/invoice-normalizer/CreateTemplateModal';
import { NormalizeModal } from '../../components/invoice-normalizer/NormalizeModal';
import { MappingModal } from '../../components/invoice-normalizer/MappingModal';
import {
  fetchTemplates,
  deleteTemplate,
  type NormalizerTemplate,
} from '../../services/invoiceNormalizer.service';

export default function InvoiceNormalizerPage() {
  const { t } = useTranslation('invoices');
  const queryClient = useQueryClient();

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [normalizeTemplateId, setNormalizeTemplateId] = useState<string | null>(null);
  const [mappingTemplateId, setMappingTemplateId] = useState<string | null>(null);

  const { data: templates = [], isLoading } = useQuery({
    queryKey: ['normalizer-templates'],
    queryFn: fetchTemplates,
  });

  const deleteMutation = useMutation({
    mutationFn: deleteTemplate,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['normalizer-templates'] });
      toast.success(t('normalizer.messages.template_deleted'));
    },
    onError: () => toast.error(t('normalizer.messages.template_delete_failed')),
  });

  const handleDelete = useCallback((id: string) => {
    if (window.confirm(t('normalizer.confirm_delete'))) {
      deleteMutation.mutate(id);
    }
  }, [deleteMutation]);

  const handleTemplateCreated = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['normalizer-templates'] });
    setShowCreateModal(false);
    toast.success(t('normalizer.messages.template_created'));
  }, [queryClient]);

  const totalNormalizations = templates.reduce(
    (sum: number, tmpl: NormalizerTemplate) => sum + (tmpl.normalizationCount || 0), 0
  );
  const totalTemplates = templates.length;

  return (
    <div className="space-y-6 p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            {t('normalizer.title')}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {t('normalizer.description')}
          </p>
        </div>
        <Button
          variant="primary"
          icon={<Plus className="w-4 h-4" />}
          onClick={() => setShowCreateModal(true)}
        >
          {t('normalizer.new_template')}
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card variant="outlined" padding="md">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-primary/10">
              <FileSpreadsheet className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{t('normalizer.stats.templates')}</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {totalTemplates}
              </p>
            </div>
          </div>
        </Card>

        <Card variant="outlined" padding="md">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-success/10">
              <CheckCircle2 className="w-5 h-5 text-success" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{t('normalizer.stats.total_conversions')}</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {totalNormalizations}
              </p>
            </div>
          </div>
        </Card>

        <Card variant="outlined" padding="md">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-purple-100 dark:bg-purple-900/30">
              <Sparkles className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{t('normalizer.stats.ai_matching')}</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{t('normalizer.stats.active')}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Templates Grid */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        </div>
      ) : templates.length === 0 ? (
        <Card variant="outlined" padding="lg">
          <div className="text-center py-6">
            <FileSpreadsheet className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              {t('normalizer.no_templates')}
            </h3>
            <p className="text-sm text-muted-foreground mb-6 max-w-md mx-auto">
              {t('normalizer.no_templates_description')}
            </p>
            <Button
              variant="primary"
              icon={<Plus className="w-4 h-4" />}
              onClick={() => setShowCreateModal(true)}
            >
              {t('normalizer.create_first')}
            </Button>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {templates.map((template: NormalizerTemplate) => (
            <NormalizerTemplateCard
              key={template.id}
              template={template}
              onNormalize={() => setNormalizeTemplateId(template.id)}
              onMapping={() => setMappingTemplateId(template.id)}
              onDelete={() => handleDelete(template.id)}
            />
          ))}

          {/* Add new template card */}
          <div
            role="button"
            tabIndex={0}
            onClick={() => setShowCreateModal(true)}
            onKeyDown={(e) => e.key === 'Enter' && setShowCreateModal(true)}
            className="flex flex-col items-center justify-center gap-3 p-8
              rounded-2xl border-2 border-dashed border-border
              hover:border-blue-400 dark:hover:border-blue-500
              hover:bg-primary/10/50 dark:hover:bg-blue-900/10
              transition-all duration-300 cursor-pointer min-h-[200px]"
          >
            <div className="p-3 rounded-xl bg-muted">
              <Plus className="w-6 h-6 text-muted-foreground" />
            </div>
            <span className="text-sm font-medium text-muted-foreground">
              {t('normalizer.add_template')}
            </span>
          </div>
        </div>
      )}

      {/* Modals */}
      {showCreateModal && (
        <CreateTemplateModal
          onClose={() => setShowCreateModal(false)}
          onCreated={handleTemplateCreated}
        />
      )}
      {normalizeTemplateId && (
        <NormalizeModal
          templateId={normalizeTemplateId}
          onClose={() => setNormalizeTemplateId(null)}
        />
      )}
      {mappingTemplateId && (
        <MappingModal
          templateId={mappingTemplateId}
          onClose={() => setMappingTemplateId(null)}
        />
      )}
    </div>
  );
}
