/**
 * External dependencies
 */
const { test, expect } = require( '@wordpress/e2e-test-utils-playwright' );

/**
 * Internal dependencies
 */
const { openMinimap, getMinimap } = require( '../utils/minimap' );
const { fillWithParagraphs } = require( '../utils/scroll' );

/**
 * The spotlight frame over the minimap.
 *
 * @param {import('@playwright/test').Page} page Playwright page.
 * @return {import('@playwright/test').Locator} Spotlight locator.
 */
const getSpotlight = ( page ) => page.locator( '.minimap-spotlight' );

/**
 * The spotlight toggle above the minimap.
 *
 * @param {import('@playwright/test').Page} page Playwright page.
 * @return {import('@playwright/test').Locator} Toggle locator.
 */
const spotlightToggle = ( page ) =>
	page.getByRole( 'checkbox', { name: 'Highlight visible area' } );

/**
 * Saves the spotlight preference straight to the store.
 *
 * @param {import('@playwright/test').Page} page    Playwright page.
 * @param {?boolean}                        enabled Value to save.
 */
const saveSpotlight = ( page, enabled ) =>
	page.evaluate(
		( value ) =>
			window.wp.data
				.dispatch( 'core/preferences' )
				.set( 'block-minimap', 'spotlight', value ),
		enabled
	);

const saveSize = ( page, size ) =>
	page.evaluate(
		( value ) =>
			window.wp.data
				.dispatch( 'core/preferences' )
				.set( 'block-minimap', 'size', value ),
		size
	);

const canvasScrollTop = ( page ) =>
	page
		.frame( { name: 'editor-canvas' } )
		.evaluate( () => document.scrollingElement.scrollTop );

/**
 * Which paragraph sits at a view's top edge, and how far through it.
 *
 * For the canvas that is the viewport's top edge; for the minimap it is the
 * spotlight's top edge. Evaluated in the canvas frame for 'canvas' and in
 * the page for 'minimap'.
 *
 * @param {string} view 'canvas' or 'minimap'.
 * @return {number} Paragraph index plus the fraction through it.
 */
function paragraphAtTop( view ) {
	let line;
	let entries;

	if ( view === 'canvas' ) {
		line = 0;
		entries = document.querySelectorAll(
			'.is-root-container > [data-block]'
		);
	} else {
		line = document
			.querySelector( '.minimap-spotlight' )
			.getBoundingClientRect().top;
		entries = document.querySelectorAll(
			'#minimap-container > .core-paragraph'
		);
	}

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

test.describe( 'Viewport spotlight', () => {
	test.beforeEach( async ( { admin, page } ) => {
		await admin.createNewPost( { title: 'Spotlight' } );
		await saveSpotlight( page, true );
	} );

	test.afterEach( async ( { page } ) => {
		// The preferences follow the user, so leave them on the defaults.
		await saveSpotlight( page, true );
		await saveSize( page, 'auto' );
	} );

	test( 'is on by default', async ( { page } ) => {
		await saveSpotlight( page, undefined );
		await fillWithParagraphs( page, 40 );
		await openMinimap( page );

		await expect( spotlightToggle( page ) ).toBeChecked();
		await expect( getSpotlight( page ) ).toBeVisible();
		await expect( getSpotlight( page ) ).toHaveAttribute(
			'aria-hidden',
			'true'
		);
	} );

	test( 'frames the content visible in the canvas', async ( { page } ) => {
		await fillWithParagraphs( page, 40 );
		await openMinimap( page );

		await page.frame( { name: 'editor-canvas' } ).evaluate( () => {
			document
				.querySelectorAll( '.is-root-container > [data-block]' )[ 20 ]
				.scrollIntoView( { block: 'start' } );
		} );

		const expected = await page
			.frame( { name: 'editor-canvas' } )
			.evaluate( paragraphAtTop, 'canvas' );

		await expect
			.poll( () => page.evaluate( paragraphAtTop, 'minimap' ) )
			.toBeCloseTo( expected, 1 );
	} );

	test( 'draws the entries in view at full size in compact sizes', async ( {
		page,
	} ) => {
		await fillWithParagraphs( page, 60 );
		await saveSize( page, 'half' );
		await openMinimap( page );

		await page.frame( { name: 'editor-canvas' } ).evaluate( () => {
			document
				.querySelectorAll( '.is-root-container > [data-block]' )[ 30 ]
				.scrollIntoView( { block: 'start' } );
		} );

		const inkColor = ( index ) =>
			getMinimap( page ).evaluate(
				( container, entry ) =>
					getComputedStyle(
						container.querySelectorAll(
							':scope > .core-paragraph'
						)[ entry ].querySelector( '.minimap-ink' )
					).color,
				index
			);

		// The paragraph at the top of the canvas reads as text, far ones as bars.
		await expect.poll( () => inkColor( 30 ) ).not.toBe( 'rgba(0, 0, 0, 0)' );
		expect( await inkColor( 5 ) ).toBe( 'rgba(0, 0, 0, 0)' );
		expect( await inkColor( 55 ) ).toBe( 'rgba(0, 0, 0, 0)' );
	} );

	test( 'is hidden when the whole post fits in the canvas', async ( {
		page,
	} ) => {
		await fillWithParagraphs( page, 1 );
		await openMinimap( page );

		await expect( getMinimap( page ) ).toBeVisible();
		await expect( getSpotlight( page ) ).toBeHidden();
	} );

	test( 'turns off from the toggle and saves the choice', async ( {
		page,
	} ) => {
		await fillWithParagraphs( page, 40 );
		await openMinimap( page );
		await expect( getSpotlight( page ) ).toBeVisible();

		await spotlightToggle( page ).uncheck();

		await expect( getSpotlight( page ) ).toHaveCount( 0 );
		await expect
			.poll( () =>
				page.evaluate( () =>
					window.wp.data
						.select( 'core/preferences' )
						.get( 'block-minimap', 'spotlight' )
				)
			)
			.toBe( false );
	} );

	test( 'dragging the frame scrolls the canvas', async ( { page } ) => {
		await fillWithParagraphs( page, 40 );
		await openMinimap( page );

		const box = await getSpotlight( page ).boundingBox();
		const x = box.x + box.width / 2;
		const y = box.y + 5;

		await page.mouse.move( x, y );
		await page.mouse.down();
		await page.mouse.move( x, y + 40, { steps: 8 } );

		// The frame stays under the pointer while the canvas follows it.
		await expect
			.poll( async () => ( await getSpotlight( page ).boundingBox() ).y )
			.toBeCloseTo( box.y + 40, -1 );
		expect( await canvasScrollTop( page ) ).toBeGreaterThan( 0 );

		await page.mouse.up();

		// Once let go, the minimap lines back up with the canvas.
		const expected = await page
			.frame( { name: 'editor-canvas' } )
			.evaluate( paragraphAtTop, 'canvas' );

		await expect
			.poll( () => page.evaluate( paragraphAtTop, 'minimap' ) )
			.toBeCloseTo( expected, 1 );
	} );
} );
