import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { User, Mail, Phone, MapPin, ShieldCheck, Globe, LogOut, Camera, X } from 'lucide-react';
import { cn } from '../utils/cn';

// Mock profile data
const MOCK_PROFILE = {
  fullName: 'John Inspector',
  email: 'john.smith@company.com',
  phone: '+62 812-3456-7890',
  workLocation: 'Dealer Sunter',
  role: 'Senior Inspector',
  department: 'Quality Assurance',
  avatarBase64: null,
};

const ProfilePage: React.FC = () => {
  const { t, i18n } = useTranslation();
  const [profile, setProfile] = useState(MOCK_PROFILE);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState(profile);
  
  const initials = profile.fullName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();

  const handleLanguageChange = (code: string) => {
    i18n.changeLanguage(code);
    // In a real app, update the languageStore or user preference backend here.
  };

  const handleSave = () => {
    setProfile(formData);
    setIsEditing(false);
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-foreground">{t('profile.title') || 'Profile & Settings'}</h1>
        <p className="text-muted-foreground mt-1">{t('profile.subtitle') || 'Manage your account and preferences.'}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left Column - Profile Card */}
        <div className="md:col-span-1 space-y-6">
          <div className="bg-white rounded-3xl border border-divider shadow-sm p-6 text-center">
            <div className="relative inline-block">
              <div className="w-24 h-24 rounded-2xl bg-primary-blue text-white flex items-center justify-center text-3xl font-bold mx-auto overflow-hidden border-4 border-surface shadow-sm">
                {profile.avatarBase64 ? (
                  <img src={`data:image/jpeg;base64,${profile.avatarBase64}`} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  initials
                )}
              </div>
              <button className="absolute -bottom-2 -right-2 p-2 bg-white rounded-full shadow-md border border-divider text-muted-foreground hover:text-primary-blue transition-colors">
                <Camera className="w-4 h-4" />
              </button>
            </div>
            
            <h2 className="mt-4 text-lg font-bold text-foreground">{profile.fullName}</h2>
            <p className="text-sm text-muted-foreground">{profile.role}</p>
            
            <div className="mt-4 inline-flex items-center px-3 py-1 rounded-full bg-success-green/10 text-success-green text-xs font-bold uppercase tracking-wider">
              {t('profile.status') || 'Active'}
            </div>
          </div>

          <div className="bg-white rounded-3xl border border-divider shadow-sm p-6">
            <h3 className="font-bold text-foreground mb-4 flex items-center gap-2">
              <Globe className="w-5 h-5 text-primary-blue" />
              {t('settings.language.title') || 'Language / Bahasa'}
            </h3>
            <div className="flex gap-2">
              <button 
                onClick={() => handleLanguageChange('en')}
                className={cn(
                  "flex-1 py-2 rounded-xl text-sm font-semibold transition-all border",
                  i18n.language === 'en' 
                    ? "bg-primary-blue text-white border-primary-blue shadow-sm" 
                    : "bg-surface text-muted-foreground border-divider hover:bg-surface/80"
                )}
              >
                English
              </button>
              <button 
                onClick={() => handleLanguageChange('id')}
                className={cn(
                  "flex-1 py-2 rounded-xl text-sm font-semibold transition-all border",
                  i18n.language === 'id' 
                    ? "bg-primary-blue text-white border-primary-blue shadow-sm" 
                    : "bg-surface text-muted-foreground border-divider hover:bg-surface/80"
                )}
              >
                Indonesia
              </button>
            </div>
          </div>
        </div>

        {/* Right Column - Details */}
        <div className="md:col-span-2">
          <div className="bg-white rounded-3xl border border-divider shadow-sm overflow-hidden">
            <div className="p-6 border-b border-divider flex justify-between items-center bg-surface/30">
              <h3 className="font-bold text-foreground">Personal Information</h3>
              {!isEditing ? (
                <button 
                  onClick={() => setIsEditing(true)}
                  className="text-sm font-semibold text-primary-blue hover:text-primary-blue-dark transition-colors"
                >
                  Edit Profile
                </button>
              ) : (
                <button 
                  onClick={() => setIsEditing(false)}
                  className="p-1 text-muted-foreground hover:text-foreground transition-colors bg-white rounded-full shadow-sm"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
            
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                    <User className="w-3.5 h-3.5" /> Full Name
                  </label>
                  {isEditing ? (
                    <input 
                      type="text" 
                      value={formData.fullName} 
                      onChange={e => setFormData({...formData, fullName: e.target.value})}
                      className="w-full px-3 py-2 border border-divider rounded-lg focus:outline-none focus:border-primary-blue"
                    />
                  ) : (
                    <p className="font-medium text-foreground py-2">{profile.fullName}</p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                    <Mail className="w-3.5 h-3.5" /> Email
                  </label>
                  {isEditing ? (
                    <input 
                      type="email" 
                      value={formData.email} 
                      onChange={e => setFormData({...formData, email: e.target.value})}
                      className="w-full px-3 py-2 border border-divider rounded-lg focus:outline-none focus:border-primary-blue"
                    />
                  ) : (
                    <p className="font-medium text-foreground py-2">{profile.email}</p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                    <Phone className="w-3.5 h-3.5" /> Phone Number
                  </label>
                  {isEditing ? (
                    <input 
                      type="tel" 
                      value={formData.phone} 
                      onChange={e => setFormData({...formData, phone: e.target.value})}
                      className="w-full px-3 py-2 border border-divider rounded-lg focus:outline-none focus:border-primary-blue"
                    />
                  ) : (
                    <p className="font-medium text-foreground py-2">{profile.phone}</p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                    <MapPin className="w-3.5 h-3.5" /> Location
                  </label>
                  {isEditing ? (
                    <input 
                      type="text" 
                      value={formData.workLocation} 
                      onChange={e => setFormData({...formData, workLocation: e.target.value})}
                      className="w-full px-3 py-2 border border-divider rounded-lg focus:outline-none focus:border-primary-blue"
                    />
                  ) : (
                    <p className="font-medium text-foreground py-2">{profile.workLocation}</p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                    <ShieldCheck className="w-3.5 h-3.5" /> Role
                  </label>
                  <p className="font-medium text-foreground py-2 text-muted-foreground cursor-not-allowed">
                    {profile.role} (Read Only)
                  </p>
                </div>
              </div>

              {isEditing && (
                <div className="pt-4 flex justify-end">
                  <button 
                    onClick={handleSave}
                    className="px-6 py-2 bg-primary-blue text-white rounded-xl font-semibold hover:bg-primary-blue-dark transition-colors shadow-sm"
                  >
                    Save Changes
                  </button>
                </div>
              )}
            </div>
            
            <div className="p-4 bg-danger-red/5 border-t border-danger-red/10 flex justify-between items-center sm:hidden">
                <button className="flex items-center gap-2 text-danger-red font-semibold text-sm">
                  <LogOut className="w-4 h-4" /> Sign Out
                </button>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
