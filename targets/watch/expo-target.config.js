/** @type {import('@bacons/apple-targets/app.plugin').ConfigFunction} */
module.exports = () => ({
  type: 'watch',
  name: 'FoxiemWatch',
  displayName: 'Foxiem',
  // A ".watch" suffix appends to the iPhone app's bundle identifier (co.uk.solutionvela.foxiem.watch).
  bundleIdentifier: '.watch',
  deploymentTarget: '10.0',
  // Required for App Store Connect (ITMS-90391 / 90713): generates Assets.xcassets/AppIcon
  // and sets ASSETCATALOG_COMPILER_APPICON_NAME + CFBundleIconName on the Watch target.
  icon: '../../assets/icon.png',
  frameworks: ['SwiftUI', 'WatchConnectivity'],
});
