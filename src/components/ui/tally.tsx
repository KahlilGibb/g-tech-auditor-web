import React from 'react';
import { createPortal } from 'react-dom';
import { cn } from '../../utils/cn';

/* ─────────────────────────────────────────────────────────────────────────
 * Tally UI kit — Hallmark modern-minimal primitives
 * Geist type · indigo accent on cool-pastel paper · pill controls · soft cards
 * ───────────────────────────────────────────────────────────────────────── */

/* ── Eyebrow — mono uppercase kicker ──────────────────────────────────────── */
export const Eyebrow: React.FC<React.HTMLAttributes<HTMLSpanElement>> = ({
  className,
  children,
  ...rest
}) => (
  <span
    className={cn(
      'inline-flex items-center gap-1.5 font-mono text-[11px] font-medium uppercase tracking-[0.14em] text-stone',
      className,
    )}
    {...rest}
  >
    {children}
  </span>
);

/* ── PageHeader — eyebrow + title + subtitle + actions ────────────────────── */
export const PageHeader: React.FC<{
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  eyebrow?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}> = ({ title, subtitle, eyebrow, actions, className }) => (
  <div className={cn('page-header', className)}>
    <div className="min-w-0">
      {eyebrow && <Eyebrow className="mb-2">{eyebrow}</Eyebrow>}
      <h1 className="page-title">{title}</h1>
      {subtitle && <p className="page-subtitle max-w-2xl">{subtitle}</p>}
    </div>
    {actions && <div className="flex w-full items-center gap-3 sm:w-auto sm:shrink-0">{actions}</div>}
  </div>
);

/* ── Button ───────────────────────────────────────────────────────────────── */
type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'subtle';
type ButtonSize = 'sm' | 'md' | 'lg';

const BTN_BASE =
  'inline-flex items-center justify-center gap-2 rounded-full font-semibold tracking-[-0.012em] transition-all duration-150 disabled:opacity-50 disabled:pointer-events-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-blue-dark';

const BTN_SIZE: Record<ButtonSize, string> = {
  sm: 'px-4 py-2 text-[13px]',
  md: 'px-5 py-2.5 text-sm',
  lg: 'px-6 py-3 text-sm',
};

const BTN_VARIANT: Record<ButtonVariant, string> = {
  primary:
    'bg-ink-deep text-white border border-ink-deep shadow-soft-sm hover:bg-primary-blue hover:border-primary-blue hover:-translate-y-px active:translate-y-0',
  secondary:
    'bg-transparent text-ink-deep border border-ink-deep/20 hover:bg-surface hover:border-ink-deep/30',
  ghost: 'bg-transparent text-slate hover:bg-surface hover:text-ink-deep',
  subtle: 'bg-surface text-ink-deep border border-hairline-soft hover:bg-secondary hover:border-hairline',
  danger:
    'bg-danger-red text-white border border-danger-red hover:bg-danger-red-light hover:border-danger-red-light hover:-translate-y-px active:translate-y-0',
};

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  block?: boolean;
  icon?: React.ReactNode;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', loading, block, icon, className, children, disabled, ...rest }, ref) => (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={cn(BTN_BASE, BTN_SIZE[size], BTN_VARIANT[variant], block && 'w-full', className)}
      {...rest}
    >
      {loading ? <Spinner className="h-4 w-4" /> : icon}
      {children}
    </button>
  ),
);
Button.displayName = 'Button';

/* ── IconButton — square/circular icon-only control ───────────────────────── */
export const IconButton = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> & { tone?: 'default' | 'danger' }
>(({ className, tone = 'default', children, ...rest }, ref) => (
  <button
    ref={ref}
    className={cn(
      'inline-flex h-11 w-11 items-center justify-center rounded-full border border-hairline-soft bg-card text-slate transition-all duration-150 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-blue-dark disabled:opacity-50',
      tone === 'default' && 'hover:bg-surface hover:text-ink-deep hover:border-hairline',
      tone === 'danger' && 'hover:bg-danger-red/10 hover:text-danger-red hover:border-danger-red/30',
      className,
    )}
    {...rest}
  >
    {children}
  </button>
));
IconButton.displayName = 'IconButton';

/* ── RowAction — tiny inline table-row action button ──────────────────────── */
export const RowAction: React.FC<
  React.ButtonHTMLAttributes<HTMLButtonElement> & { tone?: 'default' | 'brand' | 'danger' }
> = ({ className, tone = 'default', children, ...rest }) => (
  <button
    className={cn(
      'inline-flex items-center justify-center gap-1.5 rounded-full p-2 text-slate transition-colors duration-150',
      tone === 'default' && 'hover:bg-surface hover:text-ink-deep',
      tone === 'brand' && 'hover:bg-primary-blue/10 hover:text-primary-blue',
      tone === 'danger' && 'hover:bg-danger-red/10 hover:text-danger-red',
      className,
    )}
    {...rest}
  >
    {children}
  </button>
);

/* ── Card / Panel ─────────────────────────────────────────────────────────── */
export const Card: React.FC<
  React.HTMLAttributes<HTMLDivElement> & { interactive?: boolean; padded?: boolean }
> = ({ className, interactive, padded, children, ...rest }) => (
  <div
    className={cn('panel', interactive && 'hover-bento cursor-pointer', padded && 'p-6', className)}
    {...rest}
  >
    {children}
  </div>
);

export const CardHeader: React.FC<{
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  action?: React.ReactNode;
  icon?: React.ReactNode;
  className?: string;
}> = ({ title, subtitle, action, icon, className }) => (
  <div className={cn('panel-header', className)}>
    <div className="flex min-w-0 items-center gap-3">
      {icon && (
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-surface text-primary-blue">
          {icon}
        </span>
      )}
      <div className="min-w-0">
        {title && <h2 className="truncate text-[15px] font-semibold tracking-tight text-ink-deep">{title}</h2>}
        {subtitle && <p className="mt-0.5 truncate text-xs text-stone">{subtitle}</p>}
      </div>
    </div>
    {action && <div className="flex shrink-0 items-center gap-2">{action}</div>}
  </div>
);

/* ── Badge / status pill ──────────────────────────────────────────────────── */
type BadgeTone = 'neutral' | 'brand' | 'success' | 'warning' | 'danger' | 'lime' | 'outline';

const BADGE_TONE: Record<BadgeTone, string> = {
  neutral: 'bg-surface text-slate',
  brand: 'bg-primary-blue/10 text-primary-blue',
  success: 'bg-success-green/12 text-success-green',
  warning: 'bg-warning-amber/15 text-[oklch(48%_0.13_60)]',
  danger: 'bg-danger-red/10 text-danger-red',
  lime: 'bg-companion/25 text-[oklch(42%_0.15_135)]',
  outline: 'border border-hairline bg-card text-slate',
};

export const Badge: React.FC<{
  tone?: BadgeTone;
  dot?: boolean;
  className?: string;
  children: React.ReactNode;
}> = ({ tone = 'neutral', dot, className, children }) => (
  <span
    className={cn(
      'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold',
      BADGE_TONE[tone],
      className,
    )}
  >
    {dot && <span className="h-1.5 w-1.5 rounded-full bg-current" />}
    {children}
  </span>
);

/* ── Field + Input + Textarea + Select ────────────────────────────────────── */
export const Field: React.FC<{
  label?: React.ReactNode;
  hint?: React.ReactNode;
  error?: React.ReactNode;
  required?: boolean;
  htmlFor?: string;
  className?: string;
  children: React.ReactNode;
}> = ({ label, hint, error, required, htmlFor, className, children }) => (
  <div className={cn('space-y-1.5', className)}>
    {label && (
      <label htmlFor={htmlFor} className="flex items-center gap-1 text-xs font-semibold text-charcoal">
        {label}
        {required && <span className="text-danger-red">*</span>}
      </label>
    )}
    {children}
    {error ? (
      <p className="text-xs font-medium text-danger-red">{error}</p>
    ) : hint ? (
      <p className="text-xs text-stone">{hint}</p>
    ) : null}
  </div>
);

export const Input = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement> & { icon?: React.ReactNode }
>(({ className, icon, ...rest }, ref) => {
  if (icon) {
    return (
      <div className="relative">
        <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-stone">{icon}</span>
        <input ref={ref} className={cn('form-input pl-11', className)} {...rest} />
      </div>
    );
  }
  return <input ref={ref} className={cn('form-input', className)} {...rest} />;
});
Input.displayName = 'Input';

export const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, rows = 3, ...rest }, ref) => (
    <textarea ref={ref} rows={rows} className={cn('form-input', className)} {...rest} />
  ),
);
Textarea.displayName = 'Textarea';

export const Select = React.forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(
  ({ className, children, ...rest }, ref) => (
    <select ref={ref} className={cn('form-input', className)} {...rest}>
      {children}
    </select>
  ),
);
Select.displayName = 'Select';

/* ── SearchInput — pill search with leading icon ──────────────────────────── */
export const SearchInput: React.FC<
  React.InputHTMLAttributes<HTMLInputElement> & { wrapClassName?: string }
> = ({ className, wrapClassName, ...rest }) => (
  <div className={cn('relative w-full sm:max-w-md', wrapClassName)}>
    <SearchGlyph className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-stone" />
    <input className={cn('form-input pl-11', className)} {...rest} />
  </div>
);

/* ── Toggle / switch ──────────────────────────────────────────────────────── */
export const Toggle: React.FC<{
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
  label?: string;
}> = ({ checked, onChange, disabled, label }) => (
  <button
    type="button"
    role="switch"
    aria-checked={checked}
    aria-label={label}
    disabled={disabled}
    onClick={() => onChange(!checked)}
    className={cn(
      'relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-blue-dark disabled:opacity-50',
      checked ? 'bg-primary-blue' : 'bg-hairline',
    )}
  >
    <span
      className={cn(
        'inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform duration-200',
        checked ? 'translate-x-[22px]' : 'translate-x-0.5',
      )}
    />
  </button>
);

/* ── Tabs — pill segmented control ────────────────────────────────────────── */
export function Tabs<T extends string>({
  tabs,
  value,
  onChange,
  className,
}: {
  tabs: { value: T; label: React.ReactNode; count?: number }[];
  value: T;
  onChange: (v: T) => void;
  className?: string;
}) {
  return (
    <div className={cn('flex gap-1.5 overflow-x-auto pb-0.5 hide-scrollbar', className)}>
      {tabs.map((tab) => {
        const active = tab.value === value;
        return (
          <button
            key={tab.value}
            onClick={() => onChange(tab.value)}
            className={cn(
              'inline-flex shrink-0 items-center gap-2 rounded-full px-4 py-2 text-[13px] font-semibold transition-all duration-150',
              active
                ? 'bg-ink-deep text-white shadow-soft-sm'
                : 'border border-hairline-soft bg-card text-slate hover:bg-surface hover:text-ink-deep',
            )}
          >
            {tab.label}
            {typeof tab.count === 'number' && (
              <span
                className={cn(
                  'rounded-full px-1.5 py-0.5 text-[10px] font-bold tabular-nums',
                  active ? 'bg-white/20 text-white' : 'bg-surface text-stone',
                )}
              >
                {tab.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

/* ── EmptyState ───────────────────────────────────────────────────────────── */
export const EmptyState: React.FC<{
  icon?: React.ReactNode;
  title: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}> = ({ icon, title, description, action, className }) => (
  <div className={cn('flex flex-col items-center justify-center px-6 py-16 text-center', className)}>
    {icon && (
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-surface text-primary-blue">
        {icon}
      </div>
    )}
    <h3 className="text-sm font-semibold text-ink-deep">{title}</h3>
    {description && <p className="mt-2 max-w-xs text-xs leading-relaxed text-stone">{description}</p>}
    {action && <div className="mt-5">{action}</div>}
  </div>
);

/* ── Spinner ──────────────────────────────────────────────────────────────── */
export const Spinner: React.FC<{ className?: string }> = ({ className }) => (
  <span
    className={cn(
      'inline-block animate-spin rounded-full border-2 border-current border-t-transparent align-[-0.125em]',
      className ?? 'h-5 w-5',
    )}
    role="status"
    aria-label="Loading"
  />
);

/* ── Alert — inline banner ────────────────────────────────────────────────── */
export const Alert: React.FC<{
  tone?: 'danger' | 'warning' | 'info' | 'success';
  className?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}> = ({ tone = 'danger', className, action, children }) => {
  const tones = {
    danger: 'border-danger-red/25 bg-danger-red/8 text-danger-red',
    warning: 'border-warning-amber/30 bg-warning-amber/10 text-[oklch(45%_0.13_60)]',
    info: 'border-primary-blue/25 bg-primary-blue/8 text-primary-blue',
    success: 'border-success-green/25 bg-success-green/8 text-success-green',
  } as const;
  return (
    <div
      className={cn(
        'flex items-center justify-between gap-3 rounded-2xl border px-4 py-3 text-sm font-medium',
        tones[tone],
        className,
      )}
    >
      <span className="min-w-0">{children}</span>
      {action}
    </div>
  );
};

/* ── ProgressBar ──────────────────────────────────────────────────────────── */
export const ProgressBar: React.FC<{
  value: number; // 0..100
  tone?: 'brand' | 'success' | 'warning' | 'danger' | 'gradient';
  className?: string;
}> = ({ value, tone = 'brand', className }) => {
  const fills = {
    brand: 'bg-primary-blue',
    success: 'bg-success-green',
    warning: 'bg-warning-amber',
    danger: 'bg-danger-red',
    gradient: 'bg-[linear-gradient(90deg,var(--color-primary-blue),var(--color-companion))]',
  } as const;
  return (
    <div className={cn('h-1.5 w-full overflow-hidden rounded-full bg-surface', className)}>
      <div
        className={cn('h-full rounded-full transition-all duration-500', fills[tone])}
        style={{ width: `${Math.max(0, Math.min(100, value))}%` }}
      />
    </div>
  );
};

/* ── StatCard — dashboard metric tile ─────────────────────────────────────── */
export const StatCard: React.FC<{
  icon?: React.ReactNode;
  value: React.ReactNode;
  label: React.ReactNode;
  tone?: BadgeTone;
  onClick?: () => void;
}> = ({ icon, value, label, tone = 'brand', onClick }) => (
  <Card interactive={!!onClick} padded onClick={onClick} className="rounded-2xl">
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <Eyebrow>{label}</Eyebrow>
        <p className="mt-2.5 text-[2rem] font-semibold leading-none tracking-tight text-ink-deep tabular-nums">
          {value}
        </p>
      </div>
      {icon && (
        <span
          className={cn(
            'flex h-11 w-11 shrink-0 items-center justify-center rounded-full',
            BADGE_TONE[tone],
          )}
        >
          {icon}
        </span>
      )}
    </div>
  </Card>
);

/* ── Modal ────────────────────────────────────────────────────────────────── */
export const Modal: React.FC<{
  open: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  eyebrow?: React.ReactNode;
  footer?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  children: React.ReactNode;
}> = ({ open, onClose, title, subtitle, eyebrow, footer, size = 'md', children }) => {
  React.useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, onClose]);

  if (!open) return null;
  const sizes = { sm: 'sm:max-w-md', md: 'sm:max-w-lg', lg: 'sm:max-w-2xl', xl: 'sm:max-w-4xl' } as const;

  // Render modal directly into the body using React Portal to escape CSS stacking context
  // This ensures the modal overlays sidebars and headers correctly.
  return createPortal(
    <div className="modal-overlay animate-fade-in" onMouseDown={onClose}>
      <div
        className={cn('modal-panel animate-scale-in', sizes[size])}
        onMouseDown={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        {(title || eyebrow) && (
          <div className="flex items-start justify-between gap-3 border-b border-hairline-soft px-6 py-5">
            <div className="min-w-0">
              {eyebrow && <Eyebrow className="mb-1.5">{eyebrow}</Eyebrow>}
              {title && <h2 className="text-lg font-semibold tracking-tight text-ink-deep">{title}</h2>}
              {subtitle && <p className="mt-0.5 text-sm text-stone">{subtitle}</p>}
            </div>
            <IconButton onClick={onClose} aria-label="Close" className="h-9 w-9 shrink-0">
              <CloseGlyph className="h-4 w-4" />
            </IconButton>
          </div>
        )}
        <div className="modal-body px-6 py-5">{children}</div>
        {footer && <div className="modal-footer">{footer}</div>}
      </div>
    </div>,
    document.body
  );
};

/* ── Table shell helpers ──────────────────────────────────────────────────── */
export const TableWrap: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({ className, children, ...rest }) => (
  <Card className={cn('overflow-hidden', className)} {...rest}>
    <div className="overflow-x-auto">
      <table className="w-full text-left">{children}</table>
    </div>
  </Card>
);

export const Th: React.FC<React.ThHTMLAttributes<HTMLTableCellElement>> = ({ className, children, ...rest }) => (
  <th className={cn('px-6 py-3.5 first:pl-6', className)} {...rest}>
    {children}
  </th>
);

export const Td: React.FC<React.TdHTMLAttributes<HTMLTableCellElement>> = ({ className, children, ...rest }) => (
  <td className={cn('px-6 py-4 align-middle', className)} {...rest}>
    {children}
  </td>
);

/* ── Avatar ───────────────────────────────────────────────────────────────── */
export const Avatar: React.FC<{
  name?: string;
  src?: string | null;
  size?: number;
  className?: string;
}> = ({ name = '', src, size = 36, className }) => {
  const initials = name
    .split(' ')
    .map((n) => n[0])
    .filter(Boolean)
    .join('')
    .slice(0, 2)
    .toUpperCase();
  return (
    <div
      className={cn(
        'flex shrink-0 items-center justify-center overflow-hidden rounded-full border border-primary-blue/20 bg-primary-blue/10 font-semibold text-primary-blue',
        className,
      )}
      style={{ height: size, width: size, fontSize: size * 0.36 }}
    >
      {src ? (
        <img src={src} alt={name} className="h-full w-full rounded-full object-cover" />
      ) : (
        <span>{initials || '—'}</span>
      )}
    </div>
  );
};

/* ── Inline glyphs (so the kit is icon-lib independent) ───────────────────── */
function SearchGlyph({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <circle cx="11" cy="11" r="7" />
      <path d="m21 21-4.3-4.3" strokeLinecap="round" />
    </svg>
  );
}

function CloseGlyph({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M18 6 6 18M6 6l12 12" strokeLinecap="round" />
    </svg>
  );
}
