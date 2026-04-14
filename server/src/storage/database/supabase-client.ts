import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { execSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

let envLoaded = false;
let lastEnvLoadError: string | null = null;

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
    
    // 动态导入 dotenv
    import('dotenv').then(dotenv => {
      dotenv.default.config({ path: envPath });
      if (process.env.COZE_SUPABASE_URL && process.env.COZE_SUPABASE_ANON_KEY) {
        console.log('[Supabase] Loaded from .env file');
      }
    }).catch(() => {
      // dotenv not available, ignore
    });
  } catch (e) {
    // ignore
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
      timeout: 10000,
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
    // Silently fail, will try next method
  }
  
  // 标记已尝试加载
  envLoaded = true;
}

function getSupabaseCredentials(): SupabaseCredentials {
  loadEnv();

  const url = process.env.COZE_SUPABASE_URL;
  const anonKey = process.env.COZE_SUPABASE_ANON_KEY;

  // 提供详细的错误诊断信息
  const errors: string[] = [];
  
  if (!url) {
    errors.push('COZE_SUPABASE_URL is not set');
  }
  if (!anonKey) {
    errors.push('COZE_SUPABASE_ANON_KEY is not set');
  }
  
  if (errors.length > 0) {
    const errorMsg = `[Supabase] Credential error: ${errors.join(', ')}`;
    console.error(errorMsg);
    if (lastEnvLoadError) {
      console.error(`[Supabase] Last environment load error: ${lastEnvLoadError}`);
    }
    console.error('[Supabase] Please ensure COZE_SUPABASE_URL and COZE_SUPABASE_ANON_KEY are set');
    console.error('[Supabase] You can set them via:');
    console.error('[Supabase]   1. System environment variables');
    console.error('[Supabase]   2. .env file in project root');
    console.error('[Supabase]   3. Python coze_workload_identity module');
    throw new Error(errorMsg);
  }

  return { url: url!, anonKey: anonKey! };
}

function getSupabaseServiceRoleKey(): string | undefined {
  loadEnv();
  return process.env.COZE_SUPABASE_SERVICE_ROLE_KEY;
}

function getSupabaseClient(token?: string): SupabaseClient {
  const { url, anonKey } = getSupabaseCredentials();

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

  return createClient(url, key, {
    db: {
      timeout: 60000,
    },
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

export { loadEnv, getSupabaseCredentials, getSupabaseServiceRoleKey, getSupabaseClient };
