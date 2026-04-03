export function getVisibleVersion() {
  const buildId = process.env.NEXT_PUBLIC_BUILD_ID;
  const appVersion = process.env.NEXT_PUBLIC_APP_VERSION ?? '0.1.0';

  if (buildId) {
    return `Build ${buildId}`;
  }

  return `Version ${appVersion}`;
}
