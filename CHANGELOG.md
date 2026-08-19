# Changelog

All notable changes to this project will be documented in this file, per [the Keep a Changelog standard](http://keepachangelog.com/).

## [1.1.0]
### Added
- Minimap representations for all block types. A renderer registry resolves an exact match, then a family renderer, then a metadata fallback showing the block's own icon and title, so every block - third party ones included - gets a recognizable entry instead of an anonymous empty box. ([#4](https://github.com/adamsilverstein/block-minimap/issues/4))
- Recursive rendering of `innerBlocks` with a depth cap of four, so the minimap mirrors the document tree; Columns lay out side by side.
- Bespoke renderers: quotes, pullquotes, verse, preformatted text, code, tables and details render their content; galleries, videos, covers and media & text render thumbnails with labeled placeholders when no URL exists yet; buttons, social links and navigation render as rows of pills; spacers, More and Page Break render as the gap or rule itself; embeds are labeled with their provider.
- A visually distinct warning entry for unresolvable (`core/missing`) blocks.

### Changed
- The minimap only redraws when the block tree or post title actually changes, and an edit re-renders only the affected subtree instead of the whole map.

### Fixed
- Entries nested inside quotes, details and media & text now fit their wrapper instead of overflowing the sidebar.
- Button, social link, navigation and file labels resolve entities, so a name like `Fish &amp; Chips` reads as written.
- Galleries saved before WordPress 5.9 render their images instead of an empty placeholder.
- The plugin's translated strings use the text domain the plugin declares, and the editor script registers its translations.
- Custom HTML, shortcode and classic blocks render as escaped source text, so author supplied markup can never execute or fire requests from the minimap.
- Images without a URL (for example, still uploading) render a labeled placeholder instead of a broken image and a console warning.
- Minimap images now carry an `alt` attribute.

## [1.0.0]
### Added
