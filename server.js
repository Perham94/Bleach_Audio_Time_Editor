const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3000;

const upload = multer({ dest: 'uploads/' });

app.use(express.static(path.join(__dirname, 'public')));

function findInt32Address(buffer, value) {
    let lastIndex = -1;
    for (let i = 0; i < buffer.length - 4; i++) {
        const num = buffer.readInt32LE(i);
        if (num === value) {
            lastIndex = i;
        }
    }
    return lastIndex;
}

function findNextNonZeroDouble(buffer, startIndex) {
    for (let i = startIndex + 4; i < buffer.length - 8; i++) {
        const doubleValue = buffer.readDoubleLE(i);
        if (Math.abs(doubleValue) > 1e-9) {
            return { index: i, value: doubleValue };
        }
    }
    return null;
}

function findAllDoubleOffsets(buffer, value) {
    const offsets = [];
    for (let i = 0; i < buffer.length - 8; i++) {
        const doubleValue = buffer.readDoubleLE(i);
        if (Math.abs(doubleValue - value) < 1e-9) {
            offsets.push(i);
        }
    }
    return offsets;
}

function replaceDoubles(buffer, offsets, newValue) {
    offsets.forEach(offset => {
        buffer.writeDoubleLE(newValue, offset);
    });
}

app.post('/upload', upload.single('file'), (req, res) => {
    const songId = parseInt(req.body.songId);
    const newTime = parseFloat(req.body.newTime);

    if (isNaN(songId) || isNaN(newTime)) {
        return res.status(400).send("Invalid input values.");
    }

    const filePath = req.file.path;
    const buffer = fs.readFileSync(filePath);
    const lastOffset = findInt32Address(buffer, songId);

    if (lastOffset !== -1) {
        const nextDouble = findNextNonZeroDouble(buffer, lastOffset);
        if (nextDouble) {
            const allOffsets = findAllDoubleOffsets(buffer, nextDouble.value);
            if (allOffsets.length > 0) {
                replaceDoubles(buffer, allOffsets, newTime);
                const modifiedFilePath = path.join(__dirname, 'uploads', req.file.originalname.replace('.bnk', '_modified.bnk'));
                fs.writeFileSync(modifiedFilePath, buffer);
                res.download(modifiedFilePath);
            } else {
                res.status(404).send("No matching double values found.");
            }
        } else {
            res.status(404).send("No non-zero double value found after the last int32 offset.");
        }
    } else {
        res.status(404).send("No instances of the song ID found in the file.");
    }

    fs.unlinkSync(filePath);
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
