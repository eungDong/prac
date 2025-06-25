export const runtime = "edge";
import { EmotionAPI } from "@/constants/api";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  try {
    // URL에서 fileId 파라미터 추출 (있는 경우)
    const url = new URL(request.url);
    const fileId = url.searchParams.get("fileId");

    // 캐시 방지를 위한 타임스탬프 파라미터 확인
    const timestamp =
      url.searchParams.get("timestamp") || Date.now().toString();

    console.log(
      `감정 분석 결과 요청: fileId=${fileId}, timestamp=${timestamp}`
    );

    const response = await fetch(EmotionAPI.directResultEmo, {
      headers: {
        "EMO-Client-ID": EmotionAPI.clientId,
        "EMO-Secret-Key": EmotionAPI.secretKey,
        Referer: "http://49.247.42.95",
        "X-User-Token": EmotionAPI.userToken,
        // 캐시 방지를 위한 헤더 추가
        "Cache-Control": "no-cache, no-store, must-revalidate",
        Pragma: "no-cache",
        Expires: "0",
      },
      // CORS 에러 방지를 위한 설정
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    console.log(
      "Emotion analysis content data:",
      JSON.stringify(data.data.content, null, 2)
    );

    // 응답 데이터 검증
    if (!data?.data?.content?.length) {
      throw new Error("No analysis results available");
    }

    // 필요한 데이터만 추출 (ansDog, ansFilter, fileNameOrigin 포함)
    const latestResult = data.data.content[0];
    const filteredResponse = {
      ansDog: latestResult.ansDog || "",
      ansFilter: latestResult.ansFilter || "",
      fileNameOrigin: latestResult.fileNameOrigin || "", // 파일명 추가
      startTime: latestResult.startTime || "",
      endTime: latestResult.endTime || "",
    };

    console.log(
      "클라이언트에 제공할 필터링된 결과:",
      JSON.stringify(filteredResponse, null, 2)
    );

    // 필터링된 데이터만 반환
    return NextResponse.json(filteredResponse);
  } catch (error) {
    console.error("Result error:", error);
    return NextResponse.json(
      {
        error: "Failed to get emotion result",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
