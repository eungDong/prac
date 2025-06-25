import { ko } from "./ko";
import { en } from "./en";

export const translations = {
  ko,
  en,
};

export type TranslationKey = keyof typeof ko;