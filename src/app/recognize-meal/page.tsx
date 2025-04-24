'use client';

import React, { useState, useRef, ChangeEvent, useEffect, useCallback } from 'react';
import { MainNav } from '@/components/main-nav'; // Changed to named import and corrected path
import { Sidebar } from '@/components/ui/sidebar'; // Changed to named import
import { Button } from '@/components/ui/button'; // Corrected path alias if needed
import { Input } from '@/components/ui/input'; // Corrected path alias if needed
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, Terminal, Camera as CameraIcon, Upload, Play, Pause, X, Sparkles, ChefHat, HeartPulse, Link as LinkIcon, Mic } from "lucide-react"; // Added more friendly icons
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from "@/lib/utils"; // For conditional classes

// Component to render streaming text with a blinking cursor effect
const StreamingTextRenderer = ({ text, isStreaming }: { text: string | null, isStreaming: boolean }) => {
    if (text === null) return null;

    // Simple approach: split by newline and wrap paragraphs/list items
    const lines = text.split('\n').map((line, index) => {
        line = line.trim();
        if (!line) return null; // Skip empty lines
        if (/^\d+\.\s/.test(line)) {
            return <li key={index} className="ml-4 mb-1">{line.substring(line.indexOf('.') + 1).trim()}</li>;
        }
        return <p key={index} className="mb-2">{line}</p>;
    });

    return (
        <div className="prose prose-sm max-w-none relative">
            {lines}
            {isStreaming && <span className="inline-block w-2 h-4 bg-primary animate-blink ml-1"></span>}
        </div>
    );
};

// Blinking cursor animation
const blinkAnimation = `
  @keyframes blink {
    0%, 100% { opacity: 1; }
    50% { opacity: 0; }
  }
  .animate-blink {
    animation: blink 1s step-end infinite;
  }
`;

export default function RecognizeMealPage() {
    // State variables
    const [mealNameInput, setMealNameInput] = useState('');
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [imageBase64, setImageBase64] = useState<string | null>(null);
    const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
    const [recognizedMeal, setRecognizedMeal] = useState<string | null>(null);
    const [cookingInstructions, setCookingInstructions] = useState<string | null>(null);
    const [isStreamingInstructions, setIsStreamingInstructions] = useState(false);
    const [nutritionInfo, setNutritionInfo] = useState<string | null>(null);
    const [isStreamingNutrition, setIsStreamingNutrition] = useState(false);
    const [sourceUrlRecipe, setSourceUrlRecipe] = useState<string | null>(null); // Primary source URL
    const [allSourceUrlsRecipe, setAllSourceUrlsRecipe] = useState<string[]>([]); // All found URLs
    const [sourceUrlNutrition, setSourceUrlNutrition] = useState<string | null>(null); // Primary source URL
    const [allSourceUrlsNutrition, setAllSourceUrlsNutrition] = useState<string[]>([]); // All found URLs
    const [isLoading, setIsLoading] = useState(false); // Overall loading state
    const [isProcessing, setIsProcessing] = useState(false); // More specific processing state
    const [error, setError] = useState<string | null>(null);
    const [isCameraOpen, setIsCameraOpen] = useState(false);
    const [isPlaying, setIsPlaying] = useState(false);
    const [isUsingFallbackTTS, setIsUsingFallbackTTS] = useState(false); // Track if fallback is used
    const [isFlashing, setIsFlashing] = useState(false); // State for camera flash effect
    const [isCameraReady, setIsCameraReady] = useState(false); // New state to track camera readiness
    const [googleTtsRequested, setGoogleTtsRequested] = useState(false); // Track if user requested Google TTS for current text
    const [googleTtsLoading, setGoogleTtsLoading] = useState(false); // Loading state for Google TTS fetch

    // Refs
    const fileInputRef = useRef<HTMLInputElement>(null);
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const audioRef = useRef<HTMLAudioElement>(null);
    const currentUtterance = useRef<SpeechSynthesisUtterance | null>(null); // Ref for ANY browser utterance
    const streamRef = useRef<MediaStream | null>(null);
    const isMobile = useIsMobile();

    // --- File & Camera Handling ---
    const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            stopCamera();
            setSelectedFile(file);
            setError(null);
            const reader = new FileReader();
            reader.onloadend = () => {
                const result = reader.result as string;
                setImagePreviewUrl(result);
                const base64String = result?.split(',')[1];
                setImageBase64(base64String || null);
            };
            reader.onerror = () => setError("Error reading file.");
            reader.readAsDataURL(file);
        }
    };

    // Enhanced camera startup
    const startCamera = async () => {
        console.log("startCamera called");
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
            try {
                resetImageData();
                console.log("Requesting camera permission...");
                
                // Stop any existing stream first
                if (streamRef.current) {
                    streamRef.current.getTracks().forEach(track => track.stop());
                }
                
                // Request camera access with max resolution for better quality
                const stream = await navigator.mediaDevices.getUserMedia({ 
                    video: { 
                        facingMode: 'environment',
                        width: { ideal: 1920 },
                        height: { ideal: 1080 }
                    } 
                });
                
                console.log("Camera permission granted, stream obtained.");
                streamRef.current = stream;
                
                // Set camera open state first
                setIsCameraOpen(true);
                setError(null);
                
                // Reset camera ready state - will be set to true once video is loaded
                setIsCameraReady(false);
                
            } catch (err) {
                console.error("Error in startCamera getting stream:", err);
                setError(`Lỗi camera: ${err instanceof Error ? err.message : String(err)}. Vui lòng kiểm tra quyền truy cập.`);
                setIsCameraOpen(false);
            }
        } else {
            console.error("getUserMedia not supported");
            setError("Trình duyệt không hỗ trợ truy cập camera.");
        }
    };

    // Improved camera stopping
    const stopCamera = useCallback(() => {
        // Always clear any errors when stopping the camera
        setError(null);
        
        // Stop all tracks in the current stream
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => {
                console.log(`Stopping track: ${track.kind}, enabled: ${track.enabled}`);
                track.stop();
            });
            streamRef.current = null;
        }
        
        // Clear video source
        if (videoRef.current) {
            videoRef.current.srcObject = null;
            videoRef.current.load(); // Force reload of video element
        }
        
        // Reset states
        setIsCameraOpen(false);
        setIsCameraReady(false);
    }, []);

    // Enhanced capture photo function with better error handling and debugging
    const capturePhoto = () => {
        console.log("capturePhoto called");
        
        // Check if camera is ready
        if (!isCameraReady) {
            setError("Camera isn't fully initialized yet. Please wait a moment.");
            console.error("Camera not ready for capture");
            return;
        }
        
        // Check required refs
        if (!videoRef.current || !canvasRef.current) {
            setError("Camera or canvas component not available.");
            console.error("Missing refs for capture: video or canvas");
            return;
        }
        
        const video = videoRef.current;
        const canvas = canvasRef.current;
        
        try {
            // Log video state for debugging
            console.log(`Video state: readyState=${video.readyState}, paused=${video.paused}`);
            console.log(`Video dimensions: ${video.videoWidth}x${video.videoHeight}`);
            
            // Check if video has valid dimensions
            if (video.videoWidth <= 0 || video.videoHeight <= 0) {
                setError("Camera stream not ready. Please wait a moment or restart camera.");
                console.error("Invalid video dimensions for capture");
                return;
            }
            
            // Set canvas dimensions to match video
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            console.log(`Canvas set to: ${canvas.width}x${canvas.height}`);
            
            // Get context and ensure it exists
            const context = canvas.getContext('2d');
            if (!context) {
                setError("Could not get canvas context.");
                console.error("Failed to get 2d context from canvas");
                return;
            }
            
            // Draw image with error handling
            try {
                // Draw video frame to canvas
                context.drawImage(video, 0, 0, canvas.width, canvas.height);
                console.log("Successfully drew video frame to canvas");
            } catch (drawError) {
                console.error("Error during canvas drawImage:", drawError);
                setError(`Failed to capture image: ${drawError instanceof Error ? drawError.message : String(drawError)}`);
                return;
            }
            
            // Convert canvas to data URL
            try {
                const dataUrl = canvas.toDataURL('image/jpeg', 0.95); // Higher quality JPEG
                
                // Verify data URL is valid
                if (!dataUrl || dataUrl === 'data:,' || dataUrl.length < 50) {
                    console.error("Invalid data URL from canvas:", dataUrl?.substring(0, 20));
                    setError("Failed to convert canvas to image.");
                    return;
                }
                
                console.log(`Data URL generated successfully (${dataUrl.length} chars)`);
                
                // Set states with the captured image
                setImagePreviewUrl(dataUrl);
                const base64Data = dataUrl.split(',')[1];
                if (!base64Data) {
                    throw new Error("Failed to extract base64 data from image");
                }
                setImageBase64(base64Data);
                setSelectedFile(null); // Clear any existing file selection
                
                // Trigger flash effect
                setIsFlashing(true);
                setTimeout(() => setIsFlashing(false), 150);
                
                // Close camera after successful capture
                console.log("Photo captured successfully, stopping camera");
                stopCamera();
                
            } catch (dataUrlError) {
                console.error("Error generating data URL:", dataUrlError);
                setError(`Failed to process captured image: ${dataUrlError instanceof Error ? dataUrlError.message : String(dataUrlError)}`);
            }
            
        } catch (generalError) {
            console.error("General error in capturePhoto:", generalError);
            setError(`Lỗi chụp ảnh: ${generalError instanceof Error ? generalError.message : String(generalError)}`);
        }
    };

    // --- Video Element Setup ---
    // Effect to handle video element events and stream connection
    useEffect(() => {
        const videoElement = videoRef.current;
        
        if (isCameraOpen && videoElement && streamRef.current) {
            console.log("Setting up video with stream");
            
            // Create handlers for video events
            const handleCanPlay = () => {
                console.log("Video canplay event triggered");
                setIsCameraReady(true);
                // Try playing the video again to ensure it starts
                videoElement.play().catch(e => console.error("Play failed in canplay handler:", e));
            };
            
            const handleError = (e: Event) => {
                console.error("Video error event:", e);
                const videoError = videoElement.error;
                setError(`Camera error: ${videoError ? `code ${videoError.code}` : 'unknown'}`);
                setIsCameraReady(false);
            };
            
            // Add event listeners
            videoElement.addEventListener('canplay', handleCanPlay);
            videoElement.addEventListener('error', handleError);
            
            // Set the stream as source for video element
            videoElement.srcObject = streamRef.current;
            
            // Try to play the video
            videoElement.play().catch(e => {
                console.error("Initial video.play() failed:", e);
                // Don't set error here as mobile browsers often require user interaction
            });
            
            // Cleanup function
            return () => {
                videoElement.removeEventListener('canplay', handleCanPlay);
                videoElement.removeEventListener('error', handleError);
            };
        }
    }, [isCameraOpen]);

    // Cleanup effect when component unmounts
    useEffect(() => {
        return () => {
            // Ensure camera is stopped when component unmounts
            if (streamRef.current) {
                streamRef.current.getTracks().forEach(track => track.stop());
                streamRef.current = null;
            }
        };
    }, []);

    const resetImageData = () => {
        setSelectedFile(null);
        setImageBase64(null);
        setImagePreviewUrl(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    // --- Stream Reading Function ---
    const readStream = async (
        response: Response,
        setText: React.Dispatch<React.SetStateAction<string | null>>,
        setIsStreaming: React.Dispatch<React.SetStateAction<boolean>>,
        setPrimarySourceUrl?: React.Dispatch<React.SetStateAction<string | null>>,
        setAllSourceUrls?: React.Dispatch<React.SetStateAction<string[]>>, // Add setter for all URLs
        onFirstChunkCallback?: (chunkText: string) => void
    ): Promise<string> => {
        if (!response.body) {
            throw new Error("Response body is null");
        }
        if (!response.body) {
            throw new Error("Response body is null");
        }
        setText(""); // Clear previous text
        setIsStreaming(true);
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let fullText = "";
        let firstChunkProcessed = false; // Track first chunk for immediate TTS

        // Extract source URLs from headers
        const primaryUrlHeader = response.headers.get('X-Source-Url');
        const allUrlsJsonHeader = response.headers.get('X-Source-Urls-Json');

        if (setPrimarySourceUrl && primaryUrlHeader) {
            try {
                setPrimarySourceUrl(decodeURIComponent(primaryUrlHeader));
            } catch { /* ignore decode error */ }
        }

        if (setAllSourceUrls && allUrlsJsonHeader) {
            try {
                const urls = JSON.parse(allUrlsJsonHeader);
                if (Array.isArray(urls)) {
                    const validUrls = urls.filter(url => typeof url === 'string');
                    console.log("Received all source URLs:", validUrls); // Log received URLs
                    setAllSourceUrls(validUrls);
                } else {
                     console.warn("X-Source-Urls-Json header did not contain a valid array:", allUrlsJsonHeader);
                     setAllSourceUrls([]);
                }
            } catch (e) {
                console.error("Failed to parse X-Source-Urls-Json header:", e, "Raw:", allUrlsJsonHeader);
                setAllSourceUrls([]); // Reset to empty array on error
            }
        } else if (setAllSourceUrls) {
             console.log("X-Source-Urls-Json header not found.");
             setAllSourceUrls([]); // Reset if header is missing
        }


        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            const chunk = decoder.decode(value, { stream: true });
            fullText += chunk;
            setText(prev => (prev ?? "") + chunk);

            // Call callback with the *full text accumulated so far* on the first pass
            // if (!firstChunkProcessed && onFirstChunkCallback && fullText.trim().length > 0) { // Check fullText length
            // Simplified: Call on every chunk containing potential sentence end for quicker reaction
            if (onFirstChunkCallback && chunk.search(/[.!?]/) !== -1 && !firstChunkProcessed) {
                 onFirstChunkCallback(fullText); // Pass accumulated text
                 firstChunkProcessed = true; // Only trigger once
            }
        }
        setIsStreaming(false);
        return fullText; // Return the complete text
    };

    // --- Browser TTS Playback Function ---
    const playBrowserTTS = (text: string) => {
        if (!text || !('speechSynthesis' in window)) {
            console.log("Skipping browser TTS (not supported or empty text).");
            return;
        }

        // Cancel any previous speech (browser or Google audio)
        window.speechSynthesis.cancel();
        if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current.src = '';
        }
        setGoogleTtsRequested(false); // Reset Google request flag

        try {
            const utterance = new SpeechSynthesisUtterance(text);
            utterance.lang = 'vi-VN';
            utterance.rate = 1.0;
            utterance.pitch = 1.0;

            utterance.onstart = () => {
                console.log("Browser TTS started.");
                setIsPlaying(true);
                setIsUsingFallbackTTS(true); // Indicate browser voice is active
                currentUtterance.current = utterance;
            };
            utterance.onend = () => {
                console.log("Browser TTS finished.");
                if (currentUtterance.current === utterance) {
                    currentUtterance.current = null;
                    setIsPlaying(false);
                    setIsUsingFallbackTTS(false); // No longer actively using browser voice
                }
            };
            utterance.onerror = (event: SpeechSynthesisErrorEvent) => {
                console.error("Browser TTS error:", event.error);
                if (currentUtterance.current === utterance) {
                    currentUtterance.current = null;
                    setIsPlaying(false);
                    setIsUsingFallbackTTS(false);
                }
                setError(`Lỗi phát âm thanh trình duyệt: ${event.error}`);
            };
            window.speechSynthesis.speak(utterance);
        } catch (e) {
            console.error("Error starting browser TTS:", e);
            setError(`Không thể bắt đầu giọng đọc trình duyệt: ${e instanceof Error ? e.message : String(e)}`);
            setIsPlaying(false);
            setIsUsingFallbackTTS(false);
        }
    };


    // --- Google Cloud TTS Generation and Playback Function ---
    const playGoogleTTS = async (text: string) => {
         if (!text || !audioRef.current) {
            console.log("Skipping Google TTS (no text or audio element).");
            return;
        }

        // Cancel any ongoing browser speech
        if (currentUtterance.current) {
            console.log("Google TTS requested, cancelling browser TTS.");
            window.speechSynthesis.cancel();
            currentUtterance.current = null;
        }
        setIsUsingFallbackTTS(false); // Switching to Google TTS
        setIsPlaying(false); // Stop showing play state until Google audio starts
        setGoogleTtsRequested(true); // Mark that Google TTS was requested
        setGoogleTtsLoading(true); // Show loading indicator for Google TTS

        // Reset Google audio element
        audioRef.current.pause();
        audioRef.current.src = '';

        console.log("Attempting Google Cloud TTS fetch for:", text.substring(0, 50) + "...");
        try {
            const ttsResponse = await fetch('/api/tts', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text }),
            });

            if (!ttsResponse.ok) {
                // Throw error to trigger fallback
                const errorBody = await ttsResponse.text(); // Get error text from backend
                throw new Error(`Google TTS API failed (${ttsResponse.status}): ${errorBody || ttsResponse.statusText}`);
            }

            const audioBlob = await ttsResponse.blob();
            if (audioBlob.size === 0) {
                throw new Error("Google TTS API returned empty audio data.");
            }

            // Google TTS Success: Prepare and Play
            const objectURL = URL.createObjectURL(audioBlob);
            audioRef.current.src = objectURL;
            audioRef.current.play()
                .then(() => {
                    setIsPlaying(true); // Set playing state *only* on successful play start
                    console.log("Google Cloud TTS playback started.");
                })
                .catch(e => {
                    console.error("Google Cloud TTS auto-play failed:", e);
                    setIsPlaying(false); // Ensure state is correct if autoplay fails
                    setError("Không thể tự động phát âm thanh Google.");
                    try { URL.revokeObjectURL(objectURL); } catch {}
                });

        } catch (error) {
            console.error("Error fetching or playing Google TTS:", error);
            setError(`Lỗi tải giọng đọc Google: ${error instanceof Error ? error.message : String(error)}`);
            setIsPlaying(false);
            setGoogleTtsRequested(false); // Reset flag on error
            // Optionally: Fallback to browser TTS again if Google fails?
            // playBrowserTTS(text);
        }
    };

    // --- Main Data Fetching Logic ---
    const handleRecognize = async () => {
        if (!imageBase64 && !mealNameInput) {
            setError('Cho mình xin tên món ăn hoặc hình ảnh nhé!');
            return;
        }

        setIsLoading(true);
        setIsProcessing(true); // Start overall processing indicator
        setError(null);
        setRecognizedMeal(null);
        setCookingInstructions(null);
        setNutritionInfo(null);
        setSourceUrlRecipe(null); // Reset primary URL
        setAllSourceUrlsRecipe([]);
        setSourceUrlNutrition(null);
        setAllSourceUrlsNutrition([]);
        setGoogleTtsRequested(false); // Reset Google TTS request on new recognition
        setGoogleTtsLoading(false);
        setIsStreamingInstructions(false);
        setIsStreamingNutrition(false);
        if (audioRef.current) audioRef.current.pause();
        window.speechSynthesis?.cancel(); // Stop previous browser speech
        currentUtterance.current = null; // Clear utterance ref
        setIsPlaying(false);
        setIsUsingFallbackTTS(false);

        let currentMealName = mealNameInput;
        let currentDetailedDescription = ""; // Variable to hold the description
        let mimeType = selectedFile?.type || 'image/jpeg';

        try {
            // 1. Recognize Meal & Get Description (Not streaming)
            if (imageBase64) {
                console.log("Sending image for recognition and description...");
                const recognizeResponse = await fetch('/api/recognize-meal', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ imageBase64, mimeType }),
                });
                if (!recognizeResponse.ok) {
                    const errorData = await recognizeResponse.json();
                    throw new Error(errorData.error || `Recognition failed: ${recognizeResponse.statusText}`);
                }
                const recognizeData = await recognizeResponse.json();
                currentMealName = recognizeData.mealName;
                currentDetailedDescription = recognizeData.detailedDescription; // Store the description
                setRecognizedMeal(currentMealName);
                console.log("Received Description:", currentDetailedDescription); // Log for debugging
            } else if (mealNameInput) {
                setRecognizedMeal(`Đang tìm thông tin cho: ${mealNameInput}`);
                // No detailed description if only name is provided
            }

            if (!currentMealName) throw new Error("Could not determine meal name.");

            // 2. Fetch Instructions (Streaming) & Trigger TTS afterwards
            console.log(`Fetching cooking instructions stream for: ${currentMealName} (using description: ${!!currentDetailedDescription})`);
            const instructionsPayload = {
                mealName: currentMealName,
                detailedDescription: currentDetailedDescription || undefined // Send description if available
            };
            const instructionsResponse = await fetch('/api/get-cooking-instructions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(instructionsPayload),
            });

            if (!instructionsResponse.ok) {
                const errorData = await instructionsResponse.json(); // Assume error is JSON
                setCookingInstructions(`Lỗi lấy hướng dẫn: ${errorData.error || instructionsResponse.statusText}`);
                setIsStreamingInstructions(false);
            } else {
                // Start streaming instructions
                readStream(
                    instructionsResponse,
                    setCookingInstructions,
                    setIsStreamingInstructions,
                    setSourceUrlRecipe, // Setter for primary URL
                    setAllSourceUrlsRecipe
                    // No immediate TTS callback needed here anymore
                )
                .then(fullText => {
                    // Once FULL text stream is complete, play using BROWSER TTS by default
                    if (fullText && !fullText.startsWith("Ui, mình không tìm thấy")) {
                       playBrowserTTS(fullText); // Default to browser voice
                    } else {
                        console.log("Skipping default browser TTS due to empty or 'not found' instructions.");
                    }
                })
                .catch(streamError => {
                    console.error("Instruction stream error:", streamError);
                    setError(`Lỗi khi đang tải hướng dẫn: ${streamError.message}`);
                    setCookingInstructions(null); // Clear partial stream on error
                    setIsStreamingInstructions(false);
                    window.speechSynthesis?.cancel(); // Stop browser TTS on error too
                    currentUtterance.current = null;
                    setIsPlaying(false);
                    setIsUsingFallbackTTS(false);
                    });
            }

            // 3. Fetch Nutrition Info (Streaming) - Run concurrently
            console.log(`Fetching nutrition info stream for: ${currentMealName} (using description: ${!!currentDetailedDescription})`);
            const nutritionPayload = {
                mealName: currentMealName,
                detailedDescription: currentDetailedDescription || undefined // Send description if available
            };
            const nutritionResponse = await fetch('/api/get-nutrition-info', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(nutritionPayload),
            });

            if (!nutritionResponse.ok) {
                const errorData = await nutritionResponse.json(); // Assume error is JSON
                setNutritionInfo(`Lỗi lấy thông tin dinh dưỡng: ${errorData.error || nutritionResponse.statusText}`);
                setIsStreamingNutrition(false);
            } else {
                // Start streaming nutrition info
                readStream(
                    nutritionResponse,
                    setNutritionInfo,
                    setIsStreamingNutrition,
                    setSourceUrlNutrition, // Setter for primary URL
                    setAllSourceUrlsNutrition // Setter for all URLs
                )
                .catch(streamError => {
                    console.error("Nutrition stream error:", streamError);
                    setError(`Lỗi khi đang tải thông tin dinh dưỡng: ${streamError.message}`);
                    setNutritionInfo(null); // Clear partial stream on error
                    setIsStreamingNutrition(false);
                });
            }

        } catch (err: any) {
            console.error("Processing error:", err);
            setError(err.error || err.message || 'Oops, có lỗi xảy ra rồi!');
            // Clear all results on major error
            setRecognizedMeal(null); setCookingInstructions(null);
            setNutritionInfo(null);
            setSourceUrlRecipe(null); setAllSourceUrlsRecipe([]);
            setSourceUrlNutrition(null); setAllSourceUrlsNutrition([]);
            setGoogleTtsRequested(false);
            setGoogleTtsLoading(false);
            setIsStreamingInstructions(false); setIsStreamingNutrition(false);
            window.speechSynthesis?.cancel();
            currentUtterance.current = null;
            setIsPlaying(false);
            setIsUsingFallbackTTS(false);
        } finally {
            setIsLoading(false);
        }
    };

    // --- TTS Playback Control (Handles both engines) ---
    const togglePlayPause = () => {
        // Priority 1: Control Browser Speech Synthesis
        if (currentUtterance.current && 'speechSynthesis' in window) {
            if (speechSynthesis.paused) {
                console.log("Resuming browser TTS");
                speechSynthesis.resume();
                setIsPlaying(true); // Should update via onresume if available, but set manually too
            } else if (speechSynthesis.speaking) {
                console.log("Pausing browser TTS");
                speechSynthesis.pause();
                 setIsPlaying(false); // Should update via onpause if available, but set manually too
            }
            // Note: Simple pause/resume. Stopping requires cancelling via other means (e.g., new request).
        }
        // Priority 2: Control Google TTS Audio Element
        else if (audioRef.current && audioRef.current.src && googleTtsRequested) {
             const audio = audioRef.current;
             if (isPlaying) {
                 console.log("Pausing Google TTS audio");
                 audio.pause();
                 // isPlaying state updated by 'pause' event listener attached in useEffect
             } else if (audio.readyState >= 2) { // Check if ready to play
                 console.log("Playing Google TTS audio");
                 audio.play().catch(e => {
                     console.error("Manual Google audio play failed:", e);
                     setError("Không thể phát lại âm thanh Google.");
                     setIsPlaying(false);
                 });
                 // isPlaying state updated by 'play' event listener attached in useEffect
             } else {
                  console.warn("Google audio not ready for playback.");
             }
         } else {
             console.log("No active TTS to toggle.");
         }
    };

    // Effect to handle audio element events and cleanup object URLs
    useEffect(() => {
        const audioElement = audioRef.current;
        if (!audioElement) return;

        const handlePlay = () => setIsPlaying(true);
        const handlePause = () => setIsPlaying(false);
        const handleEnded = () => {
            setIsPlaying(false);
            // Clean up Object URL after playback finishes
            if (audioElement.src.startsWith('blob:')) {
                console.log("Revoking Object URL:", audioElement.src);
                URL.revokeObjectURL(audioElement.src);
            }
        };

        audioElement.addEventListener('play', handlePlay);
        audioElement.addEventListener('pause', handlePause);
        audioElement.addEventListener('ended', handleEnded);

        // Cleanup function
        return () => {
            audioElement.removeEventListener('play', handlePlay);
            audioElement.removeEventListener('pause', handlePause);
            audioElement.removeEventListener('ended', handleEnded);
            // Also revoke URL on unmount or src change if it's a blob URL
            if (audioElement.src.startsWith('blob:')) {
                console.log("Revoking Object URL on cleanup:", audioElement.src);
                URL.revokeObjectURL(audioElement.src);
            }
            // Cancel any ongoing browser speech on unmount
            window.speechSynthesis?.cancel();
        };
    }, []); // Run only once on mount to attach listeners

    // Effect to cancel speech synthesis if component unmounts while speaking
    useEffect(() => {
        return () => {
            if (isUsingFallbackTTS) {
                window.speechSynthesis?.cancel();
            }
        };
    }, [isUsingFallbackTTS]);

    // Update overall processing state based on individual streams
    useEffect(() => {
        if (!isStreamingInstructions && !isStreamingNutrition && isLoading) {
            // If main loading is still true but streams finished, something else might be loading
            // Or we can now set processing to false. Let's assume streams are the main part.
            setIsProcessing(false);
        } else if (isStreamingInstructions || isStreamingNutrition) {
            setIsProcessing(true);
        }
    }, [isStreamingInstructions, isStreamingNutrition, isLoading]);


    return (
        <div className="flex h-screen"> {/* Added flex container */}
            <Sidebar /> {/* Added Sidebar */}
            <div className="flex-1 flex flex-col"> {/* Added main content area */}
                <MainNav /> {/* Added MainNav */}
                <div className="container mx-auto p-4 md:p-6 lg:p-8 font-sans flex-grow overflow-auto"> {/* Added flex-grow and overflow */}
                    {/* Inject blink animation styles */}
                    <style>{blinkAnimation}</style>
            <Card className="w-full max-w-xl mx-auto shadow-lg border-primary/20"> {/* Wider, subtle border */}
                <CardHeader className="text-center bg-primary/5 p-6 rounded-t-lg">
                    <Sparkles className="mx-auto h-8 w-8 text-primary mb-2" />
                    <CardTitle className="text-2xl md:text-3xl font-semibold text-primary">Trợ lý Bếp AI</CardTitle>
                    <CardDescription className="text-muted-foreground">
                        Chụp ảnh món ăn, mình lo phần còn lại! 😉
                    </CardDescription>
                </CardHeader>
                <CardContent className="p-6 space-y-6">
                    {/* Input Section */}
                    <div className="space-y-4">
                        <Label htmlFor="mealName" className="text-base font-medium flex items-center gap-2">
                            <ChefHat className="h-5 w-5 text-muted-foreground"/> Tên món ăn <span className="text-xs text-muted-foreground">(nếu không có ảnh)</span>
                        </Label>
                        <Input
                            id="mealName"
                            placeholder="Ví dụ: Bún chả Hà Nội"
                            value={mealNameInput}
                            onChange={(e) => setMealNameInput(e.target.value)}
                            disabled={isLoading || isCameraOpen}
                            className="text-base"
                        />
                    </div>
                    {/* Image Input: Upload or Camera */}
                    <div className="space-y-4">
                        <Label className="text-base font-medium flex items-center gap-2">
                             <CameraIcon className="h-5 w-5 text-muted-foreground"/> Hình ảnh món ăn <span className="text-xs text-muted-foreground">(nếu không có tên)</span>
                        </Label>
                        {/* Camera View - Modified for Fullscreen */}
                        {isCameraOpen && (
                            <div className="fixed inset-0 z-50 bg-black flex flex-col items-center justify-center"> {/* Fullscreen container */}
                                <video
                                    ref={videoRef}
                                    autoPlay
                                    playsInline
                                    className="w-full h-full object-cover" // Fill container
                                />
                                {/* Flash Overlay */}
                                <div
                                    className={cn(
                                        "absolute inset-0 bg-white transition-opacity duration-150 ease-out pointer-events-none",
                                        isFlashing ? "opacity-70" : "opacity-0"
                                    )}
                                />
                                {/* Capture Button - Centered Bottom */}
                                <Button
                                    size="icon"
                                    onClick={capturePhoto}
                                    disabled={isLoading || isFlashing || !isCameraReady} // Disable if camera not ready
                                    className="absolute bottom-8 left-1/2 transform -translate-x-1/2 rounded-full z-10 w-16 h-16 bg-white hover:bg-gray-200 shadow-lg border-4 border-gray-300" // Larger, white button
                                    aria-label="Chụp ảnh"
                                >
                                    <CameraIcon className="h-7 w-7 text-black" /> {/* Black icon */}
                                </Button>
                                {/* Close Button - Top Right */}
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={stopCamera}
                                    className="absolute top-4 right-4 z-10 bg-black/50 text-white hover:bg-black/70 rounded-full w-10 h-10" // Slightly larger
                                    aria-label="Đóng camera"
                                >
                                    <X className="h-5 w-5" />
                                </Button>
                                {/* Loading/Error Indicator within Camera */}
                                {!isCameraReady && !error && (
                                    <div className="absolute inset-0 flex items-center justify-center bg-black/70 text-white z-20">
                                        <Loader2 className="h-8 w-8 animate-spin mr-3" />
                                        Đang khởi động camera...
                                    </div>
                                )}
                                {error && (
                                     <div className="absolute bottom-24 left-4 right-4 p-3 bg-red-600/80 text-white rounded-md text-center z-20">
                                         {error}
                                     </div>
                                )}
                            </div>
                        )}
                        <canvas ref={canvasRef} style={{ display: 'none' }} />

                        {/* Image Preview */}
                        {imagePreviewUrl && !isCameraOpen && (
                            <div className="mt-2 border rounded-lg overflow-hidden max-h-64 flex justify-center items-center bg-muted/30 p-2 relative group">
                                <img src={imagePreviewUrl} alt="Xem trước" className="max-w-full max-h-60 object-contain rounded" />
                                 <Button variant="destructive" size="icon" onClick={resetImageData} className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity w-7 h-7 rounded-full" aria-label="Xóa ảnh">
                                     <X className="h-4 w-4" />
                                 </Button>
                            </div>
                        )}

                        {/* Action Buttons */}
                        {!isCameraOpen && (
                            <div className="flex flex-col sm:flex-row gap-3">
                                <Button onClick={() => fileInputRef.current?.click()} variant="outline" className="flex-1 text-base py-2.5" disabled={isLoading}>
                                    <Upload className="mr-2 h-5 w-5" /> Tải ảnh lên
                                </Button>
                                <Input id="mealImage" type="file" accept="image/*" ref={fileInputRef} onChange={handleFileChange} disabled={isLoading} className="hidden" />
                                <Button onClick={startCamera} variant="outline" className="flex-1 text-base py-2.5" disabled={isLoading}>
                                    <CameraIcon className="mr-2 h-5 w-5" /> Chụp ảnh
                                </Button>
                            </div>
                        )}
                    </div>

                    {/* Submit Button */}
                    <Button onClick={handleRecognize} disabled={isLoading || isProcessing || (!mealNameInput && !imageBase64)} className="w-full text-lg py-3 font-semibold" size="lg">
                        {isProcessing ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Sparkles className="mr-2 h-5 w-5" />}
                        {isProcessing ? 'Đang tìm kiếm...' : 'Xem kết quả nào!'}
                    </Button>

                    {/* Error Display */}
                    {error && (
                        <Alert variant="destructive" className="mt-6">
                            <Terminal className="h-4 w-4" />
                            <AlertTitle>Ối! Có lỗi rồi</AlertTitle>
                            <AlertDescription>{error}</AlertDescription>
                        </Alert>
                    )}

                    {/* --- Results Section --- */}
                    {(recognizedMeal || cookingInstructions || nutritionInfo || isProcessing) && (
                        <div className="space-y-6 pt-6 border-t border-primary/10">
                            {/* Loading/Streaming Indicators */}
                             {isProcessing && !recognizedMeal && !cookingInstructions && !nutritionInfo && (
                                 <div className="flex justify-center items-center text-muted-foreground py-4">
                                     <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                     <span>Đang tìm thông tin, chờ mình xíu nha...</span>
                                 </div>
                             )}

                            {/* Recognized Meal */}
                            {recognizedMeal && (
                                <Card className="bg-background border-primary/10 shadow-sm">
                                    <CardHeader>
                                        <CardTitle className="text-lg flex items-center gap-2"><ChefHat className="h-5 w-5 text-primary"/> Món ăn</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <p className="font-semibold text-lg">{recognizedMeal.replace('Đang tìm thông tin cho: ','')}</p>
                                    </CardContent>
                                </Card>
                            )}

                            {/* Cooking Instructions */}
                            {(cookingInstructions !== null || isStreamingInstructions) && (
                                <Card className="bg-background border-primary/10 shadow-sm">
                                    <CardHeader>
                                        <CardTitle className="text-lg flex items-center gap-2"><Mic className="h-5 w-5 text-primary"/> Hướng dẫn nấu ăn</CardTitle>
                                        {/* Display Primary Source */}
                                        {sourceUrlRecipe && !isStreamingInstructions && (
                                            <CardDescription className="text-xs text-muted-foreground mt-1">
                                                Nguồn chính: <a href={sourceUrlRecipe} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">{new URL(sourceUrlRecipe).hostname}</a>
                                            </CardDescription>
                                        )}
                                        {/* Display Other Sources - Improved UI */}
                                        {allSourceUrlsRecipe.length > 1 && !isStreamingInstructions && (
                                            <div className="text-xs text-muted-foreground mt-1.5"> {/* Use div for separation */}
                                                <span className="font-medium">Nguồn khác:</span>
                                                <div className="flex flex-wrap gap-x-2 gap-y-1 mt-0.5"> {/* Allow wrapping */}
                                                    {allSourceUrlsRecipe
                                                        .filter(url => url !== sourceUrlRecipe) // Exclude primary source
                                                        .slice(0, 3) // Limit
                                                        .map((url) => (
                                                            <a
                                                                key={url}
                                                                href={url}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                className="text-blue-600 hover:underline bg-blue-50 px-1.5 py-0.5 rounded text-[11px]" // Badge-like style
                                                            >
                                                                {new URL(url).hostname}
                                                            </a>
                                                        ))}
                                                    {allSourceUrlsRecipe.length > 4 && <span className="text-[11px]">(và {allSourceUrlsRecipe.length - 4} trang khác)</span>}
                                                </div>
                                            </div>
                                        )}
                                    </CardHeader>
                                    <CardContent>
                                        <StreamingTextRenderer text={cookingInstructions} isStreaming={isStreamingInstructions} />
                                    </CardContent>
                                    {/* TTS Controls - Show when instructions are loaded */}
                                    {!isStreamingInstructions && cookingInstructions && !cookingInstructions.startsWith("Ui, mình không tìm thấy") && (
                                        <CardFooter className="flex items-center gap-2 flex-wrap">
                                            {/* Play/Pause Button */}
                                            <Button
                                                onClick={togglePlayPause}
                                                size="sm"
                                                variant="outline"
                                                className="text-primary border-primary hover:bg-primary/10"
                                                // Disable if no TTS is active or ready
                                                disabled={!((isUsingFallbackTTS && currentUtterance.current) || (googleTtsRequested && audioRef.current?.src))}
                                            >
                                                {isPlaying ? <Pause className="h-4 w-4 mr-2" /> : <Play className="h-4 w-4 mr-2" />}
                                                {isPlaying ? 'Tạm dừng' : 'Phát lại'}
                                            </Button>

                                            {/* Switch to Google Voice Button */}
                                            <Button
                                                onClick={() => playGoogleTTS(cookingInstructions)}
                                                size="sm"
                                                variant="outline"
                                                disabled={googleTtsLoading || (googleTtsRequested && !isUsingFallbackTTS)} // Disable if loading or already using Google
                                                className={cn(googleTtsRequested && !isUsingFallbackTTS && "border-green-500 text-green-600")} // Style if active
                                            >
                                                {googleTtsLoading ? (
                                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                                ) : (
                                                     <Sparkles className="h-4 w-4 mr-2" />
                                                )}
                                                {googleTtsRequested && !isUsingFallbackTTS ? "Đang dùng giọng Google" : "Dùng giọng Google"}
                                            </Button>

                                            {/* Hidden audio element for Google TTS */}
                                            <audio ref={audioRef} className="hidden" />
                                            {/* Indicate which voice is playing */}
                                            {isPlaying && isUsingFallbackTTS && <span className="text-xs text-muted-foreground">(Giọng đọc trình duyệt)</span>}
                                             {isPlaying && googleTtsRequested && !isUsingFallbackTTS && <span className="text-xs text-muted-foreground">(Giọng đọc Google)</span>}
                                        </CardFooter>
                                    )}
                                </Card>
                            )}

                            {/* Nutrition Info */}
                            {(nutritionInfo !== null || isStreamingNutrition) && (
                                <Card className="bg-background border-primary/10 shadow-sm">
                                    <CardHeader>
                                        <CardTitle className="text-lg flex items-center gap-2"><HeartPulse className="h-5 w-5 text-primary"/> Thông tin dinh dưỡng</CardTitle>
                                        {/* Display Primary Source */}
                                        {sourceUrlNutrition && !isStreamingNutrition && (
                                            <CardDescription className="text-xs text-muted-foreground mt-1">
                                                Nguồn chính: <a href={sourceUrlNutrition} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">{new URL(sourceUrlNutrition).hostname}</a>
                                            </CardDescription>
                                        )}
                                        {/* Display Other Sources - Improved UI */}
                                        {allSourceUrlsNutrition.length > 1 && !isStreamingNutrition && (
                                             <div className="text-xs text-muted-foreground mt-1.5"> {/* Use div for separation */}
                                                <span className="font-medium">Nguồn khác:</span>
                                                <div className="flex flex-wrap gap-x-2 gap-y-1 mt-0.5"> {/* Allow wrapping */}
                                                    {allSourceUrlsNutrition
                                                        .filter(url => url !== sourceUrlNutrition) // Exclude primary source
                                                        .slice(0, 3) // Limit
                                                        .map((url) => (
                                                            <a
                                                                key={url}
                                                                href={url}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                className="text-blue-600 hover:underline bg-blue-50 px-1.5 py-0.5 rounded text-[11px]" // Badge-like style
                                                            >
                                                                {new URL(url).hostname}
                                                            </a>
                                                        ))}
                                                    {allSourceUrlsNutrition.length > 4 && <span className="text-[11px]">(và {allSourceUrlsNutrition.length - 4} trang khác)</span>}
                                                </div>
                                            </div>
                                        )}
                                    </CardHeader>
                                    <CardContent>
                                         <StreamingTextRenderer text={nutritionInfo} isStreaming={isStreamingNutrition} />
                                    </CardContent>
                                </Card>
                            )}
                        </div>
                    )}
                </CardContent>
            </Card>
                </div> {/* End container */}
            </div> {/* End main content area */}
        </div> /* End flex container */
    );
}
