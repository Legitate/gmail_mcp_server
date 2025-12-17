const fs = require('fs');
const path = require('path');
const { google } = require('googleapis');
const express = require('express');
const { saveTokens, loadTokens } = require('../security/token_store');
const logger = require('../utils/logger');

const SCOPES = [
    'https://www.googleapis.com/auth/gmail.readonly',
    'https://www.googleapis.com/auth/gmail.send',
    'https://www.googleapis.com/auth/gmail.compose',
    'https://www.googleapis.com/auth/gmail.modify'
];

async function getCredentials() {
    // Priority 1: Environment Variables
    if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
        return {
            client_id: process.env.GOOGLE_CLIENT_ID,
            client_secret: process.env.GOOGLE_CLIENT_SECRET,
            redirect_uris: ['http://localhost:3456/oauth2callback']
        };
    }

    // Priority 2: credentials.json file
    const credentialPath = path.join(__dirname, '../../credentials.json');
    try {
        const content = await fs.promises.readFile(credentialPath);
        const keys = JSON.parse(content);
        const key = keys.installed || keys.web;
        return {
            client_id: key.client_id,
            client_secret: key.client_secret,
            redirect_uris: key.redirect_uris || ['http://localhost:3456/oauth2callback']
        };
    } catch (err) {
        return null;
    }
}

async function getAuthClient() {
    const keys = await getCredentials();
    if (!keys) {
        throw new Error('No credentials found. Please provide GOOGLE_CLIENT_ID/SECRET in .env or credentials.json');
    }

    const oAuth2Client = new google.auth.OAuth2(
        keys.client_id,
        keys.client_secret,
        keys.redirect_uris[0]
    );

    // Check for stored tokens
    const storedTokens = await loadTokens();
    if (storedTokens) {
        oAuth2Client.setCredentials(storedTokens);
        logger.info('Loaded stored tokens.');
        return oAuth2Client;
    }

    return null; // Return null if not authenticated
}

// Function to start the auth server and return the URL (does NOT block)
async function startAuthServer() {
    const keys = await getCredentials();
    const oAuth2Client = new google.auth.OAuth2(
        keys.client_id,
        keys.client_secret,
        keys.redirect_uris[0]
    );

    return new Promise((resolve, reject) => {
        const app = express();

        // Try to listen, handling EADDRINUSE
        const server = app.listen(3456, () => {
            logger.info(`Auth server listening on port 3456`);

            const authUrl = oAuth2Client.generateAuthUrl({
                access_type: 'offline',
                scope: SCOPES,
            });

            resolve(authUrl); // Resolve immediately with the URL
        });

        server.on('error', (e) => {
            if (e.code === 'EADDRINUSE') {
                logger.warn('Port 3456 already in use. Assuming auth server is already running.');
                // Re-generate URL anyway since the other server might be ours
                const authUrl = oAuth2Client.generateAuthUrl({
                    access_type: 'offline',
                    scope: SCOPES,
                });
                resolve(authUrl);
            } else {
                logger.error('Auth server error: ' + e);
                reject(e);
            }
        });

        app.get('/oauth2callback', async (req, res) => {
            const code = req.query.code;
            if (code) {
                try {
                    const { tokens } = await oAuth2Client.getToken(code);
                    oAuth2Client.setCredentials(tokens);
                    await saveTokens(tokens);
                    res.send('Authentication successful! You can close this tab and return to Claude.');
                    logger.info('Authentication successful and tokens saved.');
                    server.close();
                } catch (err) {
                    logger.error('Error retrieving access token: ' + err);
                    res.send('Authentication failed.');
                    server.close();
                }
            } else {
                res.send('No code provided.');
                server.close();
            }
        });
    });
}

module.exports = {
    getAuthClient,
    startAuthServer
};
