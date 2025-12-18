/**
 * Modifies the labels on a message.
 */
async function modifyLabels(gmail, { id, addLabelIds = [], removeLabelIds = [] } = {}) {
    try {
        const res = await gmail.users.messages.modify({
            userId: 'me',
            id,
            requestBody: {
                addLabelIds,
                removeLabelIds
            }
        });
        return res.data;
    } catch (error) {
        throw new Error(`Failed to modify labels for message ${id}: ${error.message}`);
    }
}

module.exports = {
    modifyLabels
};
