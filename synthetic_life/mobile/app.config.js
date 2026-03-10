// Dynamic config — reads EAS Secrets (env vars) at build/update time.
// app.config.js takes precedence over app.json.
export default ({ config }) => ({
  ...config,
  extra: {
    ...config.extra,
    // EAS Secret: eas secret:create --name ANTHROPIC_API_KEY --value sk-ant-...
    // Falls back to the value in app.json → extra.anthropicApiKey (local dev)
    anthropicApiKey:
      process.env.ANTHROPIC_API_KEY ?? process.env.temporal ?? config.extra?.anthropicApiKey ?? '',
    eas: {
      projectId: process.env.EAS_PROJECT_ID ?? config.extra?.eas?.projectId ?? '',
    },
  },
})
