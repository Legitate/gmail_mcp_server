/**
 * Deletes or trashes a message.
 */
async function deleteMessage(gmail, { id, permanent = false } = {}) {
    try {
        if (permanent) {
            await gmail.users.messages.delete({
                userId: 'me',
                id
            });
            return { success: true, message: `Message ${id} permanently deleted.` };
        } else {
            await gmail.users.messages.trash({
                userId: 'me',
                id
            });
            return { success: true, message: `Message ${id} moved to trash.` };
        }
    } catch (error) {
        throw new Error(`Failed to delete/trash message ${id}: ${error.message}`);
    }
}

module.exports = {
    deleteMessage
};
