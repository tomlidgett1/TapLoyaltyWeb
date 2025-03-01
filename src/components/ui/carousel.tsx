"use client"

import * as React from "react"
import { ArrowLeft, ArrowRight } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

// Define types for our simplified carousel
type CarouselApi = {
  scrollPrev: () => void
  scrollNext: () => void
  canScrollPrev: boolean
  canScrollNext: boolean
}

type CarouselProps = {
  orientation?: "horizontal" | "vertical"
  setApi?: (api: CarouselApi) => void
  className?: string
  children?: React.ReactNode
}

type CarouselContextProps = {
  api: CarouselApi
  orientation: "horizontal" | "vertical"
}

const CarouselContext = React.createContext<CarouselContextProps | null>(null)

function useCarousel() {
  const context = React.useContext(CarouselContext)

  if (!context) {
    throw new Error("useCarousel must be used within a <Carousel />")
  }

  return context
}

const Carousel = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & CarouselProps
>(
  (
    {
      orientation = "horizontal",
      setApi,
      className,
      children,
      ...props
    },
    ref
  ) => {
    const containerRef = React.useRef<HTMLDivElement>(null)
    const [canScrollPrev, setCanScrollPrev] = React.useState(false)
    const [canScrollNext, setCanScrollNext] = React.useState(true)

    const scrollPrev = React.useCallback(() => {
      if (!containerRef.current) return
      const container = containerRef.current
      const scrollAmount = orientation === "horizontal" 
        ? container.clientWidth * 0.8 
        : container.clientHeight * 0.8
      
      if (orientation === "horizontal") {
        container.scrollBy({ left: -scrollAmount, behavior: "smooth" })
      } else {
        container.scrollBy({ top: -scrollAmount, behavior: "smooth" })
      }
    }, [orientation])

    const scrollNext = React.useCallback(() => {
      if (!containerRef.current) return
      const container = containerRef.current
      const scrollAmount = orientation === "horizontal" 
        ? container.clientWidth * 0.8 
        : container.clientHeight * 0.8
      
      if (orientation === "horizontal") {
        container.scrollBy({ left: scrollAmount, behavior: "smooth" })
      } else {
        container.scrollBy({ top: scrollAmount, behavior: "smooth" })
      }
    }, [orientation])

    const checkScrollability = React.useCallback(() => {
      if (!containerRef.current) return
      const container = containerRef.current
      
      if (orientation === "horizontal") {
        setCanScrollPrev(container.scrollLeft > 0)
        setCanScrollNext(
          container.scrollLeft < container.scrollWidth - container.clientWidth
        )
      } else {
        setCanScrollPrev(container.scrollTop > 0)
        setCanScrollNext(
          container.scrollTop < container.scrollHeight - container.clientHeight
        )
      }
    }, [orientation])

    // Update scrollability when content changes
    React.useEffect(() => {
      checkScrollability()
      
      // Create ResizeObserver to check scrollability when container size changes
      const observer = new ResizeObserver(() => {
        checkScrollability()
      })
      
      if (containerRef.current) {
        observer.observe(containerRef.current)
      }
      
      return () => {
        observer.disconnect()
      }
    }, [checkScrollability])

    // Create and expose the API
    const api = React.useMemo(
      () => ({
        scrollPrev,
        scrollNext,
        canScrollPrev,
        canScrollNext,
      }),
      [scrollPrev, scrollNext, canScrollPrev, canScrollNext]
    )

    // Expose the API via the setApi prop
    React.useEffect(() => {
      if (setApi) {
        setApi(api)
      }
    }, [api, setApi])

    return (
      <CarouselContext.Provider
        value={{
          api,
          orientation,
        }}
      >
        <div
          ref={ref}
          className={cn("relative", className)}
          role="region"
          aria-roledescription="carousel"
          {...props}
        >
          {children}
        </div>
      </CarouselContext.Provider>
    )
  }
)
Carousel.displayName = "Carousel"

const CarouselContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => {
  const { orientation } = useCarousel()
  const containerRef = React.useRef<HTMLDivElement>(null)

  // Forward the ref to the parent component
  React.useImperativeHandle(ref, () => containerRef.current as HTMLDivElement)

  return (
    <div className="overflow-hidden">
      <div
        ref={containerRef}
        onScroll={(e) => {
          // You could add scroll event handling here if needed
        }}
        className={cn(
          "flex overflow-auto scrollbar-hide",
          orientation === "horizontal" ? "-ml-4" : "-mt-4 flex-col",
          className
        )}
        {...props}
      />
    </div>
  )
})
CarouselContent.displayName = "CarouselContent"

const CarouselItem = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => {
  const { orientation } = useCarousel()

  return (
    <div
      ref={ref}
      role="group"
      aria-roledescription="slide"
      className={cn(
        "min-w-0 shrink-0 grow-0 basis-full",
        orientation === "horizontal" ? "pl-4" : "pt-4",
        className
      )}
      {...props}
    />
  )
})
CarouselItem.displayName = "CarouselItem"

const CarouselPrevious = React.forwardRef<
  HTMLButtonElement,
  React.ComponentProps<typeof Button>
>(({ className, variant = "outline", size = "icon", ...props }, ref) => {
  const { orientation, api } = useCarousel()

  return (
    <Button
      ref={ref}
      variant={variant}
      size={size}
      className={cn(
        "absolute h-8 w-8 rounded-full",
        orientation === "horizontal"
          ? "-left-12 top-1/2 -translate-y-1/2"
          : "-top-12 left-1/2 -translate-x-1/2 rotate-90",
        className
      )}
      disabled={!api.canScrollPrev}
      onClick={api.scrollPrev}
      {...props}
    >
      <ArrowLeft className="h-4 w-4" />
      <span className="sr-only">Previous slide</span>
    </Button>
  )
})
CarouselPrevious.displayName = "CarouselPrevious"

const CarouselNext = React.forwardRef<
  HTMLButtonElement,
  React.ComponentProps<typeof Button>
>(({ className, variant = "outline", size = "icon", ...props }, ref) => {
  const { orientation, api } = useCarousel()

  return (
    <Button
      ref={ref}
      variant={variant}
      size={size}
      className={cn(
        "absolute h-8 w-8 rounded-full",
        orientation === "horizontal"
          ? "-right-12 top-1/2 -translate-y-1/2"
          : "-bottom-12 left-1/2 -translate-x-1/2 rotate-90",
        className
      )}
      disabled={!api.canScrollNext}
      onClick={api.scrollNext}
      {...props}
    >
      <ArrowRight className="h-4 w-4" />
      <span className="sr-only">Next slide</span>
    </Button>
  )
})
CarouselNext.displayName = "CarouselNext"

export {
  type CarouselApi,
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselPrevious,
  CarouselNext,
} 