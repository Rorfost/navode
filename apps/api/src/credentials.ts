/**
 * A deliberately narrow server-side boundary for long-lived provider tokens.
 * It is not an HTTP DTO: callers must select one of the supported provider
 * token models and plaintext never leaves this module except to an authorized
 * provider client.
 */
export type ProviderCredentialInput =
  | { provider: 'github'; credentialType: 'oauth_refresh_token'; refreshToken: string }
  | { provider: 'google-calendar'; credentialType: 'oauth_refresh_token'; refreshToken: string };

export type EncryptedProviderCredential = {
  ciphertext: string;
  initializationVector: string;
  keyVersion: string;
};

type Keyring = ReadonlyMap<string, CryptoKey>;
const encoder = new TextEncoder();
const decoder = new TextDecoder();

function toBase64Url(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/u, '');
}

function fromBase64Url(value: string): Uint8Array {
  if (!/^[A-Za-z0-9_-]+$/u.test(value)) throw new Error('Credential key material is invalid.');
  const normalized = value.replaceAll('-', '+').replaceAll('_', '/');
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
  const binary = atob(padded);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

export async function createCredentialKeyring(serialized: string): Promise<Keyring> {
  const entries = serialized
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);
  if (!entries.length) throw new Error('At least one credential encryption key is required.');
  const keyring = new Map<string, CryptoKey>();
  for (const entry of entries) {
    const [version, material, ...unexpected] = entry.split(':');
    if (!version || !material || unexpected.length || !/^[A-Za-z0-9._-]{1,32}$/u.test(version)) {
      throw new Error('Credential key format must be version:base64url-key.');
    }
    const bytes = fromBase64Url(material);
    if (bytes.byteLength !== 32 || keyring.has(version)) {
      throw new Error('Credential keys must be unique AES-256 keys.');
    }
    keyring.set(
      version,
      await crypto.subtle.importKey('raw', bytes, { name: 'AES-GCM' }, false, [
        'encrypt',
        'decrypt',
      ]),
    );
  }
  return keyring;
}

function credentialAad(
  userId: string,
  input: Pick<ProviderCredentialInput, 'provider' | 'credentialType'>,
): Uint8Array {
  return encoder.encode(`${userId}:${input.provider}:${input.credentialType}`);
}

export async function encryptProviderCredential(
  keyring: Keyring,
  userId: string,
  input: ProviderCredentialInput,
): Promise<EncryptedProviderCredential> {
  if (input.refreshToken.length < 1 || input.refreshToken.length > 8_192) {
    throw new Error('Provider refresh token has an invalid length.');
  }
  const [keyVersion, key] =
    (keyring.entries().next().value as [string, CryptoKey] | undefined) ?? [];
  if (!keyVersion || !key) throw new Error('Credential encryption key is unavailable.');
  const initializationVector = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt(
    { additionalData: credentialAad(userId, input), iv: initializationVector, name: 'AES-GCM' },
    key,
    encoder.encode(input.refreshToken),
  );
  return {
    ciphertext: toBase64Url(new Uint8Array(encrypted)),
    initializationVector: toBase64Url(initializationVector),
    keyVersion,
  };
}

export async function decryptProviderCredential(
  keyring: Keyring,
  userId: string,
  input: Pick<ProviderCredentialInput, 'provider' | 'credentialType'>,
  encrypted: EncryptedProviderCredential,
): Promise<string> {
  const key = keyring.get(encrypted.keyVersion);
  if (!key) throw new Error('Credential key version is unavailable.');
  const plaintext = await crypto.subtle.decrypt(
    {
      additionalData: credentialAad(userId, input),
      iv: fromBase64Url(encrypted.initializationVector),
      name: 'AES-GCM',
    },
    key,
    fromBase64Url(encrypted.ciphertext),
  );
  return decoder.decode(plaintext);
}
