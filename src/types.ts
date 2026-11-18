export type AuthType = 'none' | 'basic' | 'bearer' | 'apikey' | 'oauth2';
export type BodyType = 'none' | 'json' | 'form' | 'formdata' | 'xml' | 'raw' | 'binary' | 'graphql';

export interface KV {
  name: string;
  value: string;
  disabled?: boolean;
}

export interface MultipartFile {
  name: string;
  value: string;
  type: 'text' | 'file';
  fileName?: string;
  base64?: string;
}

export interface OAuth2Config {
  grantType: 'client_credentials' | 'password' | 'authorization_code';
  tokenUrl: string;
  clientId: string;
  clientSecret: string;
  scope: string;
  username: string;
  password: string;
  accessToken: string;
  refreshToken: string;
}

export interface AuthConfig {
  type: AuthType;
  basic: { username: string; password: string };
  bearer: { token: string };
  apikey: { key: string; value: string; in: 'header' | 'query' };
  oauth2: OAuth2Config;
}

export interface AssertRule {
  id: string;
  type: 'status' | 'header' | 'body' | 'text' | 'time' | 'env';
  action: string;
  path: string;
  value: string;
  varName: string;
  disabled?: boolean;
}

export interface RequestBody {
  type: BodyType;
  raw: string;
  form: KV[];
  formdata: MultipartFile[];
  graphql: { query: string; variables: string };
  binaryName: string;
  binaryData: string;
  binaryPath: string;
}

export interface KangposRequest {
  _id: string;
  name: string;
  method: string;
  url: string;
  body: RequestBody;
  headers: KV[];
  auth: AuthConfig;
  tests: AssertRule[];
  script: string;
  docs: string;
  createdAt?: number;
}

export interface KangposFolder {
  _id: string;
  type: 'folder';
  name: string;
  items: CollectionItem[];
}

export type CollectionItem = KangposRequest | KangposFolder;

export interface KangposCollection {
  _id: string;
  name: string;
  items: CollectionItem[];
  createdAt: number;
  envVars: KV[];
}

export interface KangposEnv {
  _id: string;
  name: string;
  type: 'g' | 'e';
  variables: KV[];
}

export interface HttpHeader {
  name: string;
  value: string;
}

export interface HttpResponse {
  status: number;
  statusText: string;
  headers: HttpHeader[];
  body: string;
  bodyBase64: string;
  timeMs: number;
  size: number;
  contentType: string;
}

export interface ActivityEntry {
  _id: string;
  name: string;
  method: string;
  url: string;
  request: KangposRequest;
  collectionId?: string;
  status: number;
  timeMs: number;
  size: number;
  createdAt: number;
}

export interface HttpClientConfig {
  timeout: number;
  followRedirects: boolean;
  maxRedirects: number;
  verifySsl: boolean;
  proxy: string;
}

export interface RunAssertResult {
  pass: boolean;
  name: string;
  message: string;
}

export interface RunResult {
  name: string;
  method: string;
  status: number;
  ok: boolean;
  timeMs: number;
  error?: string;
  asserts: RunAssertResult[];
}
