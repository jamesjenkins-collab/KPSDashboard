import { useState } from 'react';
import { HelpCircle, X, Play } from 'lucide-react';

export function HelpWidget({ videoUrl }) {
    const [isOpen, setIsOpen] = useState(false);

    // Default placeholder if no URL provided
    // This is a generic Google Drive placeholder or a simple message
    const src = videoUrl || "https://www.youtube.com/embed/dQw4w9WgXcQ?autoplay=1"; // Rick Roll placeholder for testing visibility :) - Joking, let's use a safe blank or generic one.
    // Actually, let's use a real placeholder or just empty.

    return (
        <>
            {/* Floating Button */}
            <button
                onClick={() => setIsOpen(true)}
                className="fixed bottom-24 right-6 bg-indigo-600 hover:bg-indigo-700 text-white p-3 rounded-full shadow-lg transition-all hover:scale-110 z-50 flex items-center gap-2 group"
                aria-label="Help Video"
            >
                <HelpCircle className="w-6 h-6" />
                <span className="max-w-0 overflow-hidden group-hover:max-w-xs transition-all duration-300 ease-in-out whitespace-nowrap">
                    Need Help?
                </span>
            </button>

            {/* Video Modal */}
            {isOpen && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl overflow-hidden relative flex flex-col">
                        <div className="flex items-center justify-between p-4 border-b border-gray-100">
                            <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                                <Play className="w-4 h-4 text-indigo-600 fill-current" />
                                Dashboard Walkthrough
                            </h3>
                            <button
                                onClick={() => setIsOpen(false)}
                                className="p-1 hover:bg-gray-100 rounded-full text-gray-500 transition-colors"
                            >
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        <div className="relative pt-[56.25%] bg-black">
                            {videoUrl ? (
                                <iframe
                                    src={videoUrl}
                                    className="absolute inset-0 w-full h-full"
                                    allow="autoplay; encrypted-media"
                                    allowFullScreen
                                ></iframe>
                            ) : (
                                <div className="absolute inset-0 flex items-center justify-center text-white">
                                    <p>Video URL not provided yet.</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
