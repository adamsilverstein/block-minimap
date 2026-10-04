# Changelog

All notable changes to this project will be documented in this file, per [the Keep a Changelog standard](http://keepachangelog.com/).

## [Unreleased]

## [1.2.0]
### Added
- A spotlight over the part of the minimap visible in the editor canvas: a theme color frame around it, with the rest dimmed. At the compact sizes the entries inside the frame draw at full size, like a magnifier. Dragging the frame scrolls the canvas, and a Highlight visible area toggle, saved as a user preference, turns it off. ([#62](https://github.com/adamsilverstein/block-minimap/issues/62))
- A size control for the minimap: Automatic, 100%, 2/3 and 1/2. Below 100%, body text draws as gray bars the length of each line while headings stay readable, so a long post fits in fewer sidebar screens. Automatic picks a size from how much the post holds, counting blocks and words, and is the default; the choice is saved as a user preference. ([#60](https://github.com/adamsilverstein/block-minimap/issues/60))

## [1.1.0]
### Added
- The minimap and the editor canvas scroll together: scrolling either one scrolls the other to the same content, lined up block by block, and both reach their top and bottom together. ([#52](https://github.com/adamsilverstein/block-minimap/issues/52))
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
