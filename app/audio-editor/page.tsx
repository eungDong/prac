"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { AudioEditor } from "@/components/AudioEditor";
import { useEffect, useState, Suspense } from "react";
import { uploadAudioFile, getEmotionResult } from "@/utils/audio";
import { Loader2 } from "lucide-react";
import { getFile, saveSetting, saveSettingSync } from "@/utils/storage";
import { extractAudioFromVideo } from "@/utils/audio-extractor";
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

function AudioEditorContent({ fileId }: { fileId: string | null }) {
  const router = useRouter();
  const { t } = useTranslation();
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);

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

      await saveSetting("selectedStartTime", startTime.toString());
      await saveSetting("selectedEndTime", endTime.toString());
      saveSettingSync("selectedStartTime", startTime.toString());
      saveSettingSync("selectedEndTime", endTime.toString());

      console.log("오디오 자르기 시작 (audio-editor):", {
        startTime,
        endTime,
        fileName: file.name,
        fileType: file.type,
        fileSize: file.size,
      });

      const audioBlob = await extractAudioFromVideo(file, startTime, endTime);

      const timestamp = new Date()
        .toISOString()
        .replace(/[-:.]/g, "")
        .replace("T", "_")
        .substring(0, 15);
      const audioFilename = `audio_segment_${timestamp}.wav`;

      console.log("오디오 자르기 완료 (audio-editor):", {
        size: audioBlob.size,
        type: audioBlob.type,
        name: audioFilename,
      });

      console.log("오디오 업로드 시작 (audio-editor)...");
      const uploadResponse = await uploadAudioFile(audioBlob);

      if (!uploadResponse.success) {
        console.error("업로드 실패:", uploadResponse);
        throw new Error(
          uploadResponse.error ||
            t("editor.upload_no_success")
        );
      }

      console.log("분석 결과 대기 중 (audio-editor)...");

      try {
        console.log("감정 분석 요청 시작 (audio-editor)");
        const result = await getEmotionResult(30, 1000);

        console.log(
          "감정 분석 완료 (audio-editor, 최신 데이터만):",
          JSON.stringify(result, null, 2)
        );

        if (result) {
          console.log("사용할 감정 분석 결과 (audio-editor):", result);
          const ansFilter = result.ansFilter || "";
          const ansDog = result.ansDog || "";

          router.push(
            `/result?fileId=${fileId}&start=${startTime}&end=${endTime}&filter=${ansFilter}&dog=${ansDog}&audioFilename=${audioFilename}`
          );
        } else {
          throw new Error("Invalid analysis result (audio-editor)");
        }
      } catch (error) {
        console.error("감정 분석 요청 오류 (audio-editor):", error);
        alert(t("editor.emotion_analysis_error"));
        setAnalyzing(false);
      }
    } catch (error) {
      console.error("오디오 자르기 또는 처리 중 오류 (audio-editor):", error);
      alert(t("editor.audio_extraction_error"));
      setAnalyzing(false);
    }
  };

  if (!file) {
    return null;
  }

  return (
    <EditorLayout
      title={t("editor.audio_title")}
      loading={loading}
      analyzing={analyzing}
      onBack={handleBack}
    >
      <AudioEditor
        file={file}
        onComplete={handleComplete}
        analyzing={analyzing}
      />
    </EditorLayout>
  );
}

export default function AudioEditorPage() {
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
                    width: "clamp(2rem, 4vw + 2vh, 3rem)",
                    height: "clamp(2rem, 4vw + 2vh, 3rem)",
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
                    fontSize: "clamp(1rem, 2vw + 1vh, 1.5rem)",
                  }}
                >
                  Initializing
                </h2>
                <p
                  className="text-white/70"
                  style={{
                    fontSize: "clamp(0.75rem, 1.5vw + 0.5vh, 1rem)",
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
        {(fileId) => <AudioEditorContent key={fileId} fileId={fileId} />}
      </SearchParamsWrapper>
    </Suspense>
  );
}
