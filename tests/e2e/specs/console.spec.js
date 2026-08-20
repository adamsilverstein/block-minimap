/**
 * External dependencies
 */
const { test, expect } = require( '@wordpress/e2e-test-utils-playwright' );

/**
 * Internal dependencies
 */
const { openMinimap, getMinimap } = require( '../utils/minimap' );

/**
 * Collects everything the page logs, so a run can assert on it afterwards.
 *
 * @param {import('@playwright/test').Page} page Playwright page.
 * @return {{errors: string[], warnings: string[]}} Collected messages.
 */
function collectConsole( page ) {
	const errors = [];
	const warnings = [];

	page.on( 'console', ( message ) => {
		const text = message.text();
		if ( message.type() === 'error' ) {
			errors.push( text );
		}
		if ( message.type() === 'warning' ) {
			warnings.push( text );
		}
	} );
	page.on( 'pageerror', ( error ) => errors.push( error.message ) );

	return { errors, warnings };
}

test.describe( 'Console output', () => {
	test( 'logs no errors while the minimap is open', async ( {
		admin,
		editor,
		page,
	} ) => {
		const { errors } = collectConsole( page );

		await admin.createNewPost( { title: 'Quiet please' } );
		await editor.insertBlock( {
			name: 'core/heading',
			attributes: { content: 'A heading', level: 2 },
		} );
		await editor.insertBlock( {
			name: 'core/list',
			innerBlocks: [
				{ name: 'core/list-item', attributes: { content: 'An item' } },
			],
		} );

		await openMinimap( page );
		await expect( getMinimap( page ) ).toBeVisible();

		expect( errors ).toEqual( [] );
	} );

	/*
	 * The plugin reached WordPress 7.0 still calling `wp.editPost.PluginSidebar`
	 * and `wp.editPost.PluginSidebarMoreMenuItem`, deprecated since 6.6. This
	 * asserts on every deprecation rather than those two by name, so the next
	 * one surfaces on the day it lands rather than whenever someone next opens
	 * the sidebar by hand.
	 */
	test( 'triggers no deprecation notices while the minimap is open', async ( {
		admin,
		page,
	} ) => {
		const { warnings } = collectConsole( page );

		await admin.createNewPost( { title: 'No deprecations' } );
		await openMinimap( page );
		await expect( getMinimap( page ) ).toBeVisible();

		const deprecations = warnings.filter( ( text ) =>
			text.includes( 'is deprecated' )
		);

		expect( deprecations ).toEqual( [] );
	} );

	/*
	 * The old renderer emitted `<img src={undefined}>` for media blocks with
	 * no URL yet, which React renders as an img with no src at all: a broken
	 * image glyph. The canvas iframe fetches whatever it likes; only top
	 * frame image requests can come from the minimap, so any img the minimap
	 * renders must carry a src and that src must resolve.
	 */
	test( 'fires no broken image requests for media blocks with no URL', async ( {
		admin,
		editor,
		page,
	} ) => {
		const brokenImages = [];
		page.on( 'response', ( response ) => {
			const request = response.request();
			if (
				request.resourceType() === 'image' &&
				request.frame() === page.mainFrame() &&
				response.status() >= 400
			) {
				brokenImages.push( `${ response.status() } ${ request.url() }` );
			}
		} );

		await admin.createNewPost( { title: 'No broken images' } );
		for ( const name of [
			'core/image',
			'core/cover',
			'core/gallery',
			'core/video',
			'core/audio',
			'core/media-text',
		] ) {
			await editor.insertBlock( { name } );
		}

		await openMinimap( page );
		await expect( getMinimap( page ) ).toBeVisible();

		await expect(
			getMinimap( page ).locator( 'img:not([src])' )
		).toHaveCount( 0 );
		expect( brokenImages ).toEqual( [] );
	} );
} );
