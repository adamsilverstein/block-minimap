/**
 * External dependencies
 */
const { test, expect } = require( '@wordpress/e2e-test-utils-playwright' );

/**
 * Internal dependencies
 */
const { openMinimap, getMinimap, getMinimapBlocks } = require( '../utils/minimap' );

/**
 * The subscription fires on every store change, so the minimap bails out
 * when the block tree and title are unchanged, and per-entry memoization
 * keeps an edit from re-rendering unrelated subtrees. The component counts
 * its committed renders on `window.__blockMinimapRenders` for these tests.
 */
test.describe( 'Rendering performance', () => {
	test.beforeEach( async ( { admin } ) => {
		await admin.createNewPost( { title: 'A long post' } );
	} );

	test( 'a single edit produces one redraw within the debounce window', async ( {
		page,
	} ) => {
		// One dispatch, so a hundred insertions do not mean a hundred redraws.
		await page.evaluate( () => {
			const blocks = Array.from( { length: 100 }, ( _, i ) =>
				window.wp.blocks.createBlock( 'core/paragraph', {
					content: `Paragraph ${ i }`,
				} )
			);
			window.wp.data
				.dispatch( 'core/block-editor' )
				.insertBlocks( blocks );
		} );

		await openMinimap( page );
		await expect( getMinimapBlocks( page ) ).toHaveCount( 100 );

		// Let the insertion's debounced update settle before counting.
		await page.waitForTimeout( 400 );
		const before = await page.evaluate(
			() => window.__blockMinimapRenders
		);

		await page.evaluate( () => {
			const { clientId } = window.wp.data
				.select( 'core/block-editor' )
				.getBlocks()[ 41 ];
			window.wp.data
				.dispatch( 'core/block-editor' )
				.updateBlockAttributes( clientId, {
					content: 'Paragraph 41, edited',
				} );
		} );

		// The minimap catches up within the debounce window.
		await expect(
			getMinimap( page ).getByText( 'Paragraph 41, edited' )
		).toBeVisible( { timeout: 2000 } );

		const after = await page.evaluate(
			() => window.__blockMinimapRenders
		);
		expect( after - before ).toBe( 1 );
	} );

	test( 'store churn that leaves the tree unchanged produces no redraw', async ( {
		page,
		editor,
	} ) => {
		await editor.insertBlock( {
			name: 'core/paragraph',
			attributes: { content: 'Steady' },
		} );

		await openMinimap( page );
		await expect( getMinimapBlocks( page ) ).toHaveCount( 1 );
		await page.waitForTimeout( 400 );

		const before = await page.evaluate(
			() => window.__blockMinimapRenders
		);

		// Selection changes hit the subscription but not the block tree.
		await page.evaluate( () => {
			const { clientId } = window.wp.data
				.select( 'core/block-editor' )
				.getBlocks()[ 0 ];
			window.wp.data
				.dispatch( 'core/block-editor' )
				.selectBlock( clientId );
			window.wp.data
				.dispatch( 'core/block-editor' )
				.clearSelectedBlock();
		} );

		// Past the debounce window, so a redraw would have happened by now.
		await page.waitForTimeout( 600 );

		const after = await page.evaluate(
			() => window.__blockMinimapRenders
		);
		expect( after ).toBe( before );
	} );
} );
