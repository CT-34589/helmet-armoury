"use client"

import * as React from "react"
import { useTheme } from "next-themes"
import { Toaster as Sonner, type ToasterProps } from "sonner"
import {
  CircleCheckIcon,
  InfoIcon,
  TriangleAlertIcon,
  OctagonXIcon,
  Loader2Icon,
} from "lucide-react"

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme()

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      icons={{
        success: <CircleCheckIcon className="size-4" />,
        info: <InfoIcon className="size-4" />,
        warning: <TriangleAlertIcon className="size-4" />,
        error: <OctagonXIcon className="size-4" />,
        loading: <Loader2Icon className="size-4 animate-spin" />,
      }}
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg",
          description: "group-[.toast]:text-muted-foreground",
          actionButton:
            "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground",
          cancelButton:
            "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground",
          success:
            "group-[.toaster]:border-emerald-500/30 group-[.toaster]:bg-emerald-500/10 group-[.toaster]:text-emerald-400",
          error:
            "group-[.toaster]:border-destructive/30 group-[.toaster]:bg-destructive/10 group-[.toaster]:text-destructive",
          info:
            "group-[.toaster]:border-blue-500/30 group-[.toaster]:bg-blue-500/10 group-[.toaster]:text-blue-400",
          warning:
            "group-[.toaster]:border-yellow-500/30 group-[.toaster]:bg-yellow-500/10 group-[.toaster]:text-yellow-500",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }