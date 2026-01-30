return {
  LrSdkVersion = 6.0,
  LrSdkMinimumVersion = 6.0,
  LrToolkitIdentifier = 'com.photography.upload',
  LrPluginName = 'Photography Portfolio',
  
  -- We define it as an Export Service, just like PhotoDeck
  LrExportServiceProvider = {
    title = 'Photography Portfolio',
    file = 'UploadServiceProvider.lua',
  },
  
  LrLibraryMenuItems = {
    {
      title = 'Set as Cover Image',
      file = 'SetCoverImage.lua',
    },
  },

  VERSION = { major = 1, minor = 3, revision = 0 },
}
