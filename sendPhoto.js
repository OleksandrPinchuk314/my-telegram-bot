const TelegramBot = require('node-telegram-bot-api');

// Replace with your bot's token
const token = '7514232458:AAHC1XQQE39sG4bxntqOf1X4qV2A5vkr5G0'; // Make sure this token is correct
const bot = new TelegramBot(token, { polling: true });

bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;

    const bannerPath = './assets/photo_2024-05-22.jpg'; // Ensure this path is correct
    const messageText = 'Welcome to My Bot! Here is the latest update:';

    // Send the photo with the caption
    bot.sendPhoto(chatId, bannerPath, { caption: messageText })
        .then(() => {
            return bot.sendMessage(chatId, 'This is the content of your message.');
        })
        .catch(error => {
            // Log the error message
            console.error('Error sending photo:', error.response ? error.response.body : error.message);
        });
});
