import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "cn"

const headingVariants = cva("font-heading font-semibold tracking-tight", {
  variants: {
    level: {
      1: "text-3xl",
      2: "text-2xl",
      3: "text-lg",
    },
  },
  defaultVariants: { level: 1 },
})

type HeadingProps = React.ComponentProps<"h1"> &
  VariantProps<typeof headingVariants>

function Heading({ className, level = 1, ...props }: HeadingProps) {
  const Tag = `h${level}` as "h1" | "h2" | "h3"
  return (
    <Tag
      data-slot="heading"
      className={cn(headingVariants({ level }), className)}
      {...props}
    />
  )
}

const textVariants = cva("", {
  variants: {
    variant: {
      default: "text-base",
      muted: "text-sm text-muted-foreground",
      lead: "text-lg text-muted-foreground",
    },
  },
  defaultVariants: { variant: "default" },
})

function Text({
  className,
  variant,
  ...props
}: React.ComponentProps<"p"> & VariantProps<typeof textVariants>) {
  return (
    <p
      data-slot="text"
      className={cn(textVariants({ variant }), className)}
      {...props}
    />
  )
}

export { Heading, Text }
