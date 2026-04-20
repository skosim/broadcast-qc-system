import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function NotFound() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <Card className="max-w-lg">
        <CardHeader>
          <CardTitle>Страница не найдена</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">Запрошенный объект отсутствует в текущем наборе данных или был перенесен в новый раздел.</p>
          <Button asChild>
            <Link href="/">Вернуться на обзор</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
