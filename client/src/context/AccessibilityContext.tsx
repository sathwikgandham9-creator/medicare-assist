import React, { createContext, useContext, useState, useEffect } from 'react';
import { Language, TRANSLATIONS } from '../utils/translations';
import { api } from '../services/api';

interface AccessibilityContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  textSize: 'normal' | 'large' | 'xlarge';
  setTextSize: (size: 'normal' | 'large' | 'xlarge') => void;
  highContrast: boolean;
  setHighContrast: (val: boolean) => void;
  voiceEnabled: boolean;
  setVoiceEnabled: (val: boolean) => void;
  t: (key: string) => string;
}

const AccessibilityContext = createContext<AccessibilityContextType | undefined>(undefined);

export const AccessibilityProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>(
    (localStorage.getItem('medicare_lang') as Language) || 'en'
  );
  const [textSize, setTextSizeState] = useState<'normal' | 'large' | 'xlarge'>(
    (localStorage.getItem('medicare_text_size') as any) || 'large'
  );
  const [highContrast, setHighContrastState] = useState<boolean>(
    localStorage.getItem('medicare_high_contrast') === 'true'
  );
  const [voiceEnabled, setVoiceEnabledState] = useState<boolean>(
    localStorage.getItem('medicare_voice') !== 'false'
  );

  // Apply root CSS classes for accessibility
  useEffect(() => {
    const root = document.documentElement;

    // Text size
    root.classList.remove('text-size-normal', 'text-size-large', 'text-size-xlarge');
    root.classList.add(`text-size-${textSize}`);

    // High contrast
    if (highContrast) {
      root.classList.add('high-contrast');
    } else {
      root.classList.remove('high-contrast');
    }
  }, [textSize, highContrast]);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem('medicare_lang', lang);
    api.request('/auth/settings', {
      method: 'PATCH',
      body: JSON.stringify({ preferred_language: lang }),
    }).catch(() => {});
  };

  const setTextSize = (size: 'normal' | 'large' | 'xlarge') => {
    setTextSizeState(size);
    localStorage.setItem('medicare_text_size', size);
    api.request('/auth/settings', {
      method: 'PATCH',
      body: JSON.stringify({ text_size: size }),
    }).catch(() => {});
  };

  const setHighContrast = (val: boolean) => {
    setHighContrastState(val);
    localStorage.setItem('medicare_high_contrast', String(val));
    api.request('/auth/settings', {
      method: 'PATCH',
      body: JSON.stringify({ high_contrast: val }),
    }).catch(() => {});
  };

  const setVoiceEnabled = (val: boolean) => {
    setVoiceEnabledState(val);
    localStorage.setItem('medicare_voice', String(val));
    api.request('/auth/settings', {
      method: 'PATCH',
      body: JSON.stringify({ voice_enabled: val }),
    }).catch(() => {});
  };

  const t = (key: string): string => {
    const langDict = TRANSLATIONS[language] || TRANSLATIONS.en;
    return langDict[key] || TRANSLATIONS.en[key] || key;
  };

  return (
    <AccessibilityContext.Provider
      value={{
        language,
        setLanguage,
        textSize,
        setTextSize,
        highContrast,
        setHighContrast,
        voiceEnabled,
        setVoiceEnabled,
        t,
      }}
    >
      {children}
    </AccessibilityContext.Provider>
  );
};

export const useAccessibility = () => {
  const ctx = useContext(AccessibilityContext);
  if (!ctx) throw new Error('useAccessibility must be used within AccessibilityProvider');
  return ctx;
};

