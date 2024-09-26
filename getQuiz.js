const axios = require('axios');

// Get a session token: https://opentdb.com/api_token.php?command=request.

function randVal(len){
    return Math.floor(Math.random() * len)
}

exports.fetchQuestions = (selType) => {
    return new Promise(async (resolve) => {
        const type = selType === 0 ? 'multiple' : 'boolean'
        const categories = [9, 21, 9, 23, 27, 9];  // General Knowledge, Sports, History, Animals
        const category = categories[randVal(categories.length)]
        const response = await axios.get('https://opentdb.com/api.php', {
            params: {
                amount: 1,        // Fetch 1 questions
                difficulty: 'easy', // Easy questions
                category,     // Category ID
                type    // multiple or boolean
            }
        });
        const questions = response.data.results;
        resolve(questions[0]);
    }).catch (error => {
        console.error('Error fetching trivia questions:', error);
    });
}
