/**
 * Lists starred messages in the user's mailbox.
 */
async function listStarredMessages(gmail, { maxResults = 10 } = {}) {
    try {
        const res = await gmail.users.messages.list({
            userId: 'me',
            maxResults,
            q: 'is:starred'
        });
        return res.data.messages || [];
    } catch (error) {
        throw new Error(`Failed to list starred messages: ${error.message}`);
    }
}

module.exports = {
    listStarredMessages
};
