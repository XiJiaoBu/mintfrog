require('dotenv').config(); // Load environment variables

const express = require('express');
const multer = require('multer');
const axios = require('axios');
const fs = require('fs');
const crypto = require('crypto');

console.log("Environment variables loaded:");
console.log("MULTIBAAS_API_KEY:", process.env.MULTIBAAS_API_KEY);
console.log("MULTIBAAS_DEPLOYMENT_ID:", process.env.MULTIBAAS_DEPLOYMENT_ID);
console.log("CONTRACT_ADDRESS:", process.env.CONTRACT_ADDRESS);

const app = express();
const upload = multer({ dest: 'uploads/' });
app.use(express.static('uploads')); // Serve video files from uploads folder
app.use(express.static('public')); // Serve static assets for styling
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Mock database to store minted videos
const videoDatabase = {};

// Function to trigger webhook notifications
async function triggerWebhook(videoHash) {
    const webhookUrl = process.env.WEBHOOK_URL; // Set this in your .env file
    if (!webhookUrl) {
        console.log("No webhook URL configured.");
        return;
    }

    const notification = {
        event: "VIDEO_MINTED",
        videoHash: videoHash,
        timestamp: new Date().toISOString(),
    };

    try {
        await axios.post(webhookUrl, notification);
        console.log("Webhook notification sent for video hash:", videoHash);
    } catch (error) {
        console.error("Failed to send webhook notification:", error.message);
    }
}

// Function to mint video hash on blockchain
async function mintVideoHash(videoHash) {
    try {
        const url = `https://${process.env.MULTIBAAS_DEPLOYMENT_ID}.multibaas.com/api/v0/chains/ethereum/addresses/videominting1/contracts/videominting/methods/mintVideo`;
        console.log("Making request to URL:", url);

        const response = await axios.post(url, {
            args: [`0x${videoHash}`],
            from: "0xe0332d6D0715735A3405DcF34D8B1818029dF84F"  // Updated with funded address
        }, {
            headers: { 'Authorization': `Bearer ${process.env.MULTIBAAS_API_KEY}` },
            timeout: 10000
        });

        console.log("Transaction response:", response.data);
        return response.data;
    } catch (error) {
        if (error.response) {
            console.error("Error response data:", error.response.data);
            console.error("Error response status:", error.response.status);
            console.error("Error response headers:", error.response.headers);
        } else if (error.request) {
            console.error("No response received:", error.request);
        } else {
            console.error("Request setup error:", error.message);
        }
        console.error("Full error details:", error.toJSON ? error.toJSON() : error.message);
        return { error: "Failed to mint video hash" };
    }
}

// Root route redirect to /view
app.get('/', (req, res) => {
    res.redirect('/view');
});

// Serve the HTML file for viewing videos
app.get('/view', (req, res) => {
    res.sendFile(__dirname + '/public/view.html');
});

// Endpoint to handle video uploads
app.post('/upload', upload.single('video'), async (req, res) => {
    console.log("Received file upload request");
    const file = req.file;
    const title = req.body.title || "Untitled Video";

    if (!file) {
        return res.status(400).json({ error: "No video file uploaded" });
    }

    const videoHash = crypto.createHash('sha256').update(fs.readFileSync(file.path)).digest('hex');
    console.log("Generated video hash:", videoHash);

    const mintResult = await mintVideoHash(videoHash);

    if (mintResult.error) {
        return res.status(500).json({ error: "Failed to mint video" });
    }

    videoDatabase[videoHash] = {
        title,
        filename: file.filename,
        originalName: file.originalname,
        path: file.path,
        minted: true,
        timestamp: new Date().toISOString(),
    };

    await triggerWebhook(videoHash);

    res.redirect('/view'); // Redirect to the view page after uploading
});

// Endpoint to retrieve all minted videos
app.get('/videos', (req, res) => {
    res.json(videoDatabase);
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
