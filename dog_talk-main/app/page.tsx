"use client";

import { FileUpload } from "@/components/FileUpload";
import { motion } from "framer-motion";
import { useTranslation } from "@/hooks/useTranslation";

export default function Home() {
  const { t } = useTranslation();

  return (
    <main className="relative w-full">
      {/* Hero Section */}
      <section className="relative h-[100dvh] w-full overflow-hidden">
        {/* 배경 이미지 */}
        <div
          className="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: "url('/images/background.jpg')" }}
        >
          <div className="absolute inset-0 bg-gradient-to-b from-black/60 to-black/40 backdrop-blur-[2px]" />
        </div>

        {/* 메인 콘텐츠 */}
        <div className="relative z-10 flex h-full flex-col items-center justify-center px-4 py-4 lg:px-8 pt-16 sm:pt-20">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="flex-shrink-0 text-center"
            style={{
              fontSize: "clamp(1.5rem, 4vw + 2vh, 4rem)",
            }}
          >
            <h1 className="bg-gradient-to-r from-white to-white/80 bg-clip-text font-bold text-transparent leading-tight">
              {t("home.title")}
            </h1>
            <h2
              className="mt-1 font-medium text-white/70 leading-tight"
              style={{
                fontSize: "clamp(0.875rem, 2vw + 1vh, 2rem)",
              }}
            >
              {t("home.subtitle")}
            </h2>
          </motion.div>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="my-4 flex-shrink-0 max-w-2xl text-center leading-relaxed text-white/90 sm:my-6 lg:my-8"
            style={{
              fontSize: "clamp(0.75rem, 1.5vw + 0.5vh, 1.125rem)",
            }}
          >
            {t("home.description")}
            <br className="hidden sm:block" />
            <span className="sm:hidden"> </span>{t("home.description_br")}
            <span
              className="mt-1 block text-white/80 leading-tight"
              style={{
                fontSize: "clamp(0.625rem, 1vw + 0.3vh, 0.875rem)",
              }}
            >
              {t("home.duration_note")}
            </span>
          </motion.p>

          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="w-full max-w-2xl h-[200px] sm:h-[224px] lg:h-[270px] flex items-center justify-center"
          >
            <FileUpload />
          </motion.div>
        </div>
      </section>
    </main>
  );
}
