const axios = require('axios');

// Your bot token from BotFather
const BOT_TOKEN = '7822362143:AAEqlbRwydwdlhpug-c--UAbJJ52DwWQWVU';
// Your user ID (for security, so only you can change password)
const AUTHORIZED_USER_ID = '2111718061';

// JSONBin.io configuration
const JSONBIN_BIN_ID = '67e7efd88561e97a50f51fa8';
const JSONBIN_MASTER_KEY = '$2a$10$REO54EyVDK6DvkiyX0DaKu/ckaJpQvWJd3.sBpM4Dn0gjLy.TYb2G';
const JSONBIN_ACCESS_KEY = '$2a$10$P5mBlQ.BcqXgUBzVVM.7qOF/G8QqyKBzhgB.tKOm9OltORL3wEN7u';

// Update password in JSONBin.io
async function updatePassword(newPassword) {
  try {
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
    
    return response.status === 200;
  } catch (error) {
    console.error('Error updating password:', error.message);
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
      return null;
    }
  } catch (error) {
    console.error('Error fetching password:', error.message);
    return null;
  }
}

// Helper function to send Telegram messages
async function sendTelegramMessage(chatId, text) {
  try {
    await axios.post(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      chat_id: chatId,
      text: text
    });
    return true;
  } catch (error) {
    console.error('Error sending Telegram message:', error.message);
    return false;
  }
}

// Serverless function handler
module.exports = async (req, res) => {
  // Handle GET requests (for webhook verification)
  if (req.method === 'GET') {
    return res.status(200).send('Webhook is active');
  }
  
  // Handle POST requests (for webhook)
  if (req.method === 'POST') {
    try {
      const message = req.body && req.body.message;
      
      if (!message || !message.text) {
        return res.status(200).end();
      }
      
      // Check if it's authorized user sending the message
      if (message.from && message.from.id && message.from.id.toString() === AUTHORIZED_USER_ID) {
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
        // Unauthorized access attempt (optional logging)
        console.log('Unauthorized access attempt');
      }
    } catch (error) {
      console.error('Error processing webhook:', error);
    }
    
    // Always return 200 to Telegram
    return res.status(200).end();
  }
  
  // Handle other HTTP methods
  return res.status(405).send('Method Not Allowed');
};