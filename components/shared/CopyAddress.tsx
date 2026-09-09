"use client";

import { useCallback, useState } from "react";
import { Check, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn, truncateAddress } from "@/lib/utils";

type Props = {
  address: string;
  label?: string;
  className?: string;
  truncate?: boolean;
};

export function CopyAddress({
  address,
  label,
  className,
  truncate = true,
}: Props) {
  const [copied, setCopied] = useState(false);

  const onCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      /* clipboard may be unavailable */
    }
  }, [address]);

  return (
    <div
      className={cn(
        "glass-panel inline-flex items-center gap-2 rounded-full px-3 py-1.5",
        className,
      )}
    >
      {label ? <span className="text-xs text-muted">{label}</span> : null}
      <code className="tabular-nums text-sm text-foreground">
        {truncate ? truncateAddress(address, 6) : address}
      </code>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-7 w-7"
        onClick={onCopy}
        aria-label="Copy address"
      >
        {copied ? (
          <Check className="h-3.5 w-3.5 text-primary" />
        ) : (
          <Copy className="h-3.5 w-3.5" />
        )}
      </Button>
    </div>
  );
}
