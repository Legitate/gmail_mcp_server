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
            }
        ]
    };
});

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
        switch (name) {
            case "gmail_list_messages":
                const messages = await listMessagesTool.listMessages(gmailClient, args);
                return {
                    content: [{ type: "text", text: JSON.stringify(messages, null, 2) }]
                };

            case "gmail_get_message":
                const message = await getMessageTool.getMessage(gmailClient, args);
                return {
                    content: [{ type: "text", text: JSON.stringify(message, null, 2) }]
                };

            case "gmail_send_email":
                const sent = await sendEmailTool.sendEmail(gmailClient, args);
                return {
                    content: [{ type: "text", text: JSON.stringify(sent, null, 2) }]
                };

            case "gmail_create_draft":
                const draft = await createDraftTool.createDraft(gmailClient, args);
                return {
                    content: [{ type: "text", text: JSON.stringify(draft, null, 2) }]
                };

            default:
                throw new Error(`Unknown tool: ${name}`);
        }
    } catch (error) {
        logger.error(`Error executing tool ${name}: ${error.message}`);
        return {
            content: [{ type: "text", text: `Error: ${error.message}` }],
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
