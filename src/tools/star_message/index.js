/**
 * Stars a message by adding the STARRED label.
 */
async function starMessage(gmail, { id }) {
    try {
        const res = await gmail.users.messages.modify({
            userId: 'me',
            id,
            requestBody: {
                addLabelIds: ['STARRED'],
                removeLabelIds: []
            }
        });
        return res.data;
    } catch (error) {
        throw new Error(`Failed to star message ${id}: ${error.message}`);
    }
}

module.exports = {
    starMessage
};
