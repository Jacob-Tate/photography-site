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
    LrDialogs.message('Edit Album Readme', 'No collection is selected.', 'warning')
    return
  end

  local collection = source[1]
  if collection:type() ~= 'LrPublishedCollection' then
    LrDialogs.message('Edit Album Readme', 'Please select a published collection (album).', 'warning')
    return
  end

  local publishService = collection:getService()
  if not publishService then
    LrDialogs.message('Edit Album Readme', 'Could not find the publish service.', 'warning')
    return
  end

  local settings = publishService:getPublishSettings()
  if not settings then
    LrDialogs.message('Edit Album Readme', 'Could not read publish service settings.', 'warning')
    return
  end

  local serverUrl = settings.serverUrl
  local apiKey = settings.apiKey

  if not serverUrl or serverUrl == '' or not apiKey or apiKey == '' then
    LrDialogs.message('Edit Album Readme', 'Server URL and API Key must be configured in the publish service.', 'warning')
    return
  end

  -- Get album path from collection remote ID or settings
  local collectionInfo = collection:getCollectionInfoSummary()
  local albumPath = collection:getRemoteId()

  if not albumPath or albumPath == '' then
    LrDialogs.message('Edit Album Readme', 'This collection has not been published yet. Please publish it first.', 'warning')
    return
  end

  -- Fetch current README content
  local content, fetchErr = UploadUtils.getReadme(serverUrl, apiKey, albumPath)
  if fetchErr then
    LrDialogs.message('Edit Album Readme', 'Warning: ' .. fetchErr .. '. Starting with empty content.', 'warning')
    content = ''
  end

  -- Show edit dialog
  LrFunctionContext.callWithContext('editReadmeDialog', function(context)
    local f = LrView.osFactory()
    local props = LrBinding.makePropertyTable(context)
    props.readmeContent = content or ''

    local result = LrDialogs.presentModalDialog({
      title = 'Edit Album Readme — ' .. (collection:getName() or ''),
      contents = f:column {
        bind_to_object = props,
        spacing = f:control_spacing(),
        f:static_text {
          title = 'Markdown content for album: ' .. albumPath,
        },
        f:edit_field {
          value = LrView.bind('readmeContent'),
          height_in_lines = 20,
          width_in_chars = 80,
          allow_newlines = true,
        },
      },
    })

    if result == 'ok' then
      local ok, err = UploadUtils.setReadme(serverUrl, apiKey, albumPath, props.readmeContent)
      if ok then
        LrDialogs.message('Edit Album Readme', 'README saved successfully.', 'info')
      else
        LrDialogs.message('Edit Album Readme', err or 'Failed to save README.', 'warning')
      end
    end
  end)
end)
