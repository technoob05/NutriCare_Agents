'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2, Camera as CameraIcon, X } from "lucide-react";
import { cn } from "@/lib/utils";
import logger from '@/lib/logger';

interface EmotionCameraCaptureProps {
  onCapture: (imageBase64: string) => void;
  onClose: () => void;
  isOpen: boolean; // To control visibility and trigger camera start/stop
}

export function EmotionCameraCapture({ onCapture, onClose, isOpen }: EmotionCameraCaptureProps) {
  const [error, setError] = useState<string | null>(null);
  const [isFlashing, setIsFlashing] = useState(false);
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false); // To disable button during capture

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const stopCamera = useCallback(() => {
    setError(null);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => {
        logger.debug(`Stopping track: ${track.kind}, enabled: ${track.enabled}`);
        track.stop();
      });
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
      videoRef.current.load();
    }
    setIsCameraReady(false);
  }, []);

  const startCamera = useCallback(async () => {
    logger.info("EmotionCamera: startCamera called");
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      try {
        logger.info("EmotionCamera: Requesting camera permission...");
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop());
        }
        // Request camera access, prefer front camera ('user')
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: 'user', // Prioritize front camera
            width: { ideal: 1280 }, // Standard HD resolution
            height: { ideal: 720 }
          }
        });
        logger.info("EmotionCamera: Camera permission granted, stream obtained.");
        streamRef.current = stream;
        setError(null);
        
        if (videoRef.current) {
            videoRef.current.srcObject = stream;
            videoRef.current.play().catch(e => {
                 logger.error("EmotionCamera: Initial video.play() failed:", e);
            });
        }

      } catch (err) {
        logger.error("EmotionCamera: Error in startCamera getting stream:", err);
        setError(`Lỗi camera: ${err instanceof Error ? err.message : String(err)}. Vui lòng kiểm tra quyền truy cập.`);
        onClose(); // Close if camera fails to start
      }
    } else {
      logger.error("EmotionCamera: getUserMedia not supported");
      setError("Trình duyệt không hỗ trợ truy cập camera.");
      onClose(); // Close if not supported
    }
  }, [onClose]);

  const capturePhoto = useCallback(() => {
    logger.info("EmotionCamera: capturePhoto called");
    setIsCapturing(true);

    if (!isCameraReady) {
      setError("Camera chưa sẵn sàng. Vui lòng đợi một lát.");
      logger.error("EmotionCamera: Camera not ready for capture");
      setIsCapturing(false);
      return;
    }
    if (!videoRef.current || !canvasRef.current) {
      setError("Thành phần camera hoặc canvas không khả dụng.");
      logger.error("EmotionCamera: Missing refs for capture: video or canvas");
      setIsCapturing(false);
      return;
    }

    const video = videoRef.current;
    const canvas = canvasRef.current;

    try {
      logger.debug(`EmotionCamera: Video state: readyState=${video.readyState}, paused=${video.paused}`);
      logger.debug(`EmotionCamera: Video dimensions: ${video.videoWidth}x${video.videoHeight}`);

      if (video.videoWidth <= 0 || video.videoHeight <= 0) {
        setError("Luồng camera chưa sẵn sàng. Vui lòng đợi hoặc thử khởi động lại camera.");
        logger.error("EmotionCamera: Invalid video dimensions for capture");
        setIsCapturing(false);
        return;
      }

      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      logger.debug(`EmotionCamera: Canvas set to: ${canvas.width}x${canvas.height}`);

      const context = canvas.getContext('2d');
      if (!context) {
        setError("Không thể lấy context của canvas.");
        logger.error("EmotionCamera: Failed to get 2d context from canvas");
        setIsCapturing(false);
        return;
      }
      // Flip the image horizontally for a mirror effect if using front camera
      if (streamRef.current?.getVideoTracks()[0]?.getSettings().facingMode === 'user') {
        context.translate(canvas.width, 0);
        context.scale(-1, 1);
      }

      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      logger.info("EmotionCamera: Successfully drew video frame to canvas");

      const dataUrl = canvas.toDataURL('image/jpeg', 0.9); // Good quality JPEG
      if (!dataUrl || dataUrl === 'data:,' || dataUrl.length < 50) {
        logger.error("EmotionCamera: Invalid data URL from canvas:", dataUrl?.substring(0, 20));
        setError("Không thể chuyển đổi canvas thành hình ảnh.");
        setIsCapturing(false);
        return;
      }
      logger.info(`EmotionCamera: Data URL generated successfully (${dataUrl.length} chars)`);

      setIsFlashing(true);
      setTimeout(() => setIsFlashing(false), 150);
      
      onCapture(dataUrl); // Send base64 data

    } catch (generalError) {
      logger.error("EmotionCamera: General error in capturePhoto:", generalError);
      setError(`Lỗi chụp ảnh: ${generalError instanceof Error ? generalError.message : String(generalError)}`);
    } finally {
      setIsCapturing(false);
    }
  }, [isCameraReady, onCapture]);

  useEffect(() => {
    if (isOpen) {
      startCamera();
    } else {
      stopCamera();
    }
    // Cleanup on unmount or when isOpen becomes false
    return () => {
      stopCamera();
    };
  }, [isOpen, startCamera, stopCamera]);

  useEffect(() => {
    const videoElement = videoRef.current;
    if (!videoElement) return;

    // Function to check if video stream is ready
    const checkVideoReady = () => {
      // Check if video has dimensions and is ready
      if (videoElement.videoWidth > 0 && videoElement.videoHeight > 0 && videoElement.readyState >= 2) {
        logger.info("EmotionCamera: Video is ready with dimensions:", 
                     videoElement.videoWidth, "x", videoElement.videoHeight);
        setIsCameraReady(true);
        return true;
      }
      return false;
    };

    // Handle events that might indicate camera readiness
    const handleVideoReady = () => {
      if (checkVideoReady()) {
        logger.info("EmotionCamera: Video ready from event handler");
      }
    };

    // Set up event listeners for video element
    videoElement.addEventListener('loadeddata', handleVideoReady);
    videoElement.addEventListener('loadedmetadata', handleVideoReady);
    videoElement.addEventListener('canplay', handleVideoReady);
    
    // Check immediately if already ready
    if (checkVideoReady()) {
      logger.info("EmotionCamera: Video already ready on mount");
    }
    
    // For some browsers that don't reliably fire events, add a backup check
    const readyTimer = setInterval(() => {
      if (checkVideoReady()) {
        logger.info("EmotionCamera: Video ready from timer check");
        clearInterval(readyTimer);
      }
    }, 100); // Check every 100ms
    
    // Handle video errors
    const handleError = (e: Event) => {
      logger.error("EmotionCamera: Video error event:", e);
      const videoError = videoElement.error;
      setError(`Lỗi camera: ${videoError ? `code ${videoError.code} - ${videoError.message}` : 'không xác định'}`);
      setIsCameraReady(false);
    };
    
    videoElement.addEventListener('error', handleError);
    
    return () => {
      videoElement.removeEventListener('loadeddata', handleVideoReady);
      videoElement.removeEventListener('loadedmetadata', handleVideoReady);
      videoElement.removeEventListener('canplay', handleVideoReady);
      videoElement.removeEventListener('error', handleError);
      clearInterval(readyTimer);
    };
  }, [isOpen, streamRef.current]); // Re-run when stream changes

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col items-center justify-center p-4">
      <canvas ref={canvasRef} style={{ display: 'none' }} />
      <div className="relative w-full max-w-md aspect-[3/4] md:aspect-video bg-gray-800 rounded-lg overflow-hidden shadow-2xl">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          className="w-full h-full object-cover"
          // Mirror front camera by default for a more natural feel
          style={{ transform: streamRef.current?.getVideoTracks()[0]?.getSettings().facingMode === 'user' ? 'scaleX(-1)' : 'none' }}
        />
        <div
          className={cn(
            "absolute inset-0 bg-white transition-opacity duration-150 ease-out pointer-events-none",
            isFlashing ? "opacity-70" : "opacity-0"
          )}
        />
        {!isCameraReady && !error && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/70 text-white z-20">
            <Loader2 className="h-8 w-8 animate-spin mr-3" />
            Đang khởi động camera...
          </div>
        )}
      </div>

      {error && (
        <div className="mt-4 p-3 bg-red-600/90 text-white rounded-md text-center w-full max-w-md">
          {error}
        </div>
      )}

      <div className="mt-6 flex items-center justify-center gap-4 w-full max-w-md">
        <Button
          variant="ghost"
          size="lg"
          onClick={onClose}
          className="text-white hover:bg-white/20 px-6 py-3"
          aria-label="Đóng camera"
          disabled={isCapturing}
        >
          <X className="h-6 w-6 mr-2" /> Hủy
        </Button>
        <Button
          size="lg"
          onClick={capturePhoto}
          disabled={isCapturing || !isCameraReady || !!error}
          className="rounded-full z-10 w-20 h-20 bg-white hover:bg-gray-200 shadow-lg border-4 border-gray-300 flex items-center justify-center"
          aria-label="Chụp ảnh"
        >
          {isCapturing ? <Loader2 className="h-7 w-7 animate-spin text-black" /> : <CameraIcon className="h-8 w-8 text-black" />}
        </Button>
         {/* Placeholder for potential switch camera button */}
        <div className="w-24 px-6 py-3"></div> 
      </div>
    </div>
  );
}