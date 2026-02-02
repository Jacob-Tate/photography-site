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
      title = 'Edit Album Readme',
      file = 'EditReadme.lua',
    },
    {
      title = 'Edit Photo Caption',
      file = 'EditCaption.lua',
    },
  },

  LrContextMenuItems = {
    {
      title = 'Set as Cover Image',
      file = 'SetCoverImage.lua',
    },
    {
      title = 'Edit Photo Caption',
      file = 'EditCaption.lua',
    },
  },

  VERSION = { major = 1, minor = 4, revision = 0 },
}
