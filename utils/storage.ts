import { openDB, IDBPDatabase } from "idb";

// IndexedDB 데이터베이스 이름과 버전
const DB_NAME = "pet_talk_storage";
const DB_VERSION = 1;
const FILE_STORE = "files";
const SETTINGS_STORE = "settings";

interface FileData {
  name: string;
  type: string;
  base64: string;
}

// IndexedDB 초기화 및 DB 객체 반환
async function getDB(): Promise<IDBPDatabase> {
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      // 파일 데이터를 저장할 스토어 생성
      if (!db.objectStoreNames.contains(FILE_STORE)) {
        db.createObjectStore(FILE_STORE);
      }

      // 설정 데이터를 저장할 스토어 생성
      if (!db.objectStoreNames.contains(SETTINGS_STORE)) {
        db.createObjectStore(SETTINGS_STORE);
      }
    },
  });
}

// 파일 저장 함수
export async function saveFile(
  fileId: string,
  fileData: FileData
): Promise<void> {
  try {
    const db = await getDB();
    await db.put(FILE_STORE, fileData, fileId);
  } catch (error) {
    console.error("파일 저장 오류:", error);
    throw new Error("파일을 저장하는 중 오류가 발생했습니다.");
  }
}

// 파일 불러오기 함수
export async function getFile(fileId: string): Promise<FileData | null> {
  try {
    const db = await getDB();
    return await db.get(FILE_STORE, fileId);
  } catch (error) {
    console.error("파일 불러오기 오류:", error);
    throw new Error("파일을 불러오는 중 오류가 발생했습니다.");
  }
}

// 파일 삭제 함수
export async function deleteFile(fileId: string): Promise<void> {
  try {
    const db = await getDB();
    await db.delete(FILE_STORE, fileId);
  } catch (error) {
    console.error("파일 삭제 오류:", error);
    throw new Error("파일을 삭제하는 중 오류가 발생했습니다.");
  }
}

// 설정 저장 함수
export async function saveSetting(key: string, value: string): Promise<void> {
  try {
    const db = await getDB();
    await db.put(SETTINGS_STORE, value, key);
  } catch (error) {
    console.error("설정 저장 오류:", error);
    // localStorage 폴백 사용
    try {
      localStorage.setItem(key, value);
    } catch (storageError) {
      console.error("localStorage 저장 오류:", storageError);
    }
  }
}

// 설정 불러오기 함수
export async function getSetting(key: string): Promise<string | null> {
  try {
    const db = await getDB();
    return await db.get(SETTINGS_STORE, key);
  } catch (error) {
    console.error("설정 불러오기 오류:", error);
    // localStorage 폴백 사용
    return localStorage.getItem(key);
  }
}

// localStorage 폴백을 사용한 간단한 설정 저장 함수 (타임스탬프 등 작은 데이터용)
export function saveSettingSync(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch (error) {
    console.error("설정 저장 오류:", error);
    // 오류 처리 (필요시 사용자에게 알림)
  }
}

// localStorage 폴백을 사용한 간단한 설정 불러오기 함수
export function getSettingSync(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch (error) {
    console.error("설정 불러오기 오류:", error);
    return null;
  }
}
