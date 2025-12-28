import { CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { TransferResult } from "@/lib/spotify";

interface TransferProgressProps {
  isTransferring: boolean;
  progress: number;
  result: TransferResult | null;
  error: string | null;
}

export function TransferProgress({ isTransferring, progress, result, error }: TransferProgressProps) {
  if (!isTransferring && !result && !error) return null;

  return (
    <Card className="border-border/50 bg-card/50 backdrop-blur animate-fade-in">
      <CardHeader className="pb-4">
        <CardTitle className="text-lg flex items-center gap-2">
          {isTransferring && <Loader2 className="h-5 w-5 animate-spin text-primary" />}
          {result && !error && <CheckCircle2 className="h-5 w-5 text-primary" />}
          {error && <XCircle className="h-5 w-5 text-destructive" />}
          {isTransferring ? 'Đang chuyển đổi...' : error ? 'Có lỗi xảy ra' : 'Hoàn thành!'}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {isTransferring && (
          <div className="space-y-2">
            <Progress value={progress} className="h-2" />
            <p className="text-sm text-muted-foreground text-center">{progress}%</p>
          </div>
        )}

        {error && (
          <p className="text-sm text-destructive">{error}</p>
        )}

        {result && (
          <div className="space-y-3">
            {result.success.length > 0 && (
              <div className="space-y-1">
                <p className="text-sm font-medium text-primary">✓ Thành công:</p>
                <ul className="text-sm text-muted-foreground space-y-1">
                  {result.success.map((item, i) => (
                    <li key={i} className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-primary" />
                      {item.name 
                        ? `Playlist "${item.name}" (${item.tracks} bài hát)`
                        : `${item.count} ${item.type}`
                      }
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {result.failed.length > 0 && (
              <div className="space-y-1">
                <p className="text-sm font-medium text-destructive">✗ Thất bại:</p>
                <ul className="text-sm text-muted-foreground space-y-1">
                  {result.failed.map((item, i) => (
                    <li key={i} className="flex items-center gap-2">
                      <XCircle className="h-4 w-4 text-destructive" />
                      {item.type}: {item.error}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
