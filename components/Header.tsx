"use client";

import Link from "next/link";
import { useLanguage } from "@/contexts/LanguageContext";
import { useTranslation } from "@/hooks/useTranslation";

export function Header() {
  const { language, setLanguage } = useLanguage();
  const { t } = useTranslation();

  const toggleLanguage = () => {
    setLanguage(language === "ko" ? "en" : "ko");
  };

  return (
    <header className="fixed left-0 top-0 right-0 z-50 bg-black/80 backdrop-blur-sm border-b border-white/10">
      <div className="px-4 py-3 sm:px-6 sm:py-4 flex items-center justify-between">
        <Link href="/">
          <h2 className="text-xl sm:text-2xl font-bold tracking-wider text-white cursor-pointer hover:text-white/80 transition-colors">
            {t("nav.title")}
          </h2>
        </Link>
        
        <button
          onClick={toggleLanguage}
          className="flex items-center gap-2 rounded-md bg-white/20 px-3 py-1.5 text-sm font-medium text-white hover:bg-white/30 transition-colors backdrop-blur-sm"
          aria-label="언어 변경"
        >
          <span className="text-xs opacity-70">
            {language === "ko" ? "한국어" : "English"}
          </span>
          <span className="text-white/70">|</span>
          <span className="text-xs">
            {language === "ko" ? "EN" : "KO"}
          </span>
        </button>
      </div>
    </header>
  );
}
