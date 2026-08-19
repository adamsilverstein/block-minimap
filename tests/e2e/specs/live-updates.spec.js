/**
 * External dependencies
 */
const { test, expect } = require( '@wordpress/e2e-test-utils-playwright' );

/**
 * Internal dependencies
 */
const {
	openMinimap,
	getMinimap,
	getMinimapBlocks,
} = require( '../utils/minimap' );

test.describe( 'Live updates', () => {
	test.beforeEach( async ( { admin } ) => {
		await admin.createNewPost( { title: 'Editing' } );
	} );

	test( 'follows text typed into a paragraph', async ( { page, editor } ) => {
		await editor.insertBlock( {
			name: 'core/paragraph',
			attributes: { content: 'Before' },
		} );

		await openMinimap( page );
		await expect( getMinimap( page ).locator( '.core-paragraph' ) ).toHaveText(
			'Before'
		);

		await editor.canvas
			.getByRole( 'document', { name: /^Block: Paragraph/ } )
			.click();
		await page.keyboard.type( ' and after' );

		// The minimap redraws on a 250ms debounce.
		await expect( getMinimap( page ).locator( '.core-paragraph' ) ).toHaveText(
			'Before and after'
		);
	} );

	test( 'gains an entry when a block is added', async ( { page, editor } ) => {
		await editor.insertBlock( {
			name: 'core/paragraph',
			attributes: { content: 'Only one' },
		} );

		await openMinimap( page );
		await expect( getMinimapBlocks( page ) ).toHaveCount( 1 );

		await editor.insertBlock( {
			name: 'core/heading',
			attributes: { content: 'And a heading', level: 2 },
		} );

		await expect( getMinimapBlocks( page ) ).toHaveCount( 2 );
		await expect( getMinimap( page ).locator( 'h2.core-heading' ) ).toHaveText(
			'And a heading'
		);
	} );

	test( 'loses an entry when a block is removed', async ( {
		page,
		editor,
	} ) => {
		await editor.insertBlock( {
			name: 'core/paragraph',
			attributes: { content: 'Keep me' },
		} );
		const doomed = await editor.insertBlock( {
			name: 'core/paragraph',
			attributes: { content: 'Remove me' },
		} );

		await openMinimap( page );
		await expect( getMinimapBlocks( page ) ).toHaveCount( 2 );

		await page.evaluate( ( clientId ) => {
			window.wp.data
				.dispatch( 'core/block-editor' )
				.removeBlock( clientId );
		}, doomed.clientId );

		await expect( getMinimapBlocks( page ) ).toHaveCount( 1 );
		await expect( getMinimap( page ).locator( '.core-paragraph' ) ).toHaveText(
			'Keep me'
		);
	} );

	test( 'reorders entries when blocks are moved', async ( {
		page,
		editor,
	} ) => {
		await editor.insertBlock( {
			name: 'core/paragraph',
			attributes: { content: 'First' },
		} );
		const second = await editor.insertBlock( {
			name: 'core/paragraph',
			attributes: { content: 'Second' },
		} );

		await openMinimap( page );
		await expect( getMinimapBlocks( page ) ).toHaveText( [
			'First',
			'Second',
		] );

		await page.evaluate( ( clientId ) => {
			window.wp.data
				.dispatch( 'core/block-editor' )
				.moveBlocksUp( [ clientId ] );
		}, second.clientId );

		await expect( getMinimapBlocks( page ) ).toHaveText( [
			'Second',
			'First',
		] );
	} );

	test( 'follows a list as items are added to it', async ( {
		page,
		editor,
	} ) => {
		await editor.insertBlock( {
			name: 'core/list',
			innerBlocks: [
				{ name: 'core/list-item', attributes: { content: 'One' } },
			],
		} );

		await openMinimap( page );
		await expect( getMinimap( page ).locator( '.core-list li' ) ).toHaveText( [
			'One',
		] );

		await editor.canvas
			.getByRole( 'document', { name: /^Block: List item/ } )
			.click();
		await page.keyboard.press( 'End' );
		await page.keyboard.press( 'Enter' );
		await page.keyboard.type( 'Two' );

		await expect( getMinimap( page ).locator( '.core-list li' ) ).toHaveText( [
			'One',
			'Two',
		] );
	} );
} );
