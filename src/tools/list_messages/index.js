/**
 * Lists messages in the user's mailbox.
 */
async function listMessages(gmail, { maxResults = 5, q = '', includeSpamTrash = false } = {}) {
    try {
        const res = await gmail.users.messages.list({
            userId: 'me',
            maxResults,
            q,
            includeSpamTrash,
        });
        return res.data.messages || [];
    } catch (error) {
        throw new Error(`Failed to list messages: ${error.message}`);
    }
}

module.exports = {
    listMessages
};
