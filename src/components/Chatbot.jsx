import React, { useState, useRef, useEffect } from 'react';
import { sendMessageToGemini } from '../services/gemini';
import './Chatbot.css';

const Chatbot = ({ surgeons = [], cptCodes = [], surgeries = [], patients = [], orBlockSchedule = [] }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState([
        {
            id: 1,
            role: 'bot',
            text: 'Hello! I am your ASC Manager AI Assistant. I can help with questions about surgery schedules, CPT codes, patient management, OR block schedules, and more. How can I assist you today?'
        }
    ]);
    const [inputValue, setInputValue] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef(null);
    const [isListening, setIsListening] = useState(false);
    const recognitionRef = useRef(null);

    useEffect(() => {
        // Initialize speech recognition if supported
        if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
            recognitionRef.current = new SpeechRecognition();
            recognitionRef.current.continuous = false; // Stop after one sentence
            recognitionRef.current.interimResults = false;

            recognitionRef.current.onresult = (event) => {
                const transcript = event.results[0][0].transcript;
                setInputValue(prev => prev + (prev ? ' ' : '') + transcript);
                setIsListening(false);
            };

            recognitionRef.current.onerror = (event) => {
                console.error('Speech recognition error', event.error);
                setIsListening(false);
            };

            recognitionRef.current.onend = () => {
                setIsListening(false);
            };
        }
    }, []);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, isOpen]);

    const toggleVoiceInput = () => {
        if (!recognitionRef.current) {
            alert("Voice recognition is not supported in this browser.");
            return;
        }

        if (isListening) {
            recognitionRef.current.stop();
            setIsListening(false);
        } else {
            recognitionRef.current.start();
            setIsListening(true);
        }
    };

    const prepareContextData = () => {
        // limit data sending to avoid token limits if necessary, but flash models have large windows
        const contextParts = [];

        // Add current date so the AI knows what "today" refers to
        const today = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
        contextParts.push(`Current System Date: ${today} (ISO: ${new Date().toISOString().split('T')[0]})`);

        if (surgeons.length > 0) {
            contextParts.push(`Available Surgeons:\n${surgeons.map(s => `- ${s.name} (${s.specialty})`).join('\n')}`);
        }

        if (patients.length > 0) {
            // Simplified patient list for context
            contextParts.push(`Patient Directory (Count: ${patients.length}):\n${patients.map(p => `- [ID: ${p.id}] ${p.name} (DOB: ${p.dob}, MRN: ${p.mrn})`).join('\n')}`);
        }

        if (orBlockSchedule.length > 0) {
            const scheduleStr = orBlockSchedule.map(block =>
                `- ${block.room_name} (${block.day_of_week}, ${block.week_of_month} Week): ${block.provider_name} [${block.start_time}-${block.end_time}]`
            ).join('\n');
            contextParts.push(`OR Block Schedule:\n${scheduleStr}`);
        }

        if (cptCodes.length > 0) {
            // Send a summary of CPT codes to save space, or top codes
            contextParts.push(`CPT Codes Database (Sample):\n${cptCodes.slice(0, 50).map(c => `- ${c.code}: ${c.description} (Avg Cost: $${c.cost})`).join('\n')}`);
        }

        if (surgeries.length > 0) {
            // Simplify surgery list for context
            // Sorting by date could be helpful
            const sortedSurgeries = [...surgeries].sort((a, b) => new Date(a.date) - new Date(b.date));

            // Convert to readable format: "YYYY-MM-DD: Dr. Name (Status)"
            const surgeryList = sortedSurgeries.map(s => {
                // Find CPT details for cost context if possible
                const cptDetails = (s.cpt_codes || []).map(code => {
                    const found = cptCodes.find(c => c.code === code);
                    return found ? found.reimbursement : 0;
                });
                const totalRev = cptDetails.reduce((a, b) => a + b, 0);
                return `- Date: ${s.date}, Time: ${s.start_time}, Surgeon: ${s.doctor_name}, Status: ${s.status} (Est. Rev: $${totalRev})`;
            });

            contextParts.push(`Surgery Schedule:\n${surgeryList.join('\n')}`);

            // --- Financial Performance Context ---
            // Calculate Top Performers on the fly to match Dashboard logic
            const now = new Date();
            const currentMonth = now.getMonth();
            const currentYear = now.getFullYear();

            // Helper to get week number
            const getWeek = (d) => {
                const date = new Date(d.getTime());
                date.setHours(0, 0, 0, 0);
                date.setDate(date.getDate() + 3 - (date.getDay() + 6) % 7);
                const week1 = new Date(date.getFullYear(), 0, 4);
                return 1 + Math.round(((date.getTime() - week1.getTime()) / 86400000 - 3 + (week1.getDay() + 6) % 7) / 7);
            };
            const currentWeek = getWeek(now);

            const surgeonStats = {};

            surgeries.forEach(surgery => {
                if (surgery.status === 'cancelled') return;
                const surgeryDate = new Date(surgery.date);
                const name = surgery.doctor_name;

                if (!surgeonStats[name]) surgeonStats[name] = { daily: 0, weekly: 0, monthly: 0 };

                // Calculate Profit for this surgery
                let profit = 0;
                if (surgery.cpt_codes && cptCodes.length > 0) {
                    surgery.cpt_codes.forEach(code => {
                        const cpt = cptCodes.find(c => c.code === code);
                        if (cpt) profit += (cpt.reimbursement - cpt.cost);
                    });
                }

                // Daily
                if (surgeryDate.toDateString() === now.toDateString()) {
                    surgeonStats[name].daily += profit;
                }
                // Monthly
                if (surgeryDate.getMonth() === currentMonth && surgeryDate.getFullYear() === currentYear) {
                    surgeonStats[name].monthly += profit;
                }
                // Weekly
                if (getWeek(surgeryDate) === currentWeek && surgeryDate.getFullYear() === currentYear) {
                    surgeonStats[name].weekly += profit;
                }
            });

            // Find leaders
            const getLeader = (period) => {
                let max = -1;
                let leader = "None";
                Object.entries(surgeonStats).forEach(([name, stats]) => {
                    if (stats[period] > max && stats[period] > 0) {
                        max = stats[period];
                        leader = `${name} ($${stats[period].toFixed(2)})`;
                    }
                });
                return leader;
            };

            contextParts.push(`Financial Performance Indicators:
- Daily Top Performer (Profit): ${getLeader('daily')}
- Weekly Top Performer (Profit): ${getLeader('weekly')}
- Monthly Top Performer (Profit): ${getLeader('monthly')}`);
        }

        return contextParts.join('\n\n');
    };

    const handleSend = async (e) => {
        e.preventDefault();
        if (!inputValue.trim() || isLoading) return;

        const userMessageText = inputValue.trim();
        setInputValue('');

        // Add user message
        const newMessage = {
            id: Date.now(),
            role: 'user',
            text: userMessageText
        };

        setMessages(prev => [...prev, newMessage]);
        setIsLoading(true);

        try {
            // Prepare history for context
            // Filter out the initial welcome message (id: 1) because Gemini API requires the first message to be from 'user'
            const history = messages
                .filter(msg => msg.id !== 1)
                .map(msg => ({
                    role: msg.role === 'bot' ? 'model' : 'user',
                    text: msg.text
                }));

            const contextData = prepareContextData();
            const responseText = await sendMessageToGemini(userMessageText, history, contextData);

            setMessages(prev => [...prev, {
                id: Date.now() + 1,
                role: 'bot',
                text: responseText
            }]);
        } catch (error) {
            setMessages(prev => [...prev, {
                id: Date.now() + 1,
                role: 'bot',
                text: "I'm sorry, I encountered an issue connecting to the AI service. Please try again."
            }]);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="chatbot-container">
            {isOpen && (
                <div className="chatbot-window">
                    <div className="chatbot-header">
                        <div className="chatbot-title">
                            <span className="status-dot"></span>
                            ASC Assistant
                        </div>
                        <button className="chatbot-close" onClick={() => setIsOpen(false)}>
                            ×
                        </button>
                    </div>

                    <div className="chatbot-messages">
                        {messages.map((msg) => (
                            <div key={msg.id} className={`message ${msg.role}`}>
                                <div>{msg.text}</div>
                                <span className="message-time">
                                    {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                            </div>
                        ))}
                        {isLoading && (
                            <div className="typing-indicator">
                                <span className="typing-dot"></span>
                                <span className="typing-dot"></span>
                                <span className="typing-dot"></span>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    <form className="chatbot-input-area" onSubmit={handleSend}>
                        <button
                            type="button"
                            className={`chatbot-mic ${isListening ? 'listening' : ''}`}
                            onClick={toggleVoiceInput}
                            title="Voice Input"
                            style={{ marginRight: '8px', background: 'none', border: 'none', cursor: 'pointer', color: isListening ? '#ef4444' : '#64748b' }}
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" fill={isListening ? "currentColor" : "none"} viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" width="24" height="24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" />
                            </svg>
                        </button>
                        <input
                            type="text"
                            className="chatbot-input"
                            placeholder={isListening ? "Listening..." : "Ask a question..."}
                            value={inputValue}
                            onChange={(e) => setInputValue(e.target.value)}
                            disabled={isLoading}
                        />
                        <button type="submit" className="chatbot-send" disabled={isLoading || !inputValue.trim()}>
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <line x1="22" y1="2" x2="11" y2="13"></line>
                                <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                            </svg>
                        </button>
                    </form>
                </div>
            )}

            <button className="chatbot-toggle" onClick={() => setIsOpen(!isOpen)}>
                {isOpen ? (
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="18" y1="6" x2="6" y2="18"></line>
                        <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                    </svg>
                )}
            </button>
        </div>
    );
};

export default Chatbot;
