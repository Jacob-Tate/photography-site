local LrView = import 'LrView'
local LrDialogs = import 'LrDialogs'
local LrPathUtils = import 'LrPathUtils'
local LrTasks = import 'LrTasks'

local UploadUtils = require 'UploadUtils'

local provider = {}

-- 1. Configuration
provider.supportsIncrementalPublish = true 
provider.titleForPublishedCollection = "Album"
provider.titleForPublishedCollectionSet = "Folder"
provider.titleForGoToPublishedCollection = "View Album"
provider.titleForGoToPublishedPhoto = "View Photo"

provider.hideSections = { 'exportLocation' }
provider.allowFileFormats = { 'JPEG' }
provider.allowColorSpaces = { 'sRGB' }
provider.hidePrintResolution = true
provider.canExportVideo = false

provider.exportPresetFields = {
  { key = 'serverUrl', default = 'http://localhost:3000' },
  { key = 'apiKey', default = '' },
}

-- Sync Albums (Fixed for Type Safety)
function provider.syncAlbums(publishService, serverUrl)
  if not serverUrl then return end
  
  LrTasks.startAsyncTask(function()
    local data, err = UploadUtils.getAlbums(serverUrl)
    
    if not data then
      LrDialogs.message('Sync Error', err or "Could not fetch albums", 'warning')
      return
    end
    
    local catalog = publishService.catalog
    
    -- Helper to find existing collection by name (Read-only safe)
    local function findCollectionByName(parent, name)
      local children = parent:getChildCollections()
      for _, child in ipairs(children) do
        if child:getName() == name then
          return child
        end
      end
      return nil
    end

    -- 1. Sync Groups (Folders)
    if data.groups then
      for _, group in ipairs(data.groups) do
        local set = findCollectionByName(publishService, group.name)
        
        -- Conflict Check: If it exists but is NOT a Folder (Collection Set), we can't use it.
        if set and set:type() ~= "LrPublishedCollectionSet" then
          LrDialogs.message("Sync Conflict", "Skipping Group '" .. group.name .. "'. An Album with this name already exists in Lightroom. Please rename it to allow the Folder to be created.", "warning")
          set = nil -- Force skip
        end

        -- A. Create Group if missing
        if not set then
          -- We only attempt creation if we didn't find a conflict
          local conflict = findCollectionByName(publishService, group.name)
          if not conflict then
            catalog:withWriteAccessDo("Create Group", function()
              set = publishService:createPublishedCollectionSet(group.name)
            end)
          end
        end
        
        -- B. Sync Albums inside Group
        if group.albums and set and set:type() == "LrPublishedCollectionSet" then
          for _, album in ipairs(group.albums) do
            local coll = findCollectionByName(set, album.name)
            
            -- Step 1: Create if missing
            if not coll then
              catalog:withWriteAccessDo("Create Album", function()
                -- Double check 'set' still supports creation inside the transaction
                if set.createPublishedCollection then
                   coll = set:createPublishedCollection(album.name)
                end
              end)
            end
            
            -- Step 2: Update Settings (Separate Transaction)
            if coll then
              catalog:withWriteAccessDo("Update Album Settings", function()
                coll:setCollectionSettings({ destination = album.path })
                coll:setRemoteId(album.path)
              end)
            end
          end
        end
      end
    end
    
    -- 2. Sync Top-level Albums
    if data.albums then
      for _, album in ipairs(data.albums) do
        local coll = findCollectionByName(publishService, album.name)

        -- Step 1: Create if missing
        if not coll then
          catalog:withWriteAccessDo("Create Top Album", function()
            coll = publishService:createPublishedCollection(album.name)
          end)
        end

        -- Step 2: Update Settings (Separate Transaction)
        if coll then
          catalog:withWriteAccessDo("Update Top Album Settings", function()
            coll:setCollectionSettings({ destination = album.path })
            coll:setRemoteId(album.path)
          end)
        end
      end
    end

    -- 3. Sync Portfolio (special case - separate directory on server)
    local portfolioColl = findCollectionByName(publishService, "Portfolio")
    if not portfolioColl then
      catalog:withWriteAccessDo("Create Portfolio Album", function()
        portfolioColl = publishService:createPublishedCollection("Portfolio")
      end)
    end
    if portfolioColl then
      catalog:withWriteAccessDo("Update Portfolio Settings", function()
        portfolioColl:setCollectionSettings({ destination = "portfolio" })
        portfolioColl:setRemoteId("portfolio")
      end)
    end
    
    LrDialogs.message('Sync Complete', 'Album structure has been synchronized.', 'info')
  end)
end

-- 2. Service Setup Dialog
function provider.sectionsForTopOfDialog(f, propertyTable)
  local bind = LrView.bind

  return {
    {
      title = 'Server Settings',

      f:row {
        f:static_text {
          title = 'Server URL:',
          alignment = 'right',
          width = LrView.share 'label_width',
        },
        f:edit_field {
          value = bind 'serverUrl',
          width_in_chars = 40,
        },
      },

      f:row {
        f:static_text {
          title = 'API Key:',
          alignment = 'right',
          width = LrView.share 'label_width',
        },
        f:password_field {
          value = bind 'apiKey',
          width_in_chars = 40,
        },
      },
      
      f:row {
        f:static_text { title = "" },
        f:push_button {
          title = "Sync Albums Now",
          enabled = bind 'serverUrl',
          action = function() 
            if propertyTable.LR_publishService then
              provider.syncAlbums(propertyTable.LR_publishService, propertyTable.serverUrl)
            else
              LrDialogs.message("Info", "Please save the service once before syncing.", "info")
            end
          end
        }
      }
    },
  }
end

function provider.didCreateNewPublishService(publishSettings, info)
  publishSettings.LR_publishService = info.publishService
  local response = LrDialogs.confirm("Sync Albums?", "Fetch existing albums from the server?", "Yes", "No")
  if response == "ok" then
    provider.syncAlbums(info.publishService, publishSettings.serverUrl)
  end
end

-- 3. Collection Settings Dialog
function provider.viewForCollectionSettings(f, publishSettings, info)
  local bind = LrView.bind
  local settings = info.collectionSettings 
  
  if not settings.destination then
    local defaultName = "Untitled"
    if info.name then
      defaultName = info.name
    elseif info.publishedCollection then
      defaultName = info.publishedCollection:getName()
    end
    settings.destination = 'albums/' .. defaultName
  end

  return f:view {
    bind_to_object = settings,
    
    f:row {
      f:static_text {
        title = 'Album Path:',
        alignment = 'right',
      },
      f:column {
        f:edit_field {
          value = bind 'destination',
          width_in_chars = 40,
        },
        f:static_text {
          title = "Must start with 'albums/'",
          font = "<system/small>",
          text_color = import 'LrColor'(0.6, 0.6, 0.6),
        },
      }
    }
  }
end

-- 4. Publish Process
function provider.processRenderedPhotos(functionContext, exportContext)
  local exportSession = exportContext.exportSession
  local exportSettings = exportContext.propertyTable
  local nPhotos = exportSession:countRenditions()
  
  local progressScope = exportContext:configureProgress {
    title = 'Publishing Photos',
  }
  
  local serverUrl = exportSettings.serverUrl
  local apiKey = exportSettings.apiKey
  
  if not serverUrl or serverUrl == '' then
    LrDialogs.message('Configuration Error', 'Server URL is required.', 'critical')
    return
  end
  
  local destination = "portfolio"
  
  if exportContext.publishedCollectionInfo then
    local info = exportContext.publishedCollectionInfo
    local settings = info.collectionSettings
    
    if settings and settings.destination and settings.destination ~= "" then
      destination = settings.destination
    elseif info.name then
      destination = "albums/" .. info.name
    end
  end
  
  for i, rendition in exportContext:renditions { stopIfCanceled = true } do
    progressScope:setPortionComplete((i - 1) / nPhotos)
    
    if not rendition.wasSkipped then
      local success, path = rendition:waitForRender()
      
      if success then
        local ok, message = UploadUtils.uploadPhoto(serverUrl, apiKey, destination, path)
        
        if ok then
          local filename = LrPathUtils.leafName(path)
          local remoteId = destination .. "/" .. filename
          rendition:recordPublishedPhotoId(remoteId)
        else
           LrDialogs.message('Upload Error', message, 'warning')
        end
      end
    end
  end
end

-- 5. Delete Process
function provider.deletePhotosFromPublishedCollection(publishSettings, arrayOfPhotoIds, deletedCallback)
  local serverUrl = publishSettings.serverUrl
  local apiKey = publishSettings.apiKey

  for i, remoteId in ipairs(arrayOfPhotoIds) do
    local success, err = UploadUtils.deletePhoto(serverUrl, apiKey, remoteId)
    if success then
      deletedCallback(remoteId)
    else
      LrDialogs.message('Delete Failed', 'Could not delete ' .. remoteId, 'warning')
    end
  end
end

return provider
