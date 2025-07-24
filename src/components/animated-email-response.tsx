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
    
    // Calculate the total animation time for all paragraphs
    const lastElementIndex = elements.length - 1;
    const lastElementAnimationEnd = 500 + (lastElementIndex * 120); // 500ms animation + staggered delay
    
    // Create colored overlay elements for each paragraph
    elements.forEach((el, index) => {
      const element = el as HTMLElement;
      
      // Set up the initial animation
      element.classList.add("animated-paragraph");
      element.style.animationDelay = `${index * 120}ms`;
      
      // Create a gradient overlay for this element
      const overlay = document.createElement('div');
      overlay.className = 'gradient-overlay';
      
      // Position the overlay exactly over the element
      const rect = element.getBoundingClientRect();
      overlay.style.position = 'absolute';
      overlay.style.left = `${element.offsetLeft}px`;
      overlay.style.top = `${element.offsetTop}px`;
      overlay.style.width = `${rect.width}px`;
      overlay.style.height = `${rect.height}px`;
      overlay.style.pointerEvents = 'none'; // Don't interfere with clicks
      
      // Insert overlay right after the element
      if (element.parentNode) {
        element.parentNode.insertBefore(overlay, element.nextSibling);
      }
    });
    
    // Store a reference to the current containerRef value for use in the timeout
    const currentContainer = containerRef.current;
    
    // After all elements have appeared, start the color transition
    setTimeout(() => {
      if (currentContainer) {
        // First transition - orange/blue gradient
        currentContainer.classList.add('show-gradient');
        
        // Second transition - fade to black
        setTimeout(() => {
          currentContainer.classList.add('fade-to-black');
          
          // Final cleanup - remove all overlays
          setTimeout(() => {
            const overlays = currentContainer.querySelectorAll('.gradient-overlay');
            overlays.forEach(overlay => {
              overlay.remove();
            });
          }, 2000); // After transition completes
        }, 1200);
      }
    }, lastElementAnimationEnd + 300);
    
  }, [html]);

  return (
    <div 
      className={`email-response-container ${className}`} 
      ref={containerRef}
      style={{ visibility: "hidden", position: "relative" }}
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
          position: relative;
          z-index: 1;
        }
        
        .fade-in {
          animation: fadeIn 0.5s ease-in-out forwards;
        }
        
        .animated-paragraph {
          opacity: 0;
          transform: translateY(8px);
          animation: fadeInUp 0.5s cubic-bezier(0.33, 1, 0.68, 1) forwards;
        }
        
        .gradient-overlay {
          background: linear-gradient(to right, #ff7e1d, #4287f5);
          opacity: 0;
          mix-blend-mode: multiply;
          z-index: 2;
          transition: all 1.5s cubic-bezier(0.22, 1, 0.36, 1);
        }
        
        .show-gradient .gradient-overlay {
          opacity: 0.7;
        }
        
        .fade-to-black .gradient-overlay {
          background: black;
          opacity: 0;
          transition: all 2s cubic-bezier(0.16, 1, 0.3, 1);
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
            transform: translateY(8px);
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