/**
 * Internal dependencies
 */
import { blockClasses, blockTitle, toHtml } from './utils';

const { getBlockType } = wp.blocks;
const { BlockIcon } = wp.blockEditor;
const { __, sprintf } = wp.i18n;

/**
 * Tier 1 fallback: the block's own icon and title in a small band.
 *
 * `getBlockType()` supplies a translated title and an icon for every
 * registered type, third party blocks included, so no block ever renders as
 * an anonymous empty box. The category feeds a `category-*` class so the
 * band's height can approximate how much room the block tends to occupy.
 *
 * @param {Object}  block Block being rendered.
 * @param {?string} label Overrides the block type title.
 * @return {WPElement} The chip.
 */
export const chip = ( block, label ) => {
	const blockType = getBlockType( block.name );
	const category = blockType && blockType.category;

	return (
		<div
			className={ blockClasses(
				block,
				'minimap-chip',
				category && `category-${ category }`
			) }
		>
			<BlockIcon icon={ blockType && blockType.icon } />
			<span className="minimap-chip__label">
				{ label || blockTitle( block ) }
			</span>
		</div>
	);
};

/**
 * The chip with a renderer's ( block, context ) signature, so `chip` itself
 * can keep its label parameter for callers that override the title.
 *
 * @param {Object} block Block being rendered.
 * @return {WPElement} The chip.
 */
export const renderChip = ( block ) => chip( block );

/**
 * Renders a raw markup attribute as escaped source text.
 *
 * `core/html`, `core/shortcode` and `core/freeform` hold arbitrary author
 * supplied markup. Unlike rich text, which the editor sanitizes, that must
 * never reach `dangerouslySetInnerHTML`: the minimap would execute scripts
 * and fire requests the canvas never fired. React escapes plain children, so
 * the source reads as tiny code instead.
 *
 * @param {string} attributeName Which attribute holds the markup.
 * @return {Function} A renderer for that block.
 */
export const renderRaw = ( attributeName ) => ( block ) => {
	const source = toHtml( block.attributes[ attributeName ] ).trim();

	if ( ! source ) {
		return renderChip( block );
	}

	return (
		<div className={ blockClasses( block, 'minimap-raw' ) }>
			<pre>{ source }</pre>
		</div>
	);
};

/**
 * `core/missing` marks content the editor could not resolve to a registered
 * block, which is something the author wants to notice, so it renders as a
 * visually distinct warning chip naming the missing type.
 *
 * @param {Object} block A `core/missing` block.
 * @return {WPElement} The warning chip.
 */
export const renderMissing = ( block ) => (
	<div className={ blockClasses( block, 'minimap-chip', 'minimap-missing' ) }>
		<span className="minimap-chip__label">
			{ block.attributes.originalName
				? sprintf(
						/* translators: %s: the unregistered block's name. */
						__( 'Unsupported: %s', 'block-minimap' ),
						block.attributes.originalName
				  )
				: __( 'Unsupported block', 'block-minimap' ) }
		</span>
	</div>
);
