/**
 * Internal dependencies
 */
import { renderChip, renderMissing, renderRaw } from './generic';
import { renderHeading, renderList, renderText } from './text';
import { renderCover, renderImage } from './media';
import { renderSeparator } from './chrome';

const { getBlockType } = wp.blocks;

/**
 * Bespoke renderers by block name, for blocks whose shape carries more
 * information than an icon and title. Adding coverage is adding an entry
 * here rather than editing a growing conditional.
 */
const registry = {
	'core/cover': renderCover,
	'core/freeform': renderRaw( 'content' ),
	'core/heading': renderHeading,
	'core/html': renderRaw( 'content' ),
	'core/image': renderImage,
	'core/list': renderList,
	'core/missing': renderMissing,
	'core/paragraph': renderText,
	'core/separator': renderSeparator,
	'core/shortcode': renderRaw( 'text' ),
};

/**
 * Defaults by block category, between the registry and the generic chip.
 * Text bearing blocks read better as their own words than as a label.
 */
const categoryDefaults = {
	text: renderText,
};

/**
 * Picks the renderer for a block.
 *
 * Resolution order: an exact registry match, then the block's category
 * default, then the generic icon-and-title chip. The chip is the load
 * bearing arm: it needs nothing but `getBlockType()` metadata, so blocks
 * nobody wrote a renderer for — third party ones included — still show
 * their own icon and name.
 *
 * @param {Object} block Block to render.
 * @return {Function} A renderer taking ( block, context ).
 */
export function resolveRenderer( block ) {
	if ( registry[ block.name ] ) {
		return registry[ block.name ];
	}

	const blockType = getBlockType( block.name );
	const category = blockType && blockType.category;

	if (
		categoryDefaults[ category ] &&
		block.attributes &&
		block.attributes.content !== undefined
	) {
		return categoryDefaults[ category ];
	}

	return renderChip;
}
