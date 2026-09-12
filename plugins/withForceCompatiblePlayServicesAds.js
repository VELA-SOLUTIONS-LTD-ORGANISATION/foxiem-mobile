const { withProjectBuildGradle } = require('expo/config-plugins');

/**
 * play-services-ads 25.3+/25.4+ ship Kotlin metadata 2.3.0.
 * Expo SDK 57 / RN 0.86 still compile library modules with Kotlin 2.1.x,
 * so force a compatible Ads SDK until the toolchain catches up.
 */
const ADS_SDK = 'com.google.android.gms:play-services-ads:25.2.0';
const MARKER = 'foxiemForceCompatiblePlayServicesAds';

function withForceCompatiblePlayServicesAds(config) {
  return withProjectBuildGradle(config, (config) => {
    if (config.modResults.language !== 'groovy') {
      return config;
    }

    if (config.modResults.contents.includes(MARKER)) {
      return config;
    }

    config.modResults.contents += `

// ${MARKER}
subprojects { subproject ->
  subproject.configurations.configureEach { configuration ->
    configuration.resolutionStrategy.eachDependency { details ->
      if (details.requested.group == 'com.google.android.gms' && details.requested.name == 'play-services-ads') {
        details.useVersion('25.2.0')
        details.because('Foxiem: Ads 25.3+/25.4+ require Kotlin 2.3 metadata; Expo SDK 57 library modules still compile with Kotlin 2.1')
      }
    }
  }
}
`;

    return config;
  });
}

module.exports = withForceCompatiblePlayServicesAds;
