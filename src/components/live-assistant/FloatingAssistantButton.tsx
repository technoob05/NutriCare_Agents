import React, { useState, useEffect, useRef, useCallback } from "react";
import { useLiveAssistant } from "./LiveAssistantProvider";
import { MessageSquareHeart, EyeOff, Eye, Settings, X, ChevronRight, MinusCircle } from "lucide-react";

export default function FloatingAssistantButton() {
  const { setAssistantActive } = useLiveAssistant();
  const [position, setPosition] = useState({ x: 2, y: 2 });
  const [isDragging, setIsDragging] = useState(false);
  const [isPressed, setIsPressed] = useState(false);
  const [showRipple, setShowRipple] = useState(false);
  const [ripplePosition, setRipplePosition] = useState({ x: 0, y: 0 });
  const [isHidden, setIsHidden] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const buttonRef = useRef<HTMLButtonElement>(null);
  const rippleRef = useRef<HTMLSpanElement>(null);
  const settingsTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Load settings from localStorage
  useEffect(() => {
    // Load position
    const savedPosition = localStorage.getItem("assistantButtonPosition");
    if (savedPosition) {
      try {
        const parsedPosition = JSON.parse(savedPosition);
        if (typeof parsedPosition.x === 'number' && typeof parsedPosition.y === 'number') {
          setPosition(parsedPosition);
        }
      } catch (e) {
        console.error("Failed to parse saved button position:", e);
        localStorage.removeItem("assistantButtonPosition");
      }
    }
    
    // Load visibility state
    const savedVisibility = localStorage.getItem("assistantButtonVisible");
    if (savedVisibility === "false") {
      setIsHidden(true);
    }
    
    // Load minimized state
    const savedMinimized = localStorage.getItem("assistantButtonMinimized");
    if (savedMinimized === "true") {
      setIsMinimized(true);
    }
  }, []);

  // Save settings to localStorage
  useEffect(() => {
    localStorage.setItem("assistantButtonPosition", JSON.stringify(position));
  }, [position]);
  
  useEffect(() => {
    localStorage.setItem("assistantButtonVisible", (!isHidden).toString());
  }, [isHidden]);
  
  useEffect(() => {
    localStorage.setItem("assistantButtonMinimized", isMinimized.toString());
  }, [isMinimized]);

  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
    if (buttonRef.current) {
      setIsPressed(true);
      setIsDragging(true);
      const rect = buttonRef.current.getBoundingClientRect();
      dragStartRef.current = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      };
      
      // Create ripple effect at click position
      setRipplePosition({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      });
      setShowRipple(true);
      
      // Prevent text selection during drag
      e.preventDefault();
    }
  }, []);
  
  // Handle keyboard shortcut to show hidden button
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Alt+N shortcut to show the button if hidden
      if (e.altKey && e.key === 'n') {
        setIsHidden(false);
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Reset ripple effect
  useEffect(() => {
    if (showRipple) {
      const timer = setTimeout(() => {
        setShowRipple(false);
      }, 600);
      return () => clearTimeout(timer);
    }
  }, [showRipple]);
  
  // Auto-hide settings panel after inactivity
  useEffect(() => {
    if (showSettings) {
      if (settingsTimeoutRef.current) {
        clearTimeout(settingsTimeoutRef.current);
      }
      
      settingsTimeoutRef.current = setTimeout(() => {
        setShowSettings(false);
      }, 5000); // Hide after 5 seconds of inactivity
      
      return () => {
        if (settingsTimeoutRef.current) {
          clearTimeout(settingsTimeoutRef.current);
        }
      };
    }
  }, [showSettings]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (isDragging && buttonRef.current) {
      let newX = e.clientX - dragStartRef.current.x;
      let newY = e.clientY - dragStartRef.current.y;

      const newXRem = (window.innerWidth - (newX + buttonRef.current.offsetWidth)) / 16;
      const newYRem = (window.innerHeight - (newY + buttonRef.current.offsetHeight)) / 16;
      
      setPosition({ x: Math.max(0.5, newXRem), y: Math.max(0.5, newYRem) });
    }
  }, [isDragging]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    setIsPressed(false);
  }, []);

  useEffect(() => {
    if (isDragging) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
    } else {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    }
    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging, handleMouseMove, handleMouseUp]);

  const handleClick = () => {
    if (!isDragging && !showSettings) { 
      setAssistantActive(true);
    }
    dragStartRef.current = { x: 0, y: 0 };
  };
  
  const toggleSettings = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowSettings(!showSettings);
    // Reset timeout when toggling settings
    if (settingsTimeoutRef.current) {
      clearTimeout(settingsTimeoutRef.current);
    }
  };
  
  const toggleVisibility = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsHidden(true);
  };
  
  const toggleMinimized = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsMinimized(!isMinimized);
  };
  
  // Return hidden indicator when button is hidden
  if (isHidden) {
    return (
      <div 
        onClick={() => setIsHidden(false)}
        style={{
          position: "fixed",
          bottom: "0.5rem",
          right: "0.5rem",
          zIndex: 1000,
          width: "8px",
          height: "8px",
          background: "linear-gradient(135deg, #22c55e 0%, #14b8a6 100%)",
          borderRadius: "50%",
          opacity: 0.6,
          cursor: "pointer",
          boxShadow: "0 0 10px rgba(20, 184, 166, 0.5)",
          transition: "all 0.3s ease",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = "scale(1.5)";
          e.currentTarget.style.opacity = "1";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = "scale(1)";
          e.currentTarget.style.opacity = "0.6";
        }}
        title="Show NutriCare Assistant (Alt+N)"
      />
    );
  }

  return (
    <div style={{ position: "fixed", bottom: `${position.y}rem`, right: `${position.x}rem`, zIndex: 1000 }}>
      {/* Settings panel */}
      {showSettings && (
        <div
          style={{
            position: "absolute",
            bottom: "calc(100% + 0.5rem)",
            right: "0",
            background: "rgba(255, 255, 255, 0.95)",
            backdropFilter: "blur(10px)",
            WebkitBackdropFilter: "blur(10px)",
            borderRadius: "12px",
            padding: "1rem",
            boxShadow: "0 10px 25px rgba(0, 0, 0, 0.1), 0 5px 10px rgba(0, 0, 0, 0.05)",
            width: "220px",
            animation: "slideIn 0.3s ease-out forwards",
            transformOrigin: "bottom right",
            border: "1px solid rgba(0, 0, 0, 0.05)",
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div style={{ 
            display: "flex", 
            justifyContent: "space-between", 
            alignItems: "center", 
            marginBottom: "0.75rem",
            borderBottom: "1px solid rgba(0, 0, 0, 0.05)",
            paddingBottom: "0.5rem"
          }}>
            <span style={{ 
              fontWeight: 600, 
              fontSize: "0.9rem", 
              color: "#333" 
            }}>NutriCare Settings</span>
            <X 
              size={16} 
              color="#666"
              style={{ cursor: "pointer" }}
              onClick={toggleSettings}
            />
          </div>
          
          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            <button
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                background: "white",
                border: "1px solid rgba(0, 0, 0, 0.1)",
                borderRadius: "8px",
                padding: "0.5rem",
                cursor: "pointer",
                transition: "all 0.2s ease",
                color: "#333",
                fontSize: "0.85rem",
                fontWeight: 500,
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "#f5f5f5"}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "white"}
              onClick={toggleVisibility}
            >
              <EyeOff size={16} />
              Hide Assistant
            </button>
            
            <button
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                background: "white",
                border: "1px solid rgba(0, 0, 0, 0.1)",
                borderRadius: "8px",
                padding: "0.5rem",
                cursor: "pointer",
                transition: "all 0.2s ease",
                color: "#333",
                fontSize: "0.85rem",
                fontWeight: 500,
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "#f5f5f5"}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "white"}
              onClick={toggleMinimized}
            >
              {isMinimized ? <Eye size={16} /> : <MinusCircle size={16} />}
              {isMinimized ? "Show Full Button" : "Show Icon Only"}
            </button>
            
            <div style={{ 
              fontSize: "0.7rem", 
              color: "#666", 
              marginTop: "0.5rem", 
              textAlign: "center" 
            }}>
              Press Alt+N to restore if hidden
            </div>
          </div>
        </div>
      )}
      
      <button
        ref={buttonRef}
        onClick={handleClick}
        onMouseDown={handleMouseDown}
        aria-label="Ask Nutri Care"
        style={{
          position: "relative", // Changed from fixed to relative since parent div is fixed
          zIndex: 1000,
          background: "linear-gradient(135deg, #22c55e 0%, #14b8a6 100%)",
          color: "#fff",
          border: "none",
          borderRadius: "18px",
          width: "auto",
          minWidth: isMinimized ? "56px" : "64px",
          height: isMinimized ? "56px" : "64px",
          padding: isMinimized ? "0" : "0 20px",
          boxShadow: isPressed 
            ? "0 2px 10px rgba(20, 184, 166, 0.25), 0 1px 3px rgba(34, 197, 94, 0.15), inset 0 1px 3px rgba(255, 255, 255, 0.1)" 
            : "0 10px 25px rgba(20, 184, 166, 0.35), 0 3px 8px rgba(34, 197, 94, 0.2), 0 0 0 1px rgba(255, 255, 255, 0.1) inset",
          cursor: isDragging ? "grabbing" : "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          transition: "all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)",
          userSelect: "none",
          gap: isMinimized ? "0" : "10px",
          transform: isPressed ? "scale(0.96)" : "scale(1)",
          backdropFilter: "blur(5px)",
          WebkitBackdropFilter: "blur(5px)",
          overflow: "hidden",
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = "scale(1.05)";
          e.currentTarget.style.boxShadow = "0 15px 30px rgba(20, 184, 166, 0.4), 0 5px 12px rgba(34, 197, 94, 0.25), 0 0 0 1px rgba(255, 255, 255, 0.15) inset";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = "scale(1)";
          e.currentTarget.style.boxShadow = "0 10px 25px rgba(20, 184, 166, 0.35), 0 3px 8px rgba(34, 197, 94, 0.2), 0 0 0 1px rgba(255, 255, 255, 0.1) inset";
        }}
    >
      {/* Ripple effect */}
      {showRipple && (
        <span
          ref={rippleRef}
          style={{
            position: "absolute",
            top: `${ripplePosition.y}px`,
            left: `${ripplePosition.x}px`,
            width: "150px",
            height: "150px",
            backgroundColor: "rgba(255, 255, 255, 0.4)",
            borderRadius: "50%",
            transform: "translate(-50%, -50%) scale(0)",
            animation: "ripple 0.6s linear",
            pointerEvents: "none",
          }}
        />
      )}
      
      {/* Pulse effect around icon */}
      <div style={{
        position: "relative",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}>
        <span style={{
          position: "absolute",
          width: isMinimized ? "36px" : "42px",
          height: isMinimized ? "36px" : "42px",
          borderRadius: "50%",
          background: "rgba(255, 255, 255, 0.15)",
          animation: "pulse 2s infinite",
          pointerEvents: "none",
        }} />
        <MessageSquareHeart size={isMinimized ? 24 : 28} style={{
          filter: "drop-shadow(0 1px 2px rgba(0, 0, 0, 0.1))",
          animation: "float 3s ease-in-out infinite",
        }} />
      </div>
      
      {!isMinimized && (
        <span style={{ 
          fontWeight: 700, 
          fontSize: "1.05rem", 
          lineHeight: "1",
          letterSpacing: "-0.01em",
          textShadow: "0 1px 2px rgba(0, 0, 0, 0.1)",
          background: "linear-gradient(to right, #ffffff, rgba(255, 255, 255, 0.85))",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
        }}>
          Ask NutriCare
        </span>
      )}
      
      {/* Settings button */}
      <button 
        onClick={toggleSettings} 
        style={{
          position: "absolute",
          top: "-8px",
          right: "-8px",
          width: "24px",
          height: "24px",
          borderRadius: "50%",
          backgroundColor: "rgba(255, 255, 255, 0.9)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          border: "none",
          boxShadow: "0 2px 5px rgba(0, 0, 0, 0.1)",
          cursor: "pointer",
          zIndex: 2,
          padding: 0,
          transform: showSettings ? "rotate(180deg)" : "rotate(0deg)",
          transition: "transform 0.3s ease",
        }}
        aria-label="Button Settings"
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = "white";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = "rgba(255, 255, 255, 0.9)";
        }}
      >
        <Settings size={14} color="#14b8a6" />
      </button>
      
      {/* CSS animations */}
      <style jsx>{`
        @keyframes ripple {
          to {
            transform: translate(-50%, -50%) scale(4);
            opacity: 0;
          }
        }
        
        @keyframes pulse {
          0% {
            transform: scale(0.95);
            opacity: 0.5;
          }
          50% {
            transform: scale(1.05);
            opacity: 0.2;
          }
          100% {
            transform: scale(0.95);
            opacity: 0.5;
          }
        }
        
        @keyframes float {
          0% {
            transform: translateY(0px);
          }
          50% {
            transform: translateY(-2px);
          }
          100% {
            transform: translateY(0px);
          }
        }
        
        @keyframes slideIn {
          from {
            opacity: 0;
            transform: scale(0.9) translateY(10px);
          }
          to {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }
        
        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
      `}</style>
    </button>
  </div>
  );
}