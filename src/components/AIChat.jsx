import { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Send, Bot, User, Key, Loader2, Sparkles, ChevronDown } from 'lucide-react';
import { calculateSchoolStats } from '../lib/ai-context';

export function AIChat({ data }) {
    const [isOpen, setIsOpen] = useState(false);
    const [apiKey, setApiKey] = useState(localStorage.getItem('gemini_api_key') || '');
    const [showKeyInput, setShowKeyInput] = useState(!localStorage.getItem('gemini_api_key'));
    const [messages, setMessages] = useState([
        { role: 'system', content: "Hello! I'm your Data Assistant. I can answer questions about school performance, gaps, and trends effectively. I do not have access to individual student names. Ask me anything!" }
    ]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef(null);

    // Persist API Key
    const handleSaveKey = (key) => {
        setApiKey(key);
        localStorage.setItem('gemini_api_key', key);
        setShowKeyInput(false);
    };

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, isOpen]);

    const handleSend = async () => {
        if (!input.trim() || !apiKey) return;

        const userMsg = input;
        setInput('');
        setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
        setIsLoading(true);

        try {
            // 1. Aggregate Data (Privacy Firewall)
            const stats = calculateSchoolStats(data);
            const statsString = JSON.stringify(stats, null, 2);

            // 2. Construct Prompt
            const systemPrompt = `
You are a Data Analysis Assistant for a Primary School Headteacher.
You have access to the following SCHOOL-LEVEL statistics in JSON format:
${statsString}

RULES:
1. You DO NOT have access to individual student names or records.
2. If asked about specific students, explain you only have aggregated data.
3. Be concise, professional, and insight-driven.
4. Highlight gaps and trends where possible.
5. Use bullet points for clarity.

User Question: ${userMsg}
            `;

            // 3. Call Gemini API
            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${apiKey}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: systemPrompt }] }]
                })
            });

            const result = await response.json();

            if (result.error) {
                throw new Error(result.error.message || "API Error");
            }

            const aiText = result.candidates[0].content.parts[0].text;

            setMessages(prev => [...prev, { role: 'assistant', content: aiText }]);

        } catch (error) {
            let errorMsg = `Error: ${error.message}.`;

            // Auto-Diagnostic: Try to list available models if the specific one failed
            try {
                const listResp = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
                const listData = await listResp.json();
                if (listData.models) {
                    const validModels = listData.models
                        .filter(m => m.supportedGenerationMethods?.includes('generateContent'))
                        .map(m => m.name.replace('models/', ''))
                        .join(', ');
                    errorMsg += `\n\nYour API key sees these models: ${validModels}.\n\nPlease tell the developer to update the code with one of these!`;
                }
            } catch (diagError) {
                errorMsg += "\n(Could not list models either - check your API key)";
            }

            if (error.message.includes('billing') || error.message.includes('quota')) {
                errorMsg += "\n\n(Note: Google Cloud projects often require billing details for identity verification, even for free tiers. You can set a $1 budget alert to be safe.)";
            }

            setMessages(prev => [...prev, { role: 'error', content: errorMsg }]);
        } finally {
            setIsLoading(false);
        }
    };

    if (!isOpen) {
        return (
            <button
                onClick={() => setIsOpen(true)}
                className="fixed bottom-6 right-6 bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-4 rounded-full shadow-lg hover:shadow-xl transition-all hover:scale-105 z-50 flex items-center gap-2 group"
            >
                <Sparkles className="w-6 h-6 animate-pulse" />
                <span className="font-bold pr-2 hidden group-hover:block animate-fade-in">Ask AI</span>
            </button>
        );
    }

    return (
        <div className="fixed bottom-6 right-6 w-96 h-[600px] bg-white rounded-2xl shadow-2xl border border-gray-200 flex flex-col z-50 animate-in slide-in-from-bottom-10 fade-in duration-300">
            {/* Header */}
            <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-4 rounded-t-2xl flex justify-between items-center text-white">
                <div className="flex items-center gap-2">
                    <Bot className="w-5 h-5" />
                    <h3 className="font-bold">Data Assistant</h3>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setShowKeyInput(!showKeyInput)}
                        className="p-1.5 hover:bg-white/20 rounded-lg transition-colors"
                        title="API Key Settings"
                    >
                        <Key className="w-4 h-4" />
                    </button>
                    <button
                        onClick={() => setIsOpen(false)}
                        className="p-1.5 hover:bg-white/20 rounded-lg transition-colors"
                    >
                        <ChevronDown className="w-5 h-5" />
                    </button>
                </div>
            </div>

            {/* API Key Input */}
            {showKeyInput && (
                <div className="p-4 bg-gray-50 border-b border-gray-200">
                    <label className="block text-xs font-bold text-gray-500 mb-2">GEMINI API KEY</label>
                    <input
                        type="password"
                        value={apiKey}
                        onChange={(e) => setApiKey(e.target.value)}
                        placeholder="Paste your key here..."
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm mb-2 focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                    <button
                        onClick={() => handleSaveKey(apiKey)}
                        className="w-full bg-black text-white py-1.5 rounded-lg text-xs font-bold hover:bg-gray-800"
                    >
                        Save Key
                    </button>
                    <p className="text-[10px] text-gray-400 mt-2 text-center">
                        Key is stored locally in your browser.
                    </p>
                </div>
            )}

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
                {messages.map((msg, idx) => (
                    <div key={idx} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        {msg.role !== 'user' && (
                            <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center shrink-0">
                                <Bot className="w-4 h-4 text-indigo-600" />
                            </div>
                        )}
                        <div
                            className={`max-w-[80%] p-3 rounded-2xl text-sm ${msg.role === 'user'
                                ? 'bg-indigo-600 text-white rounded-tr-none'
                                : msg.role === 'error'
                                    ? 'bg-red-100 text-red-700 rounded-tl-none'
                                    : 'bg-white border border-gray-200 text-gray-800 rounded-tl-none shadow-sm'
                                }`}
                        >
                            <div className="whitespace-pre-wrap">{msg.content}</div>
                        </div>
                    </div>
                ))}
                <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="p-4 bg-white border-t border-gray-200 rounded-b-2xl">
                <div className="relative flex items-center">
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                        placeholder={apiKey ? "Ask about data..." : "Enter API Key first"}
                        disabled={!apiKey || isLoading}
                        className="w-full pl-4 pr-12 py-3 bg-gray-100 border-none rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none disabled:opacity-50"
                    />
                    <button
                        onClick={handleSend}
                        disabled={!apiKey || !input.trim() || isLoading}
                        className="absolute right-2 p-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                    >
                        {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    </button>
                </div>
            </div>
        </div>
    );
}
