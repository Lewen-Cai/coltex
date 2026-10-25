-- pandoc filter for ColTex's Word export (run by src/word.ts in the project's
-- scratch copy): pictures Word can show, and numbered equations.

-- Word can't show PDF or EPS pictures: they become PNGs of their first page.
-- \includegraphics often leaves out the extension, as TeX looks for one.
local RASTER = { png = true, jpg = true, jpeg = true, gif = true, bmp = true, tif = true, tiff = true }
local LOOK_FOR = { '.png', '.jpg', '.jpeg', '.pdf', '.eps' }
local converted = {}
local count = 0

local function exists(p)
  local f = io.open(p, 'rb')
  if f then f:close() return true end
  return false
end

local function locate(src)
  if exists(src) then return src end
  for _, ext in ipairs(LOOK_FOR) do
    if exists(src .. ext) then return src .. ext end
  end
  -- Pictures TeX finds in TeX Live, like mwe's example-image the templates use.
  if not src:find('/') then
    for _, ext in ipairs(LOOK_FOR) do
      local ok, found = pcall(pandoc.pipe, 'kpsewhich', { src .. ext }, '')
      if ok and found:match('%S') then return (found:gsub('%s+$', '')) end
    end
  end
  return nil
end

local function to_png(path)
  if converted[path] then return converted[path] end
  count = count + 1
  local base = '.coltex-word/figure-' .. count
  pandoc.system.make_directory('.coltex-word', true)
  local ext = path:match('%.([%w]+)$'):lower()
  local ok = pcall(function()
    if ext == 'pdf' then
      pandoc.pipe('pdftoppm', { '-png', '-r', '200', '-singlefile', '-f', '1', '-l', '1', path, base }, '')
    else
      pandoc.pipe('gs', { '-q', '-dSAFER', '-dBATCH', '-dNOPAUSE', '-dEPSCrop', '-sDEVICE=png16m', '-r200', '-o', base .. '.png', path }, '')
    end
  end)
  converted[path] = ok and exists(base .. '.png') and base .. '.png' or path
  return converted[path]
end

function Image(img)
  local found = locate(img.src)
  if not found then return nil end
  local ext = (found:match('%.([%w]+)$') or ''):lower()
  if ext == 'pdf' or ext == 'eps' then
    img.src = to_png(found)
  elseif RASTER[ext] then
    img.src = found
  end
  return img
end

-- Equations: pandoc keeps \label inside the maths and writes \eqref as
-- "[label]". Number them the way LaTeX does (equation environments and
-- labelled ones), put "(n)" after each, and make references say n.
local numbers = {}
local next_number = 0

local function number_math(m)
  if m.mathtype ~= 'DisplayMath' then return nil end
  local text = m.text
  local starred = text:match('^%s*\\begin{%a+%*}')
  local numbered = text:match('^%s*\\begin{equation}') or (not starred and text:match('\\label{'))
  local label = text:match('\\label{([^}]*)}')
  text = text:gsub('\\label{[^}]*}', '')
  if not numbered then
    m.text = text
    return m
  end
  next_number = next_number + 1
  if label then numbers[label] = tostring(next_number) end
  -- Inside the equation, so Word keeps the number on its line.
  local tag = '\\qquad\\text{(' .. next_number .. ')}'
  local tagged, found = text:gsub('\\end{(%a+)}%s*$', tag .. '\n\\end{%1}', 1)
  m.text = found > 0 and tagged or text .. tag
  return m
end

local function ref_link(link)
  local label = link.attributes['reference']
  local n = label and numbers[label]
  if not n then return nil end
  local kind = link.attributes['reference-type']
  link.content = { pandoc.Str(kind == 'eqref' and '(' .. n .. ')' or n) }
  return link
end

return {
  { Image = Image, Math = number_math },
  { Link = ref_link },
}
