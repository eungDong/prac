"use client";

import React, { useState, useEffect } from "react";
import { MediaSelector } from "./MediaSelector";
import { AudioWaveform } from "./AudioWaveform";

interface AudioEditorProps {
  file: File;
  onComplete: (startTime: number, endTime: number) => void;
  analyzing: boolean;
}

export const AudioEditor = ({
  file,
  onComplete,
  analyzing,
}: AudioEditorProps) => {
  const [audioContext, setAudioContext] = useState<AudioContext | null>(null);
  const [audioBuffer, setAudioBuffer] = useState<AudioBuffer | null>(null);

  // 오디오 컨텍스트 및 버퍼 초기화
  useEffect(() => {
    const context = new AudioContext();
    setAudioContext(context);

    const reader = new FileReader();
    reader.onload = async (e) => {
      if (!e.target?.result || typeof e.target.result === "string") return;

      try {
        const buffer = await context.decodeAudioData(
          e.target.result as ArrayBuffer
        );
        setAudioBuffer(buffer);
      } catch (err) {
        console.error("오디오 디코딩 오류:", err);
      }
    };

    reader.readAsArrayBuffer(file);

    return () => {
      context.close();
    };
  }, [file]);

  return (
    <MediaSelector
      file={file}
      onComplete={onComplete}
      analyzing={analyzing}
      mediaType="audio"
    >
      {({ duration, startTime, endTime }) => (
        <AudioWaveform
          audioContext={audioContext}
          audioBuffer={audioBuffer}
          duration={duration}
          startTime={startTime}
          endTime={endTime}
        />
      )}
    </MediaSelector>
  );
};
