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

-- The reader adds \graphicspath's folders to the resource path; pandoc would embed a PDF
-- found there as it is, which Word shows as "This picture can't be displayed".
local function locate(src)
  local dirs = src:sub(1, 1) == '/' and { '' } or PANDOC_STATE.resource_path
  for _, dir in ipairs(dirs) do
    local base = (dir == '' or dir == '.') and src or dir:gsub('/*$', '/') .. src
    if exists(base) then return base end
    for _, ext in ipairs(LOOK_FOR) do
      if exists(base .. ext) then return base .. ext end
    end
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
  if converted[path] ~= nil then return converted[path] end
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
  converted[path] = ok and exists(base .. '.png') and base .. '.png' or false
  return converted[path]
end

function Image(img)
  local found = locate(img.src)
  if not found then return nil end
  local ext = (found:match('%.([%w]+)$') or ''):lower()
  if ext == 'pdf' or ext == 'eps' then
    local png = to_png(found)
    -- A PDF left in the document is a broken picture in Word: say which one instead.
    if not png then
      pandoc.log.warn('Could not turn ' .. found .. ' into a picture for Word')
      return pandoc.Strong({ pandoc.Str('[Figure ' .. found .. ' could not be converted]') })
    end
    img.src = png
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

-- Word's title block puts the abstract right under the authors; the export's wrapper marks
-- where it goes instead (after the affiliations, as on a journal's title page).
local ABSTRACT_MARK = 'COLTEX-ABSTRACT-HERE'

local function place_abstract(doc)
  local at
  for i, block in ipairs(doc.blocks) do
    if block.t == 'Para' and pandoc.utils.stringify(block) == ABSTRACT_MARK then at = i break end
  end
  if not at then return nil end
  local abstract = doc.meta.abstract
  doc.blocks:remove(at)
  if not abstract then return doc end
  doc.meta.abstract = nil
  local kind = pandoc.utils.type(abstract)
  local blocks = kind == 'Blocks' and abstract or { pandoc.Para(kind == 'Inlines' and abstract or pandoc.utils.stringify(abstract)) }
  doc.blocks:insert(at, pandoc.Div(pandoc.Blocks(blocks), { ['custom-style'] = 'Abstract' }))
  doc.blocks:insert(at, pandoc.Div({ pandoc.Para({ pandoc.Str('Abstract') }) }, { ['custom-style'] = 'Abstract Title' }))
  return doc
end

-- citeproc (run before this filter) puts the reference list at the end, without a heading.
-- The export's wrapper writes the heading where the bibliography was, then this mark.
local REFERENCES_MARK = 'COLTEX-REFERENCES-HERE'

local function place_references(doc)
  local refs, at
  for i, block in ipairs(doc.blocks) do
    if block.t == 'Div' and block.identifier == 'refs' then refs = i end
    if block.t == 'Para' and pandoc.utils.stringify(block) == REFERENCES_MARK then at = i end
  end
  if at then
    if not refs then
      -- Nothing was cited: no list, and no heading over nothing.
      doc.blocks:remove(at)
      if at > 1 and doc.blocks[at - 1].t == 'Header' then doc.blocks:remove(at - 1) end
      return doc
    end
    local list = doc.blocks:remove(refs)
    if refs < at then at = at - 1 end
    doc.blocks[at] = list
    return doc
  end
  -- A document pandoc read as it is: a heading unless one comes right before the list.
  if refs and not (refs > 1 and doc.blocks[refs - 1].t == 'Header') then
    doc.blocks:insert(refs, pandoc.Header(1, 'References', pandoc.Attr('', { 'unnumbered' })))
    return doc
  end
  return nil
end

return {
  { Image = Image, Math = number_math },
  { Link = ref_link },
  { Pandoc = place_abstract },
  { Pandoc = place_references },
}
