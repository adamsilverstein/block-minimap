/**
 * External dependencies
 */
const { test, expect } = require( '@wordpress/e2e-test-utils-playwright' );
const AxeBuilder = require( '@axe-core/playwright' ).default;

/**
 * Internal dependencies
 */
const {
	TEST_IMAGE_URL,
	openMinimap,
	getMinimap,
} = require( '../utils/minimap' );

/**
 * The minimap is navigable content, not decoration: chips carry their block
 * title as real text, media carries an alt attribute, and an axe pass over
 * the rendered sidebar stays clean.
 */
test.describe( 'Accessibility', () => {
	test.beforeEach( async ( { admin, editor } ) => {
		await admin.createNewPost( { title: 'Accessible overview' } );

		// A representative slice of the renderer families.
		await editor.insertBlock( {
			name: 'core/heading',
			attributes: { content: 'A heading', level: 2 },
		} );
		await editor.insertBlock( {
			name: 'core/paragraph',
			attributes: { content: 'Some words' },
		} );
		await editor.insertBlock( {
			name: 'core/image',
			attributes: { url: TEST_IMAGE_URL, alt: 'A logo' },
		} );
		await editor.insertBlock( {
			name: 'core/gallery',
			innerBlocks: [
				{ name: 'core/image', attributes: { url: TEST_IMAGE_URL } },
			],
		} );
		await editor.insertBlock( {
			name: 'core/buttons',
			innerBlocks: [
				{ name: 'core/button', attributes: { text: 'Go' } },
			],
		} );
		await editor.insertBlock( { name: 'core/separator' } );
		await editor.insertBlock( {
			name: 'core/spacer',
			attributes: { height: '50px' },
		} );
		await editor.insertBlock( { name: 'core/archives' } );
		await editor.insertBlock( {
			name: 'core/group',
			innerBlocks: [
				{
					name: 'core/paragraph',
					attributes: { content: 'Grouped' },
				},
			],
		} );
	} );

	test( 'an axe pass over the open sidebar reports no violations', async ( {
		page,
	} ) => {
		await openMinimap( page );

		const results = await new AxeBuilder( { page } )
			.include( '.interface-complementary-area' )
			.analyze();

		expect( results.violations ).toEqual( [] );
	} );

	test( 'every image in the minimap has an alt attribute', async ( {
		page,
	} ) => {
		await openMinimap( page );

		const images = getMinimap( page ).locator( 'img' );
		await expect( images ).toHaveCount( 2 );

		for ( const image of await images.all() ) {
			await expect( image ).toHaveAttribute( 'alt', /.+/ );
		}
	} );
} );
