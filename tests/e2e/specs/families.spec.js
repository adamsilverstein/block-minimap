/**
 * External dependencies
 */
const { test, expect } = require( '@wordpress/e2e-test-utils-playwright' );

/**
 * Internal dependencies
 */
const { openMinimap, getMinimap } = require( '../utils/minimap' );

/**
 * The remaining renderer families: document chrome drawn as the rule or gap
 * itself, lists of links as a row of pills, and embeds labeled with their
 * provider.
 */
test.describe( 'Renderer families', () => {
	test.beforeEach( async ( { admin } ) => {
		await admin.createNewPost( { title: 'Families' } );
	} );

	test( 'renders a spacer as a gap proportionate to its height', async ( {
		page,
		editor,
	} ) => {
		await editor.insertBlock( {
			name: 'core/spacer',
			attributes: { height: '100px' },
		} );

		await openMinimap( page );

		const spacer = getMinimap( page ).locator( '.core-spacer' );
		await expect( spacer ).toHaveAttribute( 'aria-label', 'Spacer' );
		const box = await spacer.boundingBox();
		// 100px on the page, a quarter of that in the minimap.
		expect( box.height ).toBeGreaterThanOrEqual( 25 );
		expect( box.height ).toBeLessThan( 35 );
	} );

	test( 'renders the More and Page Break markers as labeled rules', async ( {
		page,
		editor,
	} ) => {
		await editor.insertBlock( { name: 'core/more' } );
		await editor.insertBlock( { name: 'core/nextpage' } );

		await openMinimap( page );

		await expect(
			getMinimap( page ).locator( '.core-more.minimap-marker' )
		).toHaveText( 'More' );
		await expect(
			getMinimap( page ).locator( '.core-nextpage.minimap-marker' )
		).toHaveText( 'Page Break' );
	} );

	test( 'renders buttons as a pill per button', async ( {
		page,
		editor,
	} ) => {
		await editor.insertBlock( {
			name: 'core/buttons',
			innerBlocks: [
				{
					name: 'core/button',
					attributes: { text: 'Subscribe' },
				},
				{
					name: 'core/button',
					attributes: { text: 'Learn more' },
				},
			],
		} );

		await openMinimap( page );

		const pills = getMinimap( page ).locator(
			'.core-buttons .minimap-pill'
		);
		await expect( pills ).toHaveText( [ 'Subscribe', 'Learn more' ] );
	} );

	test( 'renders social links as a pill per service', async ( {
		page,
		editor,
	} ) => {
		await editor.insertBlock( {
			name: 'core/social-links',
			innerBlocks: [
				{
					name: 'core/social-link',
					attributes: { service: 'wordpress', url: 'https://wordpress.org' },
				},
				{
					name: 'core/social-link',
					attributes: { service: 'x', url: 'https://x.com' },
				},
			],
		} );

		await openMinimap( page );

		const pills = getMinimap( page ).locator(
			'.core-social-links .minimap-pill'
		);
		await expect( pills ).toHaveText( [ 'Wordpress', 'X' ] );
	} );

	test( 'renders dynamic link lists as a single labeled pill', async ( {
		page,
		editor,
	} ) => {
		await editor.insertBlock( { name: 'core/categories' } );

		await openMinimap( page );

		// The block's registered title, whatever this release calls it.
		const title = await page.evaluate(
			() => window.wp.blocks.getBlockType( 'core/categories' ).title
		);
		await expect(
			getMinimap( page ).locator( '.core-categories .minimap-pill' )
		).toHaveText( title );
	} );

	test( 'labels an embed with its provider', async ( { page, editor } ) => {
		await editor.insertBlock( {
			name: 'core/embed',
			attributes: {
				url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
				providerNameSlug: 'youtube',
			},
		} );

		await openMinimap( page );

		// The label carries the provider, not just "Embed".
		await expect(
			getMinimap( page ).locator( '.core-embed' )
		).toContainText( 'YouTube' );
	} );

	test( 'labels an embed with no provider yet as an embed', async ( {
		page,
		editor,
	} ) => {
		await editor.insertBlock( { name: 'core/embed' } );

		await openMinimap( page );

		await expect( getMinimap( page ).locator( '.core-embed' ) ).toHaveText(
			'Embed'
		);
	} );
} );
