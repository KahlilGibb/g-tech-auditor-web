import React, { useState } from 'react';
import { CheckCircle2, Send, User } from 'lucide-react';
import { getApiErrorMessage } from '../../lib/apiResponse';
import { passwordService } from '../../services/passwordService';
import { Alert, Button, Field, Input, Modal } from '../ui';

/**
 * Accounts have no real mailbox, so this does not send an email: it files a
 * request that notifies Head Office, who reset the password from Users.
 */
export const ForgotPasswordModal: React.FC<{ open: boolean; onClose: () => void; initialIdentifier?: string }> = ({
  open,
  ...props
}) => (open ? <ForgotPasswordDialog {...props} /> : null);

// Mounted only while open, so every opening starts from a clean form.
const ForgotPasswordDialog: React.FC<{ onClose: () => void; initialIdentifier?: string }> = ({
  onClose,
  initialIdentifier = '',
}) => {
  const [identifier, setIdentifier] = useState(initialIdentifier);
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    if (!identifier.trim()) {
      setError('Isi username atau email akun Anda.');
      return;
    }
    setSending(true);
    try {
      await passwordService.requestReset(identifier.trim());
      setSent(true);
    } catch (err) {
      setError(getApiErrorMessage(err, 'Permintaan gagal dikirim. Coba lagi.'));
    } finally {
      setSending(false);
    }
  };

  return (
    <Modal
      open
      onClose={onClose}
      eyebrow="Bantuan"
      title="Lupa Password"
      subtitle="Permintaan dikirim ke Admin HO, yang akan mengatur ulang password Anda."
      size="sm"
      footer={
        sent ? (
          <Button onClick={onClose}>Tutup</Button>
        ) : (
          <>
            <Button variant="secondary" onClick={onClose}>
              Batal
            </Button>
            <Button
              type="submit"
              form="forgot-password-form"
              loading={sending}
              icon={!sending ? <Send className="h-4 w-4" /> : undefined}
            >
              Kirim Permintaan
            </Button>
          </>
        )
      }
    >
      {sent ? (
        <div className="flex flex-col items-center gap-3 py-2 text-center">
          <CheckCircle2 className="h-10 w-10 text-success-green" />
          <p className="text-sm font-semibold text-ink-deep">Permintaan terkirim</p>
          <p className="text-sm text-slate">
            Admin HO akan mengatur ulang password Anda dan memberikan password sementara. Hubungi Admin HO bila belum
            ada kabar.
          </p>
        </div>
      ) : (
        <form id="forgot-password-form" onSubmit={handleSubmit} className="space-y-4">
          {error && <Alert tone="danger">{error}</Alert>}
          <Field label="Username / Email" htmlFor="forgot-identifier">
            <Input
              id="forgot-identifier"
              autoComplete="username"
              icon={<User className="h-[18px] w-[18px]" />}
              value={identifier}
              onChange={e => setIdentifier(e.target.value)}
              placeholder="Username atau email"
            />
          </Field>
        </form>
      )}
    </Modal>
  );
};
