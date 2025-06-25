"use client";

import { useState, useRef, useEffect } from "react";
import {
  Play,
  Pause,
  RotateCcw,
  Check,
  X,
  Info,
  Download,
  Loader2,
} from "lucide-react";
import { validateWavFile } from "@/utils/audio-validator";

interface AudioPreviewProps {
  audioBlob: Blob;
  onConfirm: () => void;
  onCancel: () => void;
  filename?: string;
  isAnalyzing?: boolean;
}

export function AudioPreview({
  audioBlob,
  onConfirm,
  onCancel,
  filename = "audio.wav",
  isAnalyzing = false,
}: AudioPreviewProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [audioInfo, setAudioInfo] = useState<{
    sampleRate?: number;
    channels?: number;
    bitsPerSample?: number;
    duration?: number;
    isValid: boolean;
  } | null>(null);
  const [showInfo, setShowInfo] = useState(false);
  const [loading, setLoading] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    // Blob에서 URL 생성
    const url = URL.createObjectURL(audioBlob);
    setAudioUrl(url);

    // WAV 파일 정보 가져오기
    const getAudioInfo = async () => {
      try {
        const info = await validateWavFile(audioBlob);
        setAudioInfo(info);
      } catch (error) {
        console.error("오디오 정보 가져오기 실패:", error);
        setAudioInfo({ isValid: false }); // 정보 가져오기 실패 시 유효하지 않음으로 처리
      }
    };

    getAudioInfo();

    // 컴포넌트 언마운트 시 URL 해제
    return () => {
      if (url) URL.revokeObjectURL(url);
    };
  }, [audioBlob]);

  // isAnalyzing prop이 변경될 때 loading 상태 업데이트
  useEffect(() => {
    setLoading(isAnalyzing);
  }, [isAnalyzing]);

  const handlePlayPause = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current
          .play()
          .catch((err) => console.error("Audio play error:", err));
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleReplay = () => {
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current
        .play()
        .catch((err) => console.error("Audio replay error:", err));
      setIsPlaying(true);
    }
  };

  const handleAudioEnded = () => {
    setIsPlaying(false);
    if (audioRef.current) {
      audioRef.current.currentTime = 0; // 끝나면 처음으로 되돌림 (선택사항)
    }
  };

  const toggleInfo = () => {
    setShowInfo(!showInfo);
  };

  const handleDownload = () => {
    if (audioUrl) {
      // 다운로드 링크 생성
      const downloadLink = document.createElement("a");
      downloadLink.href = audioUrl;
      downloadLink.download = filename;
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);
    }
  };

  const handleConfirm = () => {
    // setLoading(true); // 부모 컴포넌트에서 isAnalyzing으로 제어하므로 중복 호출 방지
    onConfirm();
  };

  const formatDuration = (seconds?: number) => {
    if (
      seconds === undefined ||
      seconds === null ||
      isNaN(seconds) ||
      seconds < 0
    )
      return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  // 로딩 오버레이 컴포넌트
  const LoadingOverlay = () => (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-white p-6 sm:p-8 rounded-lg shadow-xl flex flex-col items-center max-w-sm w-full">
        <Loader2 className="h-10 w-10 sm:h-12 sm:w-12 animate-spin text-blue-500 mb-4" />
        <h3 className="text-lg sm:text-xl font-semibold mb-2 text-gray-800">
          분석 진행 중
        </h3>
        <p className="text-sm text-gray-600 text-center mb-4">
          오디오 파일을 분석하고 있습니다. 잠시만 기다려주세요.
        </p>
        <div className="w-full bg-gray-200 rounded-full h-1.5 sm:h-2 mb-4">
          <div className="bg-blue-500 h-full rounded-full animate-pulse w-3/4"></div>{" "}
          {/* 진행률 표시 향상 */}
        </div>
        <p className="text-xs sm:text-sm text-gray-500">
          분석 시간은 파일 크기에 따라 달라질 수 있습니다.
        </p>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col items-center p-4 sm:p-6 bg-white rounded-lg shadow-md w-full">
      {loading && <LoadingOverlay />}

      <h3 className="text-lg sm:text-xl font-semibold mb-2 sm:mb-4 text-gray-800">
        추출된 오디오 확인
      </h3>
      <p className="text-sm text-gray-600 mb-4 sm:mb-6 text-center">
        추출된 오디오를 확인하고 분석을 진행해주세요.
      </p>

      {audioUrl && (
        <audio
          ref={audioRef}
          src={audioUrl}
          onEnded={handleAudioEnded}
          onPlay={() => setIsPlaying(true)} // play 이벤트에서도 상태 업데이트
          onPause={() => setIsPlaying(false)} // pause 이벤트에서도 상태 업데이트
          className="hidden"
          preload="auto"
        />
      )}

      <div className="flex items-center gap-2 sm:gap-3 md:gap-4 mb-4 sm:mb-6">
        <button
          onClick={handlePlayPause}
          className="p-2.5 sm:p-3 bg-blue-500 text-white rounded-full hover:bg-blue-600 transition-colors disabled:bg-blue-300"
          aria-label={isPlaying ? "일시정지" : "재생"}
          disabled={loading || !audioUrl} // audioUrl 없을 때도 비활성화
        >
          {isPlaying ? (
            <Pause size={20} className="sm:w-5 sm:h-5" />
          ) : (
            <Play size={20} className="sm:w-5 sm:h-5" />
          )}
        </button>

        <button
          onClick={handleReplay}
          className="p-2.5 sm:p-3 bg-gray-200 text-gray-700 rounded-full hover:bg-gray-300 transition-colors disabled:bg-gray-300/70"
          aria-label="다시 듣기"
          disabled={loading || !audioUrl}
        >
          <RotateCcw size={20} className="sm:w-5 sm:h-5" />
        </button>

        <button
          onClick={toggleInfo}
          className="p-2.5 sm:p-3 bg-gray-200 text-gray-700 rounded-full hover:bg-gray-300 transition-colors disabled:bg-gray-300/70"
          aria-label="오디오 정보"
          disabled={loading || !audioInfo} // audioInfo 없을 때도 비활성화
        >
          <Info size={20} className="sm:w-5 sm:h-5" />
        </button>

        <button
          onClick={handleDownload}
          className="p-2.5 sm:p-3 bg-gray-200 text-gray-700 rounded-full hover:bg-gray-300 transition-colors disabled:bg-gray-300/70"
          aria-label="다운로드"
          disabled={loading || !audioUrl}
        >
          <Download size={20} className="sm:w-5 sm:h-5" />
        </button>
      </div>

      {showInfo && audioInfo && (
        <div className="w-full p-3 sm:p-4 bg-gray-100 rounded-md mb-3 sm:mb-4 text-xs sm:text-sm text-gray-700">
          <h4 className="font-semibold mb-1.5 sm:mb-2 text-sm sm:text-base">
            오디오 정보
          </h4>
          <ul className="space-y-1">
            <li>
              <span className="font-medium">파일명:</span> {filename}
            </li>
            <li>
              <span className="font-medium">포맷:</span> WAV{" "}
              {audioInfo.isValid ? (
                <span className="text-green-600">(유효함)</span>
              ) : (
                <span className="text-red-600">
                  (오류 또는 지원되지 않는 형식)
                </span>
              )}
            </li>
            <li>
              <span className="font-medium">샘플 레이트:</span>{" "}
              {audioInfo.sampleRate ? `${audioInfo.sampleRate} Hz` : "-"}
            </li>
            <li>
              <span className="font-medium">채널:</span>{" "}
              {audioInfo.channels
                ? audioInfo.channels === 1
                  ? "모노 (1)"
                  : audioInfo.channels === 2
                  ? "스테레오 (2)"
                  : `${audioInfo.channels} 채널`
                : "-"}
            </li>
            <li>
              <span className="font-medium">비트 깊이:</span>{" "}
              {audioInfo.bitsPerSample ? `${audioInfo.bitsPerSample} bit` : "-"}
            </li>
            <li>
              <span className="font-medium">재생 시간:</span>{" "}
              {formatDuration(audioInfo.duration)}
            </li>
            <li>
              <span className="font-medium">파일 크기:</span>{" "}
              {(audioBlob.size / 1024).toFixed(2)} KB
            </li>
          </ul>
        </div>
      )}

      <div className="flex gap-2 sm:gap-3 md:gap-4 w-full mt-auto pt-2">
        <button
          onClick={onCancel}
          className="flex-1 py-2 px-3 sm:px-4 border border-gray-300 rounded-md hover:bg-gray-100 transition-colors flex items-center justify-center gap-1.5 sm:gap-2 text-sm sm:text-base disabled:opacity-60"
          aria-label="취소"
          disabled={loading}
        >
          <X size={16} className="sm:w-4 sm:h-4" />
          <span>취소</span>
        </button>

        <button
          onClick={handleConfirm}
          className="flex-1 py-2 px-3 sm:px-4 bg-green-500 text-white rounded-md hover:bg-green-600 transition-colors flex items-center justify-center gap-1.5 sm:gap-2 text-sm sm:text-base disabled:bg-green-300 disabled:cursor-not-allowed"
          aria-label="분석 진행"
          disabled={loading || !audioInfo?.isValid} // 유효하지 않은 오디오면 분석 진행 불가
        >
          {loading ? (
            <>
              <Loader2 size={16} className="animate-spin sm:w-4 sm:h-4" />
              <span>분석 중...</span>
            </>
          ) : (
            <>
              <Check size={16} className="sm:w-4 sm:h-4" />
              <span>분석 진행</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
