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
	saveSpotlight,
} = require( '../utils/minimap' );
const {
	fillWithParagraphs,
	inMinimapScroller,
	getScrollTop,
	canvasParagraph,
	minimapParagraph,
} = require( '../utils/scroll' );

/**
 * The size control above the minimap.
 *
 * @param {import('@playwright/test').Page} page Playwright page.
 * @return {import('@playwright/test').Locator} Control locator.
 */
const sizeControl = ( page ) =>
	page.getByRole( 'combobox', { name: 'Minimap size' } );

/**
 * Replaces the post content with one line paragraphs, so the content weight
 * comes down to the block count.
 *
 * @param {import('@playwright/test').Page} page  Playwright page.
 * @param {number}                          count How many paragraphs.
 */
const fillWithShortParagraphs = ( page, count ) =>
	page.evaluate( ( total ) => {
		window.wp.data.dispatch( 'core/block-editor' ).resetBlocks(
			Array.from( { length: total }, ( _, index ) =>
				window.wp.blocks.createBlock( 'core/paragraph', {
					content: `Line ${ index }`,
				} )
			)
		);
	}, count );

/**
 * Saves a size preference straight to the store, as the control would.
 *
 * @param {import('@playwright/test').Page} page Playwright page.
 * @param {string}                          size A size key or `auto`.
 */
const saveSize = ( page, size ) =>
	page.evaluate(
		( value ) =>
			window.wp.data
				.dispatch( 'core/preferences' )
				.set( 'block-minimap', 'size', value ),
		size
	);

test.describe( 'Minimap size', () => {
	test.beforeEach( async ( { admin, page } ) => {
		await admin.createNewPost( { title: 'Sizes' } );
		await saveSize( page, 'auto' );
		// The spotlight draws entries in view at full size; size them alone.
		await saveSpotlight( page, false );
	} );

	test.afterEach( async ( { page } ) => {
		// The preferences follow the user, so leave them on the defaults.
		await saveSize( page, 'auto' );
		await saveSpotlight( page, true );
	} );

	test( 'defaults to Automatic', async ( { page } ) => {
		await openMinimap( page );

		await expect( sizeControl( page ) ).toHaveValue( 'auto' );
	} );

	test( 'Automatic picks a size from the block count', async ( {
		page,
	} ) => {
		await openMinimap( page );

		for ( const [ count, size ] of [
			[ 5, 'full' ],
			[ 50, 'two-thirds' ],
			[ 100, 'half' ],
		] ) {
			await fillWithShortParagraphs( page, count );
			await expect( getMinimap( page ) ).toHaveClass(
				new RegExp( `\\bis-size-${ size }\\b` )
			);
		}
	} );

	test( 'Automatic does not grow back until the count clearly drops', async ( {
		page,
	} ) => {
		await openMinimap( page );

		await fillWithShortParagraphs( page, 35 );
		await expect( getMinimap( page ) ).toHaveClass( /\bis-size-two-thirds\b/ );

		// Just under the threshold: no jump back to full size.
		await fillWithShortParagraphs( page, 25 );
		await expect( getMinimap( page ) ).toHaveClass( /\bis-size-two-thirds\b/ );

		await fillWithShortParagraphs( page, 15 );
		await expect( getMinimap( page ) ).toHaveClass( /\bis-size-full\b/ );
	} );

	test( 'Automatic weighs long text as well as blocks', async ( {
		page,
	} ) => {
		await openMinimap( page );

		// Few enough blocks for full size, if only blocks counted.
		await fillWithShortParagraphs( page, 25 );
		await expect( getMinimap( page ) ).toHaveClass( /\bis-size-full\b/ );

		await fillWithParagraphs( page, 25 );
		await expect( getMinimap( page ) ).toHaveClass( /\bis-size-two-thirds\b/ );
	} );

	test( 'a chosen size applies and is saved as a preference', async ( {
		page,
	} ) => {
		await fillWithParagraphs( page, 5 );
		await openMinimap( page );

		await sizeControl( page ).selectOption( 'half' );

		await expect( getMinimap( page ) ).toHaveClass( /\bis-size-half\b/ );
		await expect
			.poll( () =>
				page.evaluate( () =>
					window.wp.data
						.select( 'core/preferences' )
						.get( 'block-minimap', 'size' )
				)
			)
			.toBe( 'half' );
	} );

	test( 'compact sizes draw body text as bars and keep headings', async ( {
		page,
	} ) => {
		await page.evaluate( () => {
			const { createBlock } = window.wp.blocks;

			window.wp.data
				.dispatch( 'core/block-editor' )
				.resetBlocks( [
					createBlock( 'core/heading', { content: 'A heading' } ),
					createBlock( 'core/paragraph', { content: 'Some text' } ),
				] );
		} );
		await openMinimap( page );

		const colors = () =>
			getMinimap( page ).evaluate( ( container ) => ( {
				ink: getComputedStyle(
					container.querySelector( '.core-paragraph .minimap-ink' )
				).color,
				heading: getComputedStyle( container.querySelector( 'h2' ) )
					.color,
			} ) );

		await sizeControl( page ).selectOption( 'full' );
		expect( ( await colors() ).ink ).not.toBe( 'rgba(0, 0, 0, 0)' );

		await sizeControl( page ).selectOption( 'half' );
		await expect
			.poll( async () => ( await colors() ).ink )
			.toBe( 'rgba(0, 0, 0, 0)' );
		expect( ( await colors() ).heading ).not.toBe( 'rgba(0, 0, 0, 0)' );
	} );

	test( 'smaller sizes make the minimap shorter', async ( { page } ) => {
		await fillWithParagraphs( page, 60 );
		await openMinimap( page );

		const heights = {};

		for ( const size of [ 'full', 'two-thirds', 'half' ] ) {
			await sizeControl( page ).selectOption( size );
			await expect( getMinimap( page ) ).toHaveClass(
				new RegExp( `\\bis-size-${ size }\\b` )
			);
			heights[ size ] = await getMinimap( page ).evaluate(
				( container ) => container.scrollHeight
			);
		}

		expect( heights[ 'two-thirds' ] ).toBeLessThan( heights.full );
		expect( heights.half ).toBeLessThan( heights[ 'two-thirds' ] );
	} );

	for ( const size of [ 'full', 'two-thirds', 'half' ] ) {
		test( `scroll sync lines up at ${ size } size`, async ( { page } ) => {
			await fillWithParagraphs( page, 60 );
			await openMinimap( page );
			await sizeControl( page ).selectOption( size );
			await expect( getMinimap( page ) ).toHaveClass(
				new RegExp( `\\bis-size-${ size }\\b` )
			);

			await page.frame( { name: 'editor-canvas' } ).evaluate( () => {
				document
					.querySelectorAll( '.is-root-container > [data-block]' )[ 30 ]
					.scrollIntoView( { block: 'start' } );
			} );

			await expect
				.poll( () => inMinimapScroller( page, getScrollTop ) )
				.toBeGreaterThan( 0 );

			const expected = await canvasParagraph( page );

			await expect
				.poll( () => minimapParagraph( page ) )
				.toBeCloseTo( expected, 1 );
		} );
	}
} );
