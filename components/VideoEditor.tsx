"use client";

import { useRef } from "react";
import { ArrowLeft } from "lucide-react";
import { MediaSelector } from "./MediaSelector";
import { VideoThumbnails } from "./VideoThumbnails";
import { useTranslation } from "@/hooks/useTranslation";

interface VideoEditorProps {
  file: File;
  onBack: () => void;
  onComplete: (startTime: number, endTime: number) => void;
  analyzing: boolean;
}

export const VideoEditor = ({
  file,
  onBack,
  onComplete,
  analyzing,
}: VideoEditorProps) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const { t } = useTranslation();

  return (
    <div className="relative flex w-full flex-col">
      {/* 뒤로가기 버튼 */}
      <button
        onClick={onBack}
        className="absolute -top-12 left-0 z-20 flex items-center gap-1 rounded-full bg-white/10 px-3 py-2 text-sm font-medium text-white backdrop-blur-sm transition-colors hover:bg-white/20 sm:-top-14 sm:text-base"
      >
        <ArrowLeft className="h-4 w-4" />
        <span className="hidden sm:inline">{t("editor.back_button")}</span>
      </button>

      <MediaSelector
        file={file}
        onComplete={onComplete}
        analyzing={analyzing}
        mediaType="video"
        videoRef={videoRef}
      >
        {({ duration, startTime, endTime }) => (
          <VideoThumbnails
            videoRef={videoRef}
            duration={duration}
            startTime={startTime}
            endTime={endTime}
            framesCount={10}
            frameHeight={100}
          />
        )}
      </MediaSelector>

      {/* 숨겨진 비디오 요소 */}
      <video ref={videoRef} className="hidden" playsInline />
    </div>
  );
};
