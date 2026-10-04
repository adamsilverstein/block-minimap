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

	test( 'keeps one height while scrolling, over the content in view', async ( {
		page,
	} ) => {
		await fillWithParagraphs( page, 40 );
		await openMinimap( page );
		await expect( getSpotlight( page ) ).toBeVisible();

		const heights = new Set();

		for ( const index of [ 5, 15, 25, 35 ] ) {
			await page.frame( { name: 'editor-canvas' } ).evaluate( ( i ) => {
				document
					.querySelectorAll( '.is-root-container > [data-block]' )[ i ]
					.scrollIntoView( { block: 'center' } );
			}, index );

			// The paragraph in the middle of the canvas sits in the frame.
			await expect
				.poll( () =>
					page.evaluate( ( i ) => {
						const frame = document
							.querySelector( '.minimap-spotlight' )
							.getBoundingClientRect();
						const entry = document
							.querySelectorAll(
								'#minimap-container > .core-paragraph'
							)
							[ i ].getBoundingClientRect();

						return (
							entry.bottom > frame.top && entry.top < frame.bottom
						);
					}, index )
				)
				.toBe( true );

			heights.add(
				Math.round( ( await getSpotlight( page ).boundingBox() ).height )
			);
		}

		expect( heights.size ).toBe( 1 );
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

		await expect( getSpotlight( page ) ).not.toHaveClass( /is-dragging/ );
		await expect( getSpotlight( page ) ).toBeInViewport();
	} );
} );
