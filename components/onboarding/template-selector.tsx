'use client';

import { cn } from '@/lib/utils';
import { BILL_TEMPLATES, BillTemplate } from '@/lib/onboarding/bill-templates';
import { Check } from 'lucide-react';

interface TemplateSelectorProps {
  selectedIds: Set<string>;
  onSelectionChange: (ids: Set<string>) => void;
}

export function TemplateSelector({
  selectedIds,
  onSelectionChange,
}: TemplateSelectorProps) {
  const toggleTemplate = (templateId: string) => {
    const newSelection = new Set(selectedIds);
    if (newSelection.has(templateId)) {
      newSelection.delete(templateId);
    } else {
      newSelection.add(templateId);
    }
    onSelectionChange(newSelection);
  };

  return (
    <div className="space-y-6">
      {BILL_TEMPLATES.map((category, categoryIndex) => (
        <div
          key={category.id}
          className="animate-in fade-in slide-in-from-bottom-4"
          style={{
            animationDelay: `${categoryIndex * 100}ms`,
            animationFillMode: 'backwards',
          }}
        >
          {/* Category label */}
          <h4 className="text-xs font-medium text-white/40 uppercase tracking-wider mb-3">
            {category.label}
          </h4>

          {/* Template pills */}
          <div className="flex flex-wrap gap-2">
            {category.templates.map((template) => (
              <TemplatePill
                key={template.id}
                template={template}
                isSelected={selectedIds.has(template.id)}
                onToggle={() => toggleTemplate(template.id)}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

interface TemplatePillProps {
  template: BillTemplate;
  isSelected: boolean;
  onToggle: () => void;
}

function TemplatePill({ template, isSelected, onToggle }: TemplatePillProps) {
  return (
    <button
      onClick={onToggle}
      className={cn(
        'group relative flex items-center gap-2 px-4 py-2.5 rounded-full transition-all duration-200',
        'border text-sm font-medium',
        isSelected
          ? 'bg-violet-400/20 border-violet-400/50 text-white'
          : 'bg-white/[0.02] border-white/10 text-white/70 hover:bg-white/[0.05] hover:border-white/20 hover:text-white'
      )}
    >
      <span className="text-base">{template.emoji}</span>
      <span>{template.name}</span>

      {/* Selected checkmark */}
      {isSelected && (
        <div className="absolute -top-1 -right-1 w-4 h-4 bg-violet-400 rounded-full flex items-center justify-center">
          <Check className="w-2.5 h-2.5 text-white" strokeWidth={3} />
        </div>
      )}
    </button>
  );
}
