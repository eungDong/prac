/**
 * WAV 파일 검증 유틸리티
 */

interface WavFormat {
  isValid: boolean;
  sampleRate?: number;
  channels?: number;
  bitsPerSample?: number;
  duration?: number;
  error?: string;
}

/**
 * WAV 파일 헤더를 검사하여 유효한 WAV 파일인지 확인합니다.
 * @param blob 검사할 오디오 Blob
 * @returns WAV 파일 정보 및 유효성
 */
export async function validateWavFile(blob: Blob): Promise<WavFormat> {
  try {
    // Blob에서 ArrayBuffer로 변환
    const buffer = await blob.arrayBuffer();
    const dataView = new DataView(buffer);

    // WAV 파일 헤더 검사
    // "RIFF" 시그니처 (4바이트)
    const riff = String.fromCharCode(
      dataView.getUint8(0),
      dataView.getUint8(1),
      dataView.getUint8(2),
      dataView.getUint8(3)
    );

    if (riff !== "RIFF") {
      return {
        isValid: false,
        error: `유효하지 않은 WAV 파일: RIFF 시그니처가 없습니다. 발견된 시그니처: ${riff}`,
      };
    }

    // "WAVE" 포맷 (8-12바이트)
    const wave = String.fromCharCode(
      dataView.getUint8(8),
      dataView.getUint8(9),
      dataView.getUint8(10),
      dataView.getUint8(11)
    );

    if (wave !== "WAVE") {
      return {
        isValid: false,
        error: `유효하지 않은 WAV 파일: WAVE 포맷이 아닙니다. 발견된 포맷: ${wave}`,
      };
    }

    // "fmt " 청크 (12-16바이트)
    const fmt = String.fromCharCode(
      dataView.getUint8(12),
      dataView.getUint8(13),
      dataView.getUint8(14),
      dataView.getUint8(15)
    );

    if (fmt !== "fmt ") {
      return {
        isValid: false,
        error: `유효하지 않은 WAV 파일: fmt 청크가 없습니다. 발견된 청크: ${fmt}`,
      };
    }

    // 오디오 포맷 정보 추출
    const audioFormat = dataView.getUint16(20, true); // PCM = 1
    const channels = dataView.getUint16(22, true);
    const sampleRate = dataView.getUint32(24, true);
    const bitsPerSample = dataView.getUint16(34, true);

    // 파일 크기로 대략적인 재생 시간 계산
    const fileSize = buffer.byteLength;
    const headerSize = 44; // 기본 WAV 헤더 크기
    const dataSize = fileSize - headerSize;
    const bytesPerSecond = sampleRate * channels * (bitsPerSample / 8);
    const duration = dataSize / bytesPerSecond;

    // PCM 포맷 확인 (1 = PCM)
    if (audioFormat !== 1) {
      return {
        isValid: false,
        error: `지원되지 않는 오디오 포맷: ${audioFormat}. PCM(1) 포맷만 지원됩니다.`,
      };
    }

    return {
      isValid: true,
      sampleRate,
      channels,
      bitsPerSample,
      duration,
    };
  } catch (error) {
    return {
      isValid: false,
      error: `WAV 파일 검증 중 오류 발생: ${
        error instanceof Error ? error.message : String(error)
      }`,
    };
  }
}

/**
 * 오디오 파일을 AudioContext로 디코딩하여 유효성을 확인합니다.
 * @param blob 검사할 오디오 Blob
 * @returns 오디오 파일 정보 및 유효성
 */
export async function validateAudioPlayback(
  blob: Blob
): Promise<{ isPlayable: boolean; error?: string }> {
  try {
    // AudioContext 생성
    const audioContext = new (window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext)();

    // Blob을 ArrayBuffer로 변환
    const arrayBuffer = await blob.arrayBuffer();

    // 오디오 디코딩 시도
    await audioContext.decodeAudioData(arrayBuffer);

    // 리소스 정리
    await audioContext.close();

    return { isPlayable: true };
  } catch (error) {
    return {
      isPlayable: false,
      error: `오디오 재생 검증 중 오류 발생: ${
        error instanceof Error ? error.message : String(error)
      }`,
    };
  }
}
