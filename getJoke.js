const axios = require('axios');

exports.getJoke = async () => {
    try {
        const response = await axios.get('https://v2.jokeapi.dev/joke/Any?type=single');
        const joke = response.data.joke;
        return joke || 'Hmm, no jokes right now!';
    } catch (error) {
        console.error('Error fetching joke:', error);
        return 'Sorry, I couldn’t fetch a joke at the moment.';
    }
};
