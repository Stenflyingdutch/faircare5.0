import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import type { NextConfig } from 'next';

function resolveBuildId() {
  try {
    return execSync('git rev-parse --short HEAD').toString().trim();
  } catch {
    return `local-${Date.now().toString().slice(-6)}`;
  }
}

function resolveAppVersion() {
  try {
    const packageJson = JSON.parse(readFileSync(join(process.cwd(), 'package.json'), 'utf-8')) as { version?: string };
    return packageJson.version ?? '0.1.0';
  } catch {
    return '0.1.0';
  }
}

const nextConfig: NextConfig = {
  reactStrictMode: true,
  env: {
    NEXT_PUBLIC_BUILD_ID: resolveBuildId(),
    NEXT_PUBLIC_APP_VERSION: resolveAppVersion(),
  },
};

export default nextConfig;
