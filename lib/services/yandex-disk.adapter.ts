import { classifyStadiumFile } from "@/lib/services/stadium-file-classifier";

export type DiskAssetSnapshot = {
  clubName: string;
  filename: string;
  fileKind: "camera_plan" | "gallery" | "coordination" | "other";
  extractedHint: string | null;
  fileUrl: string | null;
};

export class YandexDiskAdapter {
  async refreshClubAssets(): Promise<DiskAssetSnapshot[]> {
    const rawFiles = [
      {
        clubName: "Велес",
        filename: "Камплан_Велес_2026.pdf",
        extractedHint: "камерплан, расстановка камер",
        fileUrl: "https://disk.yandex.ru/i/veles-camera-plan"
      }
    ];

    return rawFiles.map((file) => ({
      clubName: file.clubName,
      filename: file.filename,
      extractedHint: file.extractedHint,
      fileUrl: file.fileUrl,
      fileKind: classifyStadiumFile({
        originalName: file.filename,
        extractedText: file.extractedHint
      }).kind
    }));
  }
}
