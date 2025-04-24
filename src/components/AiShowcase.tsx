import React, { useState, useRef } from 'react'; // Added useRef for iframe access
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    CardDescription
} from '@/components/ui/card';
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    PlayCircle,
    Maximize,
    Volume2,
    VolumeX,
    ChevronRight,
    BrainCircuit,
    Cloud,
    TrendingUp,
    Bot // Using Bot for Gemini icon consistency
} from 'lucide-react';
import Image from 'next/image'; // For optimized Google logo

// --- Google & Gemini Colors (Tailwind classes) ---
// (Keep these as they are)
const GOOGLE_BLUE = 'text-blue-600 dark:text-blue-400';
const GOOGLE_RED = 'text-red-600 dark:text-red-400';
const GOOGLE_YELLOW = 'text-yellow-500 dark:text-yellow-400';
const GOOGLE_GREEN = 'text-green-600 dark:text-green-500';
const GEMINI_PURPLE = 'text-purple-600 dark:text-purple-400';
const GEMINI_PINK = 'text-pink-600 dark:text-pink-400'; // For gradients or accents

// Using Lucide 'Bot' icon for Gemini sparkle effect consistency
const GeminiIcon = ({ className }: { className?: string }) => (
    <Bot className={className} />
);


const NutriCareShowcase = () => {
    const videoId = 'qvLy808VAwg';
    const [isPlaying, setIsPlaying] = useState(false);
    const [isMuted, setIsMuted] = useState(true); // Start muted for better UX if autoplaying
    const iframeRef = useRef<HTMLIFrameElement>(null); // Ref to access iframe DOM element

    // --- Feature Tags ---
    // Combined icon and color logic directly here for cleaner mapping
    const featureTags = [
        {
            name: 'Gemini-Powered', // Shorter name for mobile possibly
            icon: Bot,
            colorClasses: 'bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-200 border border-purple-300 dark:border-purple-700',
            iconColorClass: GEMINI_PURPLE
        },
        {
            name: 'Multi-Agent System',
            icon: BrainCircuit,
            colorClasses: 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-200 border border-blue-300 dark:border-blue-700',
            iconColorClass: GOOGLE_BLUE
        },
        {
            name: 'Google Cloud', // Shorter name
            icon: Cloud,
            colorClasses: 'bg-sky-100 text-sky-800 dark:bg-sky-900/50 dark:text-sky-200 border border-sky-300 dark:border-sky-700',
            iconColorClass: 'text-sky-500 dark:text-sky-400'
        },
        {
            name: 'Food Trends', // Shorter name
            icon: TrendingUp,
            colorClasses: 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-200 border border-green-300 dark:border-green-700',
            iconColorClass: GOOGLE_GREEN
        }
    ];

    const handlePlayClick = () => {
        setIsPlaying(true);
        // Optional: Unmute on explicit user play action? Or keep muted?
        // setIsMuted(false);
    };

    // --- Fullscreen Handling ---
    const requestFullScreen = () => {
        const iframeElement = iframeRef.current;
        if (!iframeElement) return;

        // Standard fullscreen API
        if (iframeElement.requestFullscreen) {
            iframeElement.requestFullscreen();
        }
        // Vendor prefixes (optional but good for broader compatibility)
        else if ((iframeElement as any).mozRequestFullScreen) { /* Firefox */
            (iframeElement as any).mozRequestFullScreen();
        } else if ((iframeElement as any).webkitRequestFullscreen) { /* Chrome, Safari & Opera */
            (iframeElement as any).webkitRequestFullscreen();
        } else if ((iframeElement as any).msRequestFullscreen) { /* IE/Edge */
            (iframeElement as any).msRequestFullscreen();
        }
    };

    // --- Mute Toggle ---
    // YouTube API is more reliable for controlling mute AFTER the iframe has loaded
    // This basic toggle works with the `mute` URL parameter but might have sync issues
    // For robust control, consider using the YouTube IFrame Player API
    const toggleMute = () => {
        setIsMuted(!isMuted);
    };

    return (
        // Use padding that adjusts slightly for larger screens
        <div className="max-w-5xl mx-auto p-4 md:p-6 lg:p-8">
            {/* Card styling with subtle backdrop blur and borders */}
            <Card className="border border-gray-200 dark:border-gray-800 shadow-lg dark:shadow-blue-900/20 bg-white/95 dark:bg-gray-900/90 backdrop-blur-sm overflow-hidden rounded-xl">
                {/* Header: Stacks vertically on mobile, row on medium+ screens */}
                <CardHeader className="pb-4 border-b border-gray-200 dark:border-gray-700">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 md:gap-6">
                        {/* Left Side: Title & Description */}
                        <div className="flex-1">
                             {/* Title: Larger on mobile, even larger on desktop */}
                            <CardTitle className="flex items-center gap-2 text-xl sm:text-2xl md:text-3xl font-bold tracking-tight">
                                <GeminiIcon className={`h-6 w-6 md:h-7 md:w-7 ${GEMINI_PURPLE}`} />
                                <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 via-purple-500 to-pink-500 dark:from-blue-400 dark:via-purple-400 dark:to-pink-400">
                                    NutriCare Agents
                                </span>
                            </CardTitle>
                            <CardDescription className="text-gray-600 dark:text-gray-400 text-sm sm:text-base mt-1 md:mt-2">
                                Multi-agent nutrition powered by <strong className={GEMINI_PURPLE}>Google Gemini</strong> & Cloud.
                            </CardDescription>
                        </div>

                        {/* Right Side: Feature Tags (Desktop Only) */}
                        <div className="hidden md:flex flex-col items-end gap-1.5 shrink-0">
                             {/* Use small badges for desktop header */}
                            {featureTags.map((tag) => (
                                <Badge key={tag.name} variant="outline" className={`py-0.5 px-2 text-xs ${tag.colorClasses}`}>
                                    <tag.icon className={`h-3.5 w-3.5 mr-1 ${tag.iconColorClass}`} />
                                    {tag.name}
                                </Badge>
                            ))}
                        </div>
                    </div>
                </CardHeader>

                <CardContent className="pt-5 md:pt-6">
                    {/* Video Player Section */}
                    <div className="relative group mb-6 md:mb-8">
                        {/* Aspect ratio container ensures correct video dimensions */}
                        <div className="aspect-video overflow-hidden rounded-lg border border-gray-300 dark:border-gray-700 shadow-inner bg-black">
                            {/* Overlay shown only when video is NOT playing */}
                            {!isPlaying && (
                                <div
                                    className="absolute inset-0 flex flex-col items-center justify-center cursor-pointer z-10 bg-black/60 backdrop-blur-sm transition-opacity duration-300 hover:bg-black/50"
                                    onClick={handlePlayClick}
                                >
                                    {/* Larger play button */}
                                    <div className="w-16 h-16 sm:w-20 sm:w-20 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 dark:from-blue-600 dark:to-blue-800 flex items-center justify-center mb-3 md:mb-4 shadow-lg transition-transform duration-300 group-hover:scale-105">
                                        <PlayCircle className="h-10 w-10 sm:h-12 sm:w-12 text-white" strokeWidth={1.5} />
                                    </div>
                                    <p className="text-white text-base sm:text-lg font-semibold tracking-wide text-center px-4">Watch NutriCare Demo</p>
                                    <p className="text-blue-200 text-xs sm:text-sm mt-1">(Powered by Google AI)</p>
                                </div>
                            )}

                            {/* YouTube Iframe - loads and becomes visible when isPlaying */}
                            <iframe
                                ref={iframeRef} // Assign ref
                                id="youtube-player"
                                width="100%"
                                height="100%"
                                // Autoplay and mute controlled by state. Always show controls once playing.
                                src={`https://www.youtube.com/embed/${videoId}?autoplay=${isPlaying ? 1 : 0}&mute=${isMuted ? 1 : 0}&controls=1&rel=0&showinfo=0&modestbranding=1&playsinline=1`} // Added playsinline
                                title="NutriCare Agents - Google AI Competition Demo"
                                frameBorder="0"
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                                referrerPolicy="strict-origin-when-cross-origin"
                                allowFullScreen
                                // Fade in the video smoothly when playing starts
                                className={`absolute inset-0 w-full h-full transition-opacity duration-500 ${isPlaying ? 'opacity-100 z-0' : 'opacity-0 -z-10 pointer-events-none'}`}
                            ></iframe>
                        </div>

                       {/* Optional: Simplified Custom Controls (Only Mute/Fullscreen visible on hover when playing) */}
                       {/* YouTube controls=1 is generally preferred, but this is an alternative */}
                       {/*
                        {isPlaying && (
                            <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between z-20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
                                <Button
                                    variant="ghost" size="icon"
                                    className="rounded-full bg-black/40 hover:bg-black/60 text-white backdrop-blur-sm pointer-events-auto"
                                    onClick={toggleMute}
                                    aria-label={isMuted ? "Unmute" : "Mute"}
                                >
                                    {isMuted ? <VolumeX className="h-4 w-4 sm:h-5 sm:w-5" /> : <Volume2 className="h-4 w-4 sm:h-5 sm:w-5" />}
                                </Button>
                                <Button
                                    variant="ghost" size="icon"
                                    className="rounded-full bg-black/40 hover:bg-black/60 text-white backdrop-blur-sm pointer-events-auto"
                                    onClick={requestFullScreen}
                                    aria-label="Enter Fullscreen"
                                >
                                    <Maximize className="h-4 w-4 sm:h-5 sm:w-5" />
                                </Button>
                            </div>
                        )}
                       */}
                    </div>

                    {/* Feature Tags (Mobile Only - shown below video) */}
                    <div className="md:hidden flex flex-wrap justify-center gap-2 mb-6">
                        {featureTags.map((tag) => (
                             <Badge key={tag.name} variant="outline" className={`py-1 px-2.5 text-xs ${tag.colorClasses}`}>
                                <tag.icon className={`h-4 w-4 mr-1.5 ${tag.iconColorClass}`} />
                                {tag.name}
                            </Badge>
                        ))}
                    </div>

                    {/* Bottom Section: Info & CTA */}
                    {/* Stacks vertically on mobile, side-by-side on medium+ */}
                    <div className="flex flex-col md:flex-row items-stretch justify-between gap-4 md:gap-6">

                        {/* Info Block */}
                        {/* Takes remaining width on desktop (`md:flex-1`) */}
                        <div className="bg-gradient-to-r from-blue-50/50 to-purple-50/50 dark:from-blue-900/20 dark:to-purple-900/20 p-4 md:p-5 rounded-lg border border-blue-100 dark:border-blue-900/50 md:flex-1">
                            <h3 className="text-base sm:text-lg font-semibold text-gray-800 dark:text-gray-100 mb-1.5">
                                Revolutionize Your Nutrition
                            </h3>
                            <p className="text-gray-600 dark:text-gray-300 mb-3 text-sm">
                                Explore personalized meal plans, track pantry items, and get insights using cutting-edge Google AI.
                            </p>
                            {/* Link-style button */}
                            <Button variant="link" className={`p-0 h-auto text-sm ${GOOGLE_BLUE} hover:text-blue-700 dark:hover:text-blue-300`}>
                                Learn More <ChevronRight className="h-4 w-4 ml-0.5" />
                            </Button>
                        </div>

                        {/* CTA Block */}
                        {/* Fixed width on desktop (`md:w-auto` or `md:w-1/3` etc.) Adjust md:w-* as needed */}
                        <div className="bg-gray-100 dark:bg-gray-800/50 p-4 md:p-5 rounded-lg border border-gray-200 dark:border-gray-700 flex flex-col justify-center items-center text-center md:w-full md:max-w-xs lg:max-w-sm">
                             {/* Slightly smaller heading on mobile */}
                            <h4 className="text-sm sm:text-base font-semibold text-gray-900 dark:text-white mb-3">
                                Experience the Future of Food?
                            </h4>
                             {/* Button takes full width on mobile, auto on desktop */}
                            <Button size="lg" className={`w-full md:w-auto bg-gradient-to-r ${GOOGLE_BLUE ? 'from-blue-600 to-blue-700 hover:shadow-blue-500/30' : 'from-gray-600 to-gray-700'} text-white font-semibold transition-all transform hover:scale-[1.02] hover:shadow-md px-6`}>
                                Try NutriCare Agents
                            </Button>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">Free access during competition</p>
                        </div>
                    </div>

                  {/* Footer: Google Acknowledgment */}
                  {/* Stacks on mobile, row with space between on larger screens */}
                  <div className="mt-8 border-t border-gray-200 dark:border-gray-700 pt-5 flex flex-col sm:flex-row items-center justify-center sm:justify-between gap-3 text-center sm:text-left">
                    <div className="flex items-center justify-center gap-2">
                        <Image
                        src="https://upload.wikimedia.org/wikipedia/commons/2/2f/Google_2015_logo.svg"
                        alt="Google Logo"
                        width={72}
                        height={24}
                        className="h-5 sm:h-6 w-auto" // Slightly smaller on mobile
                        />
                         <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                            Proudly built for the <span className="font-semibold">Google AI Competition</span>
                        </p>
                    </div>
                    {/* Technology attribution - can be separate line on mobile if needed */}
                    <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                        Using <span className={`font-medium ${GEMINI_PURPLE}`}>Gemini</span>, <span className="font-medium text-sky-500 dark:text-sky-400">Vertex AI</span>, & <span className={`font-medium ${GOOGLE_BLUE}`}>Google Cloud</span>.
                    </p>
                  </div>

                </CardContent>
            </Card>
        </div>
    );
};

export default NutriCareShowcase;