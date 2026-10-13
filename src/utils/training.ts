export const TRAINING_ADMIN_ROLES = ['platform_admin', 'org_admin', 'admin_ho'];

export function isTrainingAdmin(role?: string) {
  return TRAINING_ADMIN_ROLES.includes(role ?? '');
}

export function safeTrainingUrl(value: string): string | null {
  try {
    const url = new URL(value);
    return ['https:', 'http:'].includes(url.protocol) && !url.username && !url.password ? url.href : null;
  } catch { return null; }
}

// The editor explicitly uses WIB regardless of the browser's local timezone.
export function toWibInput(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '' : new Date(date.getTime() + 7 * 3_600_000).toISOString().slice(0, 16);
}

export function fromWibInput(value: string) {
  const date = new Date(`${value}+07:00`);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}
