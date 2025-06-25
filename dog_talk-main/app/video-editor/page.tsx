"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { VideoEditor } from "@/components/VideoEditor";
import { useEffect, useState, Suspense } from "react";
import { uploadAudioFile, getEmotionResult } from "@/utils/audio";
import { Loader2 } from "lucide-react";
import { extractAudioFromVideo } from "@/utils/audio-extractor";
import { getFile, saveSetting, saveSettingSync } from "@/utils/storage";
import { EditorLayout } from "@/components/EditorLayout";
import { useTranslation } from "@/hooks/useTranslation";

// SearchParams를 가져오는 컴포넌트
function SearchParamsWrapper({
  children,
}: {
  children: (fileId: string | null) => React.ReactNode;
}) {
  const searchParams = useSearchParams();
  const fileId = searchParams.get("fileId");
  return <>{children(fileId)}</>;
}

function VideoEditorContent({ fileId }: { fileId: string | null }) {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const { t } = useTranslation();

  useEffect(() => {
    if (!fileId) {
      router.push("/");
      return;
    }

    const getFileData = async () => {
      try {
        const fileData = await getFile(`file_${fileId}`);
        if (!fileData) {
          alert(t("editor.file_not_found"));
          router.push("/");
          return;
        }

        const base64Data = fileData.base64.split(",")[1];
        const binaryString = atob(base64Data);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        const blob = new Blob([bytes], { type: fileData.type });
        const newFile = new File([blob], fileData.name, {
          type: fileData.type,
        });

        setFile(newFile);
        setLoading(false);
      } catch (error) {
        console.error("파일 데이터 가져오기 오류:", error);
        alert(t("editor.file_data_error"));
        router.push("/");
      }
    };

    getFileData();
  }, [fileId, router]);

  const handleBack = () => {
    router.push("/");
  };

  const handleComplete = async (startTime: number, endTime: number) => {
    if (!file) return;

    try {
      setAnalyzing(true);

      // 선택한 시간 정보를 저장
      await saveSetting("selectedStartTime", startTime.toString());
      await saveSetting("selectedEndTime", endTime.toString());

      // 동기적으로도 저장 (폴백)
      saveSettingSync("selectedStartTime", startTime.toString());
      saveSettingSync("selectedEndTime", endTime.toString());

      // 선택한 구간의 오디오 추출
      console.log("오디오 추출 시작:", {
        startTime,
        endTime,
        fileName: file.name,
        fileType: file.type,
        fileSize: file.size,
      });

      // Web Audio API를 사용하여 오디오 추출
      const audioFile = await extractAudioFromVideo(file, startTime, endTime);

      // 타임스탬프 기반 파일명 생성
      const timestamp = new Date()
        .toISOString()
        .replace(/[-:.]/g, "")
        .replace("T", "_")
        .substring(0, 15);
      const audioFilename = `audio_${timestamp}.wav`;

      console.log("오디오 추출 완료:", {
        size: audioFile.size,
        type: audioFile.type,
        name: audioFilename,
      });

      // API에 업로드
      console.log("오디오 업로드 시작...");
      const uploadResponse = await uploadAudioFile(audioFile);

      // 업로드 성공 여부 확인
      if (!uploadResponse.success) {
        throw new Error(t("editor.upload_no_success"));
      }

      // 결과 요청 (최대 30초, 1초 간격으로 재시도)
      console.log("분석 결과 대기 중...");

      try {
        console.log("감정 분석 요청 시작");
        // 감정 분석 결과 요청 (최대 30회, 1초 간격으로 재시도)
        const result = await getEmotionResult(30, 1000);

        console.log(
          "감정 분석 완료 (최신 데이터만):",
          JSON.stringify(result, null, 2)
        );
        // 결과 처리
        if (result) {
          console.log("사용할 감정 분석 결과:", result);
          const ansFilter = result.ansFilter || "";
          const ansDog = result.ansDog || "";

          // 결과 페이지로 이동
          router.push(
            `/result?fileId=${fileId}&start=${startTime}&end=${endTime}&filter=${ansFilter}&dog=${ansDog}`
          );
        } else {
          throw new Error("Invalid analysis result");
        }
      } catch (error) {
        console.error("감정 분석 요청 오류:", error);
        alert(t("editor.emotion_analysis_error"));
        setAnalyzing(false);
      }
    } catch (error) {
      console.error("오디오 추출 오류:", error);
      alert(t("editor.audio_extraction_error"));
      setAnalyzing(false);
    }
  };

  if (!file) {
    return null;
  }

  return (
    <EditorLayout
      title={t("editor.video_title")}
      loading={loading}
      analyzing={analyzing}
      onBack={handleBack}
    >
      <VideoEditor
        file={file}
        onBack={handleBack}
        onComplete={handleComplete}
        analyzing={analyzing}
      />
    </EditorLayout>
  );
}

export default function VideoEditorPage() {
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
          <div className="relative z-10 flex h-full items-center justify-center p-4">
            <div className="flex flex-col items-center gap-4 rounded-lg bg-white/10 p-6 backdrop-blur-sm sm:gap-6">
              <div className="relative">
                <div
                  className="rounded-full border-4 border-white/20"
                  style={{
                    width: "clamp(1.5rem, 3vw + 2vh, 2.5rem)",
                    height: "clamp(1.5rem, 3vw + 2vh, 2.5rem)",
                  }}
                >
                  <Loader2 className="h-full w-full animate-spin text-white" />
                </div>
                <div className="absolute -inset-2 animate-pulse rounded-full border border-white/20" />
              </div>
              <div className="flex flex-col items-center gap-1 text-center sm:gap-2">
                <h2
                  className="font-semibold text-white"
                  style={{
                    fontSize: "clamp(0.875rem, 1.5vw + 1vh, 1.25rem)",
                  }}
                >
                  Initializing
                </h2>
                <p
                  className="text-white/70"
                  style={{
                    fontSize: "clamp(0.75rem, 1.2vw + 0.5vh, 1rem)",
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
      <SearchParamsWrapper>
        {(fileId) => <VideoEditorContent key={fileId} fileId={fileId} />}
      </SearchParamsWrapper>
    </Suspense>
  );
}
