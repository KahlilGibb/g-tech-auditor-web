import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Download, FileSpreadsheet, RefreshCcw, Search, Filter, PlayCircle } from 'lucide-react';
import { useInspections } from '../hooks/useInspections';
import { SkeletonRow } from '../components/ui/SkeletonLoader';
import { cn } from '../utils/cn';
import { CheckCircle2, Clock, AlertCircle } from 'lucide-react';
import { inspectionService } from '../services/inspectionService';
import { appSwal } from '../lib/appSwal';
import { getApiErrorMessage } from '../lib/apiResponse';
import { Can } from '../components/rbac/Can';
import { useRbac } from '../hooks/useRbac';

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
      const blob = type === 'report'
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

  return (
    <div className="page-shell">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">{t('inspections.title')}</h1>
          <p className="page-subtitle">{t('inspections.subtitle')}</p>
        </div>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <button 
            onClick={handleRefresh}
            disabled={isLoading || isRefreshing}
            className="icon-button"
          >
            <RefreshCcw className={cn("w-5 h-5", (isLoading || isRefreshing) && "animate-spin")} />
          </button>
          <Can resource="inspections" action="create">
            <button className="btn-primary flex-1 sm:flex-none">
              {t('common.create')}
            </button>
          </Can>
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <input 
            type="text" 
            placeholder="Search inspections..." 
            className="form-input pl-10"
          />
        </div>
        <button className="btn-secondary">
          <Filter className="w-4 h-4" />
          Filter
        </button>
      </div>

      {/* Error State */}
      {error && !isLoading && (
        <div className="p-6 bg-danger-red/10 border border-danger-red/20 rounded-2xl flex flex-col items-center justify-center text-center gap-3">
          <AlertCircle className="w-8 h-8 text-danger-red" />
          <p className="text-danger-red font-medium">{error}</p>
          <button 
            onClick={fetchInspections}
            className="px-4 py-2 bg-card text-danger-red border border-danger-red/20 rounded-lg text-sm font-bold hover:bg-danger-red/5"
          >
            {t('common.retry')}
          </button>
        </div>
      )}

      {/* Content */}
      <div className="panel overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="table-header">
              <tr>
                <th className="px-6 py-4">Inspection</th>
                <th className="px-6 py-4">Auditor</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Site</th>
                <th className="px-6 py-4">Date</th>
                <th className="px-6 py-4 text-right">Score</th>
                <th className="px-6 py-4 text-right">Export</th>
                <th className="px-6 py-4 text-right">Form</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-divider">
              {(isLoading && inspections.length === 0) ? (
                <>
                  <SkeletonRow />
                  <SkeletonRow />
                  <SkeletonRow />
                  <SkeletonRow />
                  <SkeletonRow />
                </>
              ) : inspections.length === 0 && !error ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center">
                    <p className="text-muted-foreground">{t('inspections.empty')}</p>
                  </td>
                </tr>
              ) : (
                inspections.map((item) => (
                  <tr
                    key={item.id}
                    className={cn(
                      'hover:bg-surface/50 transition-colors',
                      can('inspections', 'submit') && 'cursor-pointer',
                    )}
                    onClick={() => {
                      if (can('inspections', 'submit')) navigate(`/inspections/${item.id}/session`);
                    }}
                  >
                    <td className="px-6 py-4">
                      <p className="font-semibold text-foreground text-sm">{item.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{item.templateName}</p>
                    </td>
                    <td className="px-6 py-4 text-sm text-foreground">{item.assignee}</td>
                    <td className="px-6 py-4">
                      <span className={cn(
                        "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium",
                        item.status === 'Complete' && "bg-success-green/10 text-success-green",
                        item.status === 'In Progress' && "bg-primary-blue/10 text-primary-blue",
                        item.status === 'Overdue' && "bg-danger-red/10 text-danger-red"
                      )}>
                        {item.status === 'Complete' && <CheckCircle2 className="w-3 h-3" />}
                        {item.status === 'In Progress' && <Clock className="w-3 h-3" />}
                        {item.status === 'Overdue' && <AlertCircle className="w-3 h-3" />}
                        {item.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-muted-foreground max-w-[150px] truncate">{item.site}</td>
                    <td className="px-6 py-4 text-sm text-muted-foreground">
                      {new Date(item.dueDate).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className={cn(
                        "font-bold",
                        !item.score ? "text-muted-foreground" : 
                        parseInt(item.score) >= 90 ? "text-success-green" : 
                        parseInt(item.score) >= 70 ? "text-warning-amber" : "text-danger-red"
                      )}>
                        {item.score || '-'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="inline-flex items-center gap-1">
                        <Can resource="inspections" action="export">
                          <button
                            className="rounded-lg p-2 text-muted-foreground transition hover:bg-primary-blue/10 hover:text-primary-blue disabled:opacity-50"
                            title={t('inspections.export.report')}
                            disabled={exportingKey === `${item.id}-report`}
                            onClick={event => {
                              event.stopPropagation();
                              void handleExport(item.id, 'report');
                            }}
                          >
                            {exportingKey === `${item.id}-report`
                              ? <RefreshCcw className="h-4 w-4 animate-spin" />
                              : <FileSpreadsheet className="h-4 w-4" />}
                          </button>
                          <button
                            className="rounded-lg p-2 text-muted-foreground transition hover:bg-primary-blue/10 hover:text-primary-blue disabled:opacity-50"
                            title={t('inspections.export.issues')}
                            disabled={exportingKey === `${item.id}-issues`}
                            onClick={event => {
                              event.stopPropagation();
                              void handleExport(item.id, 'issues');
                            }}
                          >
                            {exportingKey === `${item.id}-issues`
                              ? <RefreshCcw className="h-4 w-4 animate-spin" />
                              : <Download className="h-4 w-4" />}
                          </button>
                        </Can>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Can resource="inspections" action="submit">
                        <button
                          className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold text-primary-blue transition hover:bg-primary-blue/10"
                          onClick={event => {
                            event.stopPropagation();
                            navigate(`/inspections/${item.id}/session`);
                          }}
                        >
                          <PlayCircle className="h-4 w-4" />
                          Buka
                        </button>
                      </Can>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default InspectionsPage;
