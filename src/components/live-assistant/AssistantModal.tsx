import React, { useEffect } from "react";
import { useLiveAssistant } from "./LiveAssistantProvider";
import { X } from "lucide-react"; // Using a Lucide icon for close

export default function AssistantModal() {
  const { assistantActive, setAssistantActive } = useLiveAssistant();

  useEffect(() => {
    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setAssistantActive(false);
      }
    };
    if (assistantActive) {
      document.addEventListener("keydown", handleEsc);
    }
    return () => {
      document.removeEventListener("keydown", handleEsc);
    };
  }, [assistantActive, setAssistantActive]);

  if (!assistantActive) return null;

  // Dynamically import VoiceChatPanel only on the client-side
  const VoiceChatPanel = typeof window !== "undefined" 
    ? require("./VoiceChatPanel").default 
    : () => null;


  return (
    <div
      className="fixed inset-0 z-[2000] bg-slate-800/75 flex items-center justify-center backdrop-blur-sm"
      aria-modal="true"
      role="dialog"
      onClick={() => setAssistantActive(false)} // Close on overlay click
    >
      <div
        className="bg-white rounded-3xl shadow-2xl p-8 pt-10 md:p-10 md:pt-12 min-w-[340px] w-full max-w-lg min-h-[320px] max-h-[90vh] flex flex-col items-center relative overflow-hidden"
        onClick={(e) => e.stopPropagation()} // Prevent closing when clicking inside modal
      >
        <button
          onClick={() => setAssistantActive(false)}
          aria-label="Close Assistant"
          className="absolute top-4 right-4 text-green-600 hover:text-green-800 transition-colors p-2 rounded-full hover:bg-green-100"
        >
          <X size={28} />
        </button>
        <div className="mt-0 mb-4 text-2xl font-semibold text-green-700">
          Ask NutriCare
        </div>
        <div className="w-full flex justify-center overflow-y-auto px-1 scrollbar-thin scrollbar-thumb-green-300 scrollbar-track-green-100">
          {/* Voice and text chat panel */}
          {VoiceChatPanel && <VoiceChatPanel />}
        </div>
      </div>
    </div>
  );
}
