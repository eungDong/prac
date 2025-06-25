"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";

export type Language = "ko" | "en";

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>("ko");

  useEffect(() => {
    const savedLanguage = localStorage.getItem("language") as Language;
    if (savedLanguage && (savedLanguage === "ko" || savedLanguage === "en")) {
      setLanguageState(savedLanguage);
    } else {
      // localStorage에 저장된 언어가 없으면 브라우저 언어 감지
      const browserLanguage = navigator.language.toLowerCase();
      
      // 한국어 감지 (ko, ko-KR, ko-kr 등)
      if (browserLanguage.startsWith('ko')) {
        setLanguageState('ko');
      }
      // 영어 감지 (en, en-US, en-GB 등)
      else if (browserLanguage.startsWith('en')) {
        setLanguageState('en');
      }
      // 기본값은 한국어 (이미 useState에서 "ko"로 설정됨)
    }
  }, []);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem("language", lang);
    document.documentElement.lang = lang;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
}