import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function MetricCard({
  label,
  value,
  hint
}: {
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <Card className="border-white/12 bg-[linear-gradient(135deg,rgba(28,40,35,0.98),rgba(18,26,23,0.98))]">
      <CardHeader className="pb-3">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">{label}</p>
        <CardTitle className="text-3xl text-foreground">{value}</CardTitle>
      </CardHeader>
      {hint ? (
        <CardContent>
          <p className="text-sm text-muted-foreground">{hint}</p>
        </CardContent>
      ) : null}
    </Card>
  );
}
