/**
 * Internal dependencies
 */
import { renderChip, renderMissing, renderRaw } from './generic';
import { renderColumns, renderContainer } from './containers';
import {
	renderCode,
	renderDetails,
	renderHeading,
	renderList,
	renderPreformatted,
	renderPullquote,
	renderQuote,
	renderTable,
	renderText,
} from './text';
import {
	renderAudio,
	renderCover,
	renderEmbed,
	renderFile,
	renderGallery,
	renderImage,
	renderMediaShape,
	renderMediaText,
	renderVideo,
} from './media';
import { renderMarker, renderSeparator, renderSpacer } from './chrome';
import { renderPills } from './pills';

const { getBlockType } = wp.blocks;

/**
 * Bespoke renderers by block name, for blocks whose shape carries more
 * information than an icon and title. Adding coverage is adding an entry
 * here rather than editing a growing conditional.
 */
const registry = {
	'core/audio': renderAudio,
	'core/avatar': renderMediaShape( 'aspect-square' ),
	'core/buttons': renderPills,
	'core/categories': renderPills,
	'core/code': renderCode,
	'core/columns': renderColumns,
	'core/cover': renderCover,
	'core/details': renderDetails,
	'core/embed': renderEmbed,
	'core/file': renderFile,
	'core/freeform': renderRaw( 'content' ),
	'core/gallery': renderGallery,
	'core/heading': renderHeading,
	'core/html': renderRaw( 'content' ),
	'core/image': renderImage,
	'core/list': renderList,
	'core/media-text': renderMediaText,
	'core/missing': renderMissing,
	'core/more': renderMarker,
	'core/navigation': renderPills,
	'core/nextpage': renderMarker,
	'core/page-list': renderPills,
	'core/paragraph': renderText,
	'core/post-featured-image': renderMediaShape( 'aspect-wide' ),
	'core/preformatted': renderPreformatted,
	'core/pullquote': renderPullquote,
	'core/quote': renderQuote,
	'core/separator': renderSeparator,
	'core/shortcode': renderRaw( 'text' ),
	'core/site-logo': renderMediaShape( 'aspect-square' ),
	'core/social-links': renderPills,
	'core/spacer': renderSpacer,
	'core/table': renderTable,
	'core/tag-cloud': renderPills,
	'core/verse': renderPreformatted,
	'core/video': renderVideo,
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
 * Resolution order: an exact registry match, then the container family for
 * anything holding `innerBlocks`, then the block's category default, then
 * the generic icon-and-title chip. The chip is the load bearing arm: it
 * needs nothing but `getBlockType()` metadata, so blocks nobody wrote a
 * renderer for — third party ones included — still show their own icon and
 * name.
 *
 * @param {Object} block Block to render.
 * @return {Function} A renderer taking ( block, context ).
 */
export function resolveRenderer( block ) {
	if ( registry[ block.name ] ) {
		return registry[ block.name ];
	}

	if ( block.innerBlocks && block.innerBlocks.length ) {
		return renderContainer;
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
