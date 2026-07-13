import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

/*
  Alethia button language: every button is uppercase mono with tracking.
  Primary is the light pill (off-white fill, hover → accent); secondary is a
  hairline ghost whose border tints accent; solid accent is reserved for the
  one CTA per screen that IS the point (e.g. "Share as PDF").
*/
const buttonVariants = cva(
  "inline-flex cursor-pointer items-center justify-center gap-2 whitespace-nowrap rounded-[10px] font-mono uppercase tracking-[0.05em] transition-[background-color,color,border-color] duration-300 focus-visible:outline focus-visible:outline-1 focus-visible:outline-brand focus-visible:outline-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        primary: "bg-ink text-page hover:bg-brand hover:text-[#0a0a0a]",
        secondary:
          "border border-rule bg-transparent text-ink-2 hover:border-brand hover:text-ink",
        ghost: "text-ink-3 hover:text-brand",
        subtle: "bg-brand-soft text-brand hover:bg-brand/25",
        accent: "bg-brand text-[#0a0a0a] hover:bg-brand-strong",
        danger:
          "border border-out/40 bg-transparent text-out hover:border-out hover:bg-out-soft",
        link: "text-brand underline underline-offset-4 hover:text-brand-strong p-0 h-auto",
      },
      size: {
        sm: "h-8 px-3 text-[0.75rem]",
        md: "h-10 px-4 text-[0.8125rem]",
        lg: "h-12 px-6 text-[0.875rem]",
        icon: "h-9 w-9 text-[0.875rem]",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  /** Render as the single child element (e.g. a Next.js <Link>) instead of a <button>. */
  asChild?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild, children, ...props }, ref) => {
    const classes = cn(buttonVariants({ variant, size }), className);
    if (asChild && React.isValidElement(children)) {
      const child = children as React.ReactElement<{ className?: string }>;
      return React.cloneElement(child, {
        className: cn(classes, child.props.className),
      });
    }
    return (
      <button ref={ref} className={classes} {...props}>
        {children}
      </button>
    );
  },
);
Button.displayName = "Button";

export { buttonVariants };
