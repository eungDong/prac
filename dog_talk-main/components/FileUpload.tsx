"use client";

import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import {
  Upload,
  FileVideo,
  FileAudio,
  Loader2,
  AlertTriangle,
  X,
} from "lucide-react";
import { VideoEditor } from "./VideoEditor";
import { useRouter } from "next/navigation";
import { saveFile } from "@/utils/storage";
import { useTranslation } from "@/hooks/useTranslation";

export const FileUpload = () => {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [showEditor, setShowEditor] = useState(false);
  const [warning, setWarning] = useState<string | null>(null);
  const [isCheckingDuration, setIsCheckingDuration] = useState(false);
  const router = useRouter();
  const { t } = useTranslation();

  // 미디어 파일의 재생 시간을 확인하는 함수
  const checkMediaDuration = (file: File): Promise<number> => {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const isVideo = file.type.startsWith("video/");

      if (isVideo) {
        const video = document.createElement("video");
        video.preload = "metadata";

        video.onloadedmetadata = () => {
          URL.revokeObjectURL(url);
          resolve(video.duration);
        };

        video.onerror = () => {
          URL.revokeObjectURL(url);
          reject(new Error(t("validation.file_analysis_error")));
        };

        video.src = url;
      } else {
        const audio = document.createElement("audio");
        audio.preload = "metadata";

        audio.onloadedmetadata = () => {
          URL.revokeObjectURL(url);
          resolve(audio.duration);
        };

        audio.onerror = () => {
          URL.revokeObjectURL(url);
          reject(new Error(t("validation.file_analysis_error")));
        };

        audio.src = url;
      }
    });
  };

  // 시간을 분:초 형식으로 변환하는 함수
  const formatDuration = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}분 ${remainingSeconds}초`;
  };

  const handleAnalyze = async () => {
    if (!file) return;

    try {
      setUploading(true);

      // File을 Base64로 변환
      const base64String = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
      });

      // 파일 데이터 준비
      const fileData = {
        name: file.name,
        type: file.type,
        base64: base64String,
      };

      // 타임스탬프 기반 고유 ID 생성
      const timestamp = new Date().getTime();
      const randomStr = Math.random().toString(36).substring(2, 8);
      const fileId = `file-${timestamp}-${randomStr}`;

      // IndexedDB에 저장
      await saveFile(`file_${fileId}`, fileData);

      // 파일 유형에 따라 다른 편집기로 리다이렉트
      const isAudio = file.type.startsWith("audio/");
      if (isAudio) {
        router.push(`/audio-editor?fileId=${fileId}`);
      } else {
        router.push(`/video-editor?fileId=${fileId}`);
      }
    } catch (error) {
      console.error("파일 저장 중 오류:", error);
      alert(t("validation.upload_error"));
    } finally {
      setUploading(false);
    }
  };

  const handleEditorBack = () => {
    setShowEditor(false);
  };

  const handleEditorComplete = async (startTime: number, endTime: number) => {
    try {
      setUploading(true);
      // TODO: 실제 API 연동
      console.log("분석 구간:", { startTime, endTime });
      await new Promise((resolve) => setTimeout(resolve, 1500));

      // TODO: 분석 결과 화면으로 이동
    } catch (error) {
      alert(t("validation.analysis_error"));
      console.error(error);
    } finally {
      setUploading(false);
    }
  };

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const uploadedFile = acceptedFiles[0];
    if (uploadedFile) {
      setWarning(null);
      setIsCheckingDuration(true);

      // 파일 유효성 검사
      const isVideo = [
        "video/mp4",
        "video/quicktime",
        "video/x-msvideo",
      ].includes(uploadedFile.type);

      const isAudio = [
        "audio/mpeg",
        "audio/wav",
        "audio/ogg",
        "audio/mp3",
      ].includes(uploadedFile.type);

      if (!isVideo && !isAudio) {
        setIsCheckingDuration(false);
        setWarning(t("validation.unsupported_format"));
        return;
      }

      if (uploadedFile.size > 100 * 1024 * 1024) {
        // 100MB
        setIsCheckingDuration(false);
        setWarning(t("validation.file_too_large"));
        return;
      }

      try {
        // 미디어 파일의 재생 시간 확인
        const duration = await checkMediaDuration(uploadedFile);
        const maxDuration = 10 * 60; // 10분 = 600초

        if (duration > maxDuration) {
          setIsCheckingDuration(false);
          setWarning(t("validation.file_too_long", formatDuration(duration)));
          return;
        }

        // 7초 미만 경고
        if (duration < 7) {
          setWarning(t("validation.file_too_short", formatDuration(duration)));
        }

        setFile(uploadedFile);
      } catch (error) {
        console.error("미디어 파일 분석 중 오류:", error);
        setWarning(t("validation.file_analysis_error"));
      } finally {
        setIsCheckingDuration(false);
      }
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "video/mp4": [".mp4"],
      "video/quicktime": [".mov"],
      "audio/mpeg": [".mp3"],
      "audio/wav": [".wav"],
      "audio/ogg": [".ogg"],
      "audio/mp3": [".mp3"],
    },
    maxSize: 100 * 1024 * 1024, // 100MB
    multiple: false,
    disabled: uploading || isCheckingDuration,
  });

  const handleCloseWarning = () => {
    setWarning(null);
  };

  if (showEditor && file) {
    return (
      <VideoEditor
        file={file}
        analyzing={uploading}
        onBack={handleEditorBack}
        onComplete={handleEditorComplete}
      />
    );
  }

  const isAudioFile = file?.type.startsWith("audio/");

  return (
    <div className="flex w-full h-full flex-col items-center justify-center gap-3 sm:gap-4">
      {/* 경고 메시지 */}
      {warning && (
        <div className="w-full max-w-lg flex-shrink-0">
          <div className="flex items-start gap-2 rounded-lg border border-yellow-400/30 bg-yellow-400/10 p-3 backdrop-blur-sm">
            <AlertTriangle
              className="text-yellow-400 flex-shrink-0 mt-0.5"
              style={{
                width: "clamp(0.875rem, 1.5vw + 0.3vh, 1.25rem)",
                height: "clamp(0.875rem, 1.5vw + 0.3vh, 1.25rem)",
              }}
            />
            <div className="flex-1">
              <p
                className="text-yellow-100 leading-relaxed"
                style={{
                  fontSize: "clamp(0.625rem, 1vw + 0.3vh, 0.875rem)",
                }}
              >
                {warning}
              </p>
            </div>
            <button
              onClick={handleCloseWarning}
              className="text-yellow-400 hover:text-yellow-300 transition-colors flex-shrink-0"
              aria-label={t("validation.close_warning")}
            >
              <X
                style={{
                  width: "clamp(0.75rem, 1.2vw + 0.2vh, 1rem)",
                  height: "clamp(0.75rem, 1.2vw + 0.2vh, 1rem)",
                }}
              />
            </button>
          </div>
        </div>
      )}

      <div
        {...getRootProps()}
        className="flex w-full max-w-lg cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-white/30 bg-white/10 p-3 transition-colors hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-50 flex-grow sm:p-4"
        role="button"
        tabIndex={0}
        aria-label={t("upload.drag_inactive")}
      >
        <input {...getInputProps()} />
        <div className="flex flex-col items-center gap-2 sm:gap-3">
          {isCheckingDuration ? (
            <>
              <Loader2
                className="text-white animate-spin"
                style={{
                  width: "clamp(1.5rem, 3vw + 1vh, 2.5rem)",
                  height: "clamp(1.5rem, 3vw + 1vh, 2.5rem)",
                }}
              />
              <p
                className="text-center text-white"
                style={{
                  fontSize: "clamp(0.625rem, 1vw + 0.3vh, 0.875rem)",
                }}
              >
                {t("upload.checking")}
              </p>
            </>
          ) : file ? (
            <>
              {isAudioFile ? (
                <FileAudio
                  className="text-white"
                  style={{
                    width: "clamp(1.5rem, 3vw + 1vh, 2.5rem)",
                    height: "clamp(1.5rem, 3vw + 1vh, 2.5rem)",
                  }}
                />
              ) : (
                <FileVideo
                  className="text-white"
                  style={{
                    width: "clamp(1.5rem, 3vw + 1vh, 2.5rem)",
                    height: "clamp(1.5rem, 3vw + 1vh, 2.5rem)",
                  }}
                />
              )}
              <p
                className="text-center text-white truncate max-w-xs"
                style={{
                  fontSize: "clamp(0.625rem, 1vw + 0.3vh, 0.875rem)",
                }}
              >
                {file.name}
              </p>
            </>
          ) : (
            <>
              <Upload
                className="text-white"
                style={{
                  width: "clamp(1.5rem, 3vw + 1vh, 2.5rem)",
                  height: "clamp(1.5rem, 3vw + 1vh, 2.5rem)",
                }}
              />
              <div className="text-center text-white">
                <p
                  className="font-semibold"
                  style={{
                    fontSize: "clamp(0.75rem, 1.2vw + 0.4vh, 1rem)",
                  }}
                >
                  {isDragActive
                    ? t("upload.drag_active")
                    : t("upload.drag_inactive")}
                </p>
                <p
                  className="mt-1 text-white/70"
                  style={{
                    fontSize: "clamp(0.625rem, 1vw + 0.3vh, 0.875rem)",
                  }}
                >
                  {t("upload.file_types")}
                </p>
              </div>
            </>
          )}
        </div>
      </div>

      {file && (
        <button
          onClick={handleAnalyze}
          disabled={uploading || isCheckingDuration}
          className="flex-shrink-0 flex items-center gap-2 rounded-full bg-white px-4 py-2 font-semibold text-black transition-colors hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-50 sm:px-5 sm:py-2.5"
          style={{
            fontSize: "clamp(0.625rem, 1vw + 0.3vh, 0.875rem)",
          }}
        >
          {uploading ? (
            <>
              <Loader2
                className="animate-spin"
                style={{
                  width: "clamp(0.75rem, 1.2vw + 0.2vh, 1rem)",
                  height: "clamp(0.75rem, 1.2vw + 0.2vh, 1rem)",
                }}
              />
              {t("common.analyzing_progress")}
            </>
          ) : (
            t("common.analyze")
          )}
        </button>
      )}
    </div>
  );
};
