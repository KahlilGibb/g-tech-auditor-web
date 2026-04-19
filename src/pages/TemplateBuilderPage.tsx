import React, { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { 
  ArrowLeft, 
  Save, 
  Plus, 
  GripVertical, 
  Trash2, 
  Copy,
  ChevronDown,
  ChevronUp,
  Settings
} from 'lucide-react';
import { cn } from '../utils/cn';
import { useTemplateEditorStore } from '../stores/templateEditorStore';
import type { FieldType } from '../types/template';
import { Loader2 } from 'lucide-react';

const FIELD_TYPES: { value: FieldType; label: string }[] = [
  { value: 'text_answer', label: 'Short Text' },
  { value: 'number', label: 'Number' },
  { value: 'dropdown', label: 'Multiple Choice' },
  { value: 'checkbox', label: 'Checkbox' },
  { value: 'photo', label: 'Media / Photo' },
  { value: 'inspection_date', label: 'Date' },
  { value: 'signature', label: 'Signature' },
];

export const TemplateBuilderPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const {
    template,
    sections,
    fields,
    isLoading,
    isSaving,
    isDirty,
    loadTemplate,
    initCreateTemplate,
    updateTemplateInfo,
    saveTemplate,
    addSection,
    updateSection,
    deleteSection,
    duplicateSection,
    toggleSection,
    expandedSections,
    addField,
    updateField,
    deleteField,
    resetEditor
  } = useTemplateEditorStore();

  useEffect(() => {
    if (id && id !== 'new') {
      loadTemplate(id);
    } else if (id === 'new') {
      initCreateTemplate('inspection').then((newId) => {
        navigate(`/templates/${newId}/builder`, { replace: true });
      });
    }
    return () => resetEditor();
  }, [id]);

  const handleBack = () => {
    if (isDirty) {
      if (window.confirm('You have unsaved changes. Are you sure you want to go back?')) {
        navigate(-1);
      }
    } else {
      navigate(-1);
    }
  };

  const handleSave = async () => {
    await saveTemplate();
    navigate('/templates');
  };

  if (isLoading || !template) {
    return (
      <div className="flex h-screen items-center justify-center bg-surface">
        <Loader2 className="w-10 h-10 text-primary-blue animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface flex flex-col">
      {/* Header */}
      <header className="h-16 bg-white border-b border-divider flex justify-between items-center px-6 sticky top-0 z-30">
        <div className="flex items-center gap-4">
          <button onClick={handleBack} className="p-2 hover:bg-surface rounded-full transition-colors">
            <ArrowLeft className="w-5 h-5 text-foreground" />
          </button>
          <h1 className="text-lg font-bold text-foreground">
            {id === 'new' ? t('builder.createTemplate') : t('builder.title')}
          </h1>
        </div>
        <button
          onClick={handleSave}
          disabled={!isDirty || isSaving}
          className={cn(
            "flex items-center gap-2 px-6 py-2 rounded-full font-semibold transition-all",
            isDirty && !isSaving ? "bg-primary-blue text-white shadow-sm hover:bg-primary-blue-dark" : "bg-primary-blue/20 text-white cursor-not-allowed"
          )}
        >
          {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {t('builder.save')}
        </button>
      </header>

      {/* Main Container */}
      <div className="flex-1 max-w-4xl w-full mx-auto p-4 md:p-8 space-y-6">
        
        {/* Template Config */}
        <div className="bg-white rounded-3xl border border-divider shadow-sm p-6 space-y-5">
           <div>
              <input 
                type="text" 
                value={template.title}
                onChange={(e) => updateTemplateInfo({ title: e.target.value })}
                placeholder={t('builder.templateTitlePlaceholder') || "Template Title"}
                className="w-full text-2xl font-bold text-foreground border-none focus:ring-0 p-0 placeholder:text-muted-foreground/50"
              />
              <textarea 
                value={template.description || ''}
                onChange={(e) => updateTemplateInfo({ description: e.target.value })}
                placeholder={t('builder.addDescription') || "Add a description..."}
                rows={2}
                className="w-full mt-2 text-sm text-muted-foreground border-none focus:ring-0 p-0 placeholder:text-muted-foreground/50 resize-none"
              />
           </div>

           <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-4 border-t border-divider">
              <div className="flex items-center gap-4">
                <span className="text-sm font-semibold text-muted-foreground">{t('builder.typeToggle')}</span>
                <div className="flex bg-surface p-1 rounded-xl">
                  {(['inspection', 'cps'] as const).map(ft => (
                    <button
                      key={ft}
                      onClick={() => updateTemplateInfo({ form_type: ft })}
                      className={cn(
                        "px-4 py-1.5 rounded-lg text-sm font-semibold capitalize transition-all",
                        template.form_type === ft ? "bg-white text-primary-blue shadow-sm" : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      {ft}
                    </button>
                  ))}
                </div>
              </div>

              <label className="flex items-center gap-3 cursor-pointer">
                <span className="text-sm font-semibold text-foreground">{t('builder.enableScoring')}</span>
                <input 
                  type="checkbox" 
                  checked={template.scoring_enabled}
                  onChange={(e) => updateTemplateInfo({ scoring_enabled: e.target.checked })}
                  className="w-5 h-5 rounded hover:ring-2 hover:ring-primary-blue/20 text-primary-blue focus:ring-primary-blue transition-all"
                />
              </label>
           </div>
        </div>

        {/* Sections */}
        <div className="space-y-6">
          {sections.map((section) => {
            const isExpanded = expandedSections.includes(section.id);
            const sectionFields = fields[section.id] || [];
            
            return (
              <div key={section.id} className="bg-white rounded-3xl border border-divider shadow-sm overflow-hidden">
                {/* Section Header */}
                <div className={cn("p-5 flex items-start gap-4 transition-colors", isExpanded ? "bg-primary-blue/5 border-b border-divider" : "hover:bg-surface/50")}>
                  <div className="mt-1 cursor-move text-muted-foreground hover:text-primary-blue">
                    <GripVertical className="w-5 h-5" />
                  </div>
                  <div className="flex-1">
                    <input
                      type="text"
                      value={section.title}
                      onChange={(e) => updateSection(section.id, { title: e.target.value })}
                      placeholder={t('builder.sectionTitlePlaceholder') || "Section Title"}
                      className="w-full text-lg font-bold text-foreground bg-transparent border-none focus:ring-0 p-0 placeholder:text-muted-foreground/50"
                    />
                    {isExpanded && (
                       <input
                         type="text"
                         value={section.description || ''}
                         onChange={(e) => updateSection(section.id, { description: e.target.value })}
                         placeholder="Description (Optional)"
                         className="w-full mt-1 text-sm text-muted-foreground bg-transparent border-none focus:ring-0 p-0 placeholder:text-muted-foreground/50"
                       />
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => toggleSection(section.id)} className="p-2 text-muted-foreground hover:bg-white rounded-lg transition-colors">
                      {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                    </button>
                    {isExpanded && (
                      <>
                        <button onClick={() => duplicateSection(section.id)} className="p-2 text-muted-foreground hover:bg-white hover:text-primary-blue rounded-lg transition-colors" title="Duplicate">
                          <Copy className="w-4 h-4" />
                        </button>
                        <button onClick={() => deleteSection(section.id)} className="p-2 text-muted-foreground hover:bg-white hover:text-danger-red rounded-lg transition-colors" title="Delete">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {/* Fields List */}
                {isExpanded && (
                  <div className="p-5 bg-surface/30 space-y-3">
                    {sectionFields.map((field) => (
                      <div key={field.id} className="bg-white p-4 rounded-2xl border border-divider flex items-start gap-4 group">
                        <div className="mt-2 cursor-move text-divider group-hover:text-muted-foreground transition-colors">
                          <GripVertical className="w-4 h-4" />
                        </div>
                        <div className="flex-1 space-y-3">
                           <div className="flex items-center gap-3">
                             <input 
                               type="text"
                               value={field.label}
                               onChange={(e) => updateField(section.id, field.id, { label: e.target.value })}
                               className="flex-1 text-sm font-semibold text-foreground border-none bg-surface/50 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-blue/20"
                               placeholder="Question title"
                             />
                             <select
                               value={field.type}
                               onChange={(e) => updateField(section.id, field.id, { type: e.target.value as FieldType })}
                               className="text-sm border-divider rounded-lg px-3 py-2 focus:ring-primary-blue bg-white"
                             >
                               {FIELD_TYPES.map(ft => (
                                 <option key={ft.value} value={ft.value}>{ft.label}</option>
                               ))}
                             </select>
                           </div>
                           <div className="flex items-center justify-between">
                             <label className="flex items-center gap-2 cursor-pointer">
                               <input 
                                 type="checkbox"
                                 checked={field.required}
                                 onChange={(e) => updateField(section.id, field.id, { required: e.target.checked })}
                                 className="rounded text-primary-blue focus:ring-primary-blue w-4 h-4"
                               />
                               <span className="text-xs font-semibold text-muted-foreground">{t('builder.requireQuestion')}</span>
                             </label>
                             
                             <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button className="p-1.5 text-muted-foreground hover:text-primary-blue bg-surface rounded-md">
                                  <Settings className="w-3.5 h-3.5" />
                                </button>
                                <button onClick={() => deleteField(section.id, field.id)} className="p-1.5 text-muted-foreground hover:text-danger-red bg-surface rounded-md">
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                             </div>
                           </div>
                        </div>
                      </div>
                    ))}

                    <button 
                      onClick={() => addField(section.id, 'text_answer')}
                      className="w-full py-4 border-2 border-dashed border-divider rounded-2xl flex items-center justify-center gap-2 text-muted-foreground hover:text-primary-blue hover:border-primary-blue/30 hover:bg-primary-blue/5 transition-all font-semibold text-sm"
                    >
                      <Plus className="w-4 h-4" />
                      {t('builder.addQuestion')}
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Add Section Button */}
        <button 
          onClick={addSection}
          className="w-full py-4 border-2 border-dashed border-primary-blue/30 bg-primary-blue/5 rounded-3xl flex items-center justify-center gap-2 text-primary-blue font-bold hover:bg-primary-blue/10 transition-colors shadow-sm"
        >
          <Plus className="w-5 h-5" />
          {t('builder.addSection')}
        </button>

      </div>
    </div>
  );
};

export default TemplateBuilderPage;
