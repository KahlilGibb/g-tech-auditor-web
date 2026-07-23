import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Download,
  FileSpreadsheet,
  RefreshCcw,
  Filter,
  PlayCircle,
  CheckCircle2,
  Clock,
  AlertCircle,
  ClipboardCheck,
} from 'lucide-react';
import { useInspections } from '../hooks/useInspections';
import { SkeletonRow } from '../components/ui/SkeletonLoader';
import { cn } from '../utils/cn';
import { inspectionService } from '../services/inspectionService';
import { appSwal } from '../lib/appSwal';
import { getApiErrorMessage } from '../lib/apiResponse';
import { Can } from '../components/rbac/Can';
import { useRbac } from '../hooks/useRbac';
import {
  Alert,
  Badge,
  Button,
  EmptyState,
  IconButton,
  PageHeader,
  RowAction,
  SearchInput,
  TableWrap,
  Td,
  Th,
} from '../components/ui';

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

const InspectionsPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { can } = useRbac();
  const { inspections, isLoading, error, fetchInspections } = useInspections();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [exportingKey, setExportingKey] = useState<string | null>(null);

  useEffect(() => {
    fetchInspections();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchInspections();
    setIsRefreshing(false);
  };

  const handleExport = async (inspectionId: string, type: 'report' | 'issues') => {
    const key = `${inspectionId}-${type}`;
    setExportingKey(key);
    try {
      const blob =
        type === 'report'
          ? await inspectionService.exportReport(inspectionId)
          : await inspectionService.exportIssues(inspectionId);
      downloadBlob(blob, `${inspectionId}-${type}.xlsx`);
    } catch (exportError) {
      await appSwal.error({
        title: t('inspections.export.failed'),
        text: getApiErrorMessage(exportError),
      });
    } finally {
      setExportingKey(null);
    }
  };

  const statusTone = (status: string) =>
    status === 'Complete' ? 'success' : status === 'Overdue' ? 'danger' : 'brand';

  return (
    <div className="page-shell">
      <PageHeader
        eyebrow="Field audit"
        title={t('inspections.title')}
        subtitle={t('inspections.subtitle')}
        actions={
          <>
            <IconButton onClick={handleRefresh} disabled={isLoading || isRefreshing} aria-label="Refresh">
              <RefreshCcw className={cn('h-5 w-5', (isLoading || isRefreshing) && 'animate-spin')} />
            </IconButton>
            <Can resource="inspections" action="create">
              <Button className="flex-1 sm:flex-none">{t('common.create')}</Button>
            </Can>
          </>
        }
      />

      <div className="toolbar">
        <SearchInput placeholder="Search inspections..." wrapClassName="sm:max-w-none sm:flex-1" />
        <Button variant="secondary" icon={<Filter className="h-4 w-4" />}>
          Filter
        </Button>
      </div>

      {error && !isLoading && (
        <Alert
          tone="danger"
          action={
            <button
              onClick={fetchInspections}
              className="shrink-0 text-sm font-bold underline underline-offset-4 hover:opacity-80"
            >
              {t('common.retry')}
            </button>
          }
        >
          {error}
        </Alert>
      )}

      <TableWrap>
        <thead className="table-header">
          <tr>
            <Th>Inspection</Th>
            <Th>Auditor</Th>
            <Th>Status</Th>
            <Th>Site</Th>
            <Th>Date</Th>
            <Th className="text-right">Score</Th>
            <Th className="text-right">Export</Th>
            <Th className="text-right">Form</Th>
          </tr>
        </thead>
        <tbody className="divide-y divide-hairline-soft">
          {isLoading && inspections.length === 0 ? (
            <>
              <SkeletonRow />
              <SkeletonRow />
              <SkeletonRow />
              <SkeletonRow />
              <SkeletonRow />
            </>
          ) : inspections.length === 0 && !error ? (
            <tr>
              <td colSpan={8}>
                <EmptyState icon={<ClipboardCheck className="h-6 w-6" />} title={t('inspections.empty')} />
              </td>
            </tr>
          ) : (
            inspections.map(item => (
              <tr
                key={item.id}
                className={cn(
                  'transition-colors hover:bg-surface/60',
                  can('inspections', 'submit') && 'cursor-pointer',
                )}
                onClick={() => {
                  if (can('inspections', 'submit')) navigate(`/inspections/${item.id}/session`);
                }}
              >
                <Td>
                  <p className="text-sm font-semibold text-ink-deep">{item.title}</p>
                  <p className="mt-0.5 text-xs text-stone">{item.templateName}</p>
                </Td>
                <Td className="text-sm text-charcoal">{item.assignee}</Td>
                <Td>
                  <Badge tone={statusTone(item.status)}>
                    {item.status === 'Complete' && <CheckCircle2 className="h-3 w-3" />}
                    {item.status === 'In Progress' && <Clock className="h-3 w-3" />}
                    {item.status === 'Overdue' && <AlertCircle className="h-3 w-3" />}
                    {item.status}
                  </Badge>
                </Td>
                <Td className="max-w-[150px] truncate text-sm text-stone">{item.site}</Td>
                <Td className="text-sm text-stone">{new Date(item.dueDate).toLocaleDateString()}</Td>
                <Td className="text-right">
                  <span
                    className={cn(
                      'text-sm font-semibold tabular-nums',
                      !item.score
                        ? 'text-stone'
                        : parseInt(item.score) >= 90
                          ? 'text-success-green'
                          : parseInt(item.score) >= 70
                            ? 'text-warning-amber'
                            : 'text-danger-red',
                    )}
                  >
                    {item.score || '—'}
                  </span>
                </Td>
                <Td className="text-right">
                  <div className="inline-flex items-center gap-1">
                    <Can resource="inspections" action="export">
                      <RowAction
                        tone="brand"
                        title={t('inspections.export.report')}
                        disabled={exportingKey === `${item.id}-report`}
                        onClick={event => {
                          event.stopPropagation();
                          void handleExport(item.id, 'report');
                        }}
                      >
                        {exportingKey === `${item.id}-report` ? (
                          <RefreshCcw className="h-4 w-4 animate-spin" />
                        ) : (
                          <FileSpreadsheet className="h-4 w-4" />
                        )}
                      </RowAction>
                      <RowAction
                        tone="brand"
                        title={t('inspections.export.issues')}
                        disabled={exportingKey === `${item.id}-issues`}
                        onClick={event => {
                          event.stopPropagation();
                          void handleExport(item.id, 'issues');
                        }}
                      >
                        {exportingKey === `${item.id}-issues` ? (
                          <RefreshCcw className="h-4 w-4 animate-spin" />
                        ) : (
                          <Download className="h-4 w-4" />
                        )}
                      </RowAction>
                    </Can>
                  </div>
                </Td>
                <Td className="text-right">
                  <Can resource="inspections" action="submit">
                    <button
                      className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold text-primary-blue transition hover:bg-primary-blue/10"
                      onClick={event => {
                        event.stopPropagation();
                        navigate(`/inspections/${item.id}/session`);
                      }}
                    >
                      <PlayCircle className="h-4 w-4" />
                      Buka
                    </button>
                  </Can>
                </Td>
              </tr>
            ))
          )}
        </tbody>
      </TableWrap>
    </div>
  );
};

export default InspectionsPage;
