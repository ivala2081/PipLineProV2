import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from 'react';
import { useAuth } from './AuthContext';

// Supported languages
export const SUPPORTED_LANGUAGES = {
  en: { name: 'English', flag: '🇺🇸' },
  tr: { name: 'Türkçe', flag: '🇹🇷' },
  es: { name: 'Español', flag: '🇪🇸' },
  fr: { name: 'Français', flag: '🇫🇷' },
  de: { name: 'Deutsch', flag: '🇩🇪' },
  ar: { name: 'العربية', flag: '🇸🇦' },
  zh: { name: '中文', flag: '🇨🇳' },
  ja: { name: '日本語', flag: '🇯🇵' },
  ko: { name: '한국어', flag: '🇰🇷' },
  ru: { name: 'Русский', flag: '🇷🇺' },
};

export type LanguageCode = keyof typeof SUPPORTED_LANGUAGES;

interface LanguageContextType {
  currentLanguage: LanguageCode;
  setLanguage: (language: LanguageCode) => Promise<void>;
  t: (key: string, params?: Record<string, string | number>) => string;
  isLoading: boolean;
  supportedLanguages: typeof SUPPORTED_LANGUAGES;
}

const LanguageContext = createContext<LanguageContextType | undefined>(
  undefined
);

interface LanguageProviderProps {
  children: ReactNode;
}

export function LanguageProvider({ children }: LanguageProviderProps) {
  const [currentLanguage, setCurrentLanguage] = useState<LanguageCode>('en');
  const [translations, setTranslations] = useState<Record<string, any>>({});
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuth();

  // Load translations for the current language
  useEffect(() => {
    const loadTranslations = async () => {
      setIsLoading(true);
      try {
        const module = await import(`../locales/${currentLanguage}.json`);
        setTranslations(module.default);
      } catch (error) {
        console.warn(
          `Failed to load translations for ${currentLanguage}, falling back to English`
        );
        try {
          const fallbackModule = await import('../locales/en.json');
          setTranslations(fallbackModule.default);
        } catch (fallbackError) {
          console.error('Failed to load fallback translations:', fallbackError);
          setTranslations({});
        }
      } finally {
        setIsLoading(false);
      }
    };

    loadTranslations();
  }, [currentLanguage]);

  // Load user's preferred language on mount
  useEffect(() => {
    const loadUserLanguage = async () => {
      // Only try to load user settings if we have a user (authenticated)
      if (user) {
        try {
          const response = await fetch('/api/v1/users/settings', {
            method: 'GET',
            credentials: 'include',
            headers: {
              'Content-Type': 'application/json',
            },
          });

          if (response.status === 401) {
            // User is not authenticated, use default language
            setCurrentLanguage('en');
            return;
          }

          if (response.ok) {
            const data = await response.json();
            if (data.language) {
              setCurrentLanguage(data.language);
            }
          }
        } catch (error) {
          console.error('Failed to load user language:', error);
          // Use default language on error
          setCurrentLanguage('en');
        }
      } else {
        // No user, use browser language or default
        const browserLang = navigator.language.split('-')[0] as LanguageCode;
        if (SUPPORTED_LANGUAGES[browserLang]) {
          setCurrentLanguage(browserLang);
        } else {
          setCurrentLanguage('en');
        }
      }
    };

    loadUserLanguage();
  }, [user]);

  // Translation function
  const t = (key: string, params?: Record<string, string | number>): string => {
    const keys = key.split('.');
    let value: any = translations;

    for (const k of keys) {
      if (value && typeof value === 'object' && k in value) {
        value = value[k];
      } else {
        // Return key if translation not found
        return key;
      }
    }

    if (typeof value !== 'string') {
      return key;
    }

    // Replace parameters in translation
    if (params) {
      return value.replace(/\{(\w+)\}/g, (match: string, param: string) => {
        return params[param]?.toString() || match;
      });
    }

    return value;
  };

  // Set language function
  const setLanguage = async (language: LanguageCode) => {
    if (!SUPPORTED_LANGUAGES[language]) {
      throw new Error(`Unsupported language: ${language}`);
    }

    setCurrentLanguage(language);

    // Save to backend if user is authenticated
    if (user) {
      try {
        const response = await fetch('/api/v1/users/settings', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify({ language }),
        });

        if (!response.ok) {
          console.warn('Failed to save language preference to backend');
        }
      } catch (error) {
        console.warn('Failed to save language preference:', error);
      }
    }

    // Save to localStorage as fallback
    localStorage.setItem('preferred-language', language);
  };

  const value: LanguageContextType = {
    currentLanguage,
    setLanguage,
    t,
    isLoading,
    supportedLanguages: SUPPORTED_LANGUAGES,
  };

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}
