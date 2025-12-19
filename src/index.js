#!/usr/bin/env node
const { Server } = require("@modelcontextprotocol/sdk/server/index.js");
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const { StdioServerTransport } = require("@modelcontextprotocol/sdk/server/stdio.js");
const {
    CallToolRequestSchema,
    ListToolsRequestSchema,
} = require("@modelcontextprotocol/sdk/types.js");
const { google } = require('googleapis');
const { getAuthClient, startAuthServer } = require('./auth/google_auth');
const listMessagesTool = require('./tools/list_messages');
const getMessageTool = require('./tools/get_message');
const sendEmailTool = require('./tools/send_email');
const createDraftTool = require('./tools/create_draft');
const searchMessagesTool = require('./tools/search_messages');
const deleteMessageTool = require('./tools/delete_message');
const modifyLabelsTool = require('./tools/modify_labels');
const listLabelsTool = require('./tools/list_labels');
const getThreadTool = require('./tools/get_thread');
const getAttachmentTool = require('./tools/get_attachment');
const starMessageTool = require('./tools/star_message');
const listStarredMessagesTool = require('./tools/list_starred_messages');
const logger = require('./utils/logger');

const server = new Server(
    {
        name: "gmail-mcp-server",
        version: "1.0.0",
    },
    {
        capabilities: {
            tools: {},
        },
    }
);

let gmailClient = null;

async function setupGmailClient() {
    try {
        const auth = await getAuthClient();
        gmailClient = google.gmail({ version: 'v1', auth });
        logger.info('Gmail client initialized successfully');
    } catch (error) {
        logger.error('Failed to initialize Gmail client: ' + error);
        process.exit(1);
    }
}

server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
        tools: [
            {
                name: "gmail_list_messages",
                description: "List messages in the user's mailbox with optional query. Supports filtering by query (q) and including spam/trash.",
                inputSchema: {
                    type: "object",
                    properties: {
                        maxResults: {
                            type: "integer",
                            description: "Maximum number of messages to return (default 10)",
                            default: 10
                        },
                        q: {
                            type: "string",
                            description: "Query string to filter messages (e.g., 'from:someuser@example.com is:unread')"
                        },
                        includeSpamTrash: {
                            type: "boolean",
                            description: "Whether to include messages from SPAM and TRASH",
                            default: false
                        }
                    }
                }
            },
            {
                name: "gmail_get_message",
                description: "Get the full content of a specific message by ID.",
                inputSchema: {
                    type: "object",
                    properties: {
                        id: {
                            type: "string",
                            description: "The ID of the message to retrieve"
                        },
                        format: {
                            type: "string",
                            description: "The format to return the message in (full, minimal, raw, metadata)",
                            default: "full"
                        }
                    },
                    required: ["id"]
                }
            },
            {
                name: "gmail_send_email",
                description: "Send an email to a recipient.",
                inputSchema: {
                    type: "object",
                    properties: {
                        to: {
                            type: "string",
                            description: "Email address of the recipient"
                        },
                        subject: {
                            type: "string",
                            description: "Subject of the email"
                        },
                        body: {
                            type: "string",
                            description: "Body content of the email (plain text)"
                        }
                    },
                    required: ["to", "subject", "body"]
                }
            },
            {
                name: "gmail_create_draft",
                description: "Create a draft email without sending it.",
                inputSchema: {
                    type: "object",
                    properties: {
                        to: {
                            type: "string",
                            description: "Email address of the recipient"
                        },
                        subject: {
                            type: "string",
                            description: "Subject of the email"
                        },
                        body: {
                            type: "string",
                            description: "Body content of the email"
                        }
                    },
                    required: ["to", "subject", "body"]
                }
            },
            {
                name: "gmail_search_messages",
                description: "Search messages using Gmail's query format.",
                inputSchema: {
                    type: "object",
                    properties: {
                        query: {
                            type: "string",
                            description: "Gmail search query (e.g. 'from:user@example.com')"
                        },
                        maxResults: {
                            type: "integer",
                            description: "Maximum number of results to return",
                            default: 10
                        },
                        includeSpamTrash: {
                            type: "boolean",
                            description: "Whether to include spam and trash in results",
                            default: false
                        }
                    },
                    required: ["query"]
                }
            },
            {
                name: "gmail_delete_message",
                description: "Delete or trash a message.",
                inputSchema: {
                    type: "object",
                    properties: {
                        id: {
                            type: "string",
                            description: "The ID of the message to delete"
                        },
                        permanent: {
                            type: "boolean",
                            description: "If true, permanently deletes the message. If false, moves to trash.",
                            default: false
                        }
                    },
                    required: ["id"]
                }
            },
            {
                name: "gmail_modify_labels",
                description: "Modify the labels on a message.",
                inputSchema: {
                    type: "object",
                    properties: {
                        id: {
                            type: "string",
                            description: "The ID of the message to modify"
                        },
                        addLabelIds: {
                            type: "array",
                            items: { type: "string" },
                            description: "List of label IDs to add"
                        },
                        removeLabelIds: {
                            type: "array",
                            items: { type: "string" },
                            description: "List of label IDs to remove"
                        }
                    },
                    required: ["id"]
                }
            },
            {
                name: "gmail_list_labels",
                description: "List all labels in the user's mailbox.",
                inputSchema: {
                    type: "object",
                    properties: {}
                }
            },
            {
                name: "gmail_get_thread",
                description: "Get a specific thread by ID.",
                inputSchema: {
                    type: "object",
                    properties: {
                        id: {
                            type: "string",
                            description: "The ID of the thread to retrieve"
                        },
                        format: {
                            type: "string",
                            description: "The format to return the thread in (full, minimal, metadata)",
                            default: "full"
                        }
                    },
                    required: ["id"]
                }
            },
            {
                name: "gmail_get_attachment",
                description: "Get a specific attachment and save it to the user's Desktop.",
                inputSchema: {
                    type: "object",
                    properties: {
                        messageId: {
                            type: "string",
                            description: "The ID of the message containing the attachment"
                        },
                        attachmentId: {
                            type: "string",
                            description: "The ID of the attachment to retrieve"
                        },
                        filename: {
                            type: "string",
                            description: "The name of the file (optional, for display/download)"
                        },
                        mimeType: {
                            type: "string",
                            description: "The MIME type of the file (optional, for display/download)"
                        }
                    },
                    required: ["messageId", "attachmentId"]
                }
            },
            {
                name: "gmail_star_message",
                description: "Star a message in Gmail.",
                inputSchema: {
                    type: "object",
                    properties: {
                        id: {
                            type: "string",
                            description: "The ID of the message to star"
                        }
                    },
                    required: ["id"]
                }
            },
            {
                name: "gmail_list_starred_messages",
                description: "List starred messages.",
                inputSchema: {
                    type: "object",
                    properties: {
                        maxResults: {
                            type: "integer",
                            description: "Maximum number of messages to return (default 10)",
                            default: 10
                        }
                    }
                }
            }
        ]
    };
});

const { saveTokens, deleteTokens } = require('./security/token_store');

server.setRequestHandler(CallToolRequestSchema, async (request) => {
    // Lazy auth check
    if (!gmailClient) {
        try {
            const authClient = await getAuthClient();
            if (authClient) {
                gmailClient = google.gmail({ version: 'v1', auth: authClient });
            }
        } catch (error) {
            logger.error('Failed to auto-connect: ' + error);
        }
    }

    if (!gmailClient) {
        try {
            const authUrl = await startAuthServer();
            return {
                content: [{ type: "text", text: `Authentication Required.\n\nPlease authenticate by visiting this URL:\n${authUrl}\n\nAfter you log in, please try your request again.` }],
                isError: true,
            };
        } catch (error) {
            return {
                content: [{ type: "text", text: `Authentication Error: ${error.message}` }],
                isError: true,
            };
        }
    }

    const { name, arguments: args } = request.params;

    try {
        let result;
        switch (name) {
            case "gmail_list_messages":
                result = await listMessagesTool.listMessages(gmailClient, args);
                break;
            case "gmail_get_message":
                result = await getMessageTool.getMessage(gmailClient, args);
                break;
            case "gmail_send_email":
                result = await sendEmailTool.sendEmail(gmailClient, args);
                break;
            case "gmail_create_draft":
                result = await createDraftTool.createDraft(gmailClient, args);
                break;
            case "gmail_search_messages":
                result = await searchMessagesTool.searchMessages(gmailClient, args);
                break;
            case "gmail_delete_message":
                result = await deleteMessageTool.deleteMessage(gmailClient, args);
                break;
            case "gmail_modify_labels":
                result = await modifyLabelsTool.modifyLabels(gmailClient, args);
                break;
            case "gmail_list_labels":
                result = await listLabelsTool.listLabels(gmailClient);
                break;
            case "gmail_get_thread":
                result = await getThreadTool.getThread(gmailClient, args);
                break;
            case "gmail_get_attachment":
                logger.info(`[gmail_get_attachment] Called with args: ${JSON.stringify(args)}`);
                // Special handling for attachment to treat it as a resource
                try {
                    const attachmentData = await getAttachmentTool.getAttachment(gmailClient, args);
                    const { data } = attachmentData; // This is base64url encoded
                    const { filename, mimeType } = args;

                    if (!data) {
                        logger.error("[gmail_get_attachment] No data found in attachment response");
                        throw new Error("No data found in attachment response");
                    }

                    const base64Data = data.replace(/-/g, '+').replace(/_/g, '/');
                    logger.info(`[gmail_get_attachment] Data length: ${base64Data.length}, MimeType: ${mimeType}`);

                    // Save to Desktop
                    const buffer = Buffer.from(base64Data, 'base64');
                    const homeDir = process.env.HOME || process.env.USERPROFILE;
                    const cleanFilename = (filename || 'attachment').replace(/[^a-zA-Z0-9._-]/g, '_');
                    const desktopPath = path.join(homeDir, 'Desktop', cleanFilename);

                    try {
                        const fs = require('fs');
                        fs.writeFileSync(desktopPath, buffer);
                        logger.info(`[gmail_get_attachment] Saved to ${desktopPath}`);

                        return {
                            content: [
                                {
                                    type: "text",
                                    text: `Successfully saved attachment to your Desktop: ${desktopPath}`
                                }
                            ]
                        };
                    } catch (fsError) {
                        logger.error(`[gmail_get_attachment] Failed to save to desktop: ${fsError.message}`);
                        // Fallback to resource if local save fails
                        return {
                            content: [
                                {
                                    type: "text",
                                    text: `Failed to save to Desktop (${fsError.message}). Here is the resource download instead:`
                                },
                                {
                                    type: "resource",
                                    resource: {
                                        uri: `attachment://${args.messageId}/${args.attachmentId}/${filename || 'attachment'}`,
                                        mimeType: mimeType || 'application/octet-stream',
                                        blob: base64Data
                                    }
                                }
                            ]
                        };
                    }
                } catch (error) {
                    logger.error(`[gmail_get_attachment] Error: ${error.message}`);
                    throw error;
                }

            case "gmail_star_message":
                result = await starMessageTool.starMessage(gmailClient, args);
                break;
            case "gmail_list_starred_messages":
                result = await listStarredMessagesTool.listStarredMessages(gmailClient, args);
                break;
            default:
                throw new Error(`Unknown tool: ${name}`);
        }

        return {
            content: [{ type: "text", text: JSON.stringify(result, null, 2) }]
        };

    } catch (error) {
        const errorMessage = error.message || '';
        // Check for common auth errors: 401, 403 with "insufficient permissions", or "invalid_grant"
        if (errorMessage.includes('401') ||
            errorMessage.includes('invalid_grant') ||
            (errorMessage.includes('403') && errorMessage.includes('insufficient permissions'))) {

            logger.error(`Authentication error detected: ${errorMessage}. Resetting tokens.`);

            // Delete the invalid tokens
            await deleteTokens();
            gmailClient = null;

            // Generate a fresh auth URL
            const authUrl = await startAuthServer();

            return {
                content: [{ type: "text", text: `Authentication Session Expired.\n\nYour previous session is no longer valid. Please re-authenticate by visiting this URL:\n${authUrl}\n\nAfter you log in, please try your request again.` }],
                isError: true,
            };
        }

        logger.error(`Error executing tool ${name}: ${errorMessage}`);
        return {
            content: [{ type: "text", text: `Error: ${errorMessage}` }],
            isError: true,
        };
    }
});

async function main() {
    // setupGmailClient removed for on-demand auth
    const transport = new StdioServerTransport();
    await server.connect(transport);
    logger.info('Gmail MCP Server running on Stdio');
}

main().catch((error) => {
    logger.error("Fatal error in main: " + error);
    process.exit(1);
});
