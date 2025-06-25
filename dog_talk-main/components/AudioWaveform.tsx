"use client";

import React, { useRef, useEffect } from "react";

interface AudioWaveformProps {
  audioContext: AudioContext | null;
  audioBuffer: AudioBuffer | null;
  duration: number;
  startTime: number;
  endTime: number;
}

export const AudioWaveform = ({
  audioContext,
  audioBuffer,
  duration,
  startTime,
  endTime,
}: AudioWaveformProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current || !audioBuffer || !audioContext) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // 캔버스 크기 설정
    const { width, height } = canvas.getBoundingClientRect();
    canvas.width = width;
    canvas.height = height;

    // 캔버스 초기화
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = "#4B5563"; // 배경색 (오디오 파형 외부)
    ctx.fillRect(0, 0, width, height);

    // 오디오 데이터 샘플링
    const channelData = audioBuffer.getChannelData(0); // 첫 번째 채널 데이터
    const step = Math.max(1, Math.floor(channelData.length / width)); // step이 0이 되지 않도록 보장
    const amp = height / 2;

    // 선택된 구간의 시작과 끝 위치 계산
    const startPos = Math.floor((startTime / duration) * width);
    const endPos = Math.floor((endTime / duration) * width);

    // 선택된 구간 표시
    ctx.fillStyle = "#1E40AF"; // 선택된 구간 배경색
    ctx.fillRect(startPos, 0, Math.max(0, endPos - startPos), height); // 너비가 음수가 되지 않도록 보장

    // 파형 그리기
    ctx.lineWidth = 1;
    ctx.strokeStyle = "#FFFFFF";
    ctx.beginPath();

    for (let i = 0; i < width; i++) {
      let minValue = 1.0;
      let maxValue = -1.0;

      // 각 픽셀에 대응하는 오디오 샘플 범위의 최소/최대값 찾기
      for (let j = 0; j < step; j++) {
        const dataIndex = i * step + j;
        if (dataIndex < channelData.length) {
          // 배열 범위 초과 방지
          const datum = channelData[dataIndex];
          if (datum < minValue) minValue = datum;
          if (datum > maxValue) maxValue = datum;
        }
      }

      // 파형 그리기 (중앙을 기준으로 위/아래로)
      ctx.moveTo(i, (1 + minValue) * amp);
      ctx.lineTo(i, (1 + maxValue) * amp);
    }

    ctx.stroke();
  }, [audioBuffer, duration, startTime, endTime, audioContext]);

  return (
    <canvas
      ref={canvasRef}
      className="w-full rounded-md"
      style={{
        height: "clamp(3rem, 6vh, 5rem)",
      }}
    />
  );
};
