"use client";

import { useState, useTransition } from "react";
import { ExternalLink, FileImage, FileText, ImageIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type Material = {
  id: string;
  kind: string;
  originalName: string;
  filePath: string;
  mimeType: string;
  sourceUrl: string | null;
  comment: string | null;
  previewUrl: string | null;
  fileUrl: string;
  isImage: boolean;
};

const tabs = [
  { key: "camera_plan", label: "Камерпланы", empty: "Камерплан пока не загружен" },
  { key: "gallery", label: "Фото стадиона", empty: "Фото стадиона пока не загружены" },
  { key: "other", label: "Прочие материалы", empty: "Прочие материалы пока не загружены" }
];

const kindLabels: Record<string, string> = {
  camera_plan: "Камерплан",
  gallery: "Фото",
  coordination: "Согласование",
  other: "Материал"
};

const editableKinds = ["camera_plan", "gallery", "coordination", "other"] as const;

export function MaterialsTabs({ materials }: { materials: Material[] }) {
  const [activeTab, setActiveTab] = useState("camera_plan");
  const [items, setItems] = useState(materials);
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const visible = items.filter((item) => {
    if (activeTab === "other") {
      return item.kind !== "camera_plan" && item.kind !== "gallery";
    }

    return item.kind === activeTab;
  });

  const emptyText = tabs.find((tab) => tab.key === activeTab)?.empty ?? "Материалы отсутствуют";

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key)}
            className={cn(
              "rounded-full border px-3 py-2 text-sm transition",
              activeTab === tab.key
                ? "border-primary/50 bg-primary/15 text-primary"
                : "border-border/80 bg-secondary/50 text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {message ? <div className="text-sm text-muted-foreground">{message}</div> : null}

      {visible.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-8 text-sm text-muted-foreground">{emptyText}</CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {visible.map((material) => (
            <Card
              key={material.id}
              className={cn(material.kind === "camera_plan" ? "border-primary/30 bg-primary/5" : undefined)}
            >
              <CardContent className="space-y-3 pt-6">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-medium text-foreground">{material.originalName}</div>
                    <div className="mt-1 flex flex-wrap items-center gap-2">
                      <Badge variant="secondary">{kindLabels[material.kind] ?? material.kind}</Badge>
                      <span className="text-xs text-muted-foreground">{material.mimeType}</span>
                    </div>
                  </div>
                  <div className="rounded-xl border border-border/60 bg-secondary/40 p-2 text-muted-foreground">
                    {material.kind === "camera_plan" ? (
                      <FileText className="h-4 w-4" />
                    ) : material.isImage ? (
                      <ImageIcon className="h-4 w-4" />
                    ) : (
                      <FileImage className="h-4 w-4" />
                    )}
                  </div>
                </div>

                {material.previewUrl ? (
                  <a
                    href={material.fileUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="block overflow-hidden rounded-xl border border-border/60 bg-secondary/30"
                  >
                    <img
                      src={material.previewUrl}
                      alt={material.originalName}
                      className="h-52 w-full object-cover transition hover:scale-[1.01]"
                    />
                  </a>
                ) : material.kind === "camera_plan" ? (
                  <div className="rounded-xl border border-dashed border-primary/30 bg-primary/5 p-4 text-sm text-muted-foreground">
                    Камерплан хранится как документ. Откройте файл для просмотра.
                  </div>
                ) : (
                  <div className="rounded-xl border border-dashed border-border/60 bg-secondary/20 p-4 text-sm text-muted-foreground">
                    Для этого материала предпросмотр не подготовлен.
                  </div>
                )}

                <div className="text-sm text-muted-foreground">{material.comment ?? "Без комментария"}</div>
                <div className="text-xs text-muted-foreground">{material.filePath}</div>

                <div className="flex flex-wrap gap-2">
                  <Button asChild type="button" variant="outline">
                    <a href={material.fileUrl} target="_blank" rel="noreferrer">
                      Открыть файл
                    </a>
                  </Button>
                  {material.sourceUrl ? (
                    <Button asChild type="button" variant="ghost">
                      <a href={material.sourceUrl} target="_blank" rel="noreferrer">
                        Внешний источник <ExternalLink className="ml-2 h-4 w-4" />
                      </a>
                    </Button>
                  ) : null}
                </div>

                <div className="space-y-2 rounded-xl border border-border/60 bg-secondary/20 p-3">
                  <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                    Исправить тип файла
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {editableKinds.map((kind) => (
                      <button
                        key={kind}
                        type="button"
                        disabled={isPending}
                        onClick={() => {
                          if (kind === material.kind) {
                            return;
                          }

                          startTransition(async () => {
                            const response = await fetch(`/api/stadium-files/${material.id}`, {
                              method: "PATCH",
                              headers: {
                                "Content-Type": "application/json"
                              },
                              body: JSON.stringify({
                                kind,
                                actorName: "Внутренний пользователь"
                              })
                            });

                            const payload = (await response.json()) as { success: boolean; message: string };
                            setMessage(payload.message);

                            if (response.ok) {
                              setItems((current) =>
                                current.map((item) => (item.id === material.id ? { ...item, kind } : item))
                              );
                            }
                          });
                        }}
                        className={cn(
                          "rounded-full border px-3 py-2 text-sm transition",
                          material.kind === kind
                            ? "border-primary/50 bg-primary/15 text-primary"
                            : "border-border/80 bg-secondary/50 text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                        )}
                      >
                        {kindLabels[kind]}
                      </button>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
