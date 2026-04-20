import { TagCreateForm } from "@/components/tag-create-form";
import { SectionHeader } from "@/components/section-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getTagsDirectory } from "@/lib/repository";

export const dynamic = "force-dynamic";

export default async function TagsPage() {
  const tagsData = await getTagsDirectory();
  const tags = tagsData as Array<{
    id: string;
    code: string;
    labelRu: string;
    description: string | null;
    scope: string;
    isSystem: boolean;
    _count: {
      broadcastIssueTags: number;
      stadiumRemarks: number;
    };
  }>;

  return (
    <div className="space-y-8">
      <SectionHeader
        eyebrow="Справочник"
        title="Справочник тегов"
      />

      <Card>
        <CardHeader>
          <CardTitle>Добавить новый тег</CardTitle>
          <CardDescription>Система старается предотвращать дубли по названию и регистру.</CardDescription>
        </CardHeader>
        <CardContent>
          <TagCreateForm />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Список тегов</CardTitle>
          <CardDescription>Теги отсортированы по алфавиту и показывают текущее использование в проблемах и стадионных remark.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Код</TableHead>
                <TableHead>Тег</TableHead>
                <TableHead>Область</TableHead>
                <TableHead>Использование</TableHead>
                <TableHead>Описание</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tags.map((tag) => (
                <TableRow key={tag.id}>
                  <TableCell className="font-mono text-xs uppercase text-muted-foreground">{tag.code}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Badge variant={tag.isSystem ? "secondary" : "success"}>{tag.labelRu}</Badge>
                      {!tag.isSystem ? <span className="text-xs text-muted-foreground">пользовательский</span> : null}
                    </div>
                  </TableCell>
                  <TableCell>{tag.scope}</TableCell>
                  <TableCell>{tag._count.broadcastIssueTags + tag._count.stadiumRemarks}</TableCell>
                  <TableCell>{tag.description ?? "Описание пока не добавлено"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
