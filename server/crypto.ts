import crypto from 'crypto';

// Use a strong encryption algorithm
const ALGORITHM = 'aes-256-gcm';
const KEY_LENGTH = 32; // 256 bits
const IV_LENGTH = 16; // 128 bits
const TAG_LENGTH = 16; // 128 bits

// Generate or get encryption key from environment
function getEncryptionKey(): Buffer {
  const key = process.env.SSH_ENCRYPTION_KEY;
  if (key) {
    return Buffer.from(key, 'hex');
  }
  
  // Generate a new key if none exists (for development)
  const newKey = crypto.randomBytes(KEY_LENGTH);
  console.warn('Generated new SSH encryption key. Set SSH_ENCRYPTION_KEY environment variable for production.');
  return newKey;
}

const encryptionKey = getEncryptionKey();

export interface EncryptedData {
  encrypted: string;
  iv: string;
  tag: string;
}

export function encryptSensitiveData(data: string): EncryptedData {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipher(ALGORITHM, encryptionKey);
  cipher.setAAD(Buffer.from('ssh-config', 'utf8'));
  
  let encrypted = cipher.update(data, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  const tag = cipher.getAuthTag();
  
  return {
    encrypted,
    iv: iv.toString('hex'),
    tag: tag.toString('hex')
  };
}

export function decryptSensitiveData(encryptedData: EncryptedData): string {
  try {
    const decipher = crypto.createDecipher(ALGORITHM, encryptionKey);
    decipher.setAAD(Buffer.from('ssh-config', 'utf8'));
    decipher.setAuthTag(Buffer.from(encryptedData.tag, 'hex'));
    
    let decrypted = decipher.update(encryptedData.encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (error) {
    console.error('Failed to decrypt SSH data:', error);
    throw new Error('Invalid encryption data or key');
  }
}

// Helper function to safely encrypt SSH configuration
export function encryptSSHConfig(config: any): any {
  const sensitive = JSON.stringify({
    password: config.password,
    privateKey: config.privateKey
  });
  
  const encrypted = encryptSensitiveData(sensitive);
  
  return {
    ...config,
    password: undefined,
    privateKey: undefined,
    encryptedCredentials: encrypted
  };
}

// Helper function to safely decrypt SSH configuration
export function decryptSSHConfig(config: any): any {
  if (!config.encryptedCredentials) {
    return config;
  }
  
  try {
    const sensitive = decryptSensitiveData(config.encryptedCredentials);
    const credentials = JSON.parse(sensitive);
    
    return {
      ...config,
      password: credentials.password,
      privateKey: credentials.privateKey,
      encryptedCredentials: undefined
    };
  } catch (error) {
    console.error('Failed to decrypt SSH config:', error);
    return config;
  }
}