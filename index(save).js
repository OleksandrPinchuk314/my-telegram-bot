const TelegramBot = require('node-telegram-bot-api');
const mongoose = require('mongoose');
const cron = require('node-cron');
const getQuiz = require('./getQuiz');
const getJokes = require('./getJoke');

// Connect to MongoDB
mongoose.connect('mongodb://127.0.0.1:27017/telegram_bot')
    .then(() => {
        console.log('Connected to MongoDB');
    })
    .catch((error) => {
        console.error('Error connecting to MongoDB:', error);
    });

const userSchema = new mongoose.Schema({
    userId: { type: Number, unique: true },
    firstName: String,
    lastName: String,
    username: String,
    answer_cnt: { type: Number, default: 0 },
    comment_cnt: { type: Number, default: 0 },
    answerByQuiz: { type: Boolean, default: false },
    joinedAt: { type: Date, default: Date.now },
});
const User = mongoose.model('User', userSchema);

const settingSchema = new mongoose.Schema({
    membersCnt: { type: Number, default: 0 },
    memberslmt: { type: Number, default: 10 },
    quizlmt: { type: Number, default: 10 },
    isReadyAward: { type: Boolean, default: false },
    correct_answer: { type: String, default: '' }
});
const Setting = mongoose.model('Setting', settingSchema);

// Create a new bot instance
const apiKey = '7514232458:AAHC1XQQE39sG4bxntqOf1X4qV2A5vkr5G0';  // Use environment variable for security
const bot = new TelegramBot(apiKey, { polling: true });

// Capture new users when they send a message or start the bot
bot.on('message', async (msg) => {
    const { id: userId, first_name: firstName, last_name: lastName, username } = msg.from;
    try {
        // Check if the user already exists in the database
        let user = await User.findOne({ userId });
        if (!user) {
            // If user doesn't exist, add them to the database
            user = new User({
                userId,
                firstName,
                lastName,
                username,
            });
            await user.save();
            // Welcome message to new users
            bot.sendMessage(userId, 'Welcome to the bot! You’ve been added to the notification list.');
        } else {
            const userText = msg.text;

            // Use findOne instead of find to get the single document
            let setting = await Setting.findOne();
            const users = await User.find();

            // If no settings found, create default settings
            if (!setting) {
                setting = new Setting({
                    membersCnt: 0,
                    memberslmt: 10,
                    quizlmt: 10,
                    isReadyAward: false
                });
                await setting.save();
                console.log('Default setting created.');
            }

            // Now we are sure setting exists, we can safely access isReadyAward
            if (!setting.isReadyAward) {
                // Update user answer and comment counts
                const doc = await User.findOne({ userId });
                if (doc) {
                    if (!doc.answerByQuiz) {
                        doc.answer_cnt += 1;
                        doc.answerByQuiz = true;
                    } else {
                        doc.comment_cnt += 1;
                    }
                    await doc.save();
                }
                const answer = await getJokes.getJoke();
                bot.sendMessage(userId, answer);
            } else {
                // Reset all user counters
                if(userText === setting.correct_answer){
                    console.log(`Congratulation! ${msg.chat.id} (${msg.chat.first_name})`);
                    bot.sendMessage(userId, `Congratulation! ${msg.chat.id} (${msg.chat.first_name}). You recieved $5 bonas.`);
                    for (let user of users) {
                        if(user.answer_cnt >= setting.quizlmt && user.comment_cnt >= setting.quizlmt){
                            if(user.userId !== userId){
                                await bot.sendMessage(user.userId, `${userId} recieved award.`).catch((error) => {
                                    if (error.code === 'ETELEGRAM' && error.response.body.error_code === 403) {
                                        console.log(`Bot was blocked by the user with userId: ${user.userId}`);
                                    } else {
                                        console.error('Unhandled error:', error);
                                    }
                                });
                            }
                        }
                    }
                    setting.correct_answer = '';
                    setting.save();
                } else {
                    bot.sendMessage(userId, `Sorry! ${msg.chat.id} (${msg.chat.first_name}). You are wrong. Try again.`);
                }
                // Reset all user counters
                await setting.updateOne({ $set: { isReadyAward: false, membersCnt: 0 }});
                await User.updateMany({}, { $set: { answer_cnt: 0, comment_cnt: 0 } });
            }
        }
    } catch (error) {
        console.error('Error handling user message:', error);
    }
});

// Function to reset special characters in a string
function resetStr(str) {
    return str.replace(/&#039;/g, "'")
              .replace(/&quot;/g, '"')
              .replace(/&amp;/g, '&');
}

// Function to send a message to all users
async function sendMessageToAllUsers() {
    try {
        let setting = await Setting.findOne();
        const users = await User.find();

        // if (setting.membersCnt < setting.memberslmt) {
        if (setting.membersCnt < 2) {
            for (let user of users) {
                if (user.comment_cnt >= setting.quizlmt && user.answer_cnt >= setting.quizlmt) {
                    setting.membersCnt += 1;
                    await setting.save();
                }
            }

            const quizObj = await getQuiz.fetchQuestions(0);
            let { question, correct_answer, incorrect_answers } = quizObj;
            question = resetStr(question);
            const answers = [...incorrect_answers, correct_answer].map((answer, i) =>
                `${String.fromCharCode(65 + i)}. ${resetStr(answer)}`
            );

            for (let user of users) {
                if(user.answer_cnt < setting.quizlmt){
                    user.answerByQuiz = false;
                    await user.save();
                    await bot.sendMessage(user.userId, `${question}\n${answers.join(', ')}`).catch((error) => {
                        if (error.code === 'ETELEGRAM' && error.response.body.error_code === 403) {
                            console.log(`Bot was blocked by the user with userId: ${user.userId}`);
                        } else {
                            console.error('Unhandled error:', error);
                        }
                    });
                }
            }
        } else {
            const awardQuiz = await getQuiz.fetchQuestions(1);
            let { question, correct_answer, incorrect_answers } = awardQuiz;
            question = resetStr(question);
            const answers = [...incorrect_answers, correct_answer].map((answer, i) =>
                `${String.fromCharCode(65 + i)}. ${resetStr(answer)}`
            );
            setting.isReadyAward = true;
            setting.correct_answer = correct_answer;
            await setting.save();

            for (let user of users) {
                if (user.comment_cnt >= setting.quizlmt && user.answer_cnt >= setting.quizlmt){
                    await bot.sendMessage(user.userId, `${question}\n${answers.join(', ')}`).catch((error) => {
                        if (error.code === 'ETELEGRAM' && error.response.body.error_code === 403) {
                            console.log(`Bot was blocked by the user with userId: ${user.userId}`);
                        } else {
                            console.error('Unhandled error:', error);
                        }
                    });
                }
            }
        }
    } catch (error) {
        console.error('Error sending messages:', error);
    }
}

// Function to schedule tasks at random intervals
const standardTimeUnit = 60000; // 1 minute in milliseconds
const scheduleRandomInterval = () => {
    // const randomInterval = Math.floor(Math.random() * (standardTimeUnit * 20 - standardTimeUnit * 10 + 1)) + standardTimeUnit * 10;
    // console.log(`Next execution in ${randomInterval / 1000} seconds`);
    console.log(`Next execution in ${standardTimeUnit / 1000} seconds`);
    setTimeout(executeTask, standardTimeUnit);
};

// Execution Task
const executeTask = async () => {
    // Use findOne instead of find to get the single document
    let setting = await Setting.findOne();

    // If no settings found, create default settings
    if (!setting) {
        setting = new Setting({
            membersCnt: 0,
            memberslmt: 10,
            quizlmt: 10,
            isReadyAward: false
        });
        await setting.save();
        console.log('Default setting created.');
    }
    if (!setting.isReadyAward) {
        await sendMessageToAllUsers();
    }
    scheduleRandomInterval();
};

// Start the first execution
scheduleRandomInterval();
