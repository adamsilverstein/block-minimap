=== Block Minimap ===
Contributors:  adamsilverstein
Tags: minimap, navigation, block editor, gutenberg, outline
Requires at least: 5.4
Tested up to: 7.1
Requires PHP: 5.6
Stable tag: 1.2.0
License: GPLv2 or later
License URI: https://www.gnu.org/licenses/old-licenses/gpl-2.0.html

A minimap for the block editor: see the shape of the whole post at a glance and scroll through it from the sidebar.

== Description ==

Long posts get hard to navigate in the block editor. Block Minimap adds a sidebar that draws the whole post in miniature, so you can see its structure at a glance and move around it quickly.

* **Every block gets a shape.** Headings, paragraphs, lists, quotes, tables, code, images, galleries, media and text, buttons, social links, embeds and more each render as a small sketch of what they look like in the post. Third party blocks without their own shape fall back to their block icon and title.
* **Nested blocks show the document tree.** Groups, covers and other container blocks draw their inner blocks inside them, and Columns sit side by side the way they do in the post.
* **Scroll sync.** The minimap and the editor canvas stay scrolled to the same content. Scroll the post and the minimap follows; scroll the minimap and the post follows.
* **Compact sizes.** Below 100%, body text draws as gray bars the length of each line while headings stay readable, so a long post fits in fewer sidebar screens. Automatic picks a size from the length of the post.
* **Viewport spotlight.** A frame marks the part of the minimap visible in the editor and dims the rest. Drag the frame to scroll the post.
* **Safe previews.** Custom HTML, shortcode and classic blocks render as escaped source rather than live markup.

Open the minimap from the Block Minimap item in the editor's Options menu.

Development takes place in the [GitHub repository](https://github.com/adamsilverstein/block-minimap). Issues and pull requests are welcome.

== Screenshots ==

1. Scrolling a long post with the minimap following along, then dragging the spotlight frame to move through the post.
2. The Block Minimap sidebar next to a long post, scrolled in step with the editor canvas.
3. Nested blocks and Columns rendered side by side in the minimap.
4. Different block types - images, quotes, tables, code, galleries - each drawn in its own shape.

== Installation ==

1. Install the plugin via the plugin installer, either by searching for it or uploading a .zip file.
2. Activate the plugin.
3. Use Block Minimap!

== Changelog ==

= 1.2.0 =
* A size control for the minimap: Automatic, 100%, 2/3 and 1/2. Below 100%, body text draws as gray bars while headings stay readable.
* A spotlight marks the part of the minimap visible in the editor and dims the rest, drawing it as a miniature of the editor. Drag it to scroll the post, or turn it off with Highlight visible area.

= 1.1.0 =
* Minimap representations for all block types, including third party blocks.
* Nested blocks render as the document tree, with Columns side by side.
* The minimap and the editor canvas scroll together: scrolling either one scrolls the other to the same content.
* Quotes, tables, code, galleries, media, buttons, social links, embeds and document chrome each render in their own shape.
* Custom HTML, shortcode and classic blocks render as escaped source rather than live markup.

= 1.0.1 =
* Confirm compatibility with WordPress 7.1.
* Declare the editor script dependencies (lodash, wp-components, wp-data, wp-edit-post, wp-element, wp-i18n, wp-plugins). Without them the minimap failed to load with "lodash is not defined".

= 1.0.0 =
Added
* Initial plugin release 🎉

== Upgrade Notice ==

= 1.2.0 =
Compact minimap sizes for long posts, and a spotlight showing which part of the post is in view.

= 1.1.0 =
Draws every block type in its own shape, shows nested blocks and Columns as the document tree, and keeps the minimap scrolled in sync with the editor. Now requires WordPress 5.4 or later.
