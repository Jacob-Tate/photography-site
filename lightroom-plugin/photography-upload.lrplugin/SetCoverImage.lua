local LrApplication = import 'LrApplication'
local LrDialogs = import 'LrDialogs'
local LrTasks = import 'LrTasks'

local UploadUtils = require 'UploadUtils'

LrTasks.startAsyncTask(function()
  local catalog = LrApplication.activeCatalog()
  local source = catalog:getActiveSources()

  if not source or #source == 0 then
    LrDialogs.message('Set Cover Image', 'No collection is selected.', 'warning')
    return
  end

  local collection = source[1]
  if collection:type() ~= 'LrPublishedCollection' then
    LrDialogs.message('Set Cover Image', 'Please select a published collection (album).', 'warning')
    return
  end

  -- Get the publish service settings
  local publishService = collection:getService()
  if not publishService then
    LrDialogs.message('Set Cover Image', 'Could not find the publish service.', 'warning')
    return
  end

  local settings = publishService:getPublishSettings()
  if not settings then
    LrDialogs.message('Set Cover Image', 'Could not read publish service settings.', 'warning')
    return
  end

  local serverUrl = settings.serverUrl
  local apiKey = settings.apiKey

  if not serverUrl or serverUrl == '' or not apiKey or apiKey == '' then
    LrDialogs.message('Set Cover Image', 'Server URL and API Key must be configured in the publish service.', 'warning')
    return
  end

  -- Get the selected photo
  local selectedPhotos = catalog:getTargetPhotos()
  if not selectedPhotos or #selectedPhotos == 0 then
    LrDialogs.message('Set Cover Image', 'Please select a photo first.', 'warning')
    return
  end

  if #selectedPhotos > 1 then
    LrDialogs.message('Set Cover Image', 'Please select only one photo.', 'warning')
    return
  end

  local photo = selectedPhotos[1]

  -- Find the published photo to get the remoteId
  local publishedPhotos = collection:getPublishedPhotos()
  local remoteId = nil

  for _, pubPhoto in ipairs(publishedPhotos) do
    if pubPhoto:getPhoto() == photo then
      remoteId = pubPhoto:getRemoteId()
      break
    end
  end

  if not remoteId or remoteId == '' then
    LrDialogs.message('Set Cover Image', 'This photo has not been published yet. Please publish it first.', 'warning')
    return
  end

  -- Extract album path (directory) and filename from remoteId
  -- remoteId format: "albums/group/album/filename.jpg"
  local albumPath = remoteId:match('^(.*)/[^/]+$')
  local filename = remoteId:match('/([^/]+)$')

  if not albumPath or not filename then
    LrDialogs.message('Set Cover Image', 'Could not parse the photo path: ' .. remoteId, 'warning')
    return
  end

  local ok, err = UploadUtils.setCoverImage(serverUrl, apiKey, albumPath, filename)

  if ok then
    LrDialogs.message('Set Cover Image', 'Cover image set to: ' .. filename, 'info')
  else
    LrDialogs.message('Set Cover Image', err or 'Failed to set cover image.', 'warning')
  end
end)
