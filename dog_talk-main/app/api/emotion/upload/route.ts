export const runtime = "edge";
import { EmotionAPI } from "@/constants/api";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("bark_file") as File;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Create a new FormData instance for the external API
    const apiFormData = new FormData();
    apiFormData.append("bark_file", file);

    console.log("업로드 요청 정보:", {
      fileName: file.name,
      fileType: file.type,
      fileSize: file.size,
      endpoint: "https://pippo.petpuls.net/emo2/v1/analysis/request",
      userToken: "test_dog_8",
    });

    const response = await fetch(
      "https://pippo.petpuls.net/emo2/v1/analysis/request",
      {
        method: "POST",
        headers: {
          "EMO-Client-ID": EmotionAPI.clientId,
          "EMO-Secret-Key": EmotionAPI.secretKey,
          Referer: "http://49.247.42.95",
          "X-User-Token": EmotionAPI.userToken,
        },
        body: apiFormData,
      }
    );

    // 응답 상태 및 헤더 로깅
    console.log("업로드 API 응답 상태:", {
      status: response.status,
      statusText: response.statusText,
      headers: Object.fromEntries(response.headers.entries()),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("업로드 실패:", {
        status: response.status,
        statusText: response.statusText,
        errorText: errorText,
        url: "https://pippo.petpuls.net/emo2/v1/analysis/request",
      });

      return NextResponse.json(
        {
          error: "Failed to upload audio file",
          details: {
            status: response.status,
            statusText: response.statusText,
            errorText: errorText,
            url: "https://pippo.petpuls.net/emo2/v1/analysis/request",
          },
        },
        { status: response.status }
      );
    }

    // 성공 응답 처리
    let responseData;
    try {
      responseData = await response.json();
      console.log("업로드 성공 응답:", JSON.stringify(responseData, null, 2));
    } catch (e) {
      console.log("업로드 성공 응답 (텍스트):", e);
      const textResponse = await response.text();
      console.log("업로드 성공 응답 (텍스트):", textResponse);
      responseData = { rawResponse: textResponse };
    }

    return NextResponse.json({
      success: true,
      response: responseData,
    });
  } catch (error) {
    console.error("업로드 에러:", error);

    // 에러 객체의 자세한 정보 추출
    const errorDetails = {
      message: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
    };

    return NextResponse.json(
      {
        error: "Failed to upload audio file",
        details: errorDetails,
      },
      { status: 500 }
    );
  }
}
