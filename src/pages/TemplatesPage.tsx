import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { RefreshCcw, PlusCircle, FileText } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTemplates } from '../hooks/useTemplates';
import { SkeletonRow } from '../components/ui/SkeletonLoader';
import { cn } from '../utils/cn';

const TemplatesPage: React.FC = () => {
  const { t } = useTranslation();
  const { templates, isLoading, error, fetchTemplates } = useTemplates();
  const navigate = useNavigate();
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    fetchTemplates();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchTemplates();
    setIsRefreshing(false);
  };

  const handleCreateNew = () => {
    navigate('/templates/new');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{t('templates.title')}</h1>
          <p className="text-muted-foreground mt-1">{t('templates.subtitle')}</p>
        </div>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <button 
            onClick={handleRefresh}
            disabled={isLoading || isRefreshing}
            className="flex items-center justify-center p-2.5 bg-white border border-divider rounded-xl text-muted-foreground hover:text-foreground hover:bg-surface transition-all disabled:opacity-50"
          >
            <RefreshCcw className={cn("w-5 h-5", (isLoading || isRefreshing) && "animate-spin")} />
          </button>
          <button 
            onClick={handleCreateNew}
            className="flex items-center gap-2 px-4 py-2.5 bg-primary-blue text-white rounded-xl font-semibold hover:bg-primary-blue-dark transition-all shadow-sm flex-1 sm:flex-none justify-center"
          >
            <PlusCircle className="w-5 h-5" />
            {t('common.create')}
          </button>
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-divider shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-surface text-muted-foreground text-xs font-semibold uppercase tracking-wider">
              <tr>
                <th className="px-6 py-4">Template Name</th>
                <th className="px-6 py-4">Author</th>
                <th className="px-6 py-4">Questions</th>
                <th className="px-6 py-4 text-right">Last Modified</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-divider">
              {(isLoading && templates.length === 0) ? (
                <>
                  <SkeletonRow />
                  <SkeletonRow />
                  <SkeletonRow />
                </>
              ) : templates.length === 0 && !error ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center">
                    <p className="text-muted-foreground">{t('templates.empty')}</p>
                  </td>
                </tr>
              ) : (
                templates.map((item) => (
                  <tr 
                    key={item.id} 
                    onClick={() => navigate(`/templates/${item.id}/builder`)}
                    className="hover:bg-surface/50 transition-colors cursor-pointer text-sm"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-start gap-3">
                        <div className="p-2 bg-primary-blue/10 rounded-lg text-primary-blue mt-0.5">
                          <FileText className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="font-semibold text-foreground">{item.name}</p>
                          <p className="text-xs text-muted-foreground mt-0.5 max-w-sm truncate">{item.description}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-foreground">{item.author}</td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center justify-center px-2.5 py-0.5 rounded-full bg-surface text-muted-foreground font-medium text-xs">
                        {item.questionCount} Qs
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right text-muted-foreground">
                      {item.lastModified}
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

export default TemplatesPage;
