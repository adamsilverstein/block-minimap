/**
 * Internal dependencies
 */
import { blockClasses, blockTitle } from './utils';
import { renderInner } from './containers';

/**
 * A labeled placeholder for media without a URL.
 *
 * An image dropped into the canvas but not yet uploaded has no `url`, and
 * `<img src={ undefined }>` is a broken image plus a console warning, so
 * every media renderer needs this path. The aspect class keeps the
 * placeholder roughly the shape of the media it stands in for.
 *
 * @param {Object}  block       Block being rendered.
 * @param {string}  label       Visible label.
 * @param {?string} aspectClass One of the `aspect-*` classes.
 * @return {WPElement} The placeholder band.
 */
export const mediaPlaceholder = ( block, label, aspectClass ) => (
	<div
		className={ blockClasses(
			block,
			'minimap-media-placeholder',
			aspectClass
		) }
	>
		{ label }
	</div>
);

/**
 * Renders a cover block as its background image with any inner blocks below,
 * or a placeholder when it has neither.
 *
 * @param {Object} block A `core/cover` block.
 * @param {Object} ctx   Renderer context.
 * @return {WPElement} The thumbnail, a placeholder, or both media and children.
 */
export const renderCover = ( block, ctx ) => {
	const { url } = block.attributes;
	const hasChildren = ( block.innerBlocks || [] ).length > 0;

	if ( ! url && ! hasChildren ) {
		return mediaPlaceholder( block, blockTitle( block ), 'aspect-wide' );
	}

	if ( ! hasChildren ) {
		return (
			<img
				className={ blockClasses( block, 'minimap-media' ) }
				src={ url }
				alt={ blockTitle( block ) }
			/>
		);
	}

	return (
		<div className={ blockClasses( block, 'minimap-cover' ) }>
			{ url && (
				/*
				 * The image repeats the block class so a cover reads the
				 * same way whether or not it has children yet.
				 */
				<img
					className={ `minimap-media minimap-cover__media ${ block.name.replace(
						/\//g,
						'-'
					) }` }
					src={ url }
					alt={ blockTitle( block ) }
				/>
			) }
			<div className="minimap-cover__inner">
				{ renderInner( block, ctx ) }
			</div>
		</div>
	);
};

/**
 * Renders an image block as a thumbnail, or a placeholder without a URL.
 *
 * @param {Object} block A `core/image` block.
 * @return {WPElement} The thumbnail or placeholder.
 */
export const renderImage = ( block ) => {
	const { url, alt } = block.attributes;

	if ( ! url ) {
		return mediaPlaceholder( block, blockTitle( block ), 'aspect-wide' );
	}

	return (
		<img
			className={ blockClasses( block, 'minimap-media' ) }
			src={ url }
			alt={ alt || blockTitle( block ) }
		/>
	);
};
