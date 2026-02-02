local LrApplication = import 'LrApplication'
local LrDialogs = import 'LrDialogs'
local LrTasks = import 'LrTasks'
local LrFunctionContext = import 'LrFunctionContext'
local LrView = import 'LrView'
local LrBinding = import 'LrBinding'

local UploadUtils = require 'UploadUtils'

LrTasks.startAsyncTask(function()
  local catalog = LrApplication.activeCatalog()
  local source = catalog:getActiveSources()

  if not source or #source == 0 then
    LrDialogs.message('Edit Photo Caption', 'No collection is selected.', 'warning')
    return
  end

  local collection = source[1]
  if collection:type() ~= 'LrPublishedCollection' then
    LrDialogs.message('Edit Photo Caption', 'Please select a published collection (album).', 'warning')
    return
  end

  local publishService = collection:getService()
  if not publishService then
    LrDialogs.message('Edit Photo Caption', 'Could not find the publish service.', 'warning')
    return
  end

  local settings = publishService:getPublishSettings()
  if not settings then
    LrDialogs.message('Edit Photo Caption', 'Could not read publish service settings.', 'warning')
    return
  end

  local serverUrl = settings.serverUrl
  local apiKey = settings.apiKey

  if not serverUrl or serverUrl == '' or not apiKey or apiKey == '' then
    LrDialogs.message('Edit Photo Caption', 'Server URL and API Key must be configured in the publish service.', 'warning')
    return
  end

  -- Get the selected photo
  local selectedPhotos = catalog:getTargetPhotos()
  if not selectedPhotos or #selectedPhotos == 0 then
    LrDialogs.message('Edit Photo Caption', 'Please select a photo first.', 'warning')
    return
  end

  if #selectedPhotos > 1 then
    LrDialogs.message('Edit Photo Caption', 'Please select only one photo.', 'warning')
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
    LrDialogs.message('Edit Photo Caption', 'This photo has not been published yet. Please publish it first.', 'warning')
    return
  end

  -- Fetch current caption content
  local content, fetchErr = UploadUtils.getCaption(serverUrl, apiKey, remoteId)
  if fetchErr then
    LrDialogs.message('Edit Photo Caption', 'Warning: ' .. fetchErr .. '. Starting with empty content.', 'warning')
    content = ''
  end

  local filename = remoteId:match('/([^/]+)$') or remoteId

  -- Show edit dialog
  LrFunctionContext.callWithContext('editCaptionDialog', function(context)
    local f = LrView.osFactory()
    local props = LrBinding.makePropertyTable(context)
    props.captionContent = content or ''

    local result = LrDialogs.presentModalDialog({
      title = 'Edit Photo Caption — ' .. filename,
      contents = f:column {
        bind_to_object = props,
        spacing = f:control_spacing(),
        f:static_text {
          title = 'Markdown caption for: ' .. remoteId,
        },
        f:edit_field {
          value = LrView.bind('captionContent'),
          height_in_lines = 15,
          width_in_chars = 80,
          allow_newlines = true,
        },
      },
    })

    if result == 'ok' then
      local ok, err = UploadUtils.setCaption(serverUrl, apiKey, remoteId, props.captionContent)
      if ok then
        LrDialogs.message('Edit Photo Caption', 'Caption saved successfully.', 'info')
      else
        LrDialogs.message('Edit Photo Caption', err or 'Failed to save caption.', 'warning')
      end
    end
  end)
end)
