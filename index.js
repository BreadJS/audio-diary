// Import necessary modules
const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = 3000;

// Middleware to handle large payloads
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Middleware to serve static files
app.use(express.static(path.join(__dirname, 'public')));

// Route to save the recording
app.post('/save-recording', (req, res) => {
    const { audioData, fileName } = req.body;

    if (!audioData || !fileName) {
        return res.status(400).send('Invalid data');
    }

    const timestamp = new Date().toISOString();
    const filePath = path.join(__dirname, 'recordings', `${fileName}`);

    // Decode base64 audio data and save it as a file
    const buffer = Buffer.from(audioData.split(',')[1], 'base64');

    fs.writeFile(filePath, buffer, (err) => {
      if (err) {
        console.error('Error saving file:', err);
        return res.status(500).send('Error saving file');
      }
      res.status(200).send('File saved successfully');
    });
});

// Route to list recordings
app.get('/list-recordings', (req, res) => {
    const recordingsDir = path.join(__dirname, 'recordings');

    fs.readdir(recordingsDir, (err, files) => {
        if (err) {
            console.error('Error reading recordings directory:', err);
            return res.status(500).send('Error reading recordings');
        }

        const recordingsByDate = files.reduce((acc, file) => {
            const stats = fs.statSync(path.join(recordingsDir, file));
            const date = stats.birthtime.toISOString().split('T')[0];

            if (!acc[date]) {
                acc[date] = [];
            }
            acc[date].push({ fileName: file, date: stats.birthtime.toISOString() });

            return acc;
        }, {});

        res.json(recordingsByDate);
    });
});

// Route to fetch a recording
app.get('/recordings/:fileName', (req, res) => {
    const fileName = req.params.fileName;
    const filePath = path.join(__dirname, 'recordings', fileName);

    res.sendFile(filePath);
});

// Ensure the recordings directory exists
const recordingsDir = path.join(__dirname, 'recordings');
if (!fs.existsSync(recordingsDir)) {
    fs.mkdirSync(recordingsDir);
}

// Start the server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
