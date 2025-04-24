import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from "@/components/ui/badge"; // Import Badge
import {
    ScanSearch,     // Recognize Meal
    PanelLeft,      // Pantry Tracker
    BookOpenText,   // Explore Recipes (Slightly different icon for clarity)
    BrainCircuit,   // Chat with AI
    MicVocal,       // Voice Mode (More specific icon)
    ImagePlay,      // Generate Images (Combines Image + Play hint)
    Video,          // Video Generation (Changed from Play)
    SearchCode,     // Recipe Discovery (Hints at code/embedding)
    Sparkles,       // Generic AI/Gemini indicator
     Cloud,            // Cloud indicator (Vertex AI)
     Lightbulb       // Added for AI Explainer
 } from 'lucide-react';
 import Link from 'next/link';

// Simple SVG component for Gemini-like Sparkle (Optional, but adds flair)
// You can replace this with a more official icon if allowed/available
const GeminiSparkle = ({ className }: { className?: string }) => (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 2L9.9 7.2H4.6l4.2 3.8L6.7 16l5.3-4.4 5.3 4.4-2.1-5L19.4 7.2h-5.3L12 2z" />
    </svg>
);

// Google Colors (Approximate Tailwind classes)
const GOOGLE_BLUE = 'text-blue-600 dark:text-blue-400';
const GOOGLE_RED = 'text-red-600 dark:text-red-400';
const GOOGLE_YELLOW = 'text-yellow-500 dark:text-yellow-400';
const GOOGLE_GREEN = 'text-green-600 dark:text-green-500';
const GEMINI_PURPLE = 'text-purple-600 dark:text-purple-400';
const GEMINI_PINK = 'text-pink-600 dark:text-pink-400'; // For gradients or accents

const DashboardUI = () => {
    // --- Data Definitions ---
    // Added 'enabled' flag to each feature
    const featureCards = [
        {
            name: 'Recognize Meal',
            description: 'Identify dishes with Google Vision AI', // Emphasize Google Vision
            href: '/recognize-meal',
            icon: ScanSearch,
            tech: 'Gemini Vision Pro + LangChain', // Specify Pro if applicable
            tag: 'Vision AI',
            tagColor: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
            iconColor: GOOGLE_GREEN,
            enabled: true,
        },
        {
            name: 'Pantry Tracker',
            description: 'Smart recipe ideas from your ingredients',
            href: '/pantry-tracker',
            icon: PanelLeft,
            tech: 'LangChain + Gemini API',
            tag: 'Gemini',
            tagColor: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
            iconColor: GEMINI_PURPLE,
              enabled: true,
          },
          {
             name: 'AI Explainer',
             description: 'Understand how the AI makes decisions',
             href: '/ai-explainer',
             icon: Lightbulb, // Using Lightbulb icon
             tech: 'Explainable AI (XAI) Techniques',
             tag: 'Transparency',
             tagColor: 'bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-200', // Teal color
             iconColor: 'text-teal-500 dark:text-teal-400',
             enabled: true,
         },
         {
              name: 'Explore Recipes',
              description: 'Interactive learning about food & cooking',
             href: '/recipes', // Link remains but will be disabled
            icon: BookOpenText,
            tech: 'LangChain + Structured Output',
            tag: 'Learning',
            tagColor: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
            iconColor: GOOGLE_BLUE,
            enabled: false, // Disabled
        },
        {
            name: 'Chat with AI',
            description: 'Personalized nutrition powered by Gemini', // Emphasize Gemini
            href: '/chat',
            icon: BrainCircuit,
            tech: 'Gemini 2.5 Pro + Google Search', // Highlight latest model
            tag: 'Gemini 2.5 Pro',
            tagColor: 'bg-gradient-to-r from-purple-200 to-pink-200 text-purple-900 dark:from-purple-800 dark:to-pink-800 dark:text-white', // Gradient tag
            iconColor: GEMINI_PURPLE,
            enabled: true,
        },
    ];

    const advancedFeatures = [
        {
             name: 'Voice Mode',
             description: 'Hands-free interaction via Google STT', // Emphasize Google STT
             href: '/voice', // Corrected href
             icon: MicVocal,
             tech: 'Google Cloud STT/TTS + Gemini Agents',
            tag: 'Google Cloud',
            tagColor: 'bg-sky-100 text-sky-800 dark:bg-sky-900 dark:text-sky-200',
            iconColor: 'text-sky-600 dark:text-sky-400',
            enabled: true,
        },
        {
            name: 'Generate Images',
            description: 'Create food visuals with Gemini AI', // Emphasize Gemini
            href: '/generate-images', // Link remains but will be disabled
            icon: ImagePlay,
            tech: 'Gemini 2.0 Flash Image Generation',
            tag: 'Gemini Image',
            tagColor: 'bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200',
            iconColor: GEMINI_PINK,
            enabled: false, // Disabled
        },
        {
            name: 'Video Generation (Beta)',
            description: 'AI cooking demos via Vertex AI', // Emphasize Vertex AI
            href: '/generate-videos', // Link remains but will be disabled
            icon: Video,
            tech: 'Veo-2 API on Google Vertex AI',
            tag: 'Vertex AI Beta',
            tagColor: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
            iconColor: 'text-orange-500 dark:text-orange-400',
            enabled: false, // Disabled
        },
        {
            name: 'Recipe Discovery',
            description: 'Find recipes using Google Embeddings', // Emphasize Embeddings
            href: '/recipe-discovery', // Link remains but will be disabled
            icon: SearchCode,
            tech: 'Google Embedding Models + AI',
            tag: 'Embeddings',
            tagColor: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
            iconColor: GOOGLE_YELLOW,
            enabled: false, // Disabled
        },
    ];

    // --- Helper Function for Card Rendering ---
    // Updated to handle the 'enabled' flag correctly with Link component
    const renderCard = (feature: any, isAdvanced = false) => {
        return (
            <Link
                href={feature.enabled ? feature.href : '#'} // Use '#' for disabled links
                key={feature.name}
                className={`group block h-full relative ${!feature.enabled ? 'opacity-60 cursor-not-allowed' : ''}`}
                aria-disabled={!feature.enabled} // Add aria-disabled for accessibility
                onClick={!feature.enabled ? (e) => e.preventDefault() : undefined} // Prevent default click behavior if disabled
                tabIndex={!feature.enabled ? -1 : undefined} // Remove from tab order if disabled
            >
                {/* Add "Coming Soon" badge if not enabled */}
                {!feature.enabled && (
                    <Badge variant="secondary" className="absolute top-2 right-2 z-10 bg-gray-500 text-white text-[10px] px-1.5 py-0.5 rounded-sm">
                        Coming Soon
                    </Badge>
                )}
                <Card className={`
                    h-full border
                    dark:bg-gray-850
                    border-gray-200 dark:border-gray-700
                    ${feature.enabled ? 'hover:border-blue-500 dark:hover:border-blue-400 hover:shadow-lg dark:hover:shadow-blue-900/30' : ''}
                    transition-all duration-300
                    overflow-hidden flex flex-col
                `}>
                    <CardHeader className="pb-3">
                        <div className="flex items-center justify-between mb-2">
                            <feature.icon className={`h-6 w-6 ${feature.iconColor} ${feature.enabled ? 'transition-transform duration-300 group-hover:scale-110' : ''}`} />
                            {/* Specific Tag for Technology */}
                            <span className={`text-xs font-medium px-2.5 py-0.5 rounded-full ${feature.tagColor}`}>
                                {feature.tag}
                            </span>
                        </div>
                        <CardTitle className="text-lg font-semibold text-gray-800 dark:text-gray-100">{feature.name}</CardTitle>
                    </CardHeader>
                    <CardContent className="flex-grow flex flex-col justify-between pt-0">
                        <CardDescription className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                            {feature.description}
                        </CardDescription>
                        {/* Technology Stack Info */}
                        <div className="mt-auto">
                            <div className="text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700/50 rounded px-2 py-1 inline-flex items-center gap-1">
                                <Sparkles className="h-3 w-3 text-purple-500" /> {/* Subtle AI indicator */}
                                <span>{feature.tech}</span>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </Link>
        );
    };


    // --- Main Component Return ---
    return (
        <div className="flex flex-col gap-10 max-w-7xl mx-auto p-4 sm:p-8 bg-gray-50 dark:bg-gray-900 min-h-screen">

            {/* Header Section */}
            <div className="text-center mb-4">
                <h1 className="text-4xl font-bold text-gray-800 dark:text-gray-100 mb-2">
                    NutriCare<span className={GOOGLE_BLUE}>Agents</span>
                </h1>
                <p className="text-lg text-gray-600 dark:text-gray-400 flex items-center justify-center gap-2">
                    Intelligent Nutrition <span className="font-semibold">Powered by Google AI</span>
                    <GeminiSparkle className={`w-5 h-5 ${GEMINI_PURPLE}`} /> {/* Gemini Sparkle */}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-500 mt-1">
                    Showcasing Gemini, Vision API, Vertex AI, and more for the Google AI Competition.
                </p>
            </div>

            {/* Core Features Section */}
            <div>
                <h2 className="text-2xl font-semibold mb-5 text-gray-700 dark:text-gray-300 border-l-4 border-blue-500 pl-3">
                    Core Features
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                    {featureCards.map(feature => renderCard(feature))}
                </div>
            </div>

            {/* Advanced Capabilities Section */}
            <div>
                <h2 className="text-2xl font-semibold mb-5 text-gray-700 dark:text-gray-300 border-l-4 border-purple-500 pl-3">
                    Advanced Capabilities
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                    {advancedFeatures.map(feature => renderCard(feature, true))}
                </div>
            </div>

            {/* Stats Section - Enhanced with Google Colors */}
            <Card className="bg-gradient-to-r from-white to-gray-100 dark:from-gray-800 dark:to-gray-850 border border-gray-200 dark:border-gray-700 shadow-sm">
                <CardContent className="p-6">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                        <div className="flex flex-col items-center">
                            <p className={`text-3xl font-bold ${GOOGLE_BLUE}`}>10k+</p>
                            <p className="text-sm text-gray-600 dark:text-gray-300">Meals Recognized</p>
                        </div>
                        <div className="flex flex-col items-center">
                            <p className={`text-3xl font-bold ${GOOGLE_GREEN}`}>5k+</p>
                            <p className="text-sm text-gray-600 dark:text-gray-300">Recipes Generated</p>
                        </div>
                        <div className="flex flex-col items-center">
                            <p className={`text-3xl font-bold ${GOOGLE_YELLOW}`}>99%</p>
                            <p className="text-sm text-gray-600 dark:text-gray-300">Gemini Accuracy</p>
                        </div>
                        <div className="flex flex-col items-center">
                            <p className={`text-3xl font-bold ${GOOGLE_RED}`}>24/7</p>
                            <p className="text-sm text-gray-600 dark:text-gray-300">AI Availability</p>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Footer/Disclaimer */}
            <div className="text-center mt-6 text-xs text-gray-500 dark:text-gray-400">
                Built with <span className="font-semibold">Google AI Technologies</span> for the Google AI Competition.
                NutriCareAgents © 2024
            </div>
        </div>
    );
};

export default DashboardUI;
