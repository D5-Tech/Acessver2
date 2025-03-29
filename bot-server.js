const express = require('express');
const axios = require('axios');
const bodyParser = require('body-parser');
const app = express();

// Your bot token from BotFather
const BOT_TOKEN = '7822362143:AAEqlbRwydwdlhpug-c--UAbJJ52DwWQWVU';
// Your user ID (for security, so only you can change password)
const AUTHORIZED_USER_ID = '2111718061';

// JSONBin.io configuration
const JSONBIN_MASTER_KEY = '$2a$10$REO54EyVDK6DvkiyX0DaKu/ckaJpQvWJd3.sBpM4Dn0gjLy.TYb2G';
let passwordBinId = ''; // We'll fetch or create this

app.use(bodyParser.json());

// Initialize by creating or retrieving the password bin
async function initializePasswordBin() {
  try {
    // First, try to get existing bins to check if we already have one
    const response = await axios.get('https://api.jsonbin.io/v3/b', {
      headers: {
        'X-Master-Key': JSONBIN_MASTER_KEY
      }
    });
    
    if (response.data && response.data.length > 0) {
      // Use the first bin we find (you might want to identify by name in a real app)
      passwordBinId = response.data[0].metadata.id;
      console.log(`Using existing bin: ${passwordBinId}`);
      return;
    }
    
    // If no bins found, create a new one with default password
    const createResponse = await axios.post('https://api.jsonbin.io/v3/b', 
      { password: 'admin123' },
      {
        headers: {
          'Content-Type': 'application/json',
          'X-Master-Key': JSONBIN_MASTER_KEY
        }
      }
    );
    
    if (createResponse.data && createResponse.data.metadata) {
      passwordBinId = createResponse.data.metadata.id;
      console.log(`Created new password bin: ${passwordBinId}`);
    } else {
      console.error('Failed to create password bin');
    }
  } catch (error) {
    console.error('Error initializing password bin:', error.message);
  }
}

// Update password in JSONBin.io
async function updatePassword(newPassword) {
  if (!passwordBinId) {
    await initializePasswordBin();
  }
  
  try {
    const response = await axios.put(
      `https://api.jsonbin.io/v3/b/${passwordBinId}`,
      { password: newPassword },
      {
        headers: {
          'Content-Type': 'application/json',
          'X-Master-Key': JSONBIN_MASTER_KEY
        }
      }
    );
    
    return response.status === 200;
  } catch (error) {
    console.error('Error updating password:', error.message);
    return false;
  }
}

// Handle incoming Telegram messages
app.post('/webhook', async (req, res) => {
  const message = req.body.message;
  
  // Check if it's authorized user sending the message
  if (message && message.from.id.toString() === AUTHORIZED_USER_ID) {
    // Command format: /setpassword newpassword123
    if (message.text.startsWith('/setpassword ')) {
      const newPassword = message.text.split(' ')[1];
      
      // Update password in JSONBin.io
      const success = await updatePassword(newPassword);
      
      // Send confirmation message
      let responseText = success
        ? `Password has been updated to: ${newPassword}`
        : 'Failed to update password. Please try again.';
      
      axios.post(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
        chat_id: message.chat.id,
        text: responseText
      });
    }
  }
  
  res.sendStatus(200);
});

// Initialize the password bin when server starts
initializePasswordBin().then(() => {
  app.listen(3000, () => console.log('Bot server running on port 3000'));
});