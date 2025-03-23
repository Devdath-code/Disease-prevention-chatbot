document.addEventListener('DOMContentLoaded', function() {
    // Elements
    const chatMessages = document.getElementById('chat-messages');
    const userInput = document.getElementById('user-input');
    const sendBtn = document.getElementById('send-btn');
    const newChatBtn = document.getElementById('new-chat-btn');
    
    // Generate a unique session ID
    const sessionId = 'session_' + Date.now();
    
    // Event listeners
    sendBtn.addEventListener('click', sendMessage);
    userInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });
    
    newChatBtn.addEventListener('click', clearChat);
    
    // Function to send message
    function sendMessage() {
        const message = userInput.value.trim();
        
        if (message === '') return;
        
        // Clear input
        userInput.value = '';
        
        // Add user message to chat
        addMessageToChat('user', message);
        
        // Show typing indicator
        showTypingIndicator();
        
        // Send message to backend
        fetch('/api/diagnose', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                message: message,
                session_id: sessionId
            })
        })
        .then(response => response.json())
        .then(data => {
            // Remove typing indicator
            hideTypingIndicator();
            
            // Handle error
            if (data.error) {
                addErrorMessage(data.message);
                return;
            }
            
            // Add bot response to chat
            addDiagnosisToChat(data);
        })
        .catch(error => {
            hideTypingIndicator();
            addErrorMessage('Failed to get a response. Please try again.');
            console.error('Error:', error);
        });
    }
    
    // Function to add message to chat
    function addMessageToChat(role, content) {
        const messageDiv = document.createElement('div');
        messageDiv.classList.add('message', `${role}-message`);
        messageDiv.textContent = content;
        
        chatMessages.appendChild(messageDiv);
        scrollToBottom();
    }
    
    // Function to add diagnosis to chat
    function addDiagnosisToChat(diagnosis) {
        // Remove welcome message if it exists
        const welcomeMessage = document.querySelector('.welcome-message');
        if (welcomeMessage) {
            welcomeMessage.remove();
        }
        
        const diagnosisDiv = document.createElement('div');
        diagnosisDiv.classList.add('message', 'bot-message', 'diagnosis');
        
        // Primary diagnosis section
        const primarySection = document.createElement('div');
        primarySection.classList.add('diagnosis-section');
        
        const primaryTitle = document.createElement('div');
        primaryTitle.classList.add('diagnosis-title');
        primaryTitle.textContent = 'Primary Diagnosis:';
        primarySection.appendChild(primaryTitle);
        
        const diseaseName = document.createElement('div');
        diseaseName.textContent = diagnosis.primary_diagnosis.disease_name;
        primarySection.appendChild(diseaseName);
        
        // Precautions list
        const precautionsTitle = document.createElement('div');
        precautionsTitle.classList.add('diagnosis-title');
        precautionsTitle.textContent = 'Precautions:';
        primarySection.appendChild(precautionsTitle);
        
        const precautionsList = document.createElement('ul');
        precautionsList.classList.add('precautions-list');
        
        diagnosis.primary_diagnosis.precautions.forEach(precaution => {
            const listItem = document.createElement('li');
            listItem.textContent = precaution;
            precautionsList.appendChild(listItem);
        });
        
        primarySection.appendChild(precautionsList);
        diagnosisDiv.appendChild(primarySection);
        
        // Alternative diagnosis section
        const alternativeSection = document.createElement('div');
        alternativeSection.classList.add('diagnosis-section', 'alternative-diagnosis');
        
        const alternativeTitle = document.createElement('div');
        alternativeTitle.classList.add('diagnosis-title');
        alternativeTitle.textContent = 'Alternative Diagnosis (Less Likely):';
        alternativeSection.appendChild(alternativeTitle);
        
        const alternativeName = document.createElement('div');
        alternativeName.textContent = diagnosis.possible_alternative.disease_name;
        alternativeSection.appendChild(alternativeName);
        
        const disclaimer = document.createElement('div');
        disclaimer.textContent = diagnosis.possible_alternative.disclaimer;
        disclaimer.style.fontSize = '0.9rem';
        disclaimer.style.marginTop = '8px';
        alternativeSection.appendChild(disclaimer);
        
        diagnosisDiv.appendChild(alternativeSection);
        
        chatMessages.appendChild(diagnosisDiv);
        scrollToBottom();
    }
    
    // Function to add error message
    function addErrorMessage(message) {
        const errorDiv = document.createElement('div');
        errorDiv.classList.add('message', 'bot-message', 'error-message');
        errorDiv.textContent = `Error: ${message}`;
        
        chatMessages.appendChild(errorDiv);
        scrollToBottom();
    }
    
    // Function to show typing indicator
    function showTypingIndicator() {
        const typingDiv = document.createElement('div');
        typingDiv.classList.add('typing-indicator');
        typingDiv.id = 'typing-indicator';
        
        for (let i = 0; i < 3; i++) {
            const dot = document.createElement('div');
            dot.classList.add('typing-dot');
            typingDiv.appendChild(dot);
        }
        
        chatMessages.appendChild(typingDiv);
        scrollToBottom();
    }
    
    // Function to hide typing indicator
    function hideTypingIndicator() {
        const typingIndicator = document.getElementById('typing-indicator');
        if (typingIndicator) {
            typingIndicator.remove();
        }
    }
    
    // Function to clear chat
    function clearChat() {
        // Send clear history request to backend
        fetch('/api/clear_history', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                session_id: sessionId
            })
        })
        .then(response => response.json())
        .then(data => {
            if (data.status === 'success') {
                // Clear chat messages
                chatMessages.innerHTML = '';
                
                // Re-add welcome message
                const welcomeDiv = document.createElement('div');
                welcomeDiv.classList.add('welcome-message');
                
                const welcomeTitle = document.createElement('h2');
                welcomeTitle.textContent = 'Welcome to MediDiagnose';
                welcomeDiv.appendChild(welcomeTitle);
                
                const welcomeText1 = document.createElement('p');
                welcomeText1.textContent = 'Describe your symptoms in detail, and I\'ll suggest a possible diagnosis and precautions.';
                welcomeDiv.appendChild(welcomeText1);
                
                const welcomeText2 = document.createElement('p');
                welcomeText2.textContent = 'Example: "I\'ve been experiencing a dry cough, fever, and fatigue for the past three days."';
                welcomeDiv.appendChild(welcomeText2);
                
                chatMessages.appendChild(welcomeDiv);
            }
        })
        .catch(error => {
            console.error('Error clearing chat history:', error);
        });
    }
    
    // Function to scroll to bottom of chat
    function scrollToBottom() {
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }
    
    // Initialize - Load chat history if any
    function loadChatHistory() {
        fetch(`/api/history?session_id=${sessionId}`)
            .then(response => response.json())
            .then(data => {
                if (data.length > 0) {
                    // Remove welcome message
                    const welcomeMessage = document.querySelector('.welcome-message');
                    if (welcomeMessage) {
                        welcomeMessage.remove();
                    }
                    
                    // Add messages to chat
                    data.forEach(item => {
                        if (item.role === 'user') {
                            addMessageToChat('user', item.content);
                        } else if (item.role === 'bot') {
                            // Handle bot response based on content
                            if (item.content.error) {
                                addErrorMessage(item.content.message);
                            } else {
                                addDiagnosisToChat(item.content);
                            }
                        }
                    });
                }
            })
            .catch(error => {
                console.error('Error loading chat history:', error);
            });
    }
    
    // Initial setup - auto-resize textarea
    userInput.addEventListener('input', function() {
        this.style.height = 'auto';
        this.style.height = (this.scrollHeight < 120 ? this.scrollHeight : 120) + 'px';
    });
});