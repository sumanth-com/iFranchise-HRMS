"use client"

import { Button as ButtonPrimitive } from "@base-ui/react/button"
import type { ComponentProps } from "react"

import { buttonVariants, type ButtonVariantProps } from "@/components/ui/button-variants"
import { cn } from "@/lib/utils"

type ButtonProps = ButtonPrimitive.Props & ButtonVariantProps

function Button({
  className,
  variant = "default",
  size = "default",
  render,
  nativeButton,
  type,
  ...props
}: ButtonProps) {
  const classes = cn(buttonVariants({ variant, size, className }))

  if (render !== undefined || nativeButton === false) {
    return (
      <ButtonPrimitive
        data-slot="button"
        className={classes}
        render={render}
        nativeButton={nativeButton}
        type={type}
        {...props}
      />
    )
  }

  const buttonProps = props as ComponentProps<"button">

  return (
    <button
      data-slot="button"
      type={type ?? "button"}
      className={classes}
      suppressHydrationWarning={typeof buttonProps.id === "string"}
      {...buttonProps}
    />
  )
}

export { Button, buttonVariants }
