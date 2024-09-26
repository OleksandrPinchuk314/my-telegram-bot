const TelegramBot = require('node-telegram-bot-api');
const express = require('express');
const app = express();
const axios = require('axios');
const fs = require('fs');

const token = '7514232458:AAHC1XQQE39sG4bxntqOf1X4qV2A5vkr5G0';
const bot = new TelegramBot(token, { polling: true });

bot.on('message', async (msg) => {
    const chatId = msg.chat.id;
    const members = [];
    const memberList = members.map((val, ind) => {
        return val.user.username
    }).join(", ")
    bot.sendMessage(chatId, `Members: ${memberList}`)
})

bot.on('message', (msg) => {
    console.log(msg)
    const chatId = msg.chat.id;
    // Send back a message
    const inputText = msg.text;
    generateText(inputText).then(response => {
        console.log("Generated reply:", response);
        // bot.sendMessage(chatId, response[0]['generated_text']);
        bot.sendMessage(chatId, response[0]?.generated_text);
    });
    bot.sendMessage(chatId, 'Hello! This is an auto response from your bot.');
});

// Your Hugging Face API key
const apiKey = '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';

// Specify the model you want to use
const model = 'gpt2'; // You can change this to other models available on Hugging Face

// The text you want to input to the model (for text generation, sentiment analysis, etc.)

const generateText = async (inputText) => {
  const url = `https://api-inference.huggingface.co/models/${model}`;
  
  try {
    const response = await axios.post(url, { inputs: inputText }, {
      headers: {
        'Authorization': `Bearer ${apiKey}`
      }
    });
    
    // Print the output from the model
    return response.data;
  } catch (error) {
    console.error('Error accessing the Hugging Face API:', error.response ? error.response.data : error.message);
  }
};

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});