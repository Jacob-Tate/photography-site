local LrHttp = import 'LrHttp'
local LrFileUtils = import 'LrFileUtils'
local LrPathUtils = import 'LrPathUtils'

local UploadUtils = {}

--------------------------------------------------------------------------------
-- Helpers
--------------------------------------------------------------------------------

local function urlencode(s)
   if s == nil then return "" end
   s = string.gsub(s, "\n", "\r\n")
   s = string.gsub(s, "([^%w %-%_%.%~])",
      function (c) return string.format ("%%%02X", string.byte(c)) end)
   s = string.gsub(s, " ", "+")
   return s
end

local function json_encode(t)
  local parts = {}
  table.insert(parts, "{")
  local first = true
  for k, v in pairs(t) do
      if not first then table.insert(parts, ",") end
      first = false
      if type(v) == "boolean" then
        table.insert(parts, '"' .. k .. '":' .. tostring(v))
      elseif type(v) == "number" then
        table.insert(parts, '"' .. k .. '":' .. tostring(v))
      else
        local val = tostring(v):gsub('\\', '\\\\'):gsub('"', '\\"')
        table.insert(parts, '"' .. k .. '":"' .. val .. '"')
      end
  end
  table.insert(parts, "}")
  return table.concat(parts)
end

local function json_decode(str)
  local pos = 1
  local len = #str
  local decode_value 

  local function skip_ws()
    while pos <= len and str:sub(pos,pos):match('%s') do pos = pos + 1 end
  end

  local function decode_string()
    pos = pos + 1 
    local start = pos
    while pos <= len do
      local c = str:sub(pos, pos)
      if c == '"' then
        local val = str:sub(start, pos - 1)
        pos = pos + 1
        return val
      elseif c == '\\' then
        pos = pos + 2
      else
        pos = pos + 1
      end
    end
  end

  local function decode_number()
    local start = pos
    if str:sub(pos, pos) == '-' then pos = pos + 1 end
    while pos <= len and str:sub(pos,pos):match('%d') do pos = pos + 1 end
    if pos <= len and str:sub(pos,pos) == '.' then
      pos = pos + 1
      while pos <= len and str:sub(pos,pos):match('%d') do pos = pos + 1 end
    end
    return tonumber(str:sub(start, pos - 1))
  end

  local function decode_array()
    pos = pos + 1 
    local arr = {}
    skip_ws()
    if str:sub(pos, pos) == ']' then pos = pos + 1; return arr end
    while true do
      table.insert(arr, decode_value())
      skip_ws()
      if str:sub(pos, pos) == ']' then pos = pos + 1; break end
      if str:sub(pos, pos) == ',' then pos = pos + 1; skip_ws() end
    end
    return arr
  end

  local function decode_object()
    pos = pos + 1 
    local obj = {}
    skip_ws()
    if str:sub(pos, pos) == '}' then pos = pos + 1; return obj end
    while true do
      local key = decode_string()
      skip_ws()
      if str:sub(pos, pos) == ':' then pos = pos + 1 end
      skip_ws()
      obj[key] = decode_value()
      skip_ws()
      if str:sub(pos, pos) == '}' then pos = pos + 1; break end
      if str:sub(pos, pos) == ',' then pos = pos + 1; skip_ws() end
    end
    return obj
  end

  decode_value = function()
    skip_ws()
    local c = str:sub(pos, pos)
    if c == '"' then return decode_string()
    elseif c == '[' then return decode_array()
    elseif c == '{' then return decode_object()
    elseif c == 't' then pos = pos + 4; return true
    elseif c == 'f' then pos = pos + 5; return false
    elseif c == 'n' then pos = pos + 4; return nil
    else return decode_number() end
  end

  return decode_value()
end

--------------------------------------------------------------------------------
-- Public API
--------------------------------------------------------------------------------

function UploadUtils.uploadPhoto(serverUrl, apiKey, destination, filePath)
  local filename = LrPathUtils.leafName(filePath)
  local fileContents = LrFileUtils.readFile(filePath)

  if not fileContents then
    return false, 'Failed to read file'
  end

  -- Pass destination in URL (Safest method)
  local url = serverUrl .. '/api/upload?destination=' .. urlencode(destination)

  local mimeChunks = {
    { name = 'destination', value = destination },
    { name = 'file', fileName = filename, filePath = filePath, contentType = 'application/octet-stream' },
  }

  local headers = {
    { field = 'X-API-Key', value = apiKey },
    { field = 'X-Destination', value = destination },
  }

  local result, hdrs = LrHttp.postMultipart(url, mimeChunks, headers)

  if not result then return false, 'Network error' end
  if hdrs and hdrs.status and hdrs.status >= 400 then return false, 'Server error: ' .. tostring(hdrs.status) end

  return true, 'Success'
end

function UploadUtils.deletePhoto(serverUrl, apiKey, remoteFilePath)
  local url = serverUrl .. '/api/manage/delete'
  local body = json_encode({ filePath = remoteFilePath })
  local headers = {
    { field = 'Content-Type', value = 'application/json' },
    { field = 'X-API-Key', value = apiKey },
  }
  
  local result, hdrs = LrHttp.post(url, body, headers)
  
  if not result then return false, 'Network error' end
  if hdrs and hdrs.status and hdrs.status >= 400 then return false, 'Delete failed' end
  
  return true
end

function UploadUtils.getAlbums(serverUrl)
  local url = serverUrl .. '/api/albums'
  local result, hdrs = LrHttp.get(url)
  
  if not result or (hdrs and hdrs.status and hdrs.status >= 400) then
    return nil, 'Failed to fetch albums (HTTP ' .. (hdrs and hdrs.status or 'Err') .. ')'
  end
  
  local success, data = pcall(json_decode, result)
  if not success then
    return nil, 'Invalid JSON response from server'
  end
  
  return data
end

function UploadUtils.setAlbumPassword(serverUrl, apiKey, albumPath, password)
  local url = serverUrl .. '/api/manage/password'
  local body = json_encode({ albumPath = albumPath, password = password or '' })
  local headers = {
    { field = 'Content-Type', value = 'application/json' },
    { field = 'X-API-Key', value = apiKey },
  }

  local result, hdrs = LrHttp.post(url, body, headers)

  if not result then return false, 'Network error' end
  if hdrs and hdrs.status and hdrs.status >= 400 then return false, 'Failed to set password' end

  return true
end

function UploadUtils.setCoverImage(serverUrl, apiKey, albumPath, filename)
  local url = serverUrl .. '/api/manage/cover'
  local body = json_encode({ albumPath = albumPath, filename = filename or '' })
  local headers = {
    { field = 'Content-Type', value = 'application/json' },
    { field = 'X-API-Key', value = apiKey },
  }

  local result, hdrs = LrHttp.post(url, body, headers)

  if not result then return false, 'Network error' end
  if hdrs and hdrs.status and hdrs.status >= 400 then return false, 'Failed to set cover image' end

  return true
end

function UploadUtils.setIgnoreStats(serverUrl, apiKey, albumPath, ignored)
  local url = serverUrl .. '/api/manage/ignorestats'
  local body = json_encode({ albumPath = albumPath, ignored = ignored })
  local headers = {
    { field = 'Content-Type', value = 'application/json' },
    { field = 'X-API-Key', value = apiKey },
  }

  local result, hdrs = LrHttp.post(url, body, headers)

  if not result then return false, 'Network error' end
  if hdrs and hdrs.status and hdrs.status >= 400 then return false, 'Failed to update ignore stats' end

  return true
end

function UploadUtils.getIgnoreStats(serverUrl, apiKey, albumPath)
  local url = serverUrl .. '/api/manage/ignorestats?albumPath=' .. urlencode(albumPath)
  local headers = {
    { field = 'X-API-Key', value = apiKey },
  }

  local result, hdrs = LrHttp.get(url, headers)

  if not result or (hdrs and hdrs.status and hdrs.status >= 400) then
    return false
  end

  local success, data = pcall(json_decode, result)
  if not success or not data then
    return false
  end

  return data.ignored == true
end

return UploadUtils
