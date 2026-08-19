/**
 * Internal dependencies
 */
import { blockClasses, blockTitle, toPlainText } from './utils';

const { map } = lodash;

/**
 * Per block extraction of pill labels from the blocks that have client side
 * items to draw.
 */
const pillLabels = {
	'core/buttons': ( block ) =>
		map(
			block.innerBlocks,
			( button ) =>
				toPlainText( button.attributes && button.attributes.text ) ||
				blockTitle( button )
		),
	'core/navigation': ( block ) =>
		map(
			block.innerBlocks,
			( item ) =>
				toPlainText( item.attributes && item.attributes.label ) ||
				blockTitle( item )
		),
	'core/social-links': ( block ) =>
		map( block.innerBlocks, ( link ) => {
			const { service, label } = link.attributes || {};

			if ( label ) {
				return toPlainText( label );
			}

			return service
				? service.charAt( 0 ).toUpperCase() + service.slice( 1 )
				: blockTitle( link );
		} ),
};

/**
 * Renders a list-of-links block as a row of small pills.
 *
 * Buttons, social links and navigation items become one pill each. Dynamic
 * link lists — Page List, Categories, Tag Cloud — have no client side items,
 * so the block title becomes the single pill: the row still reads as a list
 * of links.
 *
 * @param {Object} block Block being rendered.
 * @return {WPElement} The pill row.
 */
export const renderPills = ( block ) => {
	const labels = (
		pillLabels[ block.name ] ? pillLabels[ block.name ]( block ) : []
	).filter( Boolean );

	if ( ! labels.length ) {
		labels.push( blockTitle( block ) );
	}

	return (
		<div className={ blockClasses( block, 'minimap-pills' ) }>
			{ labels.map( ( label, i ) => (
				<span key={ i } className="minimap-pill">
					{ label }
				</span>
			) ) }
		</div>
	);
};
