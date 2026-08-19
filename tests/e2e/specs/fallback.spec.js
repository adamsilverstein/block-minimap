/**
 * External dependencies
 */
const { test, expect } = require( '@wordpress/e2e-test-utils-playwright' );

/**
 * Internal dependencies
 */
const { openMinimap, getMinimap } = require( '../utils/minimap' );

/**
 * Blocks without a bespoke renderer fall back to their registered icon and
 * title, so nothing renders as an anonymous empty box — third party blocks
 * the plugin has never heard of included.
 */
test.describe( 'Metadata fallback', () => {
	test.beforeEach( async ( { admin } ) => {
		await admin.createNewPost( { title: 'Fallbacks' } );
	} );

	test( 'shows the registered title and icon for a block with no bespoke renderer', async ( {
		page,
		editor,
	} ) => {
		await editor.insertBlock( { name: 'core/archives' } );

		await openMinimap( page );

		const chip = getMinimap( page ).locator( '.core-archives' );
		await expect( chip ).toHaveClass( /minimap-chip/ );
		await expect( chip ).toHaveText( 'Archives' );
		await expect( chip.locator( 'svg' ) ).toHaveCount( 1 );
	} );

	test( 'shows a third party block through the same path', async ( {
		page,
		editor,
	} ) => {
		await page.evaluate( () => {
			window.wp.blocks.registerBlockType( 'test/no-renderer', {
				title: 'Throwaway Block',
				category: 'widgets',
				icon: 'smiley',
				attributes: {},
				edit: () => null,
				save: () => null,
			} );
		} );

		await editor.insertBlock( { name: 'test/no-renderer' } );

		await openMinimap( page );

		const chip = getMinimap( page ).locator( '.test-no-renderer' );
		await expect( chip ).toHaveClass( /minimap-chip/ );
		await expect( chip ).toHaveText( 'Throwaway Block' );
	} );

	test( 'marks an unresolvable block as unsupported', async ( {
		page,
		editor,
	} ) => {
		await editor.insertBlock( {
			name: 'core/missing',
			attributes: { originalName: 'acme/discontinued' },
		} );

		await openMinimap( page );

		const entry = getMinimap( page ).locator( '.core-missing' );
		await expect( entry ).toHaveClass( /minimap-missing/ );
		await expect( entry ).toHaveText( 'Unsupported: acme/discontinued' );
	} );
} );
