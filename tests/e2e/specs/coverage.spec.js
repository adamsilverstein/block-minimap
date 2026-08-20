/**
 * External dependencies
 */
const { test, expect } = require( '@wordpress/e2e-test-utils-playwright' );

/**
 * Internal dependencies
 */
const {
	openMinimap,
	getMinimapBlocks,
} = require( '../utils/minimap' );

/**
 * The coverage gate: every block type insertable at the top level of the
 * post editor gets a recognizable minimap entry. The list is derived at
 * runtime rather than hardcoded, so a block added to core in a later
 * release fails this test instead of silently regressing coverage.
 */
test.describe( 'Coverage', () => {
	test( 'every insertable block type renders a recognizable entry', async ( {
		admin,
		page,
	} ) => {
		test.setTimeout( 240_000 );

		await admin.createNewPost( { title: 'One of everything' } );

		const names = await page.evaluate( () => {
			const { select } = window.wp.data;

			return window.wp.blocks
				.getBlockTypes()
				.filter( ( { name } ) =>
					select( 'core/block-editor' ).canInsertBlockType( name )
				)
				.map( ( { name } ) => name )
				.sort();
		} );

		// A sanity floor: core registers far more than the six the old
		// switch statement knew about.
		expect( names.length ).toBeGreaterThan( 40 );

		// One dispatch: inserting these one by one is what makes runs slow.
		await page.evaluate( ( blockNames ) => {
			const blocks = blockNames.map( ( name ) =>
				window.wp.blocks.createBlock( name )
			);
			window.wp.data
				.dispatch( 'core/block-editor' )
				.insertBlocks( blocks );
		}, names );

		await openMinimap( page );
		await expect( getMinimapBlocks( page ) ).toHaveCount( names.length, {
			timeout: 30_000,
		} );

		const entries = await page.evaluate( () => {
			const nodes = document.querySelectorAll(
				'#minimap-container > *:not(.title)'
			);

			return [ ...nodes ].map( ( entry ) => ( {
				className: entry.className,
				hasImage:
					entry.tagName === 'IMG' || !! entry.querySelector( 'img' ),
				text: ( entry.innerText || '' ).trim(),
				ariaLabel: entry.getAttribute( 'aria-label' ) || '',
			} ) );
		} );

		// The minimap renders top level blocks in editor order, so the nth
		// entry represents the nth inserted block.
		const offenders = names.filter( ( name, i ) => {
			const entry = entries[ i ];
			const carriesClass = entry.className.includes(
				name.replace( /\//g, '-' )
			);
			const recognizable =
				entry.hasImage || entry.text !== '' || entry.ariaLabel !== '';

			return ! carriesClass || ! recognizable;
		} );

		expect( offenders ).toEqual( [] );
	} );
} );
