/**
 * Searches for messages using Gmail's query format.
 */
async function searchMessages(gmail, { query, maxResults = 10, includeSpamTrash = false } = {}) {
    try {
        const res = await gmail.users.messages.list({
            userId: 'me',
            q: query,
            maxResults,
            includeSpamTrash
        });

        const messages = res.data.messages || [];
        return {
            messages,
            resultSizeEstimate: res.data.resultSizeEstimate,
            nextPageToken: res.data.nextPageToken
        };
    } catch (error) {
        throw new Error(`Failed to search messages with query "${query}": ${error.message}`);
    }
}

module.exports = {
    searchMessages
};
