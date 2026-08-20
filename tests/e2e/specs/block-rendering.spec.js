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

		const image = getMinimap( page ).locator( 'img.core-image' );
		await expect( image ).toHaveAttribute( 'src', TEST_IMAGE_URL );
		await expect( image ).toHaveAttribute( 'alt', 'A logo' );
	} );

	test( 'labels an image with no URL instead of rendering a broken img', async ( {
		page,
		editor,
	} ) => {
		await editor.insertBlock( { name: 'core/image' } );

		await openMinimap( page );

		await expect( getMinimap( page ).locator( '.core-image' ) ).toHaveText(
			'Image'
		);
		await expect( getMinimap( page ).locator( 'img' ) ).toHaveCount( 0 );
	} );

	test( 'labels a cover with no URL instead of rendering a broken img', async ( {
		page,
		editor,
	} ) => {
		await editor.insertBlock( { name: 'core/cover' } );

		await openMinimap( page );

		await expect( getMinimap( page ).locator( '.core-cover' ) ).toHaveText(
			'Cover'
		);
		await expect( getMinimap( page ).locator( 'img' ) ).toHaveCount( 0 );
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

	test( 'renders code content rather than an empty box', async ( {
		page,
		editor,
	} ) => {
		await editor.insertBlock( {
			name: 'core/code',
			attributes: { content: 'const answer = 42;' },
		} );

		await openMinimap( page );

		await expect( getMinimap( page ).locator( '.core-code' ) ).toHaveText(
			'const answer = 42;'
		);
	} );

	test( 'renders a quote with its content and citation', async ( {
		page,
		editor,
	} ) => {
		await editor.insertBlock( {
			name: 'core/quote',
			attributes: { citation: 'Someone wise' },
			innerBlocks: [
				{
					name: 'core/paragraph',
					attributes: { content: 'Quoted words' },
				},
			],
		} );

		await openMinimap( page );

		const quote = getMinimap( page ).locator( 'blockquote.core-quote' );
		await expect( quote ).toContainText( 'Quoted words' );
		await expect( quote.locator( 'cite' ) ).toHaveText( 'Someone wise' );
	} );

	test( 'renders a pullquote with its content and citation', async ( {
		page,
		editor,
	} ) => {
		await editor.insertBlock( {
			name: 'core/pullquote',
			attributes: { value: 'Pulled out', citation: 'A source' },
		} );

		await openMinimap( page );

		const pullquote = getMinimap( page ).locator(
			'blockquote.core-pullquote'
		);
		await expect( pullquote ).toContainText( 'Pulled out' );
		await expect( pullquote.locator( 'cite' ) ).toHaveText( 'A source' );
	} );

	test( 'renders verse and preformatted blocks as preformatted text', async ( {
		page,
		editor,
	} ) => {
		await editor.insertBlock( {
			name: 'core/verse',
			attributes: { content: 'Roses are red' },
		} );
		await editor.insertBlock( {
			name: 'core/preformatted',
			attributes: { content: 'exactly  as  typed' },
		} );

		await openMinimap( page );

		await expect(
			getMinimap( page ).locator( 'pre.core-verse' )
		).toHaveText( 'Roses are red' );
		await expect(
			getMinimap( page ).locator( 'pre.core-preformatted' )
		).toHaveText( 'exactly  as  typed' );
	} );

	test( 'renders a table with its rows and header cells', async ( {
		page,
		editor,
	} ) => {
		await editor.insertBlock( {
			name: 'core/table',
			attributes: {
				head: [
					{
						cells: [
							{ content: 'Name', tag: 'th' },
							{ content: 'Amount', tag: 'th' },
						],
					},
				],
				body: [
					{
						cells: [
							{ content: 'Flour', tag: 'td' },
							{ content: '500g', tag: 'td' },
						],
					},
					{
						cells: [
							{ content: 'Water', tag: 'td' },
							{ content: '350ml', tag: 'td' },
						],
					},
				],
			},
		} );

		await openMinimap( page );

		const table = getMinimap( page ).locator( '.core-table table' );
		await expect( table.locator( 'th' ) ).toHaveText( [
			'Name',
			'Amount',
		] );
		await expect( table.locator( 'tbody tr' ) ).toHaveCount( 2 );
		await expect( table.locator( 'td' ).nth( 2 ) ).toHaveText( 'Water' );
	} );

	test( 'renders a details block with its summary and children', async ( {
		page,
		editor,
	} ) => {
		await editor.insertBlock( {
			name: 'core/details',
			attributes: { summary: 'The fine print' },
			innerBlocks: [
				{
					name: 'core/paragraph',
					attributes: { content: 'Hidden by default' },
				},
			],
		} );

		await openMinimap( page );

		const details = getMinimap( page ).locator( '.core-details' );
		await expect(
			details.locator( '.minimap-details-summary' )
		).toHaveText( 'The fine print' );
		await expect( details.locator( '.core-paragraph' ) ).toHaveText(
			'Hidden by default'
		);
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
