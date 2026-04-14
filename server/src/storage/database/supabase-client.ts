import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { execSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

let envLoaded = false;
let lastEnvLoadError: string | null = null;

// Supabase 连接状态
export interface SupabaseConnectionStatus {
  connected: boolean;
  error?: string;
  url?: string;
}

let connectionStatus: SupabaseConnectionStatus = {
  connected: false,
  error: 'Not initialized'
};

export function getConnectionStatus(): SupabaseConnectionStatus {
  return { ...connectionStatus };
}

interface SupabaseCredentials {
  url: string;
  anonKey: string;
}

function loadEnv(): void {
  if (envLoaded) {
    return;
  }

  // 如果环境变量已设置，直接返回
  if (process.env.COZE_SUPABASE_URL && process.env.COZE_SUPABASE_ANON_KEY) {
    console.log('[Supabase] Using environment variables from system');
    envLoaded = true;
    return;
  }

  // 尝试加载项目根目录的 .env 文件
  try {
    const __dirname = path.dirname(fileURLToPath(import.meta.url));
    const projectRoot = path.resolve(__dirname, '../../../..');
    const envPath = path.join(projectRoot, '.env');
    
    // 使用 ES Module 方式导入 dotenv
    import('dotenv').then(dotenv => {
      dotenv.config({ path: envPath });
      if (process.env.COZE_SUPABASE_URL && process.env.COZE_SUPABASE_ANON_KEY) {
        console.log('[Supabase] Loaded from .env file:', envPath);
        envLoaded = true;
      }
    }).catch(() => {
      console.log('[Supabase] dotenv import not available');
    });
  } catch (e) {
    console.log('[Supabase] Failed to load .env file:', e);
  }

  // 尝试使用 Python workload identity
  try {
    const pythonCode = `
import os
import sys
try:
    from coze_workload_identity import Client
    client = Client()
    env_vars = client.get_project_env_vars()
    client.close()
    for env_var in env_vars:
        print(f"{env_var.key}={env_var.value}")
except Exception as e:
    print(f"# Error: {e}", file=sys.stderr)
`;

    const output = execSync(`python3 -c '${pythonCode.replace(/'/g, "'\"'\"'")}'`, {
      encoding: 'utf-8',
      timeout: 15000,
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    const lines = output.trim().split('\n');
    let loaded = false;
    for (const line of lines) {
      if (line.startsWith('#')) continue;
      const eqIndex = line.indexOf('=');
      if (eqIndex > 0) {
        const key = line.substring(0, eqIndex);
        let value = line.substring(eqIndex + 1);
        if ((value.startsWith("'") && value.endsWith("'")) ||
            (value.startsWith('"') && value.endsWith('"'))) {
          value = value.slice(1, -1);
        }
        if (!process.env[key]) {
          process.env[key] = value;
          loaded = true;
        }
      }
    }
    
    if (loaded) {
      console.log('[Supabase] Loaded from Python workload identity');
      envLoaded = true;
      return;
    }
  } catch (e) {
    lastEnvLoadError = e instanceof Error ? e.message : 'Unknown error';
    console.log('[Supabase] Python workload identity not available:', lastEnvLoadError);
  }
  
  // 标记已尝试加载
  envLoaded = true;
}

function getSupabaseCredentials(): SupabaseCredentials | null {
  loadEnv();

  const url = process.env.COZE_SUPABASE_URL;
  const anonKey = process.env.COZE_SUPABASE_ANON_KEY;

  // 如果没有配置，返回 null 而不是抛出错误
  if (!url || !anonKey) {
    const errorMsg = 'Supabase credentials not configured';
    console.error(`[Supabase] ⚠️ ${errorMsg}`);
    console.error('[Supabase] Please set COZE_SUPABASE_URL and COZE_SUPABASE_ANON_KEY');
    console.error('[Supabase] You can:');
    console.error('[Supabase]   1. Set environment variables in your platform dashboard');
    console.error('[Supabase]   2. Create a .env file in the project root');
    console.error('[Supabase]   3. For Coze deployment, use the Python workload identity');
    
    connectionStatus = {
      connected: false,
      error: errorMsg,
    };
    return null;
  }

  connectionStatus = {
    connected: true,
    url: url,
  };

  return { url, anonKey };
}

function getSupabaseServiceRoleKey(): string | undefined {
  loadEnv();
  return process.env.COZE_SUPABASE_SERVICE_ROLE_KEY;
}

// 缓存客户端实例
let cachedClient: SupabaseClient | null = null;

export function getSupabaseClient(token?: string): SupabaseClient | null {
  const credentials = getSupabaseCredentials();
  
  if (!credentials) {
    return null;
  }

  const { url, anonKey } = credentials;

  // 如果使用自定义 token，使用 anonKey
  let key: string;
  if (token) {
    key = anonKey;
  } else {
    const serviceRoleKey = getSupabaseServiceRoleKey();
    key = serviceRoleKey ?? anonKey;
  }

  if (token) {
    return createClient(url, key, {
      global: {
        headers: { Authorization: `Bearer ${token}` },
      },
      db: {
        timeout: 60000,
      },
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
  }

  // 复用缓存的客户端
  if (cachedClient) {
    return cachedClient;
  }

  cachedClient = createClient(url, key, {
    db: {
      timeout: 60000,
    },
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  return cachedClient;
}

// 测试 Supabase 连接
export async function testConnection(): Promise<boolean> {
  const client = getSupabaseClient();
  
  if (!client) {
    console.error('[Supabase] Client not available - credentials not configured');
    connectionStatus = {
      connected: false,
      error: 'Credentials not configured',
    };
    return false;
  }

  try {
    // 简单查询测试连接
    const { data, error } = await client.from('users').select('id').limit(1);
    
    if (error) {
      console.error('[Supabase] Connection test failed:', error.message);
      connectionStatus = {
        connected: false,
        error: error.message,
        url: process.env.COZE_SUPABASE_URL,
      };
      return false;
    }
    
    console.log('[Supabase] ✅ Connection test successful');
    connectionStatus = {
      connected: true,
      url: process.env.COZE_SUPABASE_URL,
    };
    return true;
  } catch (e) {
    const errorMsg = e instanceof Error ? e.message : 'Unknown error';
    console.error('[Supabase] Connection test error:', errorMsg);
    connectionStatus = {
      connected: false,
      error: errorMsg,
      url: process.env.COZE_SUPABASE_URL,
    };
    return false;
  }
}

export { loadEnv, getSupabaseCredentials, getSupabaseServiceRoleKey };
