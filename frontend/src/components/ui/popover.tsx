import * as React from "react"

import { cn } from "@/lib/utils"

const Popover = ({ children }: { children: React.ReactNode }) => {
  const [open, setOpen] = React.useState(false)
  const ref = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  return (
    <div ref={ref} className="relative">
      {React.Children.map(children, (child) => {
        if (React.isValidElement(child)) {
          return React.cloneElement(child as React.ReactElement<any>, { open, setOpen })
        }
        return child
      })}
    </div>
  )
}

const PopoverTrigger = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & { asChild?: boolean; open?: boolean; setOpen?: (open: boolean) => void }
>(({ children, asChild, open, setOpen, ...props }, ref) => {
  const handleClick = () => setOpen?.(!open)

  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(children as React.ReactElement<any>, {
      onClick: handleClick,
      ref,
    })
  }

  return (
    <div ref={ref} onClick={handleClick} {...props}>
      {children}
    </div>
  )
})
PopoverTrigger.displayName = "PopoverTrigger"

const PopoverContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & { align?: "start" | "center" | "end"; open?: boolean; setOpen?: (open: boolean) => void }
>(({ className, children, align = "center", open, ...props }, ref) => {
  if (!open) return null

  return (
    <div
      ref={ref}
      className={cn(
        "absolute z-50 mt-2 rounded-md border bg-popover p-4 text-popover-foreground shadow-md outline-none",
        align === "start" && "left-0",
        align === "center" && "left-1/2 -translate-x-1/2",
        align === "end" && "right-0",
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
})
PopoverContent.displayName = "PopoverContent"

export { Popover, PopoverTrigger, PopoverContent }
