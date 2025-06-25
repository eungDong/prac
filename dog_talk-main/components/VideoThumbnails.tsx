"use client";

import { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";
import Image from "next/image";

interface VideoThumbnailsProps {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  duration: number;
  startTime: number;
  endTime: number;
  framesCount?: number;
  frameHeight?: number;
}

export const VideoThumbnails = ({
  videoRef,
  duration,
  startTime,
  endTime,
  framesCount = 10,
  frameHeight = 80,
}: VideoThumbnailsProps) => {
  const [frames, setFrames] = useState<string[]>([]);

  useEffect(() => {
    if (!videoRef.current || duration === 0 || !videoRef.current.videoWidth) {
      setFrames([]);
      return;
    }

    const video = videoRef.current;
    const frameGap = duration / framesCount;
    const tempFrames: string[] = [];
    let processedFrames = 0;

    if (video.readyState < video.HAVE_METADATA) {
      video.addEventListener(
        "loadedmetadata",
        async () => {
          await captureFramesAsync();
        },
        { once: true }
      );
    } else {
      captureFramesAsync();
    }

    async function captureFramesAsync() {
      for (let i = 0; i < framesCount; i++) {
        const time = Math.min(i * frameGap, duration - 0.01);
        try {
          const frameDataUrl = await captureFrameAtTime(
            video,
            time,
            frameHeight
          );
          if (frameDataUrl) {
            tempFrames.push(frameDataUrl);
          }
        } catch (error) {
          console.error(`프레임 ${i + 1} 캡처 오류:`, error);
        }
        processedFrames++;
        if (processedFrames === framesCount) {
          setFrames([...tempFrames]);
        }
      }
    }

    async function captureFrameAtTime(
      videoElement: HTMLVideoElement,
      time: number,
      targetHeight: number
    ) {
      return new Promise<string | null>((resolve) => {
        const canvas = document.createElement("canvas");
        const aspectRatio = videoElement.videoWidth / videoElement.videoHeight;
        canvas.height = targetHeight;
        canvas.width = targetHeight * aspectRatio;

        const ctx = canvas.getContext("2d");
        if (!ctx) {
          console.error("2D 컨텍스트를 가져올 수 없습니다");
          resolve(null);
          return;
        }

        videoElement.currentTime = time;
        const onSeeked = () => {
          videoElement.removeEventListener("seeked", onSeeked);
          videoElement.removeEventListener("error", onError);
          try {
            ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
            resolve(canvas.toDataURL());
          } catch (drawError) {
            console.error("캔버스에 이미지 그리기 오류:", drawError);
            resolve(null);
          }
        };
        const onError = (e: Event) => {
          videoElement.removeEventListener("seeked", onSeeked);
          videoElement.removeEventListener("error", onError);
          console.error("비디오 시크 오류:", e);
          resolve(null);
        };

        videoElement.addEventListener("seeked", onSeeked, { once: true });
        videoElement.addEventListener("error", onError, { once: true });
      });
    }
  }, [videoRef, duration, framesCount, frameHeight]);

  if (!frames.length && duration > 0) {
    return (
      <div
        className="flex h-full items-center justify-center rounded-md bg-black/40"
        style={{ height: "clamp(3rem, 6vh, 5rem)" }}
      >
        <Loader2 className="w-6 h-6 text-white/70 animate-spin" />
      </div>
    );
  }

  if (!frames.length) return null;

  return (
    <div
      className="flex h-full justify-between gap-1 rounded-md bg-black/40 overflow-hidden"
      style={{ height: "clamp(3rem, 6vh, 5rem)" }}
    >
      {frames.map((frame, index) => (
        <div
          key={index}
          className="h-full flex-1 overflow-hidden rounded-sm"
          style={{
            opacity:
              index / framesCount >= startTime / duration &&
              index / framesCount < endTime / duration
                ? 1
                : 0.5,
          }}
        >
          <Image
            src={frame}
            alt={`프레임 ${index}`}
            className="h-full w-full object-cover"
            width={100}
            height={frameHeight}
            unoptimized
          />
        </div>
      ))}
    </div>
  );
};
