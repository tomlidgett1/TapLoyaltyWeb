"use client"

import { useEffect, useRef } from "react"

interface AnimatedEmailResponseProps {
  html: string
  className?: string
}

export default function AnimatedEmailResponse({ html, className = "" }: AnimatedEmailResponseProps) {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!containerRef.current) return;

    // Get all the paragraph elements and other block-level elements
    const paragraphs = containerRef.current.querySelectorAll("p, div, ul, ol, h1, h2, h3, h4, h5, h6");
    
    // If no paragraphs found, just make the container visible
    if (paragraphs.length === 0) {
      containerRef.current.style.visibility = "visible";
      containerRef.current.classList.add("fade-in");
      return;
    }

    // Create an array of elements to animate
    const elements = Array.from(paragraphs);
    
    // Make container visible
    containerRef.current.style.visibility = "visible";
    
    // Animate each paragraph with a staggered delay
    elements.forEach((el, index) => {
      const element = el as HTMLElement;
      element.classList.add("animated-paragraph");
      element.style.animationDelay = `${index * 150}ms`;
    });
  }, [html]);

  return (
    <div 
      className={`email-response-container ${className}`} 
      ref={containerRef}
      style={{ visibility: "hidden" }}
    >
      <div 
        className="email-response-content"
        dangerouslySetInnerHTML={{ __html: html }}
      />
      <style jsx global>{`
        .email-response-container {
          width: 100%;
        }

        .email-response-content {
          line-height: 1.5;
        }
        
        .fade-in {
          animation: fadeIn 0.5s ease-in-out forwards;
        }
        
        .animated-paragraph {
          opacity: 0;
          transform: translateY(10px);
          animation: fadeInUp 0.5s ease-in-out forwards;
        }
        
        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
        
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
} 