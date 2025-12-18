/**
 * Lists all labels in the user's mailbox.
 */
async function listLabels(gmail) {
    try {
        const res = await gmail.users.labels.list({
            userId: 'me'
        });
        return res.data.labels || [];
    } catch (error) {
        throw new Error(`Failed to list labels: ${error.message}`);
    }
}

module.exports = {
    listLabels
};
