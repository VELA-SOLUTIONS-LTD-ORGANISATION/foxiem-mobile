/** @type {import('@bacons/apple-targets/app.plugin').ConfigFunction} */
module.exports = (config) => ({
  type: 'widget',
  name: 'FoxiemWidget',
  displayName: 'Foxiem',
  // Interactive widgets (Button(intent:)) and WidgetConfigurationIntent need iOS 17.
  deploymentTarget: '17.0',
  frameworks: ['SwiftUI', 'WidgetKit', 'AppIntents'],
  entitlements: {
    // Must match APP_GROUP in src/widgets/model.ts and the main app's entitlement.
    'com.apple.security.application-groups': config.ios?.entitlements?.['com.apple.security.application-groups'] ?? [
      'group.co.uk.solutionvela.foxiem',
    ],
  },
});
