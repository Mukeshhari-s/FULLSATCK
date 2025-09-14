import React from 'react';
import './VoiceButton.css';

const VoiceButton = ({ onClick }) => (
  <button className="voice-button" onClick={onClick} title="Voice Search">
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="12" cy="12" r="12" fill="#007bff"/>
      <path d="M12 17c1.66 0 3-1.34 3-3V9a3 3 0 10-6 0v5c0 1.66 1.34 3 3 3zm5-3v-1a1 1 0 10-2 0v1a5 5 0 01-10 0v-1a1 1 0 10-2 0v1c0 3.07 2.13 5.64 5 6.32V21a1 1 0 102 0v-1.68c2.87-.68 5-3.25 5-6.32z" fill="#fff"/>
    </svg>
  </button>
);

export default VoiceButton;
