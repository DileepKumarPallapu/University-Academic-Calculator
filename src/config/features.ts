/**
 * Application Feature Flags
 * 
 * Set AMS_FEATURE_ENABLED to false during development.
 * When false:
 * - AMS portal, dashboard, login, sync, and import routes are blocked.
 * - Dedicated development notice is displayed for direct navigation.
 * - Navigation links and cards are marked as Coming Soon — Under Development.
 * - Network authentication and background sync requests are prevented.
 */
export let AMS_FEATURE_ENABLED = false;

export function setAmsFeatureEnabled(enabled: boolean) {
  AMS_FEATURE_ENABLED = enabled;
}
