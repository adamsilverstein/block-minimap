/**
 * External dependencies
 */
const { test, expect } = require( '@wordpress/e2e-test-utils-playwright' );

/**
 * Internal dependencies
 */
const { openMinimap, getMinimap } = require( '../utils/minimap' );

/**
 * The minimap is a fixed width sidebar column, so a nested entry has to give
 * back whatever room its wrapper's border, padding or sibling takes. Every
 * renderer that draws children shares one inner width rule; these tests hold
 * each of those wrappers to it.
 */
test.describe( 'Nested entry widths', () => {
	test.beforeEach( async ( { admin } ) => {
		await admin.createNewPost( { title: 'Layout' } );
	} );

	/**
	 * Asserts a wrapper's nested paragraph fits inside it and the minimap as
	 * a whole has nothing to scroll to horizontally.
	 *
	 * @param {import('@playwright/test').Page} page Playwright page.
	 * @param {string} wrapperClass The wrapper's block class.
	 */
	async function expectNestedEntryFits( page, wrapperClass ) {
		const minimap = getMinimap( page );
		const wrapper = minimap.locator( `.${ wrapperClass }` );
		const nested = wrapper.locator( '.core-paragraph' );

		await expect( nested ).toHaveText( 'Nested' );

		const wrapperBox = await wrapper.boundingBox();
		const nestedBox = await nested.boundingBox();

		expect( nestedBox.x + nestedBox.width ).toBeLessThanOrEqual(
			wrapperBox.x + wrapperBox.width
		);

		const overflow = await minimap.evaluate(
			( node ) => node.scrollWidth - node.clientWidth
		);
		expect( overflow ).toBeLessThanOrEqual( 0 );
	}

	test( 'a paragraph inside a quote fits the quote', async ( {
		page,
		editor,
	} ) => {
		await editor.insertBlock( {
			name: 'core/quote',
			innerBlocks: [
				{
					name: 'core/paragraph',
					attributes: { content: 'Nested' },
				},
			],
		} );

		await openMinimap( page );
		await expectNestedEntryFits( page, 'core-quote' );
	} );

	test( 'a paragraph inside a details block fits the details block', async ( {
		page,
		editor,
	} ) => {
		await editor.insertBlock( {
			name: 'core/details',
			attributes: { summary: 'More' },
			innerBlocks: [
				{
					name: 'core/paragraph',
					attributes: { content: 'Nested' },
				},
			],
		} );

		await openMinimap( page );
		await expectNestedEntryFits( page, 'core-details' );
	} );

	test( 'a paragraph beside media in media & text fits its half', async ( {
		page,
		editor,
	} ) => {
		await editor.insertBlock( {
			name: 'core/media-text',
			innerBlocks: [
				{
					name: 'core/paragraph',
					attributes: { content: 'Nested' },
				},
			],
		} );

		await openMinimap( page );
		await expectNestedEntryFits( page, 'core-media-text' );
	} );
} );
