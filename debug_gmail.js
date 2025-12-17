const { google } = require('googleapis');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

async function test() {
    console.log('Testing Gmail Client structure...');
    try {
        const gmail = google.gmail({ version: 'v1' });
        console.log('Gmail client created.');
        console.log('Keys:', Object.keys(gmail));

        if (gmail.users) {
            console.log('gmail.users exists.');
            if (gmail.users.messages) {
                console.log('gmail.users.messages exists.');
            } else {
                console.error('gmail.users.messages is MISSING');
            }
        } else {
            console.error('gmail.users is MISSING');
        }
    } catch (e) {
        console.error('Error:', e);
    }
}

test();
