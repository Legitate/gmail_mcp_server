const fs = require('fs').promises;
const path = require('path');
const { encrypt, decrypt } = require('./encryption');

const TOKEN_PATH = path.join(__dirname, '../../.saved_tokens.json');

async function saveTokens(tokens) {
    try {
        const jsonString = JSON.stringify(tokens);
        const encryptedData = encrypt(jsonString);
        await fs.writeFile(TOKEN_PATH, JSON.stringify(encryptedData, null, 2));
        console.error('Tokens saved securely.');
    } catch (error) {
        console.error('Error saving tokens:', error);
        throw error;
    }
}

async function loadTokens() {
    try {
        await fs.access(TOKEN_PATH);
        const fileContent = await fs.readFile(TOKEN_PATH, 'utf8');
        const encryptedData = JSON.parse(fileContent);
        const decryptedString = decrypt(encryptedData);
        return JSON.parse(decryptedString);
    } catch (error) {
        if (error.code === 'ENOENT') {
            return null;
        }
        console.error('Error loading tokens:', error);
        return null;
    }
}

module.exports = {
    saveTokens,
    loadTokens
};
