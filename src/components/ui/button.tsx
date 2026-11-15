import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

/*
  Buttons are sentence-case sans pills, 500 weight. Primary is ink with a
  faint top sheen (one per view) and turns evergreen on hover; secondary is a
  hairline outline; ghost is text only. `light` and `glass` are the pair used
  on top of artwork.
*/
const buttonVariants = cva(
  "inline-flex cursor-pointer items-center justify-center gap-2 whitespace-nowrap rounded-full font-medium transition-[background-color,color,border-color] duration-300 disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        primary:
          "bg-ink bg-[image:linear-gradient(180deg,rgba(255,255,255,0.14),rgba(255,255,255,0))] text-page hover:bg-brand",
        light: "bg-white text-ink hover:bg-brand-soft",
        glass:
          "border border-white/25 bg-white/15 text-white backdrop-blur-md hover:bg-white/25",
        secondary:
          "border border-line-strong bg-paper text-ink hover:border-brand hover:text-brand",
        ghost: "text-ink-2 hover:bg-paper-2 hover:text-ink",
        subtle: "bg-brand-soft text-brand-strong hover:bg-brand-tint",
        danger:
          "border border-out/40 bg-paper text-out-ink hover:border-out hover:bg-out-soft",
        link: "h-auto p-0 text-brand underline underline-offset-4 hover:text-brand-strong",
      },
      size: {
        sm: "h-8 px-3.5 text-[0.8125rem]",
        md: "h-10 px-5 text-sm",
        lg: "h-12 px-7 text-[0.9375rem]",
        icon: "size-9 text-sm",
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
