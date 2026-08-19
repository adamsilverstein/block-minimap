/**
 * Internal dependencies
 */
import { blockClasses, blockTitle } from './utils';

/**
 * Renders a separator as the rule itself.
 *
 * @param {Object} block A `core/separator` block.
 * @return {WPElement} The rule.
 */
export const renderSeparator = ( block ) => (
	<hr className={ blockClasses( block ) } aria-label={ blockTitle( block ) } />
);

/**
 * Renders a spacer as the gap itself, scaled down but proportionate to the
 * height the block occupies on the page.
 *
 * @param {Object} block A `core/spacer` block.
 * @return {WPElement} The gap.
 */
export const renderSpacer = ( block ) => {
	const raw = parseInt( block.attributes.height, 10 );
	const height = Number.isFinite( raw )
		? Math.min( Math.max( Math.round( raw / 4 ), 4 ), 60 )
		: 8;

	return (
		/* role="img": a plain div may not carry an aria-label. */
		<div
			className={ blockClasses( block, 'minimap-spacer' ) }
			style={ { height: `${ height }px` } }
			role="img"
			aria-label={ blockTitle( block ) }
		/>
	);
};

/**
 * Renders the More and Page Break markers as a labeled dashed rule, the way
 * the canvas draws them.
 *
 * @param {Object} block Block being rendered.
 * @return {WPElement} The marker.
 */
export const renderMarker = ( block ) => (
	<div className={ blockClasses( block, 'minimap-marker' ) }>
		{ blockTitle( block ) }
	</div>
);
