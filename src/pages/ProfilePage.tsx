import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { User, Mail, Phone, MapPin, ShieldCheck, Globe, LogOut, Camera, X, Building2 } from 'lucide-react';
import { cn } from '../utils/cn';
import { appSwal } from '../lib/appSwal';

import { useAuth } from '../hooks/useAuth';
import { useProfileStore } from '../stores/profileStore';
import {
  Avatar,
  Badge,
  Button,
  Card,
  CardHeader,
  Field,
  Input,
  PageHeader,
  RowAction,
} from '../components/ui';

const ProfilePage: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { profile, updateProfile, uploadAvatar } = useProfileStore();
  const { logout, logoutAll, user } = useAuth();

  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState(profile);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const displayName = profile.fullName || user?.name || 'Inspector';
  const role = profile.role || user?.role || 'Inspector';
  const email = user?.email || 'N/A';
  const location = user?.groupAddress || user?.groupName || profile.workLocation || 'N/A';
  const department = user?.organizationName || profile.department || 'N/A';

  const handleLanguageChange = (code: string) => {
    i18n.changeLanguage(code);
    // In a real app, update the languageStore or user preference backend here.
  };

  const handleSave = async () => {
    const confirmed = await appSwal.confirmSave();
    if (!confirmed) return;

    try {
      await updateProfile(formData);
      setIsEditing(false);
      await appSwal.successSaved('profile');
    } catch {
      // Error handled by store
    }
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      await uploadAvatar(file);
    } catch {
      // Error handled by store
    }
  };

  const handleLogout = async () => {
    const confirmed = await appSwal.confirmLogout();
    if (!confirmed) return;
    try {
      await logout();
      await appSwal.successLogout();
    } catch {
      // handled
    }
  };

  const handleLogoutAllDevices = async () => {
    const confirmed = await appSwal.confirm({
      title: 'Logout Semua Perangkat?',
      text: 'Anda akan dikeluarkan dari akun ini di semua browser dan perangkat yang sedang aktif.',
      confirmText: 'Ya, Logout Semua',
      tone: 'danger',
    });
    if (!confirmed) return;
    try {
      await logoutAll();
      await appSwal.success({
        title: 'Berhasil',
        text: 'Anda telah dikeluarkan dari semua perangkat.',
      });
    } catch {
      // handled
    }
  };

  return (
    <div className="page-shell">
      <div className="mx-auto w-full max-w-4xl space-y-6">
        <PageHeader
          eyebrow="Akun"
          title={t('profile.title') || 'Profile & Settings'}
          subtitle={t('profile.subtitle') || 'Manage your account and preferences.'}
        />

        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {/* Left Column - Profile Card */}
          <div className="md:col-span-1 space-y-6">
            <Card padded className="text-center">
              <div className="relative inline-block">
                <Avatar
                  name={displayName}
                  src={profile.avatarBase64 ? `data:image/jpeg;base64,${profile.avatarBase64}` : null}
                  size={96}
                  className="mx-auto rounded-2xl border-4 border-card shadow-soft-sm"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute -bottom-2 -right-2 flex h-9 w-9 items-center justify-center rounded-full border border-hairline-soft bg-card text-slate shadow-soft-sm transition-colors hover:text-primary-blue"
                >
                  <Camera className="h-4 w-4" />
                </button>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleAvatarChange}
                  className="hidden"
                  accept="image/*"
                />
              </div>

              <h2 className="mt-4 text-lg font-semibold tracking-tight text-ink-deep">{displayName}</h2>
              <p className="text-sm text-stone">{role}</p>

              <div className="mt-4 flex justify-center">
                <Badge tone="success" dot>
                  {t('profile.status') || 'Active'}
                </Badge>
              </div>
            </Card>

            <Card padded>
              <CardHeader
                title={t('settings.language.title') || 'Language / Bahasa'}
                icon={<Globe className="h-4 w-4" />}
                className="!border-0 !px-0 !pt-0"
              />
              <div className="flex gap-2">
                <button
                  onClick={() => handleLanguageChange('en')}
                  className={cn(
                    'flex-1 rounded-full py-2 text-sm font-semibold transition-all',
                    i18n.language === 'en'
                      ? 'bg-ink-deep text-white shadow-soft-sm'
                      : 'border border-hairline-soft bg-card text-slate hover:bg-surface hover:text-ink-deep',
                  )}
                >
                  English
                </button>
                <button
                  onClick={() => handleLanguageChange('id')}
                  className={cn(
                    'flex-1 rounded-full py-2 text-sm font-semibold transition-all',
                    i18n.language === 'id'
                      ? 'bg-ink-deep text-white shadow-soft-sm'
                      : 'border border-hairline-soft bg-card text-slate hover:bg-surface hover:text-ink-deep',
                  )}
                >
                  Indonesia
                </button>
              </div>
            </Card>

            <Card padded>
              <CardHeader
                title="Sesi & Keamanan"
                icon={<ShieldCheck className="h-4 w-4" />}
                className="!border-0 !px-0 !pt-0"
              />
              <p className="mb-4 text-xs text-stone">
                Keluarkan akun Anda dari semua peramban dan perangkat yang sedang masuk.
              </p>
              <Button
                variant="danger"
                block
                onClick={handleLogoutAllDevices}
                icon={<LogOut className="h-4 w-4" />}
              >
                Logout Semua Perangkat
              </Button>
            </Card>
          </div>

          {/* Right Column - Details */}
          <div className="md:col-span-2">
            <Card className="overflow-hidden">
              <CardHeader
                title="Personal Information"
                action={
                  !isEditing ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setFormData(profile);
                        setIsEditing(true);
                      }}
                    >
                      Edit Profile
                    </Button>
                  ) : (
                    <RowAction
                      onClick={() => {
                        setFormData(profile);
                        setIsEditing(false);
                      }}
                      aria-label="Cancel"
                    >
                      <X className="h-4 w-4" />
                    </RowAction>
                  )
                }
              />

              <div className="space-y-4 p-6">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <Field
                    label={
                      <>
                        <User className="h-3.5 w-3.5" /> Full Name
                      </>
                    }
                  >
                    {isEditing ? (
                      <Input
                        type="text"
                        value={formData.fullName}
                        onChange={e => setFormData({ ...formData, fullName: e.target.value })}
                      />
                    ) : (
                      <p className="py-2 font-medium text-ink-deep">{displayName}</p>
                    )}
                  </Field>

                  <Field
                    label={
                      <>
                        <Mail className="h-3.5 w-3.5" /> Email
                      </>
                    }
                  >
                    <p className="py-2 font-medium text-stone">{email} (Read Only)</p>
                  </Field>

                  <Field
                    label={
                      <>
                        <Phone className="h-3.5 w-3.5" /> Phone Number
                      </>
                    }
                  >
                    {isEditing ? (
                      <Input
                        type="tel"
                        value={formData.phone}
                        onChange={e => setFormData({ ...formData, phone: e.target.value })}
                      />
                    ) : (
                      <p className="py-2 font-medium text-ink-deep">{profile.phone}</p>
                    )}
                  </Field>

                  <Field
                    label={
                      <>
                        <MapPin className="h-3.5 w-3.5" /> Location
                      </>
                    }
                  >
                    {isEditing ? (
                      <Input
                        type="text"
                        value={formData.workLocation}
                        onChange={e => setFormData({ ...formData, workLocation: e.target.value })}
                      />
                    ) : (
                      <p className="py-2 font-medium text-ink-deep">{location}</p>
                    )}
                  </Field>

                  <Field
                    label={
                      <>
                        <Building2 className="h-3.5 w-3.5" /> Department
                      </>
                    }
                  >
                    {isEditing ? (
                      <Input
                        type="text"
                        value={formData.department}
                        onChange={e => setFormData({ ...formData, department: e.target.value })}
                      />
                    ) : (
                      <p className="py-2 font-medium text-ink-deep">{department}</p>
                    )}
                  </Field>

                  <Field
                    label={
                      <>
                        <ShieldCheck className="h-3.5 w-3.5" /> Role
                      </>
                    }
                  >
                    <p className="py-2 font-medium text-stone">{role} (Read Only)</p>
                  </Field>
                </div>

                {isEditing && (
                  <div className="flex justify-end pt-4">
                    <Button onClick={handleSave}>Save Changes</Button>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between border-t border-danger-red/10 bg-danger-red/5 p-4 sm:hidden">
                <button onClick={handleLogout} className="flex items-center gap-2 text-sm font-semibold text-danger-red">
                  <LogOut className="h-4 w-4" /> Sign Out
                </button>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
