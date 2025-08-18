import React, { useState } from 'react';
import './ChatBot.css';

const ChatBot = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [inputMessage, setInputMessage] = useState('');

    const toggleChat = () => {
        setIsOpen(!isOpen);
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!inputMessage.trim()) return;
        setInputMessage('');
    };

    return (
        <div className="chatbot-container">
            {isOpen ? (
                <div className="chat-window">
                    <div className="chat-header">
                        <h3>Chat</h3>
                        <button onClick={toggleChat} className="close-button">&times;</button>
                    </div>
                    <div className="messages-container">
                        {/* Empty messages container */}
                    </div>
                    <form onSubmit={handleSubmit} className="message-form">
                        <input
                            type="text"
                            value={inputMessage}
                            onChange={(e) => setInputMessage(e.target.value)}
                            placeholder="Type your message..."
                            className="message-input"
                        />
                        <button type="submit" className="send-button">Send</button>
                    </form>
                </div>
            ) : (
                <button onClick={toggleChat} className="chat-toggle-button">
                    <span className="chat-icon">💬</span>
                    Chat
                </button>
            )}
        </div>
    );
};

export default ChatBot;
