/**
 * Internal dependencies
 */
import { blockClasses, blockTitle, toPlainText } from './utils';
import { chip } from './generic';
import { renderInner } from './containers';

const { map } = lodash;
const { getBlockVariations } = wp.blocks;
const { __, sprintf } = wp.i18n;

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

/**
 * Renders a gallery as a row of its images' thumbnails.
 *
 * @param {Object} block A `core/gallery` block.
 * @return {WPElement} The thumbnails or a placeholder without any URLs.
 */
export const renderGallery = ( block ) => {
	const images = ( block.innerBlocks || [] ).filter(
		( image ) => image.attributes && image.attributes.url
	);

	if ( ! images.length ) {
		return mediaPlaceholder( block, blockTitle( block ), 'aspect-wide' );
	}

	return (
		<div className={ blockClasses( block, 'minimap-gallery' ) }>
			{ map( images, ( image ) => (
				<img
					key={ image.clientId }
					className="minimap-media minimap-gallery__thumb"
					src={ image.attributes.url }
					alt={ image.attributes.alt || blockTitle( image ) }
				/>
			) ) }
		</div>
	);
};

/**
 * Renders a video as its poster image, or a placeholder in the video's
 * shape — the minimap never embeds a player.
 *
 * @param {Object} block A `core/video` block.
 * @return {WPElement} The poster or placeholder.
 */
export const renderVideo = ( block ) => {
	const { poster } = block.attributes;

	if ( ! poster ) {
		return mediaPlaceholder( block, blockTitle( block ), 'aspect-wide' );
	}

	return (
		<img
			className={ blockClasses( block, 'minimap-media' ) }
			src={ poster }
			alt={ blockTitle( block ) }
		/>
	);
};

/**
 * Renders an audio block as a short labeled band; audio has no thumbnail.
 *
 * @param {Object} block A `core/audio` block.
 * @return {WPElement} The band.
 */
export const renderAudio = ( block ) =>
	mediaPlaceholder( block, blockTitle( block ), 'aspect-band' );

/**
 * Renders a media & text block as its two halves: the media thumbnail on
 * one side, the inner blocks on the other.
 *
 * @param {Object} block A `core/media-text` block.
 * @param {Object} ctx   Renderer context.
 * @return {WPElement} The split band.
 */
export const renderMediaText = ( block, ctx ) => {
	const { mediaUrl, mediaType, mediaPosition } = block.attributes;
	const hasChildren = ( block.innerBlocks || [] ).length > 0;

	if ( ! mediaUrl && ! hasChildren ) {
		return mediaPlaceholder( block, blockTitle( block ), 'aspect-wide' );
	}

	return (
		<div
			className={ blockClasses(
				block,
				'minimap-media-text',
				mediaPosition === 'right' && 'is-media-right'
			) }
		>
			<div className="minimap-media-text__media">
				{ mediaUrl && mediaType === 'image' ? (
					<img
						className="minimap-media"
						src={ mediaUrl }
						alt={ blockTitle( block ) }
					/>
				) : (
					<div className="minimap-media-placeholder aspect-square">
						{ blockTitle( block ) }
					</div>
				) }
			</div>
			<div className="minimap-media-text__content">
				{ hasChildren && renderInner( block, ctx ) }
			</div>
		</div>
	);
};

/**
 * Renders a file block as a chip carrying the file's name.
 *
 * @param {Object} block A `core/file` block.
 * @return {WPElement} The chip.
 */
export const renderFile = ( block ) =>
	chip( block, toPlainText( block.attributes.fileName ) || undefined );

/**
 * Renders site level media blocks — site logo, featured image, avatar — as
 * placeholders in their shape. Their URLs live server side, so there is no
 * thumbnail to draw, but the shape still reads at a glance.
 *
 * @param {string} aspectClass One of the `aspect-*` classes.
 * @return {Function} A renderer for that shape.
 */
export const renderMediaShape = ( aspectClass ) => ( block ) =>
	mediaPlaceholder( block, blockTitle( block ), aspectClass );

/**
 * Renders an embed as a placeholder naming the provider.
 *
 * `getBlockType( 'core/embed' ).title` alone is not much help, so the label
 * carries the matching variation's title — `Embed: YouTube` — falling back
 * to the raw provider slug for providers with no registered variation.
 *
 * @param {Object} block A `core/embed` block.
 * @return {WPElement} The labeled placeholder.
 */
export const renderEmbed = ( block ) => {
	const slug = block.attributes && block.attributes.providerNameSlug;
	const variations = getBlockVariations( 'core/embed' ) || [];
	const variation =
		slug && variations.filter( ( { name } ) => name === slug )[ 0 ];

	/*
	 * A variation title already names itself as an embed ("YouTube Embed"),
	 * so it stands alone; only a bare slug needs the "Embed:" prefix.
	 */
	let label = blockTitle( block );
	if ( variation ) {
		label = variation.title;
	} else if ( slug ) {
		label = sprintf(
			/* translators: %s: the embed provider's name. */
			__( 'Embed: %s', 'block-minimap' ),
			slug
		);
	}

	return mediaPlaceholder( block, label, 'aspect-wide' );
};
