const express = require('express');
const axios = require('axios');
const bodyParser = require('body-parser');
const cors = require('cors');
const fs = require('fs');
const app = express();
const PORT = process.env.PORT || 3000;

// Replace with your actual bot token from BotFather
const BOT_TOKEN = '7822362143:AAEqlbRwydwdlhpug-c--UAbJJ52DwWQWVU';
// Replace with your Telegram user ID (for security)
const AUTHORIZED_USER_ID = '2111718061';

// Store password in a file
const PASSWORD_FILE = 'password.json';

// Initialize password file if it doesn't exist
if (!fs.existsSync(PASSWORD_FILE)) {
  fs.writeFileSync(PASSWORD_FILE, JSON.stringify({ password: 'admin123' }));
}

app.use(bodyParser.json());
app.use(cors()); // Enable CORS for all routes

// Endpoint to get the current password
app.get('/password', (req, res) => {
  const data = JSON.parse(fs.readFileSync(PASSWORD_FILE));
  res.json({ success: true, password: data.password });
});

// Handle incoming Telegram messages
app.post('/webhook', (req, res) => {
  const message = req.body.message;
  
  if (message && message.from.id.toString() === AUTHORIZED_USER_ID) {
    // Command format: /setpassword newpassword123
    if (message.text.startsWith('/setpassword ')) {
      const newPassword = message.text.split(' ')[1];
      
      // Update the password in our file
      fs.writeFileSync(PASSWORD_FILE, JSON.stringify({ password: newPassword }));
      
      // Send confirmation message
      axios.post(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
        chat_id: message.chat.id,
        text: `Password has been updated to: ${newPassword}`
      });
    }
  }
  
  res.sendStatus(200);
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));