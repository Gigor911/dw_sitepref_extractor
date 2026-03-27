# Copilot Instructions — dw_sitepref_extractor

> For full project context, read `AGENTS.md` in the project root.

## Critical Rules

1. **Chakra UI v3** — Use compound component API (`Checkbox.Root`, `Accordion.Root`, `Dialog.Root`, `Card.Root`). Do NOT use Chakra v2 syntax.
2. **react-window v2** — Use `<List rowComponent={Comp} rowCount={n} rowHeight={h} rowProps={obj} />`. Do NOT use v1 `<FixedSizeList>` / `itemCount` / children-as-render-function.
3. **React 19** — `createRoot` API. React 19 features available.
4. **No backend** — Everything runs client-side. Persistence via IndexedDB (`idb` library).
5. **Color props** — Use `colorPalette` (not `colorScheme`) for Chakra v3 components.
6. **Build** — CRA + `react-app-rewired`. Never use raw `react-scripts`.

