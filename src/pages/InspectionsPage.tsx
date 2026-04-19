import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { RefreshCcw, Search, Filter } from 'lucide-react';
import { useInspections } from '../hooks/useInspections';
import { SkeletonRow } from '../components/ui/SkeletonLoader';
import { cn } from '../utils/cn';
import { CheckCircle2, Clock, AlertCircle } from 'lucide-react';

const InspectionsPage: React.FC = () => {
  const { t } = useTranslation();
  const { inspections, isLoading, error, fetchInspections } = useInspections();
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    fetchInspections();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchInspections();
    setIsRefreshing(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{t('inspections.title')}</h1>
          <p className="text-muted-foreground mt-1">{t('inspections.subtitle')}</p>
        </div>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <button 
            onClick={handleRefresh}
            disabled={isLoading || isRefreshing}
            className="flex items-center justify-center p-2.5 bg-white border border-divider rounded-xl text-muted-foreground hover:text-foreground hover:bg-surface transition-all disabled:opacity-50"
          >
            <RefreshCcw className={cn("w-5 h-5", (isLoading || isRefreshing) && "animate-spin")} />
          </button>
          <button className="flex items-center gap-2 px-4 py-2.5 bg-primary-blue text-white rounded-xl font-semibold hover:bg-primary-blue-dark transition-all shadow-sm flex-1 sm:flex-none justify-center">
            {t('common.create')}
          </button>
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <input 
            type="text" 
            placeholder="Search inspections..." 
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-divider rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-blue/20 focus:border-primary-blue transition-all"
          />
        </div>
        <button className="flex items-center gap-2 px-4 py-2.5 bg-white border border-divider rounded-xl text-sm font-semibold text-foreground hover:bg-surface transition-all">
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
            className="px-4 py-2 bg-white text-danger-red border border-danger-red/20 rounded-lg text-sm font-bold hover:bg-danger-red/5"
          >
            {t('common.retry')}
          </button>
        </div>
      )}

      {/* Content */}
      <div className="bg-white rounded-3xl border border-divider shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-surface text-muted-foreground text-xs font-semibold uppercase tracking-wider">
              <tr>
                <th className="px-6 py-4">Inspection</th>
                <th className="px-6 py-4">Auditor</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Site</th>
                <th className="px-6 py-4">Date</th>
                <th className="px-6 py-4 text-right">Score</th>
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
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <p className="text-muted-foreground">{t('inspections.empty')}</p>
                  </td>
                </tr>
              ) : (
                inspections.map((item) => (
                  <tr key={item.id} className="hover:bg-surface/50 transition-colors cursor-pointer">
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
