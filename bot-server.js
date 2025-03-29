const express = require('express');
const axios = require('axios');
const bodyParser = require('body-parser');
const app = express();

// Your bot token from BotFather
const BOT_TOKEN = '7822362143:AAEqlbRwydwdlhpug-c--UAbJJ52DwWQWVU';
// Your user ID (for security, so only you can change password)
const AUTHORIZED_USER_ID = '2111718061';

app.use(bodyParser.json());

// Handle incoming Telegram messages
app.post('/webhook', (req, res) => {
  const message = req.body.message;
  
  // Check if it's you sending the message
  if (message && message.from.id.toString() === AUTHORIZED_USER_ID) {
    // Command format: /setpassword newpassword123
    if (message.text.startsWith('/setpassword ')) {
      const newPassword = message.text.split(' ')[1];
      
      // Here you would update the password in your database
      // For this example, we'll just log it
      console.log(`Password updated to: ${newPassword}`);
      
      // Send confirmation message
      axios.post(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
        chat_id: message.chat.id,
        text: `Password has been updated to: ${newPassword}`
      });
    }
  }
  
  res.sendStatus(200);
});

app.listen(3000, () => console.log('Bot server running on port 3000'));