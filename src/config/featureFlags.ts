export const featureFlags = {
  reportsFullScreenChat: import.meta.env.VITE_REPORTS_FULLSCREEN_CHAT === 'true',
  agentUIEnabled: import.meta.env.VITE_AGENT_UI_ENABLED === 'true',
  // Add other feature flags here as needed
};