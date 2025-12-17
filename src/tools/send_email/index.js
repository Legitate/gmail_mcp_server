const { makeBody } = require('../../utils/email_utils');

/**
 * Sends an email.
 */
async function sendEmail(gmail, { to, subject, body } = {}) {
    try {
        const raw = makeBody(to, subject, body);
        const res = await gmail.users.messages.send({
            userId: 'me',
            requestBody: {
                raw,
            },
        });
        return res.data;
    } catch (error) {
        throw new Error(`Failed to send email: ${error.message}`);
    }
}

module.exports = {
    sendEmail
};
