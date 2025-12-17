const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const os = require('os');

// In a real production app, this should be an environment variable or managed by a KMS.
// For this local MCP server, we'll derive a key based on the user's machine to provide
// a basic level of security (obfuscation/encryption at rest).
const ALGORITHM = 'aes-256-gcm';
const SECRET_SALT = 'mcp-gmail-server-salt-v1'; 

function getEncryptionKey() {
  const userId = os.userInfo().username || 'default-user';
  // Use scrypt to derive a 32-byte key from the username and salt
  return crypto.scryptSync(userId, SECRET_SALT, 32);
}

function encrypt(text) {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(12); // GCM standard IV size is 12 bytes
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  const authTag = cipher.getAuthTag();
  
  return {
    iv: iv.toString('hex'),
    content: encrypted,
    tag: authTag.toString('hex')
  };
}

function decrypt(encryptedData) {
  const key = getEncryptionKey();
  const iv = Buffer.from(encryptedData.iv, 'hex');
  const tag = Buffer.from(encryptedData.tag, 'hex');
  
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);
  
  let decrypted = decipher.update(encryptedData.content, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
}

module.exports = {
  encrypt,
  decrypt
};
