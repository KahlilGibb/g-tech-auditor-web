import Swal from 'sweetalert2';
import 'sweetalert2/dist/sweetalert2.min.css';
import i18n from '../i18n';

type ConfirmTone = 'primary' | 'danger';
type EntityKey =
  | 'user'
  | 'role'
  | 'branch'
  | 'organization'
  | 'site'
  | 'inspection'
  | 'template'
  | 'profile'
  | 'section'
  | 'question'
  | 'folder'
  | 'file';

interface ConfirmOptions {
  title: string;
  text?: string;
  confirmText?: string;
  cancelText?: string;
  tone?: ConfirmTone;
}

interface AlertOptions {
  title: string;
  text?: string;
}

function t(key: string, options?: Record<string, unknown>) {
  return String(i18n.t(key, options));
}

function entity(entityKey: EntityKey) {
  return t(`swal.entities.${entityKey}`);
}

const customClass = {
  popup: 'gtech-swal-popup',
  title: 'gtech-swal-title',
  htmlContainer: 'gtech-swal-html',
  actions: 'gtech-swal-actions',
  confirmButton: 'gtech-swal-confirm',
  cancelButton: 'gtech-swal-cancel',
  denyButton: 'gtech-swal-deny',
  icon: 'gtech-swal-icon',
};

const modal = Swal.mixin({
  buttonsStyling: false,
  reverseButtons: true,
  focusCancel: true,
  customClass,
});

const toast = Swal.mixin({
  toast: true,
  position: 'top-end',
  timer: 2600,
  timerProgressBar: true,
  showConfirmButton: false,
  customClass: {
    popup: 'gtech-swal-toast',
    title: 'gtech-swal-toast-title',
  },
});

async function confirm({
  title,
  text,
  confirmText = t('swal.buttons.yes'),
  cancelText = t('swal.buttons.no'),
  tone = 'primary',
}: ConfirmOptions) {
  const result = await modal.fire({
    title,
    text,
    icon: tone === 'danger' ? 'warning' : 'question',
    showCancelButton: true,
    confirmButtonText: confirmText,
    cancelButtonText: cancelText,
    customClass: {
      ...customClass,
      confirmButton:
        tone === 'danger'
          ? 'gtech-swal-confirm gtech-swal-confirm-danger'
          : 'gtech-swal-confirm',
    },
  });

  return result.isConfirmed;
}

async function success({ title, text }: AlertOptions) {
  void toast.fire({
    title,
    text,
    icon: 'success',
  });
}

async function error({ title, text }: AlertOptions) {
  await modal.fire({
    title,
    text,
    icon: 'error',
    confirmButtonText: t('swal.buttons.understand'),
  });
}

async function info({ title, text }: AlertOptions) {
  await modal.fire({
    title,
    text,
    icon: 'info',
    confirmButtonText: t('swal.buttons.understand'),
  });
}

export const appSwal = {
  confirm,
  success,
  error,
  info,

  confirmSave() {
    return confirm({
      title: t('swal.confirm.save.title'),
      text: t('swal.confirm.save.text'),
      confirmText: t('swal.buttons.yes'),
      cancelText: t('swal.buttons.no'),
    });
  },

  confirmSubmit() {
    return confirm({
      title: t('swal.confirm.submit.title'),
      text: t('swal.confirm.submit.text'),
      confirmText: t('swal.buttons.yes'),
      cancelText: t('swal.buttons.no'),
    });
  },

  confirmCreateTemplate() {
    return confirm({
      title: t('swal.confirm.createTemplate.title'),
      text: t('swal.confirm.createTemplate.text'),
      confirmText: t('swal.buttons.yes'),
      cancelText: t('swal.buttons.no'),
    });
  },

  confirmDelete(name: string, entityKey: EntityKey) {
    return confirm({
      title: t('swal.confirm.delete.title', { entity: entity(entityKey) }),
      text: t('swal.confirm.delete.text', { name }),
      confirmText: t('swal.buttons.yes'),
      cancelText: t('swal.buttons.no'),
      tone: 'danger',
    });
  },

  confirmLogout() {
    return confirm({
      title: t('swal.confirm.logout.title'),
      text: t('swal.confirm.logout.text'),
      confirmText: t('swal.buttons.yes'),
      cancelText: t('swal.buttons.no'),
      tone: 'danger',
    });
  },

  confirmLeave() {
    return confirm({
      title: t('swal.confirm.leave.title'),
      text: t('swal.confirm.leave.text'),
      confirmText: t('swal.buttons.yes'),
      cancelText: t('swal.buttons.no'),
      tone: 'danger',
    });
  },

  confirmRemoveBranchUser(name: string) {
    return confirm({
      title: t('swal.confirm.removeBranchUser.title'),
      text: t('swal.confirm.removeBranchUser.text', { name }),
      confirmText: t('swal.buttons.yes'),
      cancelText: t('swal.buttons.no'),
      tone: 'danger',
    });
  },

  successLogin() {
    return success({
      title: t('swal.success.login.title'),
      text: t('swal.success.login.text'),
    });
  },

  successLogout() {
    return success({
      title: t('swal.success.logout.title'),
    });
  },

  successSaved(entityKey: EntityKey) {
    return success({
      title: t('swal.success.saved.title', { entity: entity(entityKey) }),
      text: t('swal.success.saved.text'),
    });
  },

  successCreated(entityKey: EntityKey, name: string) {
    return success({
      title: t('swal.success.created.title', { entity: entity(entityKey) }),
      text: t('swal.success.created.text', { name }),
    });
  },

  successUpdated(entityKey: EntityKey, name: string) {
    return success({
      title: t('swal.success.updated.title', { entity: entity(entityKey) }),
      text: t('swal.success.updated.text', { name }),
    });
  },

  successDeleted(entityKey: EntityKey, name: string) {
    return success({
      title: t('swal.success.deleted.title', { entity: entity(entityKey) }),
      text: t('swal.success.deleted.text', { name }),
    });
  },

  successAssigned(name: string) {
    return success({
      title: t('swal.success.assigned.title'),
      text: t('swal.success.assigned.text', { name }),
    });
  },

  successRemoved(name: string) {
    return success({
      title: t('swal.success.removed.title'),
      text: t('swal.success.removed.text', { name }),
    });
  },

  errorIncomplete(text: string) {
    return error({
      title: t('swal.error.incomplete.title'),
      text,
    });
  },

  errorLoginIncomplete() {
    return error({
      title: t('swal.error.loginIncomplete.title'),
      text: t('swal.error.loginIncomplete.text'),
    });
  },

  errorLoginFailed(text: string) {
    return error({
      title: t('swal.error.loginFailed.title'),
      text,
    });
  },

  errorCreateFailed(entityKey: EntityKey, text: string) {
    return error({
      title: t('swal.error.createFailed.title', { entity: entity(entityKey) }),
      text,
    });
  },

  errorUpdateFailed(entityKey: EntityKey, text: string) {
    return error({
      title: t('swal.error.updateFailed.title', { entity: entity(entityKey) }),
      text,
    });
  },

  errorDeleteFailed(entityKey: EntityKey, text: string) {
    return error({
      title: t('swal.error.deleteFailed.title', { entity: entity(entityKey) }),
      text,
    });
  },

  errorSaveFailed(entityKey: EntityKey, text: string) {
    return error({
      title: t('swal.error.saveFailed.title', { entity: entity(entityKey) }),
      text,
    });
  },

  errorAssignFailed(text: string) {
    return error({
      title: t('swal.error.assignFailed.title'),
      text,
    });
  },

  errorRemoveFailed(text: string) {
    return error({
      title: t('swal.error.removeFailed.title'),
      text,
    });
  },
};
