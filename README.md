# SFCC Metadata Tools

A fully client-side React web application for working with Salesforce Commerce Cloud (SFCC) metadata XML files.

## Features

### 📤 Extract from XML
- Parse existing SFCC metadata XML files
- Browse type-extensions in an interactive accordion
- Filter by type ID or attribute ID
- Select specific attributes and groups
- Export as full XML or individual snippets
- File history with persistent state

### ✨ Create from Scratch
- Build new custom attributes interactively
- Choose from 16+ SFCC attribute types
- Configure all metadata fields:
  - Display names & descriptions
  - Boolean flags (mandatory, localizable, site-specific, visible, externally-managed)
  - Validation rules (min/max length, min/max value, decimal scale, regex)
  - Enum values with display names
  - Default values
- Export ready-to-import metadata XML

## Tech Stack

- **React 19** with hooks and modern patterns
- **Chakra UI v3** for component library
- **React Router v7** for navigation
- **react-window v2** for virtualized lists
- **IndexedDB** (via `idb`) for client-side persistence
- **xml2js** for XML parsing
- **Create React App** with `react-app-rewired` for config overrides

## Getting Started

### Prerequisites
- Node.js 24+ (see `.nvmrc`)
- npm or yarn

### Installation

```bash
npm install
```

### Development

```bash
npm start
```

Opens the app at [http://localhost:3000](http://localhost:3000)

### Build

```bash
npm run build
```

Builds the app for production to the `build` folder.

### Deploy to GitHub Pages

```bash
npm run deploy
```

## Project Structure

```
src/
├── App.js                      # Router setup with BrowserRouter
├── XMLCheckboxTree.js          # Extract flow (677 lines)
├── components/
│   ├── HomePage.js             # Landing page with flow selection
│   ├── CreatePreferences.js    # Create flow with modal attribute editor
│   ├── AttributeList.js        # Virtualized attribute grid
│   ├── AttributeItem.js        # Single attribute checkbox
│   ├── ExportModal.js          # XML export dialog with copy/download
│   ├── FileHistory.js          # Recent files sidebar
│   ├── FilterBar.js            # Debounced filter inputs
│   ├── SelectedAttributes.js   # Selection summary
│   └── SelectedGroups.js       # Group summary
└── utils/
    ├── db.js                   # IndexedDB operations
    └── xmlGenerator.js         # XML generation logic
```

## Documentation

- **`AGENTS.md`** — Comprehensive AI coding assistant context
- **`.github/copilot-instructions.md`** — GitHub Copilot rules
- **`ROUTER_MIGRATION.md`** — React Router migration notes

## Live Demo

🔗 [https://gigor911.github.io/dw_sitepref_extractor/](https://gigor911.github.io/dw_sitepref_extractor/)

## License

MIT
