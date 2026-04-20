import type { StadiumFileKind } from "@prisma/client";

type ClassificationInput = {
  originalName: string;
  mimeType?: string | null;
  comment?: string | null;
  extractedText?: string | null;
};

type ClassificationResult = {
  kind: StadiumFileKind;
  reason: string;
};

const cameraPlanMatchers = [
  "камерплан",
  "кам план",
  "camera plan",
  "расстановка камер",
  "схема камер",
  "согласование каме"
];

const coordinationMatchers = [
  "согласование",
  "допуск",
  "схема допуска"
];

const imageExtensions = [".png", ".jpg", ".jpeg", ".webp", ".gif", ".bmp", ".heic"];

export function classifyStadiumFile(input: ClassificationInput): ClassificationResult {
  const haystack = normalizeText([
    input.originalName,
    input.comment,
    input.extractedText
  ]);

  if (cameraPlanMatchers.some((matcher) => haystack.includes(matcher))) {
    return {
      kind: "camera_plan",
      reason: "Найдено ключевое слово камерплана или схемы расстановки камер."
    };
  }

  if (isImageFile(input.originalName, input.mimeType)) {
    return {
      kind: "gallery",
      reason: "Файл распознан как изображение и отправлен в галерею."
    };
  }

  if (coordinationMatchers.some((matcher) => haystack.includes(matcher))) {
    return {
      kind: "coordination",
      reason: "Файл содержит признаки согласования или сопроводительного документа."
    };
  }

  return {
    kind: "other",
    reason: "Файл не удалось уверенно отнести к камерплану или галерее."
  };
}

export function isImageFile(originalName: string, mimeType?: string | null) {
  const filename = originalName.toLocaleLowerCase("ru");
  const mime = (mimeType ?? "").toLocaleLowerCase("ru");

  return mime.startsWith("image/") || imageExtensions.some((extension) => filename.endsWith(extension));
}

function normalizeText(parts: Array<string | null | undefined>) {
  return parts
    .filter(Boolean)
    .join(" ")
    .toLocaleLowerCase("ru")
    .replace(/ё/g, "е")
    .replace(/\s+/g, " ")
    .trim();
}
