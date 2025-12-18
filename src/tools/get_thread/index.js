/**
 * Gets a specific thread by ID.
 */
async function getThread(gmail, { id, format = 'full' } = {}) {
    try {
        const res = await gmail.users.threads.get({
            userId: 'me',
            id,
            format
        });
        return res.data;
    } catch (error) {
        throw new Error(`Failed to get thread ${id}: ${error.message}`);
    }
}

module.exports = {
    getThread
};
