Pod::Spec.new do |s|
  s.name           = 'FoxiemWatch'
  s.version        = '1.0.0'
  s.summary        = 'WatchConnectivity bridge between Foxiem and its Apple Watch app'
  s.description    = 'Carries the widget snapshot to the Watch and Watch presses back to the app. Holds no tracker logic.'
  s.author         = 'Foxiem'
  s.homepage       = 'https://foxiem.app'
  s.platform       = :ios, '16.4'
  s.source         = { git: '' }
  s.static_framework = true

  s.dependency 'ExpoModulesCore'

  s.pod_target_xcconfig = {
    'DEFINES_MODULE' => 'YES',
    'SWIFT_COMPILATION_MODE' => 'wholemodule'
  }

  s.source_files = "**/*.{h,m,mm,swift,hpp,cpp}"
end
