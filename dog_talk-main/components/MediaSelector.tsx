"use client";

import React, { useState, useRef, useEffect } from "react";
import { Play, Pause, Loader2 } from "lucide-react";
import { useTranslation } from "@/hooks/useTranslation";

interface MediaSelectorProps {
  file: File;
  onComplete: (startTime: number, endTime: number) => void;
  analyzing: boolean;
  children?: (props: {
    duration: number;
    startTime: number;
    endTime: number;
  }) => React.ReactNode; // 파형이나 썸네일 미리보기를 위한 render prop
  mediaType: "audio" | "video";
  videoRef?: React.RefObject<HTMLVideoElement | null>; // 비디오 전용 ref
}

// 최소 구간 길이 (초)
const MIN_DURATION = 7;
// 최대 구간 길이 (초)
const MAX_DURATION = 10;

export const MediaSelector = ({
  file,
  onComplete,
  analyzing,
  children,
  mediaType,
  videoRef,
}: MediaSelectorProps) => {
  const { t } = useTranslation();
  const internalRef = useRef<HTMLAudioElement | HTMLVideoElement | null>(null);
  const mediaRef = videoRef || internalRef;
  const [duration, setDuration] = useState(0);
  const [startTime, setStartTime] = useState(0);
  const [endTime, setEndTime] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [activeHandle, setActiveHandle] = useState<
    "start" | "end" | "both" | null
  >(null);
  const [dragStartX, setDragStartX] = useState(0);
  const [initialStartTime, setInitialStartTime] = useState(0);
  const [initialEndTime, setInitialEndTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [mediaLoaded, setMediaLoaded] = useState(false);

  // 미디어 초기화
  useEffect(() => {
    if (!mediaRef.current) return;

    const media = mediaRef.current;
    const mediaURL = URL.createObjectURL(file);
    media.src = mediaURL;

    const handleLoadedMetadata = () => {
      if (media.duration === Infinity || isNaN(media.duration)) {
        console.warn("Invalid media duration detected.");
        setDuration(0);
        setEndTime(0);
        setMediaLoaded(true);
        return;
      }
      setDuration(media.duration);
      setEndTime(Math.min(media.duration, MIN_DURATION + 1));
      setMediaLoaded(true);
    };

    const handleMediaError = (e: Event) => {
      console.error("Media Error:", e);
      setDuration(0);
      setEndTime(0);
      setMediaLoaded(true);
    };

    media.addEventListener("loadedmetadata", handleLoadedMetadata);
    media.addEventListener("error", handleMediaError);

    return () => {
      URL.revokeObjectURL(mediaURL);
      media.removeEventListener("loadedmetadata", handleLoadedMetadata);
      media.removeEventListener("error", handleMediaError);
    };
  }, [file]);

  // 재생 제어
  useEffect(() => {
    if (!mediaRef.current) return;

    const media = mediaRef.current;

    const handleTimeUpdate = () => {
      // 선택 구간 밖으로 나가면 멈춤
      if (media.currentTime >= endTime && endTime > 0) {
        media.pause();
        media.currentTime = startTime;
        setIsPlaying(false);
      }
    };

    media.addEventListener("timeupdate", handleTimeUpdate);

    return () => {
      media.removeEventListener("timeupdate", handleTimeUpdate);
    };
  }, [startTime, endTime]);

  const togglePlayPause = () => {
    if (!mediaRef.current || duration === 0) return;

    if (isPlaying) {
      mediaRef.current.pause();
    } else {
      // 현재 시간이 선택 구간 밖이면 시작 지점으로 이동
      if (
        mediaRef.current.currentTime < startTime ||
        mediaRef.current.currentTime >= endTime
      ) {
        mediaRef.current.currentTime = startTime;
      }
      mediaRef.current
        .play()
        .catch((err) => console.error("Media play error:", err));
    }

    setIsPlaying(!isPlaying);
  };

  const formatTime = (time: number) => {
    const validTime = isNaN(time) || time < 0 ? 0 : time;
    const minutes = Math.floor(validTime / 60);
    const seconds = Math.floor(validTime % 60);
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  // 전체 슬라이더 영역 드래그 (구간 이동)
  const handleSliderMouseDown = (e: React.MouseEvent | React.TouchEvent) => {
    if (duration === 0) return;
    setActiveHandle("both");
    setIsDragging(true);
    const clientX =
      "touches" in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    setDragStartX(clientX);
    setInitialStartTime(startTime);
    setInitialEndTime(endTime);
  };

  // 시작 핸들 드래그
  const handleStartHandleMouseDown = (
    e: React.MouseEvent | React.TouchEvent
  ) => {
    if (duration === 0) return;
    e.stopPropagation();
    setActiveHandle("start");
    setIsDragging(true);
    const clientX =
      "touches" in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    setDragStartX(clientX);
    setInitialStartTime(startTime);
  };

  // 종료 핸들 드래그
  const handleEndHandleMouseDown = (e: React.MouseEvent | React.TouchEvent) => {
    if (duration === 0) return;
    e.stopPropagation();
    setActiveHandle("end");
    setIsDragging(true);
    const clientX =
      "touches" in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    setDragStartX(clientX);
    setInitialEndTime(endTime);
  };

  const handleSliderMouseMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDragging || !mediaRef.current || duration === 0) return;

    const clientX =
      "touches" in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    const sliderRect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    if (sliderRect.width === 0) return;

    const deltaX = clientX - dragStartX;
    const deltaRatio = deltaX / sliderRect.width;
    const deltaTime = deltaRatio * duration;

    if (activeHandle === "both") {
      // 전체 구간 이동
      let newStartTime = initialStartTime + deltaTime;
      let newEndTime = initialEndTime + deltaTime;
      const currentInterval = initialEndTime - initialStartTime;

      // 경계 체크
      if (newStartTime < 0) {
        newStartTime = 0;
        newEndTime = currentInterval;
      }

      if (newEndTime > duration) {
        newEndTime = duration;
        newStartTime = duration - currentInterval;
      }
      if (newStartTime < 0) newStartTime = 0;

      setStartTime(newStartTime);
      setEndTime(newEndTime);
    } else if (activeHandle === "start") {
      // 시작 시간만 조정
      let newStartTime = initialStartTime + deltaTime;

      if (newStartTime < 0) newStartTime = 0;
      if (newStartTime > endTime - MIN_DURATION)
        newStartTime = Math.max(0, endTime - MIN_DURATION);
      if (endTime - newStartTime > MAX_DURATION)
        newStartTime = Math.max(0, endTime - MAX_DURATION);

      setStartTime(newStartTime);
    } else if (activeHandle === "end") {
      // 종료 시간만 조정
      let newEndTime = initialEndTime + deltaTime;

      if (newEndTime > duration) newEndTime = duration;
      if (newEndTime < startTime + MIN_DURATION)
        newEndTime = Math.min(duration, startTime + MIN_DURATION);
      if (newEndTime - startTime > MAX_DURATION)
        newEndTime = Math.min(duration, startTime + MAX_DURATION);

      setEndTime(newEndTime);
    }
  };

  const handleSliderMouseUp = () => {
    setIsDragging(false);
    setActiveHandle(null);
  };

  const currentSelectionDuration = endTime - startTime;

  return (
    <div className="relative flex w-full flex-col items-center justify-start">
      <div
        className="w-full flex flex-col items-center"
        style={{
          gap: `clamp(0.5rem, 1.5vh, 0.875rem)`,
        }}
      >
        {/* 제목 */}
        <h1
          className="text-center font-bold text-white"
          style={{
            fontSize: "clamp(0.875rem, 3vh, 1.75rem)",
          }}
        >
          {mediaType === "audio" ? t("editor.audio_segment_selection") : t("editor.video_segment_selection")}
        </h1>

        {/* 파일 정보 */}
        <div className="text-center">
          <div
            className="font-semibold text-white"
            style={{
              fontSize: "clamp(0.75rem, 2.5vh, 1.125rem)",
              marginBottom: `clamp(0.125rem, 0.3vh, 0.25rem)`,
            }}
          >
            {file.name}
          </div>
          {duration > 0 && (
            <div
              className="text-white/70"
              style={{
                fontSize: "clamp(0.625rem, 2vh, 0.875rem)",
              }}
            >
              {t("editor.total_length")}: {formatTime(duration)}
            </div>
          )}
        </div>

        {/* 미디어 재생 및 제어 영역 */}
        {duration > 0 && (
          <div
            className="w-full"
            style={{
              maxWidth: "min(100%, 48rem)",
            }}
          >
            {/* 미리보기 영역 (파형 또는 썸네일) */}
            <div
              style={{
                marginBottom: `clamp(0.375rem, 1vh, 0.5rem)`,
              }}
            >
              {children && typeof children === "function"
                ? children({ duration, startTime, endTime })
                : children}
            </div>

            {/* 시간 표시 */}
            <div
              className="flex justify-between text-white/70 px-1"
              style={{
                fontSize: "clamp(0.625rem, 2vh, 0.8rem)",
                marginBottom: `clamp(0.375rem, 1vh, 0.5rem)`,
              }}
            >
              <span>{formatTime(0)}</span>
              <span>{formatTime(duration)}</span>
            </div>

            {/* 재생 버튼과 슬라이더 */}
            <div className="w-full">
              {/* 재생 버튼 */}
              <div
                className="flex justify-center"
                style={{
                  marginBottom: `clamp(0.5rem, 1.5vh, 0.75rem)`,
                }}
              >
                <button
                  onClick={togglePlayPause}
                  disabled={analyzing || duration === 0}
                  className="flex items-center justify-center rounded-full bg-white text-black hover:bg-white/90 disabled:opacity-50 transition-all shadow-lg"
                  style={{
                    width: `clamp(2.5rem, 6vh, 3.5rem)`,
                    height: `clamp(2.5rem, 6vh, 3.5rem)`,
                  }}
                  aria-label={isPlaying ? "일시정지" : "재생"}
                >
                  {isPlaying ? (
                    <Pause
                      style={{
                        width: `clamp(1rem, 2.5vh, 1.5rem)`,
                        height: `clamp(1rem, 2.5vh, 1.5rem)`,
                      }}
                    />
                  ) : (
                    <Play
                      className="ml-0.5"
                      style={{
                        width: `clamp(1rem, 2.5vh, 1.5rem)`,
                        height: `clamp(1rem, 2.5vh, 1.5rem)`,
                      }}
                    />
                  )}
                </button>
              </div>

              {/* 슬라이더 */}
              <div
                className="relative touch-none select-none px-1"
                style={{
                  height: `clamp(2.5rem, 6vh, 4rem)`,
                  marginBottom: `clamp(0.5rem, 1.5vh, 0.75rem)`,
                }}
                onMouseDown={handleSliderMouseDown}
                onMouseMove={handleSliderMouseMove}
                onMouseUp={handleSliderMouseUp}
                onMouseLeave={handleSliderMouseUp}
                onTouchStart={handleSliderMouseDown}
                onTouchMove={handleSliderMouseMove}
                onTouchEnd={handleSliderMouseUp}
                onTouchCancel={handleSliderMouseUp}
              >
                <div
                  className="absolute inset-x-0 top-1/2 -translate-y-1/2 rounded-full bg-white/20"
                  style={{
                    height: `clamp(6px, 1vh, 10px)`,
                  }}
                >
                  <div
                    className="absolute h-full bg-blue-500 rounded-full"
                    style={{
                      left: `${
                        duration > 0 ? (startTime / duration) * 100 : 0
                      }%`,
                      width: `${
                        duration > 0
                          ? (currentSelectionDuration / duration) * 100
                          : 0
                      }%`,
                    }}
                  ></div>
                </div>

                {/* 시작 핸들 */}
                <div
                  className="absolute top-1/2 z-30 -translate-y-1/2 -translate-x-1/2 cursor-grab active:cursor-grabbing"
                  style={{
                    left: `${duration > 0 ? (startTime / duration) * 100 : 0}%`,
                  }}
                  onMouseDown={handleStartHandleMouseDown}
                  onTouchStart={handleStartHandleMouseDown}
                >
                  <div className="flex flex-col items-center">
                    {/* 시간 표시 */}
                    <div
                      className="mb-1 px-2 py-1 bg-blue-500 text-white text-xs font-medium rounded shadow-lg"
                      style={{
                        fontSize: `clamp(0.625rem, 1.5vh, 0.75rem)`,
                      }}
                    >
                      {formatTime(startTime)}
                    </div>
                    {/* 핸들 */}
                    <div
                      className="flex items-center justify-center"
                      style={{
                        width: `clamp(2rem, 5vh, 3rem)`,
                        height: `clamp(2rem, 5vh, 3rem)`,
                      }}
                    >
                      <div
                        className="rounded-full border-2 border-blue-400 bg-white shadow-lg hover:scale-110 active:scale-125 transition-transform"
                        style={{
                          width: `clamp(1.25rem, 3vh, 2rem)`,
                          height: `clamp(1.25rem, 3vh, 2rem)`,
                        }}
                      />
                    </div>
                  </div>
                </div>

                {/* 끝 핸들 */}
                <div
                  className="absolute top-1/2 z-30 -translate-y-1/2 -translate-x-1/2 cursor-grab active:cursor-grabbing"
                  style={{
                    left: `${duration > 0 ? (endTime / duration) * 100 : 0}%`,
                  }}
                  onMouseDown={handleEndHandleMouseDown}
                  onTouchStart={handleEndHandleMouseDown}
                >
                  <div className="flex flex-col items-center">
                    {/* 시간 표시 */}
                    <div
                      className="mb-1 px-2 py-1 bg-blue-500 text-white text-xs font-medium rounded shadow-lg"
                      style={{
                        fontSize: `clamp(0.625rem, 1.5vh, 0.75rem)`,
                      }}
                    >
                      {formatTime(endTime)}
                    </div>
                    {/* 핸들 */}
                    <div
                      className="flex items-center justify-center"
                      style={{
                        width: `clamp(2rem, 5vh, 3rem)`,
                        height: `clamp(2rem, 5vh, 3rem)`,
                      }}
                    >
                      <div
                        className="rounded-full border-2 border-blue-400 bg-white shadow-lg hover:scale-110 active:scale-125 transition-transform"
                        style={{
                          width: `clamp(1.25rem, 3vh, 2rem)`,
                          height: `clamp(1.25rem, 3vh, 2rem)`,
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 숨겨진 미디어 요소 */}
        {mediaType === "audio" ? (
          <audio
            ref={mediaRef as React.RefObject<HTMLAudioElement>}
            className="hidden"
          />
        ) : (
          <video
            ref={mediaRef as React.RefObject<HTMLVideoElement>}
            className="hidden"
            playsInline
          />
        )}

        {duration === 0 && mediaLoaded && (
          <p
            className="text-center text-yellow-400"
            style={{
              fontSize: "clamp(0.75rem, 2vh, 0.875rem)",
            }}
          >
            {t("editor.media_load_error", { mediaType: mediaType === "audio" ? t("media.audio") : t("media.video") })}
          </p>
        )}

        {/* 현재 선택 구간 정보 */}
        {duration > 0 && (
          <div
            className="w-full bg-white/10 backdrop-blur-sm rounded-lg border border-white/20"
            style={{
              padding: `clamp(0.5rem, 1.5vh, 0.75rem)`,
            }}
          >
            <div
              className="flex flex-col sm:flex-row items-center justify-between gap-2"
              style={{
                marginBottom: `clamp(0.375rem, 1vh, 0.5rem)`,
              }}
            >
              <div
                className="text-white/70 text-center sm:text-left"
                style={{
                  fontSize: "clamp(0.75rem, 2vh, 0.875rem)",
                }}
              >
                {t("editor.selected_segment")}:{" "}
                <span className="font-semibold text-white">
                  {formatTime(startTime)}
                </span>{" "}
                ~{" "}
                <span className="font-semibold text-white">
                  {formatTime(endTime)}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className="text-white/70"
                  style={{
                    fontSize: "clamp(0.75rem, 2vh, 0.875rem)",
                  }}
                >
                  {t("editor.length")}:
                </span>
                <span
                  className="font-bold text-white"
                  style={{
                    fontSize: "clamp(0.875rem, 2.5vh, 1.125rem)",
                  }}
                >
                  {formatTime(currentSelectionDuration)}
                </span>
              </div>
            </div>

            {/* 가이드 표시 */}
            <div
              className="text-white/90"
              style={{
                fontSize: "clamp(0.625rem, 1.8vh, 0.8rem)",
              }}
            >
              <div className="flex flex-wrap items-center justify-center gap-3 text-center">
                <span>
                  ⏱️ {MIN_DURATION}~{MAX_DURATION}초
                </span>
                <span className="hidden sm:inline">
                  ✅ {t("editor.clear_sound_guide")}
                </span>
                <span className="hidden sm:inline">💡 {t("editor.drag_handle_guide")}</span>
              </div>
            </div>
          </div>
        )}

        {/* 에러 메시지 */}
        {(currentSelectionDuration < MIN_DURATION ||
          currentSelectionDuration > MAX_DURATION) &&
          duration > 0 && (
            <div
              className="w-full bg-red-500/20 backdrop-blur-sm rounded-lg border border-red-400/30"
              style={{
                padding: `clamp(0.375rem, 1vh, 0.5rem)`,
              }}
            >
              <div className="flex items-center justify-center gap-2">
                <div
                  className="rounded-full bg-red-500 flex items-center justify-center flex-shrink-0"
                  style={{
                    width: `clamp(1rem, 2.5vh, 1.5rem)`,
                    height: `clamp(1rem, 2.5vh, 1.5rem)`,
                  }}
                >
                  <svg
                    className="text-white"
                    style={{
                      width: `clamp(0.625rem, 1.5vh, 0.875rem)`,
                      height: `clamp(0.625rem, 1.5vh, 0.875rem)`,
                    }}
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
                <div className="text-center">
                  <p
                    className="text-red-300 font-medium"
                    style={{
                      fontSize: "clamp(0.75rem, 2vh, 0.875rem)",
                    }}
                  >
                    {currentSelectionDuration < MIN_DURATION
                      ? t("editor.segment_too_short", {
                          missing: (MIN_DURATION - currentSelectionDuration).toFixed(1)
                        })
                      : t("editor.segment_too_long", {
                          excess: (currentSelectionDuration - MAX_DURATION).toFixed(1)
                        })}
                  </p>
                </div>
              </div>
            </div>
          )}

        <button
          onClick={() => onComplete(startTime, endTime)}
          disabled={
            analyzing ||
            currentSelectionDuration < MIN_DURATION ||
            currentSelectionDuration > MAX_DURATION ||
            duration === 0
          }
          className="w-full rounded-lg bg-blue-500 font-bold text-white shadow-lg transition-all hover:bg-blue-600 hover:shadow-xl active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
          style={{
            padding: `clamp(0.75rem, 2vh, 1rem) clamp(1.5rem, 4vw, 2rem)`,
            fontSize: "clamp(0.875rem, 2.5vh, 1.125rem)",
            maxWidth: "min(100%, 20rem)",
          }}
        >
          {analyzing ? (
            <div className="flex items-center justify-center gap-2">
              <Loader2
                style={{
                  width: `clamp(1rem, 2.5vh, 1.25rem)`,
                  height: `clamp(1rem, 2.5vh, 1.25rem)`,
                }}
                className="animate-spin"
              />
              {t("editor.analyzing_in_progress")}
            </div>
          ) : (
            t("editor.analyze_segment")
          )}
        </button>
      </div>
    </div>
  );
};

export { MIN_DURATION, MAX_DURATION };
