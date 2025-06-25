/**
 * Web Audio API를 사용하여 비디오 파일에서 오디오를 추출하는 유틸리티
 */

interface WebkitWindow extends Window {
  webkitAudioContext: typeof AudioContext;
}

/**
 * 비디오 파일에서 오디오를 추출하여 WAV 형식으로 반환합니다.
 * @param file 비디오 파일
 * @param startTime 시작 시간(초)
 * @param endTime 종료 시간(초)
 * @returns WAV 형식의 오디오 Blob
 */
export async function extractAudioFromVideo(
  file: File,
  startTime: number,
  endTime: number
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    // 파일 정보 로깅
    console.log("오디오 추출 시작:", {
      fileName: file.name,
      fileType: file.type,
      fileSize: file.size,
      startTime,
      endTime,
    });

    // 파일을 ArrayBuffer로 읽기
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const arrayBuffer = event.target?.result as ArrayBuffer;

        // AudioContext 생성
        const audioContext = new (window.AudioContext ||
          (window as unknown as WebkitWindow).webkitAudioContext)();

        // 오디오 디코딩
        console.log("오디오 디코딩 시작...");
        const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
        console.log("오디오 디코딩 완료:", {
          duration: audioBuffer.duration,
          sampleRate: audioBuffer.sampleRate,
          numberOfChannels: audioBuffer.numberOfChannels,
        });

        // 선택한 구간 계산
        const startSample = Math.floor(startTime * audioBuffer.sampleRate);
        const endSample = Math.floor(endTime * audioBuffer.sampleRate);
        const sampleCount = endSample - startSample;

        // 새 오디오 버퍼 생성
        const newAudioBuffer = audioContext.createBuffer(
          audioBuffer.numberOfChannels,
          sampleCount,
          audioBuffer.sampleRate
        );

        // 선택한 구간 복사
        for (
          let channel = 0;
          channel < audioBuffer.numberOfChannels;
          channel++
        ) {
          const channelData = audioBuffer.getChannelData(channel);
          const newChannelData = newAudioBuffer.getChannelData(channel);

          for (let i = 0; i < sampleCount; i++) {
            newChannelData[i] = channelData[startSample + i];
          }
        }

        // WAV 파일로 변환
        console.log("WAV 파일 생성 중...");
        const wavBlob = await audioBufferToWav(newAudioBuffer);
        console.log("WAV 파일 생성 완료:", {
          size: wavBlob.size,
          type: wavBlob.type,
        });

        resolve(wavBlob);
      } catch (error) {
        console.error("오디오 추출 오류:", error);
        reject(error);
      }
    };

    reader.onerror = (error) => {
      console.error("파일 읽기 오류:", error);
      reject(error);
    };

    reader.readAsArrayBuffer(file);
  });
}

/**
 * AudioBuffer를 WAV 형식의 Blob으로 변환합니다.
 * @param buffer AudioBuffer
 * @returns WAV 형식의 Blob
 */
function audioBufferToWav(buffer: AudioBuffer): Promise<Blob> {
  return new Promise((resolve) => {
    // WAV 파일 포맷 설정
    const numChannels = buffer.numberOfChannels;
    const sampleRate = buffer.sampleRate;
    const format = 1; // PCM
    const bitDepth = 16;
    const bytesPerSample = bitDepth / 8;
    const blockAlign = numChannels * bytesPerSample;

    // 오디오 데이터 준비
    let audioData: Float32Array;
    if (numChannels === 2) {
      // 스테레오 채널 처리
      audioData = new Float32Array(buffer.length * 2);
      const left = buffer.getChannelData(0);
      const right = buffer.getChannelData(1);

      for (let i = 0; i < buffer.length; i++) {
        audioData[i * 2] = left[i];
        audioData[i * 2 + 1] = right[i];
      }
    } else {
      // 모노 채널 처리
      audioData = buffer.getChannelData(0);
    }

    // WAV 파일 헤더 및 데이터 생성
    const dataLength = audioData.length * bytesPerSample;
    const buffer1 = new ArrayBuffer(44 + dataLength);
    const view = new DataView(buffer1);

    // WAV 헤더 작성
    // "RIFF" 청크
    writeString(view, 0, "RIFF");
    view.setUint32(4, 36 + dataLength, true);
    writeString(view, 8, "WAVE");

    // "fmt " 청크
    writeString(view, 12, "fmt ");
    view.setUint32(16, 16, true); // fmt 청크 크기
    view.setUint16(20, format, true); // 오디오 포맷 (1 = PCM)
    view.setUint16(22, numChannels, true); // 채널 수
    view.setUint32(24, sampleRate, true); // 샘플 레이트
    view.setUint32(28, sampleRate * blockAlign, true); // 바이트 레이트
    view.setUint16(32, blockAlign, true); // 블록 얼라인
    view.setUint16(34, bitDepth, true); // 비트 깊이

    // "data" 청크
    writeString(view, 36, "data");
    view.setUint32(40, dataLength, true); // 데이터 크기

    // 오디오 데이터 작성
    const offset = 44;
    if (numChannels === 2) {
      // 스테레오 데이터 작성
      for (let i = 0; i < audioData.length; i++) {
        const sample = Math.max(-1, Math.min(1, audioData[i]));
        view.setInt16(offset + i * bytesPerSample, sample * 0x7fff, true);
      }
    } else {
      // 모노 데이터 작성
      for (let i = 0; i < audioData.length; i++) {
        const sample = Math.max(-1, Math.min(1, audioData[i]));
        view.setInt16(offset + i * bytesPerSample, sample * 0x7fff, true);
      }
    }

    // Blob 생성 및 반환
    resolve(new Blob([buffer1], { type: "audio/wav" }));
  });
}

/**
 * DataView에 문자열을 작성합니다.
 * @param view DataView
 * @param offset 시작 위치
 * @param string 작성할 문자열
 */
function writeString(view: DataView, offset: number, string: string): void {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}
