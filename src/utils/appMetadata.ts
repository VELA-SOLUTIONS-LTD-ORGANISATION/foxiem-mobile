import Constants from 'expo-constants';

function readString(value: unknown): string | null {
  if (typeof value === 'string' && value.trim().length > 0) {
    return value.trim();
  }

  if (typeof value === 'number' && Number.isFinite(value)) {
    return String(value);
  }

  return null;
}

export function getAppVersion(): string | null {
  return (
    readString(Constants.nativeAppVersion) ??
    readString(Constants.expoConfig?.version) ??
    null
  );
}

export function getAppBuildNumber(): string | null {
  return (
    readString(Constants.nativeBuildVersion) ??
    readString(Constants.expoConfig?.ios?.buildNumber) ??
    readString(Constants.expoConfig?.android?.versionCode) ??
    null
  );
}

export function getAppIdentifier(): string | null {
  return (
    readString(Constants.expoConfig?.ios?.bundleIdentifier) ??
    readString(Constants.expoConfig?.android?.package) ??
    null
  );
}
