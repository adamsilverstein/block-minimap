/**
 * Internal dependencies
 */
import { blockClasses } from './utils';
import { renderChip } from './generic';

const { __ } = wp.i18n;

/**
 * How deep the minimap follows `innerBlocks`. Patterns nest deeper than you
 * would expect, and unbounded recursion could stall the sidebar, so past
 * this depth a truncation indicator stands in for the subtree.
 */
export const MAX_DEPTH = 4;

/**
 * Renders a block's children one level deeper, or the truncation indicator
 * once the depth cap is reached. Bespoke renderers with children share this,
 * so the cap holds everywhere.
 *
 * @param {Object} block Block whose children to render.
 * @param {Object} ctx   Renderer context: `depth` and `renderBlocks`.
 * @return {WPElement} The children or the indicator.
 */
export const renderInner = ( block, ctx ) => {
	if ( ctx.depth >= MAX_DEPTH ) {
		return (
			<div className="minimap-truncated">
				{ '… ' }
				<span className="minimap-truncated__label">
					{ __( 'deeper blocks not shown', 'block-minimap' ) }
				</span>
			</div>
		);
	}

	return ctx.renderBlocks( block.innerBlocks, ctx.depth + 1 );
};

/**
 * Renders a container block as its children, so the minimap mirrors the real
 * document tree. This is the family renderer for any block holding
 * `innerBlocks`; an empty container falls back to the title chip.
 *
 * @param {Object} block Block being rendered.
 * @param {Object} ctx   Renderer context.
 * @return {WPElement} The container or a chip.
 */
export const renderContainer = ( block, ctx ) => {
	if ( ! ( block.innerBlocks || [] ).length ) {
		return renderChip( block );
	}

	return (
		<div className={ blockClasses( block, 'minimap-container' ) }>
			{ renderInner( block, ctx ) }
		</div>
	);
};

/**
 * Renders a columns block with its children side by side rather than
 * stacked, since the horizontal split is the whole point of the block.
 *
 * @param {Object} block A `core/columns` block.
 * @param {Object} ctx   Renderer context.
 * @return {WPElement} The columns row or a chip.
 */
export const renderColumns = ( block, ctx ) => {
	if ( ! ( block.innerBlocks || [] ).length ) {
		return renderChip( block );
	}

	return (
		<div className={ blockClasses( block, 'minimap-columns' ) }>
			{ renderInner( block, ctx ) }
		</div>
	);
};
