/**
 * External dependencies
 */
const { test, expect } = require( '@wordpress/e2e-test-utils-playwright' );

/**
 * Internal dependencies
 */
const { openMinimap, getMinimap } = require( '../utils/minimap' );

/**
 * Blocks with `innerBlocks` render their children, so the minimap mirrors
 * the real document tree — container blocks are exactly the ones that hold
 * most of the page.
 */
test.describe( 'Nested blocks', () => {
	test.beforeEach( async ( { admin } ) => {
		await admin.createNewPost( { title: 'Nesting' } );
	} );

	test( 'renders blocks inside containers, nested in the DOM', async ( {
		page,
		editor,
	} ) => {
		await editor.insertBlock( {
			name: 'core/group',
			innerBlocks: [
				{
					name: 'core/columns',
					innerBlocks: [
						{
							name: 'core/column',
							innerBlocks: [
								{
									name: 'core/paragraph',
									attributes: { content: 'Deep down' },
								},
							],
						},
					],
				},
			],
		} );

		await openMinimap( page );

		// The nesting is reflected in the DOM structure, not flattened.
		await expect(
			getMinimap( page ).locator(
				'.core-group .core-columns .core-column .core-paragraph'
			)
		).toHaveText( 'Deep down' );
	} );

	test( 'lays columns out side by side rather than stacked', async ( {
		page,
		editor,
	} ) => {
		await editor.insertBlock( {
			name: 'core/columns',
			innerBlocks: [
				{
					name: 'core/column',
					innerBlocks: [
						{
							name: 'core/paragraph',
							attributes: { content: 'Left' },
						},
					],
				},
				{
					name: 'core/column',
					innerBlocks: [
						{
							name: 'core/paragraph',
							attributes: { content: 'Right' },
						},
					],
				},
			],
		} );

		await openMinimap( page );

		const columns = getMinimap( page ).locator( '.core-column' );
		await expect( columns ).toHaveCount( 2 );

		const left = await columns.nth( 0 ).boundingBox();
		const right = await columns.nth( 1 ).boundingBox();
		// Same row, different horizontal positions.
		expect( left.y ).toBeCloseTo( right.y, 0 );
		expect( right.x ).toBeGreaterThan( left.x + left.width - 1 );
	} );

	test( 'shows a truncation indicator past the depth cap instead of recursing', async ( {
		page,
		editor,
	} ) => {
		// Five nested groups put the paragraph past the depth cap of four.
		let block = {
			name: 'core/paragraph',
			attributes: { content: 'Too deep to draw' },
		};
		for ( let i = 0; i < 5; i++ ) {
			block = { name: 'core/group', innerBlocks: [ block ] };
		}
		await editor.insertBlock( block );

		await openMinimap( page );

		await expect(
			getMinimap( page ).locator( '.minimap-truncated' )
		).toContainText( 'deeper blocks not shown' );
		await expect(
			getMinimap( page ).locator( '.core-paragraph' )
		).toHaveCount( 0 );
	} );

	test( 'falls back to the title chip for an empty container', async ( {
		page,
		editor,
	} ) => {
		await editor.insertBlock( { name: 'core/group' } );

		await openMinimap( page );

		const chip = getMinimap( page ).locator( '.core-group' );
		await expect( chip ).toHaveClass( /minimap-chip/ );
		await expect( chip ).toHaveText( 'Group' );
	} );
} );
