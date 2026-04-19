import { useEffect } from 'react';
import { useTemplateStore } from '../stores/templateStore';
import type { FormType } from '../types/template';

export function useTemplates() {
  const { 
    templates, 
    isLoading, 
    error, 
    fetchTemplates, 
    createTemplate, 
    clearError 
  } = useTemplateStore();

  useEffect(() => {
    fetchTemplates();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    templates,
    isLoading,
    error,
    fetchTemplates,
    createTemplate: (formType: FormType) => createTemplate(formType),
    clearError,
  };
}
