import { useLanguage } from "@/contexts/LanguageContext";
import { translations } from "@/translations";

export function useTranslation() {
  const { language } = useLanguage();
  
  const t = (key: string, params?: Record<string, string> | string): string => {
    const keys = key.split(".");
    let value: any = translations[language];
    
    for (const k of keys) {
      if (value && typeof value === "object" && k in value) {
        value = value[k];
      } else {
        console.warn(`Translation key not found: ${key} for language: ${language}`);
        return key;
      }
    }
    
    if (typeof value !== "string") {
      return key;
    }
    
    // Handle simple string parameter (for backward compatibility)
    if (typeof params === "string") {
      return value.replace("{duration}", params);
    }
    
    // Handle object parameters
    if (params && typeof params === "object") {
      let result = value;
      for (const [paramKey, paramValue] of Object.entries(params)) {
        result = result.replace(new RegExp(`{${paramKey}}`, "g"), paramValue);
      }
      return result;
    }
    
    return value;
  };

  return { t, language };
}