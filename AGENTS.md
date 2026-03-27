# AI Context — dw_sitepref_extractor

> This file is intended for AI coding assistants (GitHub Copilot, Cursor, Windsurf, etc.).
> It describes the full project architecture, conventions, data models, and critical API
> constraints so that any AI can extend or modify this codebase correctly on the first attempt.

---

## 1. What This Project Is

A **fully client-side** React web app that parses **Salesforce Commerce Cloud (SFCC / Demandware) metadata XML files**, displays all `type-extension` definitions in a browsable/filterable accordion UI, lets users cherry-pick specific custom attributes and attribute groups, and exports them as XML — either as a complete document or as per-type snippets.

**No backend.** Everything — XML parsing, state persistence (IndexedDB), and XML generation — runs in the browser.

- **Live URL:** `https://gigor911.github.io/dw_sitepref_extractor/`
- **Deploy:** `npm run deploy` (uses `gh-pages`)

---

## 2. Tech Stack — EXACT Versions Matter

| Package | Version | CRITICAL NOTES |
|---|---|---|
| React | **19.x** | Uses `createRoot` API. React 19 features available. |
| Chakra UI | **v3** (`@chakra-ui/react ^3.31.0`) | **NOT v2.** Compound component API. See §8 below. |
| @emotion/react | ^11.x | CSS-in-JS engine for Chakra v3 |
| framer-motion | ^12.x | Animation engine used by Chakra v3 |
| react-window | **v2** (`^2.2.5`) | **NOT v1.** Completely different API. See §9 below. |
| react-virtualized-auto-sizer | ^2.0.2 | Installed but **not currently used** in code. Available for future use. |
| xml2js | ^0.6.2 | `parseString` for XML→JS parsing |
| idb | ^8.0.3 | Thin wrapper around IndexedDB |
| react-icons | ^5.x | `MdClose`, `MdContentCopy`, `MdCheck` from `react-icons/md`; `FaTrash`, `FaQuestion` from `react-icons/fa` |
| react-app-rewired | ^2.2.1 | CRA config override — all scripts use `react-app-rewired` instead of `react-scripts` |

### Build tooling

- **Create React App** (not ejected) with `react-app-rewired`.
- `config-overrides.js` polyfills Node builtins for browser (`timers`, `buffer`, `stream`) — required by `xml2js`.
- Scripts: `npm start` / `npm run build` / `npm test` all route through `react-app-rewired`.

---

## 3. File Map & Responsibilities

```
src/
├── index.js                    → React 19 createRoot entry. Wraps <App /> in StrictMode.
├── App.js                      → ChakraProvider (v3 defaultSystem) → <XMLCheckboxTree />
├── App.css                     → Default CRA CSS (largely unused)
├── index.css                   → Base body styles
│
├── XMLCheckboxTree.js          → ★ MAIN COMPONENT (677 lines). ALL app state lives here.
│                                  Handles: file upload, XML parsing (buildCheckboxTree),
│                                  filtering (useMemo filteredTree), selection management,
│                                  IndexedDB persistence, export orchestration, full layout.
│
├── components/
│   ├── AttributeList.js        → Grid of attributes. Dual-mode: plain grid (≤50 items) or
│   │                              react-window v2 virtualized list (>50 items).
│   ├── AttributeItem.js        → Single attribute checkbox (memo'd). Chakra v3 Checkbox compound.
│   ├── ExportModal.js          → Chakra v3 Dialog for viewing/copying exported XML.
│   ├── FileHistory.js          → Sidebar card showing last 5 uploaded files.
│   ├── FilterBar.js            → Sticky filter bar with 300ms debounced type/attribute inputs.
│   ├── SelectedAttributes.js   → Sidebar summary of selections with double-click-to-delete UX.
│   └── SelectedGroups.js       → Sidebar showing attribute-groups that contain selected attrs.
│
└── utils/
    ├── db.js                   → All IndexedDB operations via `idb` library.
    ├── xmlGenerator.js         → generateXML() (full doc or partial snippets) + escapeXml() + generateExportSummary().
    └── test-groups.js          → Manual Node.js test script for XML generation logic.
```

---

## 4. Core Data Model

### 4a. Parsed Tree (`checkboxTree` state — Array)

```javascript
[
  {
    typeId: "SitePreferences",       // from type-extension[@type-id]
    attributes: [
      {
        id: "enableFeatureX",        // from attribute-definition[@attribute-id]
        displayName: "Enable X",     // from <display-name xml:lang="x-default">
        type: "boolean"              // from <type> child element or @type attribute
      },
      // ...more attributes
    ],
    groups: [
      {
        groupId: "FeatureFlags",     // from attribute-group[@group-id]
        displayName: "Feature Flags",
        attributeIds: ["enableFeatureX", "enableFeatureY"]  // from <attribute attribute-id="..."/>
      },
      // ...more groups
    ]
  },
  // ...more type-extensions
]
```

### 4b. Selection State (`selectedAttributes` — Object)

```javascript
// In-memory: values are Sets
{ "SitePreferences": Set(["enableFeatureX", "someOther"]), "Product": Set(["color"]) }

// Serialized for IndexedDB: values are Arrays
{ "SitePreferences": ["enableFeatureX", "someOther"], "Product": ["color"] }
```

Conversion happens on save (Set→Array) and restore (Array→Set).

### 4c. File History Entry (IndexedDB)

```javascript
{
  tree: [...],           // parsed checkboxTree
  fileInfo: {
    name: "system-objecttype-extensions.xml",
    size: 123456,
    lastModified: 1700000000000,
    uploadedAt: 1700000000000
  },
  fileState: {           // per-file persistent state
    typeFilter: "",
    attributeFilter: "",
    selectedAttributes: { "TypeId": ["attr1", "attr2"] }  // Array format
  }
}
```

File ID format: `"${fileName}-${fileSize}-${lastModified}"`.
Re-uploading the same file overwrites the previous entry (by design).

---

## 5. Persistence Layer (`utils/db.js`)

- **IndexedDB** via `idb`, database: `site-pref-extractor-db`, version **2**.
- **Two object stores:**
  - `xml-data` — general key-value: `parsed-tree`, `current-file-id`, `app-state`
  - `file-history` — per-file data keyed by fileId
- **Max 5 files** in history (sorted by upload time, newest first).
- Backward compatibility with pre-history single-file format is maintained.

### Exported functions:
```
saveParsedData(data), getParsedData(), clearParsedData()
saveFileToHistory(fileId, data), updateFileState(fileId, fileState)
getFileFromHistory(fileId), getCurrentFileId(), getAllFileHistory()
deleteFileFromHistory(fileId)
saveAppState(state), getAppState()
```

---

## 6. XML Parsing Details (`buildCheckboxTree` in XMLCheckboxTree.js)

Handles multiple XML root structures:
- `<metadata><type-extension>...</type-extension></metadata>` (standard SFCC format)
- `<type-extensions><type-extension>...</type-extension></type-extensions>` (alternative wrapper)
- Direct `<type-extension>` root

Handles both tag names for attribute definitions:
- `<attribute-definition>` (standard)
- `<custom-attribute-definition>` (legacy/alternative)

`xml2js` output quirk: child elements are always arrays. Display names may be plain strings or objects with `_` property (when `xml:lang` attribute is present). Code handles both: `typeof dn === 'object' ? dn._ : dn`.

---

## 7. XML Generation (`utils/xmlGenerator.js`)

`generateXML(checkboxTree, selectedAttributes, isPartial)`:

- **Partial** (`isPartial=true`): Returns `Array<{ typeId, snippet, attributeCount, groupCount }>`. Each snippet is a standalone `<type-extension>` block with no XML header.
- **Full** (`isPartial=false`): Returns a single XML string with `<?xml?>` header and `<metadata xmlns="http://www.demandware.com/xml/impex/metadata/2006-10-31">` wrapper.

**Important behavior:** Group export includes ALL attribute references within a relevant group, not just the selected ones. A group is "relevant" if any of its attributes are selected.

Generated attributes always include these hardcoded default flags:
```xml
<mandatory-flag>false</mandatory-flag>
<externally-managed-flag>false</externally-managed-flag>
```

---

## 8. ⚠️ Chakra UI v3 API — MUST USE THIS SYNTAX

Chakra UI v3 uses **compound components** and different prop names from v2. DO NOT use v2 syntax.

### Provider
```jsx
import { ChakraProvider, defaultSystem } from '@chakra-ui/react';
<ChakraProvider value={defaultSystem}>
```

### Checkbox (compound component — NOT a single <Checkbox> tag)
```jsx
<Checkbox.Root checked={bool} onCheckedChange={(details) => { details.checked }}>
  <Checkbox.HiddenInput />
  <Checkbox.Control>
    <Checkbox.Indicator />
  </Checkbox.Control>
  <Checkbox.Label>Label text</Checkbox.Label>
</Checkbox.Root>
```

### Accordion (compound component)
```jsx
<Accordion.Root collapsible lazyMount unmountOnExit>
  <Accordion.Item value="unique-key">
    <Accordion.ItemTrigger>Trigger content</Accordion.ItemTrigger>
    <Accordion.ItemContent>Panel content</Accordion.ItemContent>
    <Accordion.ItemIndicator />
  </Accordion.Item>
</Accordion.Root>
```
- `lazyMount` — content not rendered until first open
- `unmountOnExit` — content removed from DOM when collapsed

### Dialog (replaces v2 Modal)
```jsx
<Dialog.Root open={bool} onOpenChange={(e) => !e.open && onClose()} size="xl">
  <Dialog.Backdrop />
  <Dialog.Positioner>
    <Dialog.Content>
      <Dialog.Header>
        <Dialog.Title>Title</Dialog.Title>
        <Dialog.CloseTrigger />
      </Dialog.Header>
      <Dialog.Body>Body</Dialog.Body>
    </Dialog.Content>
  </Dialog.Positioner>
</Dialog.Root>
```

### Card (compound component)
```jsx
<Card.Root variant="outline">
  <Card.Body>Content</Card.Body>
</Card.Root>
```

### Color props
```jsx
// v3 uses colorPalette, NOT colorScheme
<Badge colorPalette="blue">
<Button colorPalette="red">
<IconButton colorPalette="green">

// EXCEPTION: some places in this codebase still use colorScheme (may need migration)
```

### Other v3 patterns used in this project
- `<Spinner size="xl" color="blue.500" />`
- `<Badge variant="solid" | "subtle">`
- `<IconButton size="2xs" | "xs" variant="ghost">`
- Layout: `<Grid>`, `<GridItem>`, `<VStack>`, `<HStack>`, `<Center>`, `<Box>`

---

## 9. ⚠️ react-window v2 API — MUST USE THIS SYNTAX

This project uses `react-window@^2.2.5` (v2). The API is **completely different** from v1.

### v2 API (CORRECT — use this):
```jsx
import { List } from 'react-window';

<List
  rowComponent={MyRowComponent}   // A React component, NOT a render function
  rowCount={number}               // Total number of rows
  rowHeight={number}              // Fixed row height in px
  rowProps={object}               // Extra props passed to every rowComponent instance
  style={{ width: '100%', height: '100%' }}
/>
```

### Row component signature (v2):
```jsx
const MyRow = memo(({ index, style, ...rowProps }) => (
  <div style={style}>
    {/* index is the row index, style MUST be applied to outer element */}
    {/* all rowProps keys are spread as direct props */}
  </div>
));
```

### v1 API (WRONG — DO NOT use):
```jsx
// ❌ WRONG — this is v1 syntax, will NOT work
<FixedSizeList itemCount={n} itemSize={50} height={500} width="100%">
  {({ index, style }) => <div style={style}>...</div>}
</FixedSizeList>
```

### Key differences from v1:
| v1 | v2 |
|---|---|
| `<FixedSizeList>` | `<List>` |
| `itemCount` | `rowCount` |
| `itemSize` | `rowHeight` |
| children as render function | `rowComponent` prop (a component reference) |
| N/A | `rowProps` for passing extra data |

---

## 10. Performance Patterns Already In Place

1. **Virtualization** — `react-window` v2 in `AttributeList` for lists > 50 items (threshold: `VIRTUALIZATION_THRESHOLD = 50`).
2. **Lazy accordion panels** — `lazyMount` + `unmountOnExit` prevents rendering hidden content.
3. **`React.memo()`** — On `AttributeItem` and `AttributeList`.
4. **`useCallback()`** — On toggle handlers in `AttributeItem`.
5. **`useMemo()`** — On `filteredTree`, `rowCount`, `rowProps` in `AttributeList`.
6. **Debounced filters** — 300ms debounce in `FilterBar` before propagating to parent.

---

## 11. Known Issues & Improvement Opportunities

1. **Accordion item list not virtualized** — `lazyMount`/`unmountOnExit` only affect accordion *content panels*. All `<Accordion.Item>` trigger elements render in the DOM. If there are hundreds of type-extensions, the trigger list itself causes jank. Virtualizing the accordion item list would help.

2. **Unstable empty Set reference** — In `XMLCheckboxTree.js`, the expression `selectedAttributes[type.typeId] || new Set()` creates a new Set on every render for types with no selections, breaking `memo` on `AttributeList`. Fix: use a module-level `const EMPTY_SET = new Set()`.

3. **`react-virtualized-auto-sizer`** is installed but unused — `AttributeList` hardcodes `h="500px"`. Could use `<AutoSizer>` for dynamic height.

4. **No error boundary / user-facing error messages** for malformed XML files.

5. **`XMLCheckboxTree.js` is a 677-line monolith** — Could be split into custom hooks:
   - `useFileManagement()` — upload, history, file switching
   - `useAttributeSelection()` — selection state, toggle, delete
   - `useXmlParsing()` — buildCheckboxTree, parsing logic
   - `useAppPersistence()` — IndexedDB load/save coordination

6. **Export hardcodes `mandatory-flag: false`** and `externally-managed-flag: false` — does not preserve original XML values.

7. **No component tests** — Only default CRA `App.test.js` stub exists.

8. **`App.css`** contains unused CRA boilerplate styles.

9. **Some Badge components still use `colorScheme`** instead of Chakra v3 `colorPalette` — should be migrated for consistency.

---

## 12. Input XML Format Reference

The app expects SFCC metadata XML (`http://www.demandware.com/xml/impex/metadata/2006-10-31`):

```xml
<?xml version="1.0" encoding="UTF-8"?>
<metadata xmlns="http://www.demandware.com/xml/impex/metadata/2006-10-31">
  <type-extension type-id="SitePreferences">
    <custom-attribute-definitions>
      <attribute-definition attribute-id="enableFeatureX">
        <display-name xml:lang="x-default">Enable Feature X</display-name>
        <type>boolean</type>
        <mandatory-flag>false</mandatory-flag>
        <externally-managed-flag>false</externally-managed-flag>
      </attribute-definition>
    </custom-attribute-definitions>
    <group-definitions>
      <attribute-group group-id="FeatureFlags">
        <display-name xml:lang="x-default">Feature Flags</display-name>
        <attribute attribute-id="enableFeatureX"/>
      </attribute-group>
    </group-definitions>
  </type-extension>
</metadata>
```

Common `type-id` values: `SitePreferences`, `Product`, `Basket`, `Order`, `OrderLine`, `Profile`, `Content`, `Category`, etc.

---

## 13. Component Props Quick Reference

### `<XMLCheckboxTree />` — no props (self-contained root)

### `<AttributeList typeId attributes onAttributeToggle selectedAttributes />`
- `typeId: string` — type-extension ID
- `attributes: Array<{id, displayName, type}>` — list to display
- `onAttributeToggle: (typeId, attributeId, isChecked) => void`
- `selectedAttributes: Set<string>` — Set of selected attribute IDs for this type

### `<AttributeItem attr typeId isSelected onToggle />`
- `attr: {id, displayName, type}` — single attribute
- `typeId: string`
- `isSelected: boolean`
- `onToggle: (typeId, attributeId, isChecked) => void`

### `<FilterBar typeFilter attributeFilter onTypeFilterChange onAttributeFilterChange />`
- Filters are strings; callbacks receive new string value

### `<FileHistory history currentFileId onSelectFile onDeleteFile />`
- `history: Array<{id, fileInfo, tree, fileState}>`
- `onSelectFile: (fileId) => void`
- `onDeleteFile: (fileId) => void`

### `<SelectedAttributes selectedAttributes checkboxTree onDeleteType onDeleteAttribute />`
- `onDeleteType: (typeId) => void`
- `onDeleteAttribute: (typeId, attributeId) => void`

### `<SelectedGroups selectedAttributes checkboxTree />`
- Read-only display; no callbacks

### `<ExportModal isOpen onClose snippet exportType selectedAttributes checkboxTree />`
- `snippet: string | Array<{typeId, snippet, attributeCount, groupCount}>`
- `exportType: 'full' | 'partial'`

---

## 14. How State Flows

```
User uploads XML file
  → FileReader reads text
    → xml2js.parseString parses to JS object
      → buildCheckboxTree() normalizes to app data model
        → saved to IndexedDB (file-history store)
        → setCheckboxTree(tree) triggers render

User toggles checkbox
  → handleAttributeToggle(typeId, attrId, isChecked)
    → setSelectedAttributes(prev => { ...mutate Set... })
      → useEffect auto-saves to IndexedDB per-file state
      → sidebar components re-render with new selections

User clicks Export
  → setExportType('full'|'partial') + setIsExportModalOpen(true)
    → ExportModal calls getExportXML()
      → generateXML(checkboxTree, selectedAttributes, isPartial)
        → returns XML string or array of snippets
```

---

## 15. Development Commands

```bash
npm start          # Dev server at localhost:3000 (via react-app-rewired)
npm run build      # Production build to /build
npm test           # Jest tests (via react-app-rewired)
npm run deploy     # Build + deploy to GitHub Pages
```

