const OpenAI = require("openai");

// Create a new instance of OpenAI with your API key
const openai = new OpenAI({
    apiKey: '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', // Replace with your actual API key
});

async function getFunnyResponse() {
    try {
        const response = await openai.chat.completions.create({
            model: "gpt-3.5-turbo", // Replace with the model you're using (e.g., gpt-4)
            messages: [{ role: "user", content: "Tell me a joke" }],
        });
        console.log(response.choices[0].message.content.trim());
    } catch (error) {
        console.error("Error with OpenAI API:", error.response ? error.response.data : error.message);
    }
}

getFunnyResponse();
