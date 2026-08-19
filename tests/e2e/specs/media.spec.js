/**
 * External dependencies
 */
const { test, expect } = require( '@wordpress/e2e-test-utils-playwright' );

/**
 * Internal dependencies
 */
const {
	TEST_IMAGE_URL,
	openMinimap,
	getMinimap,
} = require( '../utils/minimap' );

/**
 * Media renders as a thumbnail where a URL exists and as a labeled
 * placeholder in the right shape where none does — never as a broken img.
 */
test.describe( 'Media rendering', () => {
	test.beforeEach( async ( { admin } ) => {
		await admin.createNewPost( { title: 'Media' } );
	} );

	test( 'renders a gallery as a strip of its thumbnails', async ( {
		page,
		editor,
	} ) => {
		await editor.insertBlock( {
			name: 'core/gallery',
			innerBlocks: [
				{
					name: 'core/image',
					attributes: { url: TEST_IMAGE_URL, alt: 'One' },
				},
				{
					name: 'core/image',
					attributes: { url: TEST_IMAGE_URL, alt: 'Two' },
				},
			],
		} );

		await openMinimap( page );

		const thumbs = getMinimap( page ).locator( '.core-gallery img' );
		await expect( thumbs ).toHaveCount( 2 );
		await expect( thumbs.nth( 0 ) ).toHaveAttribute(
			'src',
			TEST_IMAGE_URL
		);
	} );

	test( 'labels an empty gallery instead of rendering broken images', async ( {
		page,
		editor,
	} ) => {
		await editor.insertBlock( { name: 'core/gallery' } );

		await openMinimap( page );

		await expect(
			getMinimap( page ).locator( '.core-gallery' )
		).toHaveText( 'Gallery' );
		await expect( getMinimap( page ).locator( 'img' ) ).toHaveCount( 0 );
	} );

	test( 'renders a video as its poster image', async ( {
		page,
		editor,
	} ) => {
		await editor.insertBlock( {
			name: 'core/video',
			attributes: { src: '/a-video.mp4', poster: TEST_IMAGE_URL },
		} );

		await openMinimap( page );

		const poster = getMinimap( page ).locator( 'img.core-video' );
		await expect( poster ).toHaveAttribute( 'src', TEST_IMAGE_URL );
		// The minimap never embeds a player.
		await expect( getMinimap( page ).locator( 'video' ) ).toHaveCount( 0 );
	} );

	test( 'labels a video without a poster in the video shape', async ( {
		page,
		editor,
	} ) => {
		await editor.insertBlock( {
			name: 'core/video',
			attributes: { src: '/a-video.mp4' },
		} );

		await openMinimap( page );

		const placeholder = getMinimap( page ).locator( '.core-video' );
		await expect( placeholder ).toHaveText( 'Video' );
		await expect( placeholder ).toHaveClass( /aspect-wide/ );
		await expect( getMinimap( page ).locator( 'img' ) ).toHaveCount( 0 );
	} );

	test( 'renders audio as a labeled band', async ( { page, editor } ) => {
		await editor.insertBlock( {
			name: 'core/audio',
			attributes: { src: '/a-podcast.mp3' },
		} );

		await openMinimap( page );

		const band = getMinimap( page ).locator( '.core-audio' );
		await expect( band ).toHaveText( 'Audio' );
		await expect( getMinimap( page ).locator( 'audio' ) ).toHaveCount( 0 );
	} );

	test( 'renders media & text as its two halves side by side', async ( {
		page,
		editor,
	} ) => {
		await editor.insertBlock( {
			name: 'core/media-text',
			attributes: { mediaUrl: TEST_IMAGE_URL, mediaType: 'image' },
			innerBlocks: [
				{
					name: 'core/paragraph',
					attributes: { content: 'Beside the media' },
				},
			],
		} );

		await openMinimap( page );

		const entry = getMinimap( page ).locator( '.core-media-text' );
		await expect( entry.locator( 'img' ) ).toHaveAttribute(
			'src',
			TEST_IMAGE_URL
		);
		await expect( entry.locator( '.core-paragraph' ) ).toHaveText(
			'Beside the media'
		);

		const media = await entry
			.locator( '.minimap-media-text__media' )
			.boundingBox();
		const content = await entry
			.locator( '.minimap-media-text__content' )
			.boundingBox();
		expect( content.x ).toBeGreaterThan( media.x );
	} );

	test( 'renders a cover with children as media above its content', async ( {
		page,
		editor,
	} ) => {
		await editor.insertBlock( {
			name: 'core/cover',
			attributes: { url: TEST_IMAGE_URL },
			innerBlocks: [
				{
					name: 'core/paragraph',
					attributes: { content: 'Over the image' },
				},
			],
		} );

		await openMinimap( page );

		const cover = getMinimap( page ).locator( 'div.core-cover' );
		await expect( cover.locator( 'img' ) ).toHaveAttribute(
			'src',
			TEST_IMAGE_URL
		);
		await expect( cover.locator( '.core-paragraph' ) ).toHaveText(
			'Over the image'
		);
	} );

	test( 'renders a file block as a chip named after the file', async ( {
		page,
		editor,
	} ) => {
		await editor.insertBlock( {
			name: 'core/file',
			attributes: {
				href: '/annual-report.pdf',
				fileName: 'annual-report.pdf',
			},
		} );

		await openMinimap( page );

		const chip = getMinimap( page ).locator( '.core-file' );
		await expect( chip ).toHaveClass( /minimap-chip/ );
		await expect( chip ).toHaveText( 'annual-report.pdf' );
	} );
} );
