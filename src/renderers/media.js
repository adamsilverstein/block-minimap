/**
 * Internal dependencies
 */
import { blockClasses, blockTitle } from './utils';

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
 * Renders a cover block as its background image, or a placeholder without one.
 *
 * @param {Object} block A `core/cover` block.
 * @return {WPElement} The thumbnail or placeholder.
 */
export const renderCover = ( block ) => {
	const { url } = block.attributes;

	if ( ! url ) {
		return mediaPlaceholder( block, blockTitle( block ), 'aspect-wide' );
	}

	return (
		<img
			className={ blockClasses( block, 'minimap-media' ) }
			src={ url }
			alt={ blockTitle( block ) }
		/>
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
