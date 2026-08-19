/**
 * External dependencies
 */
const { expect } = require( '@wordpress/e2e-test-utils-playwright' );

/**
 * A same-origin image, so tests never depend on the network and the console
 * assertions are not polluted by CORS failures.
 */
const TEST_IMAGE_URL = '/wp-includes/images/w-logo-blue.png';

/**
 * Opens the minimap the way a user does: the editor options menu, under Panels.
 *
 * Every spec goes through the real entry point rather than dispatching to the
 * store, so a broken menu item fails the suite instead of hiding behind it.
 *
 * @param {import('@playwright/test').Page} page Playwright page.
 */
async function openMinimap( page ) {
	await page
		.getByRole( 'region', { name: 'Editor top bar' } )
		.getByRole( 'button', { name: 'Options' } )
		.click();
	await page.getByRole( 'menuitemcheckbox', { name: 'Block Minimap' } ).click();

	await expect( getMinimap( page ) ).toBeVisible();
}

/**
 * Closes the minimap from the same options menu entry.
 *
 * @param {import('@playwright/test').Page} page Playwright page.
 */
async function closeMinimap( page ) {
	await page
		.getByRole( 'region', { name: 'Editor top bar' } )
		.getByRole( 'button', { name: 'Options' } )
		.click();
	await page.getByRole( 'menuitemcheckbox', { name: 'Block Minimap' } ).click();

	await expect( getMinimap( page ) ).toBeHidden();
}

/**
 * The minimap container itself.
 *
 * @param {import('@playwright/test').Page} page Playwright page.
 * @return {import('@playwright/test').Locator} Container locator.
 */
function getMinimap( page ) {
	return page.locator( '#minimap-container' );
}

/**
 * The minimap's block representations, in order, excluding the post title.
 *
 * @param {import('@playwright/test').Page} page Playwright page.
 * @return {import('@playwright/test').Locator} Locator matching each entry.
 */
function getMinimapBlocks( page ) {
	return getMinimap( page ).locator( '> *:not(.title)' );
}

/**
 * The minimap's post title entry.
 *
 * @param {import('@playwright/test').Page} page Playwright page.
 * @return {import('@playwright/test').Locator} Title locator.
 */
function getMinimapTitle( page ) {
	return getMinimap( page ).locator( '.minimap-block.title' );
}

module.exports = {
	TEST_IMAGE_URL,
	openMinimap,
	closeMinimap,
	getMinimap,
	getMinimapBlocks,
	getMinimapTitle,
};
