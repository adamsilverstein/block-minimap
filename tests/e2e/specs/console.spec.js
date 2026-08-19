/**
 * External dependencies
 */
const { test, expect } = require( '@wordpress/e2e-test-utils-playwright' );

/**
 * Internal dependencies
 */
const { openMinimap, getMinimap } = require( '../utils/minimap' );

/**
 * Collects everything the page logs, so a run can assert on it afterwards.
 *
 * @param {import('@playwright/test').Page} page Playwright page.
 * @return {{errors: string[], warnings: string[]}} Collected messages.
 */
function collectConsole( page ) {
	const errors = [];
	const warnings = [];

	page.on( 'console', ( message ) => {
		const text = message.text();
		if ( message.type() === 'error' ) {
			errors.push( text );
		}
		if ( message.type() === 'warning' ) {
			warnings.push( text );
		}
	} );
	page.on( 'pageerror', ( error ) => errors.push( error.message ) );

	return { errors, warnings };
}

test.describe( 'Console output', () => {
	test( 'logs no errors while the minimap is open', async ( {
		admin,
		editor,
		page,
	} ) => {
		const { errors } = collectConsole( page );

		await admin.createNewPost( { title: 'Quiet please' } );
		await editor.insertBlock( {
			name: 'core/heading',
			attributes: { content: 'A heading', level: 2 },
		} );
		await editor.insertBlock( {
			name: 'core/list',
			innerBlocks: [
				{ name: 'core/list-item', attributes: { content: 'An item' } },
			],
		} );

		await openMinimap( page );
		await expect( getMinimap( page ) ).toBeVisible();

		expect( errors ).toEqual( [] );
	} );

	/*
	 * The plugin reached WordPress 7.0 still calling `wp.editPost.PluginSidebar`
	 * and `wp.editPost.PluginSidebarMoreMenuItem`, deprecated since 6.6. This
	 * asserts on every deprecation rather than those two by name, so the next
	 * one surfaces on the day it lands rather than whenever someone next opens
	 * the sidebar by hand.
	 */
	test( 'triggers no deprecation notices while the minimap is open', async ( {
		admin,
		page,
	} ) => {
		const { warnings } = collectConsole( page );

		await admin.createNewPost( { title: 'No deprecations' } );
		await openMinimap( page );
		await expect( getMinimap( page ) ).toBeVisible();

		const deprecations = warnings.filter( ( text ) =>
			text.includes( 'is deprecated' )
		);

		expect( deprecations ).toEqual( [] );
	} );
} );
