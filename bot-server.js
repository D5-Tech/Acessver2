const express = require('express');
const axios = require('axios');
const bodyParser = require('body-parser');
const app = express();

// Your bot token from BotFather
const BOT_TOKEN = '7822362143:AAEqlbRwydwdlhpug-c--UAbJJ52DwWQWVU';
// Your user ID (for security, so only you can change password)
const AUTHORIZED_USER_ID = '2111718061';

// JSONBin.io configuration
const JSONBIN_BIN_ID = '67e7efd88561e97a50f51fa8'; // Using your specific bin ID
const JSONBIN_MASTER_KEY = '$2a$10$REO54EyVDK6DvkiyX0DaKu/ckaJpQvWJd3.sBpM4Dn0gjLy.TYb2G';
const JSONBIN_ACCESS_KEY = '$2a$10$P5mBlQ.BcqXgUBzVVM.7qOF/G8QqyKBzhgB.tKOm9OltORL3wEN7u';

app.use(bodyParser.json());

// Add a simple GET endpoint for health check and verification
app.get('/', (req, res) => {
  res.send('Bot server is running!');
});

// For Telegram webhook verification
app.get('/webhook', (req, res) => {
  res.sendStatus(200);
});

// Update password in JSONBin.io
async function updatePassword(newPassword) {
  try {
    console.log(`Updating password to: ${newPassword}`);
    
    const response = await axios.put(
      `https://api.jsonbin.io/v3/b/${JSONBIN_BIN_ID}`,
      { password: newPassword },
      {
        headers: {
          'Content-Type': 'application/json',
          'X-Master-Key': JSONBIN_MASTER_KEY
        }
      }
    );
    
    console.log('Password update response:', response.status);
    return response.status === 200;
  } catch (error) {
    console.error('Error updating password:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
    }
    return false;
  }
}

// Get current password from JSONBin
async function getCurrentPassword() {
  try {
    const response = await axios.get(`https://api.jsonbin.io/v3/b/${JSONBIN_BIN_ID}/latest`, {
      headers: {
        'X-Access-Key': JSONBIN_ACCESS_KEY
      }
    });
    
    if (response.status === 200 && response.data && response.data.record) {
      return response.data.record.password;
    } else {
      console.error('Failed to fetch password, unexpected response format');
      return null;
    }
  } catch (error) {
    console.error('Error fetching password:', error.message);
    return null;
  }
}

// Handle incoming Telegram messages
app.post('/webhook', async (req, res) => {
  console.log('Received webhook request:', JSON.stringify(req.body));
  
  try {
    const message = req.body.message;
    
    if (!message || !message.text) {
      console.log('No message text found in request');
      return res.sendStatus(200);
    }
    
    console.log(`Message from ${message.from.id}: ${message.text}`);
    
    // Check if it's authorized user sending the message
    if (message.from.id.toString() === AUTHORIZED_USER_ID) {
      if (message.text.startsWith('/setpassword ')) {
        const newPassword = message.text.split(' ')[1];
        
        if (!newPassword || newPassword.trim() === '') {
          await sendTelegramMessage(message.chat.id, 'Please provide a valid password. Usage: /setpassword yourpassword');
        } else {
          // Update password in JSONBin.io
          const success = await updatePassword(newPassword);
          
          // Send confirmation message
          const responseText = success
            ? `✅ Password has been updated to: ${newPassword}`
            : '❌ Failed to update password. Please try again.';
          
          await sendTelegramMessage(message.chat.id, responseText);
        }
      } else if (message.text === '/getpassword') {
        // Get current password and send it back
        const currentPassword = await getCurrentPassword();
        
        if (currentPassword) {
          await sendTelegramMessage(message.chat.id, `Current password is: ${currentPassword}`);
        } else {
          await sendTelegramMessage(message.chat.id, 'Could not retrieve the current password');
        }
      } else if (message.text === '/help') {
        const helpText = 'Available commands:\n' +
                         '/setpassword [new-password] - Update the login password\n' +
                         '/getpassword - Show the current password\n' +
                         '/help - Show this help message';
        
        await sendTelegramMessage(message.chat.id, helpText);
      }
    } else {
      console.log(`Unauthorized access attempt from user ID: ${message.from.id}`);
    }
  } catch (error) {
    console.error('Error processing webhook:', error);
  }
  
  // Always return 200 to Telegram
  res.sendStatus(200);
});

// Helper function to send Telegram messages
async function sendTelegramMessage(chatId, text) {
  try {
    await axios.post(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      chat_id: chatId,
      text: text
    });
    console.log(`Message sent to ${chatId}: ${text}`);
    return true;
  } catch (error) {
    console.error('Error sending Telegram message:', error.message);
    return false;
  }
}

// Set the port to listen on (Vercel will handle this)
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Bot server running on port ${PORT}`));

// Export the Express API
module.exports = app;