import { toaster } from "../components/ui/toaster"

type ToastStatus = "info" | "warning" | "success" | "error" | "loading"

interface ToastOptions {
  title?: string
  description?: string
  status?: ToastStatus
  duration?: number
  closable?: boolean
  position?: "top" | "top-right" | "top-left" | "bottom" | "bottom-right" | "bottom-left"
}

export const useToast = () => {
  return (options: ToastOptions) => {
    const { title, description, status = "info", duration = 3000, closable = true } = options

    return toaster.create({
      title,
      description,
      type: status,
      duration,
      closable,
    })
  }
} 