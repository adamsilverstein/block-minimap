/**
 * External dependencies
 */
const { test, expect } = require( '@wordpress/e2e-test-utils-playwright' );

/**
 * Internal dependencies
 */
const { openMinimap, getMinimap } = require( '../utils/minimap' );

const PARAGRAPH_COUNT = 60;

/*
 * Long enough to wrap over several lines in the canvas, so the canvas and
 * the minimap are very different heights and a percentage sync would drift.
 */
const paragraphText = ( index ) =>
	`Paragraph ${ index }. ` +
	'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. '.repeat(
		4
	);

/**
 * Runs a function against the sidebar element that scrolls the minimap.
 *
 * @param {import('@playwright/test').Page} page Playwright page.
 * @param {Function} callback Receives the scroller, the minimap container and `arg`.
 * @param {*}        arg      Argument passed through to the callback.
 * @return {Promise<*>} Whatever the callback returns.
 */
async function inMinimapScroller( page, callback, arg ) {
	const scroller = await getMinimap( page ).evaluateHandle( ( container ) => {
		let node = container.parentElement;

		while (
			node &&
			! /^(auto|scroll|overlay)$/.test( getComputedStyle( node ).overflowY )
		) {
			node = node.parentElement;
		}

		return node;
	} );
	const container = await getMinimap( page ).elementHandle();

	return scroller.evaluate( callback, { container, arg } );
}

const getScrollTop = ( scroller ) => scroller.scrollTop;

/**
 * Which paragraph sits under a view's reference line, and how far through it.
 *
 * The sync lines the views up on a reference line that slides from the top
 * of the viewport to the bottom as the view scrolls from top to bottom, so
 * the same content sits under it in both views. Evaluated in the canvas
 * frame for 'canvas' and in the page for 'minimap'.
 *
 * @param {string} view 'canvas' or 'minimap'.
 * @return {number} Paragraph index plus the fraction through it.
 */
function paragraphUnderReference( view ) {
	let scroller;
	let viewportTop = 0;
	let entries;

	if ( view === 'canvas' ) {
		scroller = document.scrollingElement;
		entries = document.querySelectorAll(
			'.is-root-container > [data-block]'
		);
	} else {
		const container = document.getElementById( 'minimap-container' );

		scroller = container.parentElement;
		while (
			! /^(auto|scroll|overlay)$/.test(
				getComputedStyle( scroller ).overflowY
			)
		) {
			scroller = scroller.parentElement;
		}
		viewportTop = scroller.getBoundingClientRect().top;
		entries = container.querySelectorAll( ':scope > .core-paragraph' );
	}

	const max = scroller.scrollHeight - scroller.clientHeight;
	const line =
		viewportTop + ( scroller.clientHeight * scroller.scrollTop ) / max;

	for ( let index = 0; index < entries.length; index++ ) {
		const top = entries[ index ].getBoundingClientRect().top;
		const next = entries[ index + 1 ]
			? entries[ index + 1 ].getBoundingClientRect().top
			: entries[ index ].getBoundingClientRect().bottom;

		if ( line < next ) {
			return index + Math.max( 0, line - top ) / ( next - top );
		}
	}

	return entries.length;
}

const canvasParagraph = ( page ) =>
	page
		.frame( { name: 'editor-canvas' } )
		.evaluate( paragraphUnderReference, 'canvas' );

const minimapParagraph = ( page ) =>
	page.evaluate( paragraphUnderReference, 'minimap' );

test.describe( 'Scroll sync', () => {
	test.beforeEach( async ( { admin, editor, page } ) => {
		await admin.createNewPost( { title: 'A long post' } );
		await editor.insertBlock( { name: 'core/paragraph' } );
		await page.evaluate(
			( blocks ) => {
				window.wp.data
					.dispatch( 'core/block-editor' )
					.resetBlocks(
						blocks.map( ( content ) =>
							window.wp.blocks.createBlock( 'core/paragraph', {
								content,
							} )
						)
					);
			},
			Array.from( { length: PARAGRAPH_COUNT }, ( _, index ) =>
				paragraphText( index )
			)
		);

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
