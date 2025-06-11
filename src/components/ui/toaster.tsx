"use client"

import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from "@/components/ui/toast"
import { useToast } from "@/components/ui/use-toast"

export function Toaster() {
  const { toasts } = useToast()

  return (
    <ToastProvider>
      {toasts.map(({ id, title, description, action, ...props }) => {
        // Check if this is an Agent Notification toast
        const isAgentNotification = 
          typeof title === 'string' && title === 'Agent Notification';
        
        return (
          <Toast key={id} {...props}>
            <div className="grid gap-0.5 flex-1">
              {title && (
                <ToastTitle>
                  {isAgentNotification ? (
                    <span className="bg-gradient-to-r from-blue-500 to-orange-500 bg-clip-text text-transparent font-semibold">
                      Agent Notification
                    </span>
                  ) : (
                    title
                  )}
                </ToastTitle>
              )}
              {description && (
                <ToastDescription>{description}</ToastDescription>
              )}
            </div>
            {action}
            <ToastClose />
          </Toast>
        )
      })}
      <ToastViewport />
    </ToastProvider>
  )
}
