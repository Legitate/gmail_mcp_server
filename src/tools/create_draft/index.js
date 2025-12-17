const { makeBody } = require('../../utils/email_utils');

/**
 * Creates a draft email.
 */
async function createDraft(gmail, { to, subject, body } = {}) {
    try {
        const raw = makeBody(to, subject, body);
        const res = await gmail.users.drafts.create({
            userId: 'me',
            requestBody: {
                message: {
                    raw,
                },
            },
        });
        return res.data;
    } catch (error) {
        throw new Error(`Failed to create draft: ${error.message}`);
    }
}

module.exports = {
    createDraft
};
