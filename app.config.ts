import { ExpoConfig, ConfigContext } from "expo/config";

declare const process: {
  env: {
    APP_VARIANT?: string;
    [key: string]: string | undefined;
  };
};

export default ({ config }: ConfigContext): ExpoConfig => {
  const isPreview = process.env.APP_VARIANT === "preview";

  return {
    ...config,
    name: isPreview ? "Expenso (Preview)" : (config.name || "Expenso"),
    slug: config.slug || "expenso",
    ios: {
      ...config.ios,
      bundleIdentifier: isPreview ? "com.expenso.app.preview" : (config.ios?.bundleIdentifier || "com.expenso.app"),
    },
    android: {
      ...config.android,
      package: isPreview ? "com.expenso.app.preview" : (config.android?.package || "com.expenso.app"),
    },
    extra: {
      ...config.extra,
      appVariant: isPreview ? "preview" : "production",
      eas: {
        projectId: "d196b589-e7ca-491b-b05a-3ba0c3f16433",
        ...(config.extra?.eas || {}),
      },
    },
    updates: {
      url: "https://u.expo.dev/d196b589-e7ca-491b-b05a-3ba0c3f16433",
      checkAutomatically: "ON_LOAD",
      fallbackToCacheTimeout: 5000,
      ...(config.updates || {}),
    },
  };
};
