/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

export type ThemeType = 'auto' | 'light' | 'dark' | 'hc-light' | 'hc-dark';
export type VisibilityType = 'public' | 'unlisted' | 'private' | 'direct';
export type DensityType = 'cozy' | 'compact';
export type ThreadView = 'flat' | 'tree';
export type ReadingWidth = 'narrow' | 'wide';

export interface Settings {
  theme: ThemeType;
  defaultVisibility: VisibilityType;
  density: DensityType;
  threadView: ThreadView;
  readingWidth: ReadingWidth;
  showAdvancedVisibilities: boolean;
  keepNavOpen: boolean;
  customCss: string;
}

interface SettingsContextType {
  settings: Settings;
  updateSettings: (newSettings: Partial<Settings>) => void;
}

const defaultSettings: Settings = {
  theme: 'auto',
  defaultVisibility: 'unlisted',
  density: 'cozy',
  threadView: 'flat',
  readingWidth: 'narrow',
  showAdvancedVisibilities: false,
  keepNavOpen: false,
  customCss: '',
};

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<Settings>(() => {
    try {
      const saved = localStorage.getItem('masto_settings');
      return saved ? { ...defaultSettings, ...JSON.parse(saved) } : defaultSettings;
    } catch {
      return defaultSettings;
    }
  });

  useEffect(() => {
    localStorage.setItem('masto_settings', JSON.stringify(settings));
  }, [settings]);

  const updateSettings = useCallback((newSettings: Partial<Settings>) => {
    setSettings((prev) => ({ ...prev, ...newSettings }));
  }, []);

  const value = useMemo(() => ({ settings, updateSettings }), [settings, updateSettings]);

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (!context) throw new Error('useSettings must be used within SettingsProvider');
  return context;
}
