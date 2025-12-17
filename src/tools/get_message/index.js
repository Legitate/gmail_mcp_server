/**
 * Gets a specific message by ID.
 */
async function getMessage(gmail, { id, format = 'full' } = {}) {
    try {
        const res = await gmail.users.messages.get({
            userId: 'me',
            id,
            format,
        });
        return res.data;
    } catch (error) {
        throw new Error(`Failed to get message ${id}: ${error.message}`);
    }
}

module.exports = {
    getMessage
};
