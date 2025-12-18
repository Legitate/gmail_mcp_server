/**
 * Gets a specific attachment by ID.
 */
async function getAttachment(gmail, { messageId, attachmentId } = {}) {
    try {
        const res = await gmail.users.messages.attachments.get({
            userId: 'me',
            messageId,
            id: attachmentId
        });
        return res.data;
    } catch (error) {
        throw new Error(`Failed to get attachment ${attachmentId} from message ${messageId}: ${error.message}`);
    }
}

module.exports = {
    getAttachment
};
