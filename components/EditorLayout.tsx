"use client";

import { ArrowLeft } from "lucide-react";
import Image from "next/image";
import { useTranslation } from "@/hooks/useTranslation";

interface EditorLayoutProps {
  children: React.ReactNode;
  title: string;
  loading?: boolean;
  analyzing?: boolean;
  onBack?: () => void;
  showBackButton?: boolean;
}

export const EditorLayout = ({
  children,
  title,
  loading = false,
  analyzing = false,
  onBack,
  showBackButton = true,
}: EditorLayoutProps) => {
  const { t } = useTranslation();
  const LoadingSpinner = ({ message }: { message: string }) => (
    <main className="relative h-[100dvh] w-full overflow-hidden">
      <div
        className="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: "url('/images/background.jpg')" }}
      >
        <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      </div>
      <div className="relative z-10 flex h-full items-center justify-center p-4">
        <div className="flex flex-col items-center gap-4 rounded-lg bg-white/10 p-6 backdrop-blur-sm sm:gap-6 sm:p-8">
          <Image
            src="/images/loading.webp"
            alt={message}
            width={160}
            height={160}
            style={{
              width: "clamp(4rem, 8vw + 4vh, 10rem)",
              height: "clamp(4rem, 8vw + 4vh, 10rem)",
            }}
            priority
          />
          <div className="flex flex-col items-center gap-1 text-center sm:gap-2">
            <h2
              className="font-semibold text-white"
              style={{
                fontSize: "clamp(1rem, 2vw + 1vh, 1.5rem)",
              }}
            >
              {message}
            </h2>
            <p
              className="text-white/70"
              style={{
                fontSize: "clamp(0.75rem, 1.5vw + 0.5vh, 1rem)",
              }}
            >
              {t("common.wait")}
            </p>
          </div>
        </div>
      </div>
    </main>
  );

  if (loading) {
    return <LoadingSpinner message={t("common.file_loading")} />;
  }

  return (
    <main className="relative h-[100dvh] w-full overflow-hidden">
      <div
        className="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: "url('/images/background.jpg')" }}
      >
        <div className="absolute inset-0 bg-black/50" />
      </div>

      {showBackButton && onBack && (
        <div className="absolute right-4 top-4 z-20 sm:right-6 sm:top-6">
          <button
            onClick={onBack}
            className="flex items-center gap-1 rounded-md bg-white/20 px-3 py-2 font-medium text-white hover:bg-white/30 transition-colors backdrop-blur-sm sm:px-4"
            style={{
              fontSize: "clamp(0.625rem, 1vw + 0.3vh, 0.875rem)",
            }}
          >
            <ArrowLeft
              style={{
                width: "clamp(0.875rem, 1.5vw + 0.3vh, 1rem)",
                height: "clamp(0.875rem, 1.5vw + 0.3vh, 1rem)",
              }}
            />
            <span className="hidden sm:inline">{t("common.back")}</span>
          </button>
        </div>
      )}

      <div
        className="relative z-10 flex h-full flex-col items-center justify-center px-4 lg:px-8"
        style={{
          paddingTop: `clamp(0.5rem, 4vh, 2.5rem)`,
          paddingBottom: `clamp(0.5rem, 1.5vh, 0.75rem)`,
        }}
      >
        <div
          className="flex-shrink-0 text-center"
          style={{
            marginBottom: `clamp(0.5rem, 1.5vh, 1rem)`,
          }}
        >
          <h1
            className="font-bold text-white leading-tight"
            style={{
              fontSize: "clamp(0.875rem, 3vh, 2rem)",
            }}
          >
            {title}
          </h1>
          <h2
            className="mt-1 font-medium text-white/70 leading-tight"
            style={{
              fontSize: "clamp(0.625rem, 2vh, 1rem)",
            }}
          >
            {t("common.select_segment")}
          </h2>
        </div>

        <div
          className="w-full max-w-4xl bg-white/10 backdrop-blur-sm rounded-lg shadow-lg"
          style={{
            padding: `clamp(0.5rem, 1.2vh, 0.875rem)`,
          }}
        >
          {children}
        </div>
      </div>

      {analyzing && (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="flex flex-col items-center gap-4 rounded-lg bg-white/10 p-6 backdrop-blur-sm sm:gap-6 sm:p-8">
            <Image
              src="/images/loading.webp"
              alt={t("common.analyzing")}
              width={160}
              height={160}
              style={{
                width: "clamp(4rem, 8vw + 4vh, 10rem)",
                height: "clamp(4rem, 8vw + 4vh, 10rem)",
              }}
              priority
            />
            <div className="flex flex-col items-center gap-1 text-center sm:gap-2">
              <h2
                className="font-semibold text-white"
                style={{
                  fontSize: "clamp(1rem, 2vw + 1vh, 1.5rem)",
                }}
              >
                {t("common.analyzing")}
              </h2>
              <p
                className="text-white/70"
                style={{
                  fontSize: "clamp(0.75rem, 1.5vw + 0.5vh, 1rem)",
                }}
              >
                {t("common.wait")}
              </p>
            </div>
          </div>
        </div>
      )}
    </main>
  );
};
