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
	getMinimapBlocks,
} = require( '../utils/minimap' );

test.describe( 'Block rendering', () => {
	test.beforeEach( async ( { admin } ) => {
		await admin.createNewPost( { title: 'Blocks' } );
	} );

	test( 'renders a heading as its own heading level', async ( {
		page,
		editor,
	} ) => {
		for ( const level of [ 1, 2, 3, 4, 5, 6 ] ) {
			await editor.insertBlock( {
				name: 'core/heading',
				attributes: { content: `Level ${ level }`, level },
			} );
		}

		await openMinimap( page );

		for ( const level of [ 1, 2, 3, 4, 5, 6 ] ) {
			await expect(
				getMinimap( page ).locator( `h${ level }.core-heading` )
			).toHaveText( `Level ${ level }` );
		}
	} );

	test( 'renders paragraph content, inline formatting included', async ( {
		page,
		editor,
	} ) => {
		await editor.insertBlock( {
			name: 'core/paragraph',
			attributes: { content: 'Plain and <em>emphasised</em>' },
		} );

		await openMinimap( page );

		const paragraph = getMinimap( page ).locator( '.core-paragraph' );
		await expect( paragraph ).toHaveText( 'Plain and emphasised' );
		await expect( paragraph.locator( 'em' ) ).toHaveText( 'emphasised' );
	} );

	test( 'renders an image block as an image with the block URL', async ( {
		page,
		editor,
	} ) => {
		await editor.insertBlock( {
			name: 'core/image',
			attributes: { url: TEST_IMAGE_URL, alt: 'A logo' },
		} );

		await openMinimap( page );

		await expect(
			getMinimap( page ).locator( 'img.core-image' )
		).toHaveAttribute( 'src', TEST_IMAGE_URL );
	} );

	test( 'renders a cover block as an image with the block URL', async ( {
		page,
		editor,
	} ) => {
		await editor.insertBlock( {
			name: 'core/cover',
			attributes: { url: TEST_IMAGE_URL },
		} );

		await openMinimap( page );

		await expect(
			getMinimap( page ).locator( 'img.core-cover' )
		).toHaveAttribute( 'src', TEST_IMAGE_URL );
	} );

	test( 'renders a separator as a rule', async ( { page, editor } ) => {
		await editor.insertBlock( { name: 'core/separator' } );

		await openMinimap( page );

		await expect( getMinimap( page ).locator( 'hr' ) ).toHaveCount( 1 );
	} );

	test( 'renders an unordered list with its items', async ( {
		page,
		editor,
	} ) => {
		await editor.insertBlock( {
			name: 'core/list',
			innerBlocks: [
				{ name: 'core/list-item', attributes: { content: 'First' } },
				{ name: 'core/list-item', attributes: { content: 'Second' } },
				{ name: 'core/list-item', attributes: { content: 'Third' } },
			],
		} );

		await openMinimap( page );

		const items = getMinimap( page ).locator( '.core-list li' );
		await expect( items ).toHaveCount( 3 );
		await expect( items ).toHaveText( [ 'First', 'Second', 'Third' ] );
		await expect( getMinimap( page ).locator( '.core-list ul' ) ).toHaveCount(
			1
		);
	} );

	test( 'renders an ordered list as an ordered list', async ( {
		page,
		editor,
	} ) => {
		await editor.insertBlock( {
			name: 'core/list',
			attributes: { ordered: true },
			innerBlocks: [
				{ name: 'core/list-item', attributes: { content: 'One' } },
				{ name: 'core/list-item', attributes: { content: 'Two' } },
			],
		} );

		await openMinimap( page );

		await expect( getMinimap( page ).locator( '.core-list ol' ) ).toHaveCount(
			1
		);
		await expect( getMinimap( page ).locator( '.core-list li' ) ).toHaveText( [
			'One',
			'Two',
		] );
	} );

	test( 'renders a nested list inside its parent item', async ( {
		page,
		editor,
	} ) => {
		await editor.insertBlock( {
			name: 'core/list',
			innerBlocks: [
				{
					name: 'core/list-item',
					attributes: { content: 'Parent' },
					innerBlocks: [
						{
							name: 'core/list',
							innerBlocks: [
								{
									name: 'core/list-item',
									attributes: { content: 'Child' },
								},
							],
						},
					],
				},
			],
		} );

		await openMinimap( page );

		await expect(
			getMinimap( page ).locator( '.core-list li ul li' )
		).toHaveText( 'Child' );
	} );

	test( 'falls back to an empty placeholder for unsupported blocks', async ( {
		page,
		editor,
	} ) => {
		await editor.insertBlock( {
			name: 'core/code',
			attributes: { content: 'const answer = 42;' },
		} );

		await openMinimap( page );

		const placeholder = getMinimap( page ).locator( '.core-code' );
		await expect( placeholder ).toHaveCount( 1 );
		await expect( placeholder ).toBeEmpty();
	} );

	test( 'keeps minimap entries in the same order as the editor', async ( {
		page,
		editor,
	} ) => {
		await editor.insertBlock( {
			name: 'core/heading',
			attributes: { content: 'Top', level: 2 },
		} );
		await editor.insertBlock( {
			name: 'core/paragraph',
			attributes: { content: 'Middle' },
		} );
		await editor.insertBlock( { name: 'core/separator' } );

		await openMinimap( page );

		await expect( getMinimapBlocks( page ) ).toHaveCount( 3 );
		await expect(
			getMinimapBlocks( page ).nth( 0 )
		).toHaveClass( /core-heading/ );
		await expect(
			getMinimapBlocks( page ).nth( 1 )
		).toHaveClass( /core-paragraph/ );
		await expect( getMinimapBlocks( page ).nth( 2 ) ).toHaveJSProperty(
			'tagName',
			'HR'
		);
	} );
} );
