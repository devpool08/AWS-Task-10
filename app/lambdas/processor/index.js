const AWS = require("aws-sdk");
const axios = require("axios");
const { v4: uuidv4 } = require("uuid");

const dynamoDB = new AWS.DynamoDB.DocumentClient();
const TABLE_NAME = process.env.TARGET_TABLE || "Weather";

async function fetchWeather() {
    const url = "https://api.open-meteo.com/v1/forecast?latitude=50.4375&longitude=30.5&hourly=temperature_2m";

    try {
        const response = await axios.get(url);
        console.log("Fetched weather data:", JSON.stringify(response.data, null, 2));
        return response.data;
    } catch (error) {
        console.error("Error fetching weather data:", error);
        throw new Error("Failed to fetch weather data");
    }
}

exports.handler = async (event) => {
    try {
        console.log("Received event:", JSON.stringify(event, null, 2));

        const weatherData = await fetchWeather();

        const item = {
            id: uuidv4(),
            forecast: {
                latitude: weatherData.latitude,
                longitude: weatherData.longitude,
                generationtime_ms: weatherData.generationtime_ms,
                utc_offset_seconds: weatherData.utc_offset_seconds,
                timezone: weatherData.timezone,
                timezone_abbreviation: weatherData.timezone_abbreviation,
                elevation: weatherData.elevation,
                hourly_units: weatherData.hourly_units,
                hourly: weatherData.hourly
            }
        };

        console.log("Saving item to DynamoDB:", JSON.stringify(item, null, 2));

        await dynamoDB.put({
            TableName: TABLE_NAME,
            Item: item
        }).promise().then(() => {
            console.log("Successfully inserted item into DynamoDB");
        }).catch(err => {
            console.error("DynamoDB put error:", err);
            throw new Error("Failed to store data in DynamoDB");
        });

        return {
            statusCode: 200,
            body: JSON.stringify({ message: "Weather data stored successfully!" }),
            headers: { "Content-Type": "application/json" }
        };

    } catch (error) {
        console.error("Error processing request:", error);
        return {
            statusCode: 500,
            body: JSON.stringify({ message: "Internal Server Error", error: error.message }),
            headers: { "Content-Type": "application/json" }
        };
    }
};
