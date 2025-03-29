// DOM Elements
const btn = document.querySelector('.talk');
const content = document.querySelector('.content');
let isListening = false;
let currentUtterance = null;
let userLocation = null;

// API Keys
const GEMINI_API_KEY = 'AIzaSyC-QZ_UG_7qKGERPaBlzNF3Qj6lhgr3JsQ'; // Replace with your API key
const OPENWEATHER_API_KEY = 'b76ef054e6fa51739f614769d942f8d9'; // Replace with your OpenWeather API key

// API Endpoints
const geminiEndpoint = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

// Add status indicator to the DOM
const statusIndicator = document.createElement('div');
statusIndicator.className = 'status-indicator';
document.querySelector('.main').appendChild(statusIndicator);

// Add wave animation container
const waveContainer = document.createElement('div');
waveContainer.className = 'wave-container';
for(let i = 0; i < 4; i++) {
    const wave = document.createElement('div');
    wave.className = 'wave';
    waveContainer.appendChild(wave);
}
document.querySelector('.input').appendChild(waveContainer);

// Initialize Location
async function initializeLocation() {
    return new Promise((resolve, reject) => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                position => {
                    userLocation = {
                        lat: position.coords.latitude,
                        lon: position.coords.longitude
                    };
                    showStatus('Location accessed successfully', 2000);
                    resolve(userLocation);
                },
                error => {
                    console.error('Error getting location:', error);
                    showStatus('Could not access location. Please enable location services.', 3000);
                    reject(error);
                },
                {
                    enableHighAccuracy: true,
                    timeout: 5000,
                    maximumAge: 0
                }
            );
        } else {
            showStatus('Geolocation is not supported by this browser', 3000);
            reject(new Error('Geolocation not supported'));
        }
    });
}

// Weather Functions
async function getWeather() {
    try {
        if (!userLocation) {
            // Try to get location if not already set
            userLocation = await initializeLocation();
        }

        const response = await fetch(
            `https://api.openweathermap.org/data/2.5/weather?lat=${userLocation.lat}&lon=${userLocation.lon}&appid=${OPENWEATHER_API_KEY}&units=metric`
        );
        
        if (!response.ok) {
            throw new Error(`Weather API returned status: ${response.status}`);
        }
        
        const data = await response.json();
        return `The current weather in ${data.name} is ${data.weather[0].description} with a temperature of ${Math.round(data.main.temp)}°C. The humidity is ${data.main.humidity}% and wind speed is ${data.wind.speed} meters per second.`;
    } catch (error) {
        console.error('Error fetching weather:', error);
        return "I need permission to access your location for weather information. Please enable location services and try again.";
    }
}

async function getWeatherForecast() {
    try {
        if (!userLocation) {
            userLocation = await initializeLocation();
        }

        const response = await fetch(
            `https://api.openweathermap.org/data/2.5/forecast?lat=${userLocation.lat}&lon=${userLocation.lon}&appid=${OPENWEATHER_API_KEY}&units=metric`
        );
        
        if (!response.ok) {
            throw new Error(`Weather API returned status: ${response.status}`);
        }
        
        const data = await response.json();
        
        let forecast = "Here's the weather forecast: ";
        const uniqueDays = new Set();
        
        for (const item of data.list) {
            const date = new Date(item.dt * 1000);
            const day = date.toLocaleDateString('en-US', { weekday: 'long' });
            
            if (!uniqueDays.has(day) && uniqueDays.size < 3) {
                uniqueDays.add(day);
                forecast += `${day}: ${item.weather[0].description} with a high of ${Math.round(item.main.temp_max)}°C. `;
            }
        }
        
        return forecast;
    } catch (error) {
        console.error('Error fetching forecast:', error);
        return "I'm having trouble accessing the weather forecast. Please make sure location services are enabled.";
    }
}

// Speech Functions
function speak(sentence) {
    // Cancel any ongoing speech
    window.speechSynthesis.cancel();
    
    const text_speak = new SpeechSynthesisUtterance(sentence);
    text_speak.rate = 1;
    text_speak.pitch = 1;
    
    // Store the current utterance
    currentUtterance = text_speak;
    
    // Show speaking animation
    waveContainer.classList.add('active');
    
    text_speak.onend = () => {
        waveContainer.classList.remove('active');
        currentUtterance = null;
    };
    
    window.speechSynthesis.speak(text_speak);
}

// Status Indicator Function
function showStatus(message, duration = 2000) {
    statusIndicator.textContent = message;
    statusIndicator.classList.add('visible');
    setTimeout(() => {
        statusIndicator.classList.remove('visible');
    }, duration);
}

function wishMe() {
    const day = new Date();
    const hr = day.getHours();
    
    let greeting;
    if(hr >= 0 && hr < 12) {
        greeting = "Good Morning DEVA";
    } else if(hr === 12) {
        greeting = "Good Noon Boss";
    } else if(hr > 12 && hr <= 17) {
        greeting = "Good Afternoon DEVA";
    } else {
        greeting = "Good Evening DEVA";
    }
    
    speak(greeting);
}

// Initialize Jarvis
window.addEventListener('load', async () => {
    speak("Activating Jarvis");
    
    try {
        // Initialize location immediately
        await initializeLocation();
        
        setTimeout(() => {
            speak("Going online");
            setTimeout(wishMe, 1500);
        }, 1500);
    } catch (error) {
        console.error('Error during initialization:', error);
        speak("I'm online, but I'll need location permission for weather features.");
    }
});

// Speech Recognition Setup
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
const recognition = new SpeechRecognition();

recognition.onstart = () => {
    isListening = true;
    btn.classList.add('listening');
    content.textContent = "Listening...";
};

recognition.onend = () => {
    isListening = false;
    btn.classList.remove('listening');
    content.textContent = "Click here to speak";
};

recognition.onresult = (event) => {
    const message = event.results[0][0].transcript;
    content.textContent = message;
    // Add user's voice message to chat
    addMessageToChat(message, 'user');
    speakThis(message);
};

recognition.onerror = (event) => {
    console.error('Speech recognition error:', event.error);
    content.textContent = "Error occurred. Please try again.";
    isListening = false;
    btn.classList.remove('listening');
};

// Button click handler with interrupt functionality
btn.addEventListener('click', () => {
    if (isListening) {
        recognition.stop();
        isListening = false;
    } else {
        recognition.start();
    }
});

// Gemini AI Integration
async function askGemini(prompt) {
    try {
        const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=' + GEMINI_API_KEY, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                contents: [{
                    parts: [{ text: prompt }]
                }],
                generationConfig: {
                    temperature: 0.7,
                    maxOutputTokens: 200,
                    topK: 1,
                    topP: 0.95
                }
            })
        });

        if (!response.ok) {
            const errorBody = await response.text();
            console.error('Gemini API Error Response:', errorBody);
            throw new Error(`Gemini API returned status: ${response.status}. Details: ${errorBody}`);
        }

        const data = await response.json();
        
        // Updated response extraction for the new API structure
        if (data.candidates && data.candidates.length > 0 && 
            data.candidates[0].content && data.candidates[0].content.parts &&
            data.candidates[0].content.parts.length > 0) {
            return data.candidates[0].content.parts[0].text;
        } else {
            console.error('Unexpected Gemini API response structure:', data);
            return "I'm unable to generate a response right now.";
        }
    } catch (error) {
        console.error('Error calling Gemini:', error);
        
        // Detailed error handling
        if (error.message.includes('403')) {
            return "API access denied. Please check your API key and permissions.";
        } else if (error.message.includes('429')) {
            return "Rate limit exceeded. Please try again later.";
        } else if (error.message.includes('network')) {
            return "Network error. Please check your internet connection.";
        }
        
        return "I'm having trouble connecting to my AI systems. Please try again later.";
    }
}

// Update the Gemini endpoint in the global variables

async function speakThis(message) {
    try {
        // Show typing indicator before AI response
        addTypingIndicator();

        let aiResponse = '';

        // Weather-related queries
        if (message.toLowerCase().includes('weather')) {
            if (message.toLowerCase().includes('forecast') || message.toLowerCase().includes('prediction') || message.toLowerCase().includes('tomorrow')) {
                aiResponse = await getWeatherForecast();
            } else {
                aiResponse = await getWeather();
            }
        }
        // Name and Developer Info
        else if(message.toLowerCase().includes('what is your name') || message.toLowerCase().includes('who are you')) {
            aiResponse = "I am Jarvis. Would you like to know more about my developer?";
            window.waitingForDevInfo = true;
        }
        // Handle the follow-up response about developer
        else if(window.waitingForDevInfo && 
               (message.toLowerCase().includes('yes') || message.toLowerCase().includes('sure') || message.toLowerCase().includes('okay'))) {
            aiResponse = "I was developed by Devanarayanan, a first-year B.Tech student in Robotics and Automation with a strong background in front-end development. You have six years of experience on YouTube, where you have about 100,000 subscribers and over 300 videos.";
            window.waitingForDevInfo = false;
        }
        else if(window.waitingForDevInfo && 
               (message.toLowerCase().includes('no') || message.toLowerCase().includes('nope'))) {
            aiResponse = "Alright, let me know if you need anything else.";
            window.waitingForDevInfo = false;
        }
        // System Commands
        else if(message.toLowerCase().includes('open google')) {
            window.open("https://google.com", "_blank");
            aiResponse = "Opening Google";
        }
        else if(message.toLowerCase().includes('open youtube')) {
            window.open("https://youtube.com", "_blank");
            aiResponse = "Opening YouTube";
        }
        else if(message.toLowerCase().includes('open instagram')) {
            window.open("https://instagram.com", "_blank");
            aiResponse = "Opening Instagram";
        }
        else if(message.toLowerCase().includes('calculator')) {
            window.open('Calculator:///')
            aiResponse = "Opening Calculator";
        }
        else if(message.toLowerCase().includes('what is the time')) {
            const time = new Date().toLocaleString(undefined, {hour: "numeric", minute: "numeric"})
            aiResponse = `The current time is ${time}`;
        }
        else if(message.toLowerCase().includes('what is the date')) {
            const date = new Date().toLocaleString(undefined, {month: "short", day: "numeric"})
            aiResponse = `Today's date is ${date}`;
        }
        // Explicit Google Search Command
        else if(message.toLowerCase().includes('search on google')) {
            const searchQuery = message.replace(/search on google/i, '').trim();
            window.open(`https://www.google.com/search?q=${searchQuery.replace(/ /g, "+")}`, "_blank");
            aiResponse = "I've searched Google for " + searchQuery;
        }
        // Gemini AI Response for other queries
        else {
            try {
                aiResponse = await askGemini(message);
                
                if(aiResponse.toLowerCase().includes('search') || 
                   aiResponse.toLowerCase().includes('look up') ||
                   aiResponse.toLowerCase().includes('find online')) {
                    window.open(`https://www.google.com/search?q=${message.replace(/ /g, "+")}`, "_blank");
                    aiResponse = "Let me search that for you online.";
                }
            } catch (error) {
                console.error('Error:', error);
                aiResponse = "I'm having trouble connecting to my AI systems. Please try again.";
            }
        }

        // Remove typing indicator
        removeTypingIndicator();

        // Add AI response to chat
        if (aiResponse) {
            addMessageToChat(aiResponse, 'ai');
            speak(aiResponse);
        }

    } catch (error) {
        console.error('Error in speakThis:', error);
        removeTypingIndicator();
        const errorMessage = "I encountered an error. Please try again.";
        addMessageToChat(errorMessage, 'ai');
        speak(errorMessage);
    }
}

// Add typing indicator functions
function addTypingIndicator() {
    const typingDiv = document.createElement('div');
    typingDiv.className = 'message ai typing-indicator';
    typingDiv.innerHTML = `
        <div class="typing-dots">
            <span></span>
            <span></span>
            <span></span>
        </div>
    `;
    chatMessages.appendChild(typingDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

function removeTypingIndicator() {
    const typingIndicator = document.querySelector('.typing-indicator');
    if (typingIndicator) {
        typingIndicator.remove();
    }
}

// Chat functionality
const chatMessages = document.getElementById('chatMessages');
const chatInput = document.getElementById('chatInput');
const chatSend = document.getElementById('chatSend');

function addMessageToChat(message, type = 'ai') {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${type}`;
    messageDiv.textContent = message;
    chatMessages.appendChild(messageDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

// Chat input handler
chatSend.addEventListener('click', () => {
    const message = chatInput.value.trim();
    if (message) {
        addMessageToChat(message, 'user');
        chatInput.value = '';
        
        // Process user message and get AI response
        speakThis(message);
    }
});

// Enter key handler for chat input
chatInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        const message = chatInput.value.trim();
        if (message) {
            addMessageToChat(message, 'user');
            chatInput.value = '';
            
            // Process user message and get AI response
            speakThis(message);
        }
    }
});

// Chat Toggle Functionality
const chatToggleBtn = document.querySelector('.chat-toggle-btn');
const chatCloseBtn = document.querySelector('.chat-close-btn');
const chatContainer = document.querySelector('.chat-container');

chatToggleBtn.addEventListener('click', () => {
    chatContainer.classList.toggle('active');
});

chatCloseBtn.addEventListener('click', () => {
    chatContainer.classList.remove('active');
});

// Quick Actions Event Listeners
document.querySelectorAll('.action-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
        const action = e.currentTarget.dataset.action;
        
        if (action === 'time') {
            speak("Analyzing time...");
            setTimeout(() => {
                const now = new Date();
                const timeString = now.toLocaleTimeString('en-US', {
                    hour: 'numeric',
                    minute: 'numeric',
                    hour12: true
                });
                speak(`The current time is ${timeString}`);
            }, 1500);
        } else if (action === 'weather') {
            speak("Analyzing weather conditions...");
            const weatherInfo = await getWeather();
            speak(weatherInfo);
        }
    });
});