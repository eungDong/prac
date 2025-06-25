// 감정 분석 결과 타입 정의
// 사용하지 않는 인터페이스 제거
// interface EmotionAnalysisContent {
//   ansFilter: string;
//   ansDog: string;
//   additionalData?: Record<string, string | number | boolean>;
// }

// 기존 인터페이스는 주석 처리하고 새로운 인터페이스 정의
// interface EmotionAnalysisResult {
//   data: {
//     content: EmotionAnalysisContent[];
//   };
// }

// 새로운 API 응답 형식에 맞는 인터페이스
interface EmotionAnalysisResult {
  ansFilter: string;
  ansDog: string;
}

interface UploadResponse {
  success: boolean;
  response?: unknown;
  error?: string;
  details?: unknown;
  filename?: string; // 업로드한 파일명
}

export async function trimAudioFile(
  file: File,
  startTime: number,
  endTime: number
): Promise<File> {
  return new Promise((resolve, reject) => {
    const audioContext = new (window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext)();
    const reader = new FileReader();

    reader.onload = async (e) => {
      try {
        const arrayBuffer = e.target?.result as ArrayBuffer;
        const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

        // 선택된 구간의 샘플 계산
        const startSample = Math.floor(startTime * audioBuffer.sampleRate);
        const endSample = Math.floor(endTime * audioBuffer.sampleRate);
        const sampleCount = endSample - startSample;

        // 새로운 AudioBuffer 생성
        const trimmedBuffer = audioContext.createBuffer(
          audioBuffer.numberOfChannels,
          sampleCount,
          audioBuffer.sampleRate
        );

        // 선택된 구간 복사
        for (
          let channel = 0;
          channel < audioBuffer.numberOfChannels;
          channel++
        ) {
          const channelData = audioBuffer.getChannelData(channel);
          const trimmedData = trimmedBuffer.getChannelData(channel);
          for (let i = 0; i < sampleCount; i++) {
            trimmedData[i] = channelData[startSample + i];
          }
        }

        // WAV 파일로 변환
        const wavBlob = await audioBufferToWav(trimmedBuffer);
        const timestamp = generateTimestamp();
        const trimmedFile = new File(
          [wavBlob],
          `trimmed_audio_${timestamp}.wav`,
          {
            type: "audio/wav",
          }
        );

        resolve(trimmedFile);
      } catch (error) {
        reject(error);
      }
    };

    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
}

function audioBufferToWav(buffer: AudioBuffer): Promise<Blob> {
  return new Promise((resolve) => {
    // Convert to mono if needed
    const numChannels = 1; // Force mono
    const sampleRate = 16000; // Force 16kHz
    const format = 1; // PCM
    const bitDepth = 16;

    // If the buffer has multiple channels, we need to convert to mono
    let monoData;
    if (buffer.numberOfChannels > 1) {
      monoData = new Float32Array(buffer.length);
      for (let i = 0; i < buffer.length; i++) {
        let sum = 0;
        for (let channel = 0; channel < buffer.numberOfChannels; channel++) {
          sum += buffer.getChannelData(channel)[i];
        }
        monoData[i] = sum / buffer.numberOfChannels;
      }
    } else {
      monoData = buffer.getChannelData(0);
    }

    const bytesPerSample = bitDepth / 8;
    const blockAlign = numChannels * bytesPerSample;

    const wav = new ArrayBuffer(44 + buffer.length * blockAlign);
    const view = new DataView(wav);

    // WAV 헤더 작성
    writeString(view, 0, "RIFF");
    view.setUint32(4, 36 + buffer.length * blockAlign, true);
    writeString(view, 8, "WAVE");
    writeString(view, 12, "fmt ");
    view.setUint32(16, 16, true);
    view.setUint16(20, format, true);
    view.setUint16(22, numChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * blockAlign, true);
    view.setUint16(32, blockAlign, true);
    view.setUint16(34, bitDepth, true);
    writeString(view, 36, "data");
    view.setUint32(40, buffer.length * blockAlign, true);

    // 오디오 데이터 작성
    const offset = 44;
    for (let i = 0; i < buffer.length; i++) {
      const value = Math.max(-1, Math.min(1, monoData[i]));
      view.setInt16(offset + i * 2, value * 0x7fff, true);
    }

    resolve(new Blob([wav], { type: "audio/wav" }));
  });
}

function writeString(view: DataView, offset: number, string: string) {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}

// 타임스탬프 생성 함수
export function generateTimestamp(): string {
  const now = new Date();
  return `${now.getFullYear()}${(now.getMonth() + 1)
    .toString()
    .padStart(2, "0")}${now.getDate().toString().padStart(2, "0")}_${now
    .getHours()
    .toString()
    .padStart(2, "0")}${now.getMinutes().toString().padStart(2, "0")}${now
    .getSeconds()
    .toString()
    .padStart(2, "0")}`;
}

// 현재 요청 중인 파일명을 저장하는 변수
let currentRequestFilename: string = "";

// 오디오 파일을 업로드하는 함수
// file: 오디오 파일, startTime/endTime: 선택한 구간 (초 단위)
export async function uploadAudioFile(
  file: File | Blob,
  startTime?: number,
  endTime?: number
): Promise<UploadResponse> {
  let audioFile: File;

  // 오디오 구간 선택이 되어 있으면 선택한 구간만 추출
  if (
    startTime !== undefined &&
    endTime !== undefined &&
    file instanceof File
  ) {
    try {
      audioFile = await trimAudioFile(file, startTime, endTime);
    } catch (error) {
      console.error("오디오 구간 추출 중 오류:", error);
      throw error;
    }
  } else {
    // 타임스탬프 기반 파일명 생성
    const timestamp = generateTimestamp();
    const filename = `audio_${timestamp}.wav`;

    // 구간 선택이 없거나 이미 Blob인 경우 그대로 사용
    audioFile =
      file instanceof File
        ? new File([file], filename, { type: "audio/wav" })
        : new File([file], filename, { type: "audio/wav" });
  }

  // 현재 파일명 저장
  const filename = audioFile.name;
  currentRequestFilename = filename;

  // 로컬 스토리지에 현재 요청 파일명 저장 (다른 탭/창에서도 접근 가능하도록)
  localStorage.setItem("lastUploadedFilename", filename);

  const formData = new FormData();
  formData.append("bark_file", audioFile);

  try {
    const response = await fetch("/api/emotion/upload", {
      method: "POST",
      body: formData,
    });

    // 응답 상태 로깅
    console.log("업로드 API 응답 상태:", {
      status: response.status,
      statusText: response.statusText,
      headers: Object.fromEntries(response.headers.entries()),
    });

    const responseData = await response.json();

    if (!response.ok) {
      console.error("업로드 실패:", responseData);
      throw new Error(
        `Failed to upload audio file: ${JSON.stringify(
          responseData.details || responseData,
          null,
          2
        )}`
      );
    }

    return {
      ...responseData,
      filename, // 파일명 추가
    };
  } catch (error) {
    console.error("업로드 중 예외 발생:", error);
    throw error;
  }
}

export async function getEmotionResult(
  maxRetries = 10,
  retryInterval = 1000
): Promise<EmotionAnalysisResult> {
  let retryCount = 0;

  // 현재 요청 파일명 가져오기 (다른 탭/창에서도 동작하도록 localStorage 사용)
  const expectedFilename =
    currentRequestFilename ||
    localStorage.getItem("lastUploadedFilename") ||
    "";

  if (!expectedFilename) {
    console.warn("파일명이 설정되지 않았습니다. 파일명 검증을 건너뜁니다.");
  } else {
    console.log(`예상 파일명: ${expectedFilename}`);
  }

  while (retryCount < maxRetries) {
    console.log(`감정 분석 결과 요청 시도 ${retryCount + 1}/${maxRetries}`);

    try {
      // 캐시 방지를 위한 타임스탬프 추가
      const timestamp = Date.now();
      const response = await fetch(`/api/emotion/result?t=${timestamp}`);

      if (!response.ok) {
        const errorData = await response.json();
        console.error("Result failed:", errorData);
        throw new Error(
          `Failed to get emotion result: ${JSON.stringify(
            errorData.details || errorData,
            null,
            2
          )}`
        );
      }

      const responseData = await response.json();
      console.log(
        "감정 분석 결과 API 응답:",
        JSON.stringify(responseData, null, 2)
      );

      // 응답 데이터 검증 (새로운 형식에 맞게 수정)
      if (!responseData || !responseData.ansFilter || !responseData.ansDog) {
        console.log("유효하지 않은 응답 데이터:", responseData);
        throw new Error("Invalid response data");
      }

      // 파일명 검증 (fileNameOrigin이 있는 경우)
      if (expectedFilename && responseData.fileNameOrigin) {
        if (responseData.fileNameOrigin !== expectedFilename) {
          console.warn(
            `파일명 불일치: 예상=${expectedFilename}, 실제=${responseData.fileNameOrigin}`
          );

          // 파일명이 일치하지 않으면 다시 시도
          if (retryCount < maxRetries - 1) {
            await new Promise((resolve) => setTimeout(resolve, retryInterval));
            retryCount++;
            continue;
          }
        } else {
          console.log("파일명 일치 확인됨:", expectedFilename);
        }
      }

      return responseData as EmotionAnalysisResult;
    } catch (error) {
      console.error(`시도 ${retryCount + 1} 실패:`, error);

      if (retryCount >= maxRetries - 1) {
        throw error;
      }

      await new Promise((resolve) => setTimeout(resolve, retryInterval));
      retryCount++;
    }
  }

  throw new Error(`최대 재시도 횟수(${maxRetries})를 초과했습니다.`);
}
