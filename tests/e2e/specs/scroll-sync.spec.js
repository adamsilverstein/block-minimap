/**
 * External dependencies
 */
const { test, expect } = require( '@wordpress/e2e-test-utils-playwright' );

/**
 * Internal dependencies
 */
const { openMinimap, getMinimap } = require( '../utils/minimap' );
const {
	fillWithParagraphs,
	inMinimapScroller,
	getScrollTop,
	canvasParagraph,
	minimapParagraph,
} = require( '../utils/scroll' );

const PARAGRAPH_COUNT = 60;

test.describe( 'Scroll sync', () => {
	test.beforeEach( async ( { admin, editor, page } ) => {
		await admin.createNewPost( { title: 'A long post' } );
		await editor.insertBlock( { name: 'core/paragraph' } );
		await fillWithParagraphs( page, PARAGRAPH_COUNT );

		await openMinimap( page );
		await expect(
			getMinimap( page ).locator( ':scope > .core-paragraph' )
		).toHaveCount( PARAGRAPH_COUNT );
	} );

	test( 'tags each top level entry with its block', async ( {
		page,
		editor,
	} ) => {
		const clientIds = await page.evaluate( () =>
			window.wp.data.select( 'core/block-editor' ).getBlockOrder()
		);
		const entryIds = await getMinimap( page )
			.locator( ':scope > .core-paragraph' )
			.evaluateAll( ( entries ) =>
				entries.map( ( entry ) =>
					entry.getAttribute( 'data-minimap-block' )
				)
			);

		expect( entryIds ).toEqual( clientIds );
		await expect(
			editor.canvas.locator( `[data-block="${ clientIds[ 0 ] }"]` )
		).toBeVisible();
	} );

	test( 'scrolling the canvas scrolls the minimap to the same block', async ( {
		page,
	} ) => {
		await page.frame( { name: 'editor-canvas' } ).evaluate( () => {
			document
				.querySelectorAll( '.is-root-container > [data-block]' )[ 30 ]
				.scrollIntoView( { block: 'start' } );
		} );

		await expect
			.poll( () => inMinimapScroller( page, getScrollTop ) )
			.toBeGreaterThan( 0 );

		// The same spot in the same paragraph sits under both reference lines.
		const expected = await canvasParagraph( page );

		await expect
			.poll( () => minimapParagraph( page ) )
			.toBeCloseTo( expected, 1 );
	} );

	test( 'scrolling the minimap scrolls the canvas to the same block', async ( {
		page,
	} ) => {
		await inMinimapScroller( page, ( scroller, { container } ) =>
			container
				.querySelectorAll( ':scope > .core-paragraph' )[ 30 ]
				.scrollIntoView( { block: 'start' } )
		);

		await expect
			.poll( () =>
				page
					.frame( { name: 'editor-canvas' } )
					.evaluate( () => document.scrollingElement.scrollTop )
			)
			.toBeGreaterThan( 0 );

		const expected = await minimapParagraph( page );

		await expect
			.poll( () => canvasParagraph( page ) )
			.toBeCloseTo( expected, 1 );
	} );

	test( 'both views reach the bottom together', async ( { page } ) => {
		await page.frame( { name: 'editor-canvas' } ).evaluate( () => {
			window.scrollTo( 0, document.scrollingElement.scrollHeight );
		} );

		await expect
			.poll( () =>
				inMinimapScroller(
					page,
					( scroller ) =>
						scroller.scrollHeight -
						scroller.clientHeight -
						scroller.scrollTop
				)
			)
			.toBeLessThan( 2 );
	} );

	test( 'a scroll in one view does not bounce back from the other', async ( {
		page,
	} ) => {
		const canvas = page.frame( { name: 'editor-canvas' } );
		const target = await canvas.evaluate( () => {
			const block = document.querySelectorAll(
				'.is-root-container > [data-block]'
			)[ 20 ];
			block.scrollIntoView( { block: 'start' } );

			return document.scrollingElement.scrollTop;
		} );

		await expect
			.poll( () => inMinimapScroller( page, getScrollTop ) )
			.toBeGreaterThan( 0 );

		// Give any echo a few frames to land, then check nothing moved.
		await page.evaluate(
			() =>
				new Promise( ( resolve ) =>
					requestAnimationFrame( () =>
						requestAnimationFrame( () =>
							requestAnimationFrame( resolve )
						)
					)
				)
		);

		expect(
			await canvas.evaluate( () => document.scrollingElement.scrollTop )
		).toBe( target );
	} );

	test( 'a mouse wheel over the minimap scrolls the canvas', async ( {
		page,
	} ) => {
		const box = await getMinimap( page ).boundingBox();

		await page.mouse.move( box.x + box.width / 2, box.y + 200 );
		await page.mouse.wheel( 0, 600 );

		await expect
			.poll( () =>
				page
					.frame( { name: 'editor-canvas' } )
					.evaluate( () => document.scrollingElement.scrollTop )
			)
			.toBeGreaterThan( 0 );
	} );
} );
