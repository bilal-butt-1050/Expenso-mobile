import { ExpoConfig, ConfigContext } from "expo/config";

declare const process: {
  env: {
    APP_VARIANT?: string;
    [key: string]: string | undefined;
  };
};

const EAS_PROJECT_ID = "d196b589-e7ca-491b-b05a-3ba0c3f16433";

/**
 * Preview and production are installed side by side on the same device, so they must differ by
 * bundle id and display name. Everything else is inherited from app.json.
 *
 * Note the spread order below: dynamic values come *after* the spread of `config`, so they win.
 * Previously `...(config.updates || {})` and `...(config.extra?.eas || {})` were spread last,
 * which silently handed precedence back to app.json — the values happened to match, so nothing
 * broke, but any future divergence would have been invisible.
 */
export default ({ config }: ConfigContext): ExpoConfig => {
  const isPreview = process.env.APP_VARIANT === "preview";

  return {
    ...config,
    name: isPreview ? "Expenso (Preview)" : config.name || "Expenso",
    slug: config.slug || "expenso",
    ios: {
      ...config.ios,
      bundleIdentifier: isPreview ? "com.expenso.app.preview" : "com.expenso.app",
    },
    android: {
      ...config.android,
      package: isPreview ? "com.expenso.app.preview" : "com.expenso.app",
    },
    extra: {
      ...config.extra,
      appVariant: isPreview ? "preview" : "production",
      eas: {
        ...(config.extra?.eas || {}),
        projectId: EAS_PROJECT_ID,
      },
    },
    updates: {
      ...(config.updates || {}),
      url: `https://u.expo.dev/${EAS_PROJECT_ID}`,
      checkAutomatically: "ON_LOAD",
      fallbackToCacheTimeout: 5000,
    },
  };
};
