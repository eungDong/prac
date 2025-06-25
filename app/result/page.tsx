"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, useRef, Suspense, useMemo } from "react";
import { ArrowLeft, Play, Pause } from "lucide-react";
import Image from "next/image";
import { getFile } from "@/utils/storage";
import { useTranslation } from "@/hooks/useTranslation";

// 감정 맵 상수 - 새로운 감정 이름으로 업데이트
const EMOTION_KEY_MAP = {
  dog_1: "energetic",
  dog_2: "demanding", 
  dog_3: "angry",
  dog_4: "defensive",
  dog_5: "attention",
  dog_6: "lonely",
  dog_7: "talkative",
  dog_8: "sick",
} as const;

// 감정별 음성 파일 맵핑
const EMOTION_SOUND_MAP = {
  dog_1: "energetic",
  dog_2: "demanding",
  dog_3: "angry",
  dog_4: "defensive",
  dog_5: "attention",
  dog_6: "lonely",
  dog_7: "talkative",
  dog_8: "sick",
} as const;

// 언어 코드를 폴더명으로 매핑
const LANGUAGE_FOLDER_MAP = {
  ko: "kr",
  en: "en",
} as const;

interface FileData {
  name: string;
  type: string;
  base64: string;
}

interface AnalysisResult {
  ansDog: string;
  ansFilter: string;
  startTime?: string;
  endTime?: string;
}

function ResultContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const audioRef = useRef<HTMLAudioElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [videoReady, setVideoReady] = useState(false);
  const [isAudioFile, setIsAudioFile] = useState(false);
  const { t, language } = useTranslation();

  const fileId = searchParams.get("fileId");
  const startTime = searchParams.get("start");
  const endTime = searchParams.get("end");
  const filter = searchParams.get("filter");
  const dog = searchParams.get("dog");
  const timestamp = searchParams.get("timestamp");

  const [file, setFile] = useState<File | null>(null);
  const [videoUrl, setVideoUrl] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(
    null
  );

  // 현재 표시할 감정과 필터 값 결정 (분석 결과 또는 URL 파라미터 사용)
  const currentDog = analysisResult?.ansDog || dog;
  const currentFilter = analysisResult?.ansFilter || filter;

  // 소리 파일 경로 설정 - 감정별로 15개 중 랜덤 선택 (useMemo로 한 번만 계산)
  const soundPath = useMemo(() => {
    if (!currentDog) return "";

    // dog_1 형태의 키를 감정 이름으로 변환
    const emotionKey = currentDog.startsWith("dog_")
      ? currentDog
      : `dog_${currentDog}`;
    const emotionName =
      EMOTION_SOUND_MAP[emotionKey as keyof typeof EMOTION_SOUND_MAP];

    if (!emotionName) return "";

    // 1~15 중 랜덤 번호 생성
    const randomNumber = Math.floor(Math.random() * 15) + 1;
    const paddedNumber = randomNumber.toString().padStart(2, "0");

    const soundFileName = `${emotionName}_${paddedNumber}.mp3`;
    
    // 언어에 따른 폴더 선택
    const languageFolder = LANGUAGE_FOLDER_MAP[language as keyof typeof LANGUAGE_FOLDER_MAP] || "kr";
    
    console.log(`선택된 랜덤 음성 파일: ${languageFolder}/${soundFileName}`);

    return `/sounds/${languageFolder}/${soundFileName}`;
  }, [currentDog, language]);

  useEffect(() => {
    if (!fileId) {
      router.push("/");
      return;
    }

    const getFileData = async () => {
      try {
        setLoading(true);

        // IndexedDB에서 파일 데이터 가져오기
        const fileData = (await getFile(`file_${fileId}`)) as FileData | null;

        if (fileData) {
          // Base64를 Blob으로 변환
          const response = await fetch(fileData.base64);
          const blob = await response.blob();

          // Blob을 File로 변환
          const file = new File([blob], fileData.name, { type: fileData.type });
          setFile(file);

          // 파일 유형 확인
          setIsAudioFile(fileData.type.startsWith("audio/"));

          // 비디오 URL 생성 (비디오 파일인 경우에만)
          if (!fileData.type.startsWith("audio/")) {
            const url = URL.createObjectURL(blob);
            setVideoUrl(url);
          } else {
            // 오디오 파일인 경우, videoUrl을 빈 문자열로 설정하거나 다른 처리를 할 수 있습니다.
            setVideoUrl(""); // 또는 null
          }

          // 현재 URL 파라미터로 분석 결과 설정
          setAnalysisResult({
            ansDog: dog || "",
            ansFilter: filter || "",
            startTime: startTime || "",
            endTime: endTime || "",
          });
        } else {
          console.error("파일 데이터를 찾을 수 없음: fileId=", fileId);
          alert("파일 데이터를 찾을 수 없습니다.");
          router.push("/");
        }
      } catch (error) {
        console.error("Failed to get file data:", error);
        alert("파일을 불러오는데 실패했습니다.");
        router.push("/");
      } finally {
        setLoading(false);
      }
    };

    getFileData();
  }, [fileId, router, dog, filter, startTime, endTime, timestamp]);

  // videoUrl cleanup을 위한 별도 useEffect
  useEffect(() => {
    return () => {
      if (videoUrl) {
        URL.revokeObjectURL(videoUrl);
      }
    };
  }, [videoUrl]);

  // 비디오 준비 완료 핸들러
  const handleVideoReady = () => {
    if (isAudioFile) return; // 오디오 파일이면 아무것도 안 함

    setVideoReady(true);

    // 선택한 구간으로 비디오 시간 설정
    if (videoRef.current && startTime) {
      videoRef.current.currentTime = Number(startTime);

      // 볼륨 조절 (원본 영상 소리를 작게 설정)
      videoRef.current.volume = 0.3; // 30% 볼륨으로 설정
    }
  };

  // 오디오 이벤트 핸들러
  const handleAudioPlay = () => {
    setIsPlaying(true);
  };

  const handleAudioPause = () => {
    setIsPlaying(false);
  };

  const handleAudioEnded = () => {
    setIsPlaying(false);

    // 오디오가 끝나면 비디오도 일시정지 (비디오 파일인 경우에만)
    if (!isAudioFile && videoRef.current) {
      videoRef.current.pause();
    }
  };

  const handleBack = () => {
    router.push("/");
  };

  // 동영상과 소리 동시 재생/정지 토글 함수
  const togglePlayback = () => {
    if (!audioRef.current) return;
    if (!isAudioFile && !videoRef.current) return; // 비디오 파일인데 videoRef가 없으면 리턴

    if (isPlaying) {
      // 정지
      audioRef.current.pause();
      if (!isAudioFile && videoRef.current) {
        videoRef.current.pause();
      }
    } else {
      // 재생
      if (!isAudioFile && videoRef.current) {
        // 비디오 위치를 선택한 구간으로 설정
        if (startTime) {
          videoRef.current.currentTime = Number(startTime);
        }
      }

      // 오디오와 비디오 동시 재생
      // 감정 소리 볼륨 설정 (더 크게)
      if (audioRef.current) {
        audioRef.current.volume = 0.7; // 70% 볼륨으로 설정
      }

      audioRef.current.play().catch((error) => {
        console.error("오디오 재생 실패:", error);
      });

      if (!isAudioFile && videoRef.current) {
        videoRef.current.play().catch((error) => {
          console.error("비디오 재생 실패:", error);
        });
      }

      // 비디오 재생 종료 시점 설정 (선택한 구간만 재생)
      if (!isAudioFile && endTime && startTime) {
        const duration = Number(endTime) - Number(startTime);

        // 설정한 시간 후에 비디오와 오디오 정지
        setTimeout(() => {
          if (
            !isAudioFile &&
            videoRef.current &&
            audioRef.current &&
            isPlaying
          ) {
            videoRef.current.pause();
            audioRef.current.pause();
            setIsPlaying(false);
          } else if (isAudioFile && audioRef.current && isPlaying) {
            // 오디오 파일의 경우 오디오만 정지
            audioRef.current.pause();
            setIsPlaying(false);
          }
        }, duration * 1000);
      } else if (isAudioFile && endTime && startTime) {
        // 오디오 파일 재생 종료 시점 설정
        const duration = Number(endTime) - Number(startTime);
        setTimeout(() => {
          if (audioRef.current && isPlaying) {
            audioRef.current.pause();
            setIsPlaying(false);
          }
        }, duration * 1000);
      }
    }
  };

  if (loading) {
    return (
      <main className="relative h-[100dvh] w-full overflow-hidden">
        <div
          className="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: "url('/images/background.jpg')" }}
        >
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
        </div>
        <div className="relative z-10 flex h-full items-center justify-center p-2">
          <div
            className="flex flex-col items-center rounded-lg bg-white/10 backdrop-blur-sm"
            style={{
              gap: "clamp(1rem, 3vh + 1vw, 2rem)",
              padding: "clamp(1rem, 3vh + 2vw, 2rem)",
            }}
          >
            <Image
              src="/images/loading.webp"
              alt="로딩 중"
              width={160}
              height={160}
              style={{
                width: "clamp(4rem, 8vw + 6vh, 10rem)",
                height: "clamp(4rem, 8vw + 6vh, 10rem)",
              }}
              priority
            />
            <div
              className="flex flex-col items-center text-center"
              style={{
                gap: "clamp(0.25rem, 0.5vh + 0.2vw, 0.5rem)",
              }}
            >
              <h2
                className="font-semibold text-white leading-tight"
                style={{
                  fontSize: "clamp(1rem, 1vw + 2.5vh, 1.5rem)",
                }}
              >
                분석 결과 로딩 중
              </h2>
              <p
                className="text-white/70 leading-tight"
                style={{
                  fontSize: "clamp(0.75rem, 0.5vw + 1.5vh, 1rem)",
                }}
              >
                잠시만 기다려주세요...
              </p>
            </div>
          </div>
        </div>
      </main>
    );
  }

  if (!file) {
    return null;
  }

  return (
    <main className="relative h-[100dvh] w-full overflow-hidden">
      {/* 배경 */}
      <div
        className="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: "url('/images/background.jpg')" }}
      >
        <div className="absolute inset-0 bg-black/50" />
      </div>

      {/* 결과 컨테이너 */}
      <div className="relative z-10 flex h-full items-center justify-center p-2 pt-16 sm:pt-20">
        <div className="w-full max-w-4xl h-full flex items-center justify-center">
          {currentFilter === "noise" ? (
            <div
              className="overflow-hidden bg-white/10 backdrop-blur-sm w-full max-w-2xl"
              style={{
                borderRadius: "clamp(0.75rem, 1.5vh + 0.5vw, 1.5rem)",
              }}
            >
              <div
                style={{
                  padding: "clamp(1rem, 3vh + 2vw, 2rem)",
                }}
              >
                <div className="flex flex-col items-center text-center">
                  <div
                    className="rounded-full bg-red-500/20 flex items-center justify-center"
                    style={{
                      padding: "clamp(0.75rem, 1.5vh + 0.5vw, 1rem)",
                      marginBottom: "clamp(1rem, 2vh + 1vw, 1.5rem)",
                    }}
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="text-red-500"
                      style={{
                        width: "clamp(1.5rem, 3vw + 2vh, 2rem)",
                        height: "clamp(1.5rem, 3vw + 2vh, 2rem)",
                      }}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                      />
                    </svg>
                  </div>
                  <h1
                    className="font-bold text-white leading-tight"
                    style={{
                      fontSize: "clamp(1.25rem, 1.5vw + 3vh, 2rem)",
                      marginBottom: "clamp(0.5rem, 1vh + 0.3vw, 0.75rem)",
                    }}
                  >
                    {t("result.noise_detected_title")}
                  </h1>
                  <p
                    className="text-white/70 leading-tight"
                    style={{
                      fontSize: "clamp(0.875rem, 1vw + 1.8vh, 1.25rem)",
                      marginBottom: "clamp(1rem, 2vh + 1vw, 1.5rem)",
                    }}
                  >
                    {t("result.noise_detected_message")}
                  </p>
                  <button
                    onClick={handleBack}
                    className="flex items-center bg-white/10 text-white hover:bg-white/20 transition-all duration-200"
                    style={{
                      gap: "clamp(0.25rem, 0.5vh + 0.2vw, 0.5rem)",
                      borderRadius: "clamp(0.5rem, 1vh + 0.3vw, 0.75rem)",
                      padding: "clamp(0.75rem, 2vh + 0.5vw, 1rem)",
                      fontSize: "clamp(0.875rem, 0.8vw + 1.5vh, 1rem)",
                    }}
                  >
                    <ArrowLeft
                      style={{
                        width: "clamp(1rem, 2vw + 1vh, 1.25rem)",
                        height: "clamp(1rem, 2vw + 1vh, 1.25rem)",
                      }}
                    />
                    <span className="font-medium">{t("result.back_to_home")}</span>
                  </button>
                </div>
              </div>
            </div>
          ) : currentDog ? (
            <div
              className="bg-white/10 backdrop-blur-sm w-full max-w-2xl flex flex-col"
              style={{
                borderRadius: "clamp(0.75rem, 1.5vh + 0.5vw, 1.5rem)",
              }}
            >
              <div
                className="flex flex-col justify-center"
                style={{
                  padding: "clamp(0.5rem, 2vh + 1vw, 2rem)",
                }}
              >
                <div className="flex flex-col items-center text-center">
                  <h1
                    className="font-bold text-white leading-tight flex-shrink-0"
                    style={{
                      fontSize: "clamp(1rem, 1vw + 3.5vh, 2rem)",
                      marginBottom: "clamp(0.5rem, 1.5vh + 0.5vw, 1.5rem)",
                    }}
                  >
                    {t("result.analysis_complete")}
                  </h1>
                  <div
                    className="flex-shrink-0"
                    style={{
                      marginBottom: "clamp(0.5rem, 1.5vh + 0.5vw, 2rem)",
                    }}
                  >
                    <div
                      className="bg-white/5"
                      style={{
                        borderRadius: "clamp(0.5rem, 1vh + 0.3vw, 0.75rem)",
                        padding: "clamp(0.5rem, 1vh + 0.5vw, 1rem)",
                      }}
                    >
                      <p
                        className="font-medium text-white/80 leading-tight"
                        style={{
                          fontSize: "clamp(0.75rem, 0.8vw + 2vh, 1.125rem)",
                          marginBottom: "clamp(0.25rem, 0.5vh + 0.2vw, 0.5rem)",
                        }}
                      >
                        {t("result.dog_emotion")}
                      </p>
                      <p
                        className="font-bold text-white leading-tight"
                        style={{
                          fontSize: "clamp(0.875rem, 1vw + 2.8vh, 1.5rem)",
                        }}
                      >
                        {currentDog && EMOTION_KEY_MAP[currentDog as keyof typeof EMOTION_KEY_MAP] 
                          ? t(`emotions.${EMOTION_KEY_MAP[currentDog as keyof typeof EMOTION_KEY_MAP]}`) 
                          : t("result.unknown_emotion")}
                      </p>
                    </div>
                  </div>

                  {/* 비디오/오디오 플레이어 */}
                  <div className="w-full min-h-0 flex flex-col">
                    {!isAudioFile && videoUrl && (
                      <div
                        className="overflow-hidden bg-black/20 min-h-0 flex items-center justify-center"
                        style={{
                          borderRadius: "clamp(0.5rem, 1vh + 0.3vw, 0.75rem)",
                          marginBottom: "clamp(0.5rem, 1vh + 0.3vw, 1rem)",
                        }}
                      >
                        <video
                          ref={videoRef}
                          src={videoUrl}
                          className="w-full h-auto object-contain"
                          onLoadedData={handleVideoReady}
                          playsInline
                          style={{
                            maxHeight: "clamp(6rem, 20vh, 20rem)",
                          }}
                        />
                      </div>
                    )}

                    {/* 오디오 요소 */}
                    <audio
                      ref={audioRef}
                      src={soundPath}
                      onPlay={handleAudioPlay}
                      onPause={handleAudioPause}
                      onEnded={handleAudioEnded}
                      preload="auto"
                      className="hidden"
                    />

                    {/* 재생 버튼 */}
                    <button
                      onClick={togglePlayback}
                      disabled={!isAudioFile && !videoReady}
                      className="flex-shrink-0 flex w-full items-center justify-center bg-white/10 text-white hover:bg-white/20 disabled:opacity-50 transition-all duration-200"
                      style={{
                        gap: "clamp(0.25rem, 0.5vh + 0.2vw, 0.5rem)",
                        borderRadius: "clamp(0.5rem, 1vh + 0.3vw, 0.75rem)",
                        padding: "clamp(0.5rem, 2.5vh + 0.3vw, 1rem)",
                        fontSize: "clamp(0.75rem, 0.5vw + 2vh, 1rem)",
                        marginBottom: "clamp(0.25rem, 0.8vh + 0.2vw, 0.75rem)",
                      }}
                    >
                      {isPlaying ? (
                        <>
                          <Pause
                            style={{
                              width: "clamp(0.875rem, 1.5vw + 1.5vh, 1.25rem)",
                              height: "clamp(0.875rem, 1.5vw + 1.5vh, 1.25rem)",
                            }}
                          />
                          <span className="font-medium">{t("result.pause")}</span>
                        </>
                      ) : (
                        <>
                          <Play
                            style={{
                              width: "clamp(0.875rem, 1.5vw + 1.5vh, 1.25rem)",
                              height: "clamp(0.875rem, 1.5vw + 1.5vh, 1.25rem)",
                            }}
                          />
                          <span className="font-medium">
                            {isAudioFile
                              ? t("result.play_voice")
                              : t("result.play_with_dog_voice")}
                          </span>
                        </>
                      )}
                    </button>

                    {/* 홈으로 이동 버튼 */}
                    <button
                      onClick={handleBack}
                      className="flex-shrink-0 flex w-full items-center justify-center border border-white/10 bg-transparent text-white hover:bg-white/5 transition-all duration-200"
                      style={{
                        gap: "clamp(0.25rem, 0.5vh + 0.2vw, 0.5rem)",
                        borderRadius: "clamp(0.5rem, 1vh + 0.3vw, 0.75rem)",
                        padding: "clamp(0.5rem, 2.5vh + 0.3vw, 1rem)",
                        fontSize: "clamp(0.75rem, 0.5vw + 2vh, 1rem)",
                      }}
                    >
                      <ArrowLeft
                        style={{
                          width: "clamp(0.875rem, 1.5vw + 1.5vh, 1.25rem)",
                          height: "clamp(0.875rem, 1.5vw + 1.5vh, 1.25rem)",
                        }}
                      />
                      <span className="font-medium">
                        {t("result.analyze_another")}
                      </span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div
              className="overflow-hidden bg-white/10 backdrop-blur-sm w-full max-w-2xl"
              style={{
                borderRadius: "clamp(0.75rem, 1.5vh + 0.5vw, 1.5rem)",
              }}
            >
              <div
                style={{
                  padding: "clamp(1rem, 3vh + 2vw, 2rem)",
                }}
              >
                <div className="flex flex-col items-center text-center">
                  <div
                    className="rounded-full bg-yellow-500/20 flex items-center justify-center"
                    style={{
                      padding: "clamp(0.75rem, 1.5vh + 0.5vw, 1rem)",
                      marginBottom: "clamp(1rem, 2vh + 1vw, 1.5rem)",
                    }}
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="text-yellow-500"
                      style={{
                        width: "clamp(1.5rem, 3vw + 2vh, 2rem)",
                        height: "clamp(1.5rem, 3vw + 2vh, 2rem)",
                      }}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                      />
                    </svg>
                  </div>
                  <h1
                    className="font-bold text-white leading-tight"
                    style={{
                      fontSize: "clamp(1.25rem, 1.5vw + 3vh, 2rem)",
                      marginBottom: "clamp(0.5rem, 1vh + 0.3vw, 0.75rem)",
                    }}
                  >
                    {t("result.analysis_failed")}
                  </h1>
                  <p
                    className="text-white/70 leading-tight"
                    style={{
                      fontSize: "clamp(0.875rem, 1vw + 1.8vh, 1.25rem)",
                      marginBottom: "clamp(1rem, 2vh + 1vw, 1.5rem)",
                    }}
                  >
                    {t("result.cannot_analyze")}
                  </p>
                  <button
                    onClick={handleBack}
                    className="flex items-center bg-white/10 text-white hover:bg-white/20 transition-all duration-200"
                    style={{
                      gap: "clamp(0.25rem, 0.5vh + 0.2vw, 0.5rem)",
                      borderRadius: "clamp(0.5rem, 1vh + 0.3vw, 0.75rem)",
                      padding: "clamp(0.75rem, 2vh + 0.5vw, 1rem)",
                      fontSize: "clamp(0.875rem, 0.8vw + 1.5vh, 1rem)",
                    }}
                  >
                    <ArrowLeft
                      style={{
                        width: "clamp(1rem, 2vw + 1vh, 1.25rem)",
                        height: "clamp(1rem, 2vw + 1vh, 1.25rem)",
                      }}
                    />
                    <span>{t("result.try_again")}</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

export default function ResultPage() {
  return (
    <Suspense
      fallback={
        <main className="relative h-[100dvh] w-full overflow-hidden">
          <div
            className="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat"
            style={{ backgroundImage: "url('/images/background.jpg')" }}
          >
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
          </div>
          <div className="relative z-10 flex h-full items-center justify-center p-2">
            <div
              className="flex flex-col items-center rounded-lg bg-white/10 backdrop-blur-sm"
              style={{
                gap: "clamp(1rem, 3vh + 1vw, 2rem)",
                padding: "clamp(1rem, 3vh + 2vw, 2rem)",
              }}
            >
              <Image
                src="/images/loading.webp"
                alt="Loading"
                width={160}
                height={160}
                style={{
                  width: "clamp(4rem, 8vw + 6vh, 10rem)",
                  height: "clamp(4rem, 8vw + 6vh, 10rem)",
                }}
                priority
              />
              <div
                className="flex flex-col items-center text-center"
                style={{
                  gap: "clamp(0.25rem, 0.5vh + 0.2vw, 0.5rem)",
                }}
              >
                <h2
                  className="font-semibold text-white leading-tight"
                  style={{
                    fontSize: "clamp(1rem, 1vw + 2.5vh, 1.5rem)",
                  }}
                >
                  Initializing
                </h2>
                <p
                  className="text-white/70 leading-tight"
                  style={{
                    fontSize: "clamp(0.75rem, 0.5vw + 1.5vh, 1rem)",
                  }}
                >
                  Please wait...
                </p>
              </div>
            </div>
          </div>
        </main>
      }
    >
      <ResultContent />
    </Suspense>
  );
}
