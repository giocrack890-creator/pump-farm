import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { Slot } from "@radix-ui/react-slot";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 rounded-full font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3DFF7A] disabled:opacity-50 disabled:pointer-events-none active:scale-[0.98]",
  {
    variants: {
      variant: {
        default:
          "bg-gradient-to-b from-[#3DFF7A] to-[#1FCF63] text-[#06140C] shadow-[0_0_24px_rgba(61,255,122,0.35)] hover:brightness-110",
        secondary:
          "bg-white/5 text-white border border-white/10 hover:bg-white/10",
        ghost: "bg-transparent text-white/80 hover:bg-white/5",
        danger: "bg-[#FF4D4D]/15 text-[#FF4D4D] border border-[#FF4D4D]/30",
        gold: "bg-gradient-to-b from-[#FFC94D] to-[#E6A800] text-[#1A1200]",
        outline:
          "border border-[rgba(61,255,122,0.35)] bg-transparent text-[#3DFF7A] hover:bg-[#3DFF7A]/10",
      },
      size: {
        default: "h-11 px-5 text-sm",
        sm: "h-9 px-3 text-xs",
        lg: "h-12 px-7 text-base",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        ref={ref}
        className={cn(buttonVariants({ variant, size }), className)}
        {...props}
      />
    );
  },
);
Button.displayName = "Button";

export { buttonVariants };
