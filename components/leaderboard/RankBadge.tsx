import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

type Props = {
  rank: number;
  className?: string;
};

export function RankBadge({ rank, className }: Props) {
  const variant =
    rank === 1 ? "gold" : rank === 2 ? "default" : rank === 3 ? "sky" : "muted";

  return (
    <Badge
      variant={variant}
      className={cn("min-w-10 justify-center tabular-nums", className)}
    >
      #{rank}
    </Badge>
  );
}
