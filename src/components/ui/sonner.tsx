"use client";

import { Toaster as Sonner, type ToasterProps } from "sonner";
import {
  CircleCheckIcon,
  InfoIcon,
  TriangleAlertIcon,
  OctagonXIcon,
  Loader2Icon,
} from "lucide-react";

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      theme="dark"
      className="toaster group"
      icons={{
        success: <CircleCheckIcon className="size-4" />,
        info: <InfoIcon className="size-4" />,
        warning: <TriangleAlertIcon className="size-4" />,
        error: <OctagonXIcon className="size-4" />,
        loading: <Loader2Icon className="size-4 animate-spin" />,
      }}
      style={
        {
          "--normal-bg": "var(--bg-elevated)",
          "--normal-text": "var(--fg-primary)",
          "--normal-border": "var(--border)",
          "--success-bg": "var(--bg-elevated)",
          "--success-text": "var(--success)",
          "--success-border": "var(--border)",
          "--warning-bg": "var(--bg-elevated)",
          "--warning-text": "var(--warning)",
          "--warning-border": "var(--border)",
          "--error-bg": "var(--bg-elevated)",
          "--error-text": "var(--danger)",
          "--error-border": "var(--border)",
          "--info-bg": "var(--bg-elevated)",
          "--info-text": "var(--fg-primary)",
          "--info-border": "var(--border)",
          "--border-radius": "var(--radius-sm)",
        } as React.CSSProperties
      }
      toastOptions={{
        classNames: {
          toast: "cn-toast",
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
