
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { Capacitor } from '@capacitor/core';

/**
 * Handles file reading from an input element.
 * Returns a Promise that resolves to a Base64 Data URL.
 * 不進行任何縮放、裁切或 Canvas 處理，保留原始品質。
 */
export const processFile = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

/**
 * Helper to convert a Blob to a pure Base64 string (without the data:mime/type;base64, prefix).
 */
const blobToBase64Data = (blob: Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const dataUrl = reader.result as string;
      const base64 = dataUrl.split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};

/**
 * Main export function for saving or sharing files.
 */
export const saveFile = async (blob: Blob, filename: string) => {
  try {
    if (Capacitor.isNativePlatform()) {
      const base64Data = await blobToBase64Data(blob);
      const savedFile = await Filesystem.writeFile({
        path: filename,
        data: base64Data,
        directory: Directory.Cache, 
      });
      await Share.share({
        title: filename,
        url: savedFile.uri,
      });
    } else {
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      setTimeout(() => {
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      }, 100);
    }
  } catch (error) {
    console.error("File Save Failed:", error);
    alert("檔案儲存失敗");
  }
};

export const downloadBlob = async (blob: Blob, filename: string) => {
    await saveFile(blob, filename);
};

export const shareFile = async (blob: Blob, filename: string) => {
    await saveFile(blob, filename);
};
