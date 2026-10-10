import React, { useState } from 'react';
import { KeyRound } from 'lucide-react';
import { appSwal } from '../../lib/appSwal';
import { getApiErrorMessage } from '../../lib/apiResponse';
import { passwordService } from '../../services/passwordService';
import { Alert, Button, Field, Input, Modal } from '../ui';

const EMPTY = { current: '', next: '', confirm: '' };

export const ChangePasswordModal: React.FC<{ open: boolean; onClose: () => void }> = ({ open, onClose }) => {
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const close = () => {
    setForm(EMPTY);
    setError('');
    onClose();
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    if (!form.current || !form.next || !form.confirm) {
      setError('Semua kolom wajib diisi.');
      return;
    }
    if (form.next.length < 8) {
      setError('Password baru minimal 8 karakter.');
      return;
    }
    if (form.next !== form.confirm) {
      setError('Konfirmasi password baru tidak sama.');
      return;
    }
    setSaving(true);
    try {
      await passwordService.changeOwn(form.current, form.next);
      close();
      await appSwal.success({
        title: 'Password berhasil diubah',
        text: 'Perangkat lain yang memakai akun ini sudah dikeluarkan.',
      });
    } catch (err) {
      setError(getApiErrorMessage(err, 'Gagal mengubah password.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={close}
      eyebrow="Keamanan"
      title="Ubah Password"
      subtitle="Setelah diganti, akun ini otomatis keluar dari perangkat lain."
      size="sm"
      footer={
        <>
          <Button variant="secondary" onClick={close}>
            Batal
          </Button>
          <Button
            type="submit"
            form="change-password-form"
            loading={saving}
            icon={!saving ? <KeyRound className="h-4 w-4" /> : undefined}
          >
            Simpan
          </Button>
        </>
      }
    >
      <form id="change-password-form" onSubmit={handleSubmit} className="space-y-4">
        {error && <Alert tone="danger">{error}</Alert>}
        <Field label="Password saat ini" htmlFor="current-password">
          <Input
            id="current-password"
            type="password"
            autoComplete="current-password"
            value={form.current}
            onChange={e => setForm({ ...form, current: e.target.value })}
          />
        </Field>
        <Field label="Password baru" htmlFor="new-password">
          <Input
            id="new-password"
            type="password"
            autoComplete="new-password"
            placeholder="Minimal 8 karakter"
            value={form.next}
            onChange={e => setForm({ ...form, next: e.target.value })}
          />
        </Field>
        <Field label="Konfirmasi password baru" htmlFor="confirm-password">
          <Input
            id="confirm-password"
            type="password"
            autoComplete="new-password"
            value={form.confirm}
            onChange={e => setForm({ ...form, confirm: e.target.value })}
          />
        </Field>
      </form>
    </Modal>
  );
};
