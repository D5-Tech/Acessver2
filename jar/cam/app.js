class AIVisionDetector {
    constructor() {
        this.webcam = document.getElementById('webcam');
        this.canvas = document.getElementById('output-canvas');
        this.ctx = this.canvas.getContext('2d');
        this.objectList = document.getElementById('object-list');
        this.clearBtn = document.getElementById('clear-btn');
        this.loadingSpinner = document.getElementById('loading-spinner');
        this.darkModeToggle = document.getElementById('darkModeToggle');

        this.synth = window.speechSynthesis;
        this.detectedObjects = new Map();
        this.detectionThreshold = 0.5;
        this.speechCooldown = 3000; // 3 seconds between speeches
        this.lastSpeechTime = 0;
        this.currentDetections = new Set();

        this.setupEventListeners();
    }

    setupEventListeners() {
        this.clearBtn.addEventListener('click', () => this.clearDetections());
        this.darkModeToggle.addEventListener('change', () => this.toggleDarkMode());
    }

    clearDetections() {
        this.detectedObjects.clear();
        this.currentDetections.clear();
        this.objectList.innerHTML = '';
        this.speakMessage('Detections cleared');
    }

    toggleDarkMode() {
        document.body.classList.toggle('dark-mode');
        const mode = document.body.classList.contains('dark-mode') ? 'Dark' : 'Light';
        this.speakMessage(`Switched to ${mode} mode`);
    }

    async init() {
        try {
            await tf.setBackend('webgl');
            
            // Camera setup
            const stream = await navigator.mediaDevices.getUserMedia({ 
                video: { 
                    facingMode: 'environment',
                    width: { ideal: 1280 },
                    height: { ideal: 720 }
                }
            });
            
            this.webcam.srcObject = stream;
            
            await new Promise((resolve) => {
                this.webcam.onloadedmetadata = () => {
                    this.webcam.play();
                    resolve();
                };
            });

            // Load COCO-SSD model
            this.model = await cocoSsd.load({base: 'mobilenet_v2'});
            
            // Set canvas dimensions
            this.canvas.width = this.webcam.videoWidth;
            this.canvas.height = this.webcam.videoHeight;

            // Hide loading spinner
            this.loadingSpinner.style.display = 'none';

            // Start detection
            this.detectObjects();
        } catch (error) {
            console.error('Initialization error:', error);
            this.speakMessage('Failed to start vision detection');
        }
    }

    async detectObjects() {
        try {
            const predictions = await this.model.detect(this.webcam);
            
            // Clear previous drawings
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

            // Reset current detections
            this.currentDetections.clear();

            // Process and draw predictions
            predictions.forEach(prediction => {
                if (prediction.score > this.detectionThreshold) {
                    this.drawPrediction(prediction);
                    this.updateObjectList(prediction);
                    this.currentDetections.add(prediction.class);
                }
            });

            // Check for changes in detected objects
            this.checkObjectChanges();
        } catch (error) {
            console.error('Detection error:', error);
        }

        // Continue detection
        requestAnimationFrame(() => this.detectObjects());
    }

    checkObjectChanges() {
        const currentTime = Date.now();

        // If no objects are detected, clear the list
        if (this.currentDetections.size === 0) {
            this.clearDetections();
            return;
        }

        // Avoid continuous speech
        if (currentTime - this.lastSpeechTime > this.speechCooldown) {
            // Randomly select an object to speak about if multiple are detected
            const detectedObjectsArray = Array.from(this.currentDetections);
            const randomObject = detectedObjectsArray[Math.floor(Math.random() * detectedObjectsArray.length)];
            
            // Speak about a random detected object
            if (randomObject) {
                this.speakMessage(`Currently seeing ${randomObject}`);
                this.lastSpeechTime = currentTime;
            }
        }
    }

    drawPrediction(prediction) {
        const [x, y, width, height] = prediction.bbox;
        
        // Draw bounding box
        this.ctx.beginPath();
        this.ctx.rect(x, y, width, height);
        this.ctx.lineWidth = 3;
        this.ctx.strokeStyle = '#3498db';
        this.ctx.stroke();

        // Draw label
        this.ctx.fillStyle = '#3498db';
        this.ctx.font = '14px Arial';
        this.ctx.fillText(
            `${prediction.class} (${Math.round(prediction.score * 100)}%)`, 
            x, 
            y > 10 ? y - 5 : y + 15
        );
    }

    updateObjectList(prediction) {
        const key = `${prediction.class}-${Math.round(prediction.score * 100)}`;
        
        if (!this.detectedObjects.has(key)) {
            // Clear previous entries if list gets too long
            if (this.objectList.children.length > 10) {
                this.objectList.removeChild(this.objectList.firstChild);
            }

            const listItem = document.createElement('li');
            listItem.className = 'object-item';
            listItem.innerHTML = `
                <span class="object-name">${prediction.class}</span>
                <span class="object-confidence">${(prediction.score * 100).toFixed(1)}%</span>
            `;
            
            this.objectList.appendChild(listItem);
            this.detectedObjects.set(key, listItem);
        }
    }

    speakMessage(message) {
        // Cancel any ongoing speech
        this.synth.cancel();
        
        const utterance = new SpeechSynthesisUtterance(message);
        utterance.rate = 1; // Normal speaking rate
        this.synth.speak(utterance);
    }
}

// Initialize the detection system when page loads
document.addEventListener('DOMContentLoaded', () => {
    const detectionSystem = new AIVisionDetector();
    detectionSystem.init();
});