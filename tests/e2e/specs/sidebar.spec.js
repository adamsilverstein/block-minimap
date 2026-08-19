/**
 * External dependencies
 */
const { test, expect } = require( '@wordpress/e2e-test-utils-playwright' );

/**
 * Internal dependencies
 */
const {
	openMinimap,
	closeMinimap,
	getMinimap,
	getMinimapTitle,
} = require( '../utils/minimap' );

test.describe( 'Minimap sidebar', () => {
	test.beforeEach( async ( { admin } ) => {
		await admin.createNewPost( { title: 'A post with a minimap' } );
	} );

	test( 'is offered under Panels in the editor options menu', async ( {
		page,
	} ) => {
		await page
			.getByRole( 'region', { name: 'Editor top bar' } )
			.getByRole( 'button', { name: 'Options' } )
			.click();

		const menuItem = page.getByRole( 'menuitemcheckbox', {
			name: 'Block Minimap',
		} );

		await expect( menuItem ).toBeVisible();
		// The sidebar is registered as `block-minimap` by the `block-minimap` plugin.
		await expect( menuItem ).toHaveAttribute(
			'aria-controls',
			'block-minimap:block-minimap'
		);
		await expect( menuItem ).toHaveAttribute( 'aria-checked', 'false' );
	} );

	test( 'opens from the options menu and renders the minimap', async ( {
		page,
	} ) => {
		await expect( getMinimap( page ) ).toBeHidden();

		await openMinimap( page );

		await expect( getMinimap( page ) ).toBeVisible();
	} );

	test( 'shows the post title at the top of the minimap', async ( {
		page,
	} ) => {
		await openMinimap( page );

		await expect( getMinimapTitle( page ) ).toHaveText(
			'A post with a minimap'
		);
	} );

	test( 'follows the post title as it is edited', async ( {
		page,
		editor,
	} ) => {
		await openMinimap( page );

		await editor.canvas
			.getByRole( 'textbox', { name: 'Add title' } )
			.fill( 'A renamed post' );

		await expect( getMinimapTitle( page ) ).toHaveText( 'A renamed post' );
	} );

	test( 'closes again from the options menu', async ( { page } ) => {
		await openMinimap( page );
		await closeMinimap( page );

		await expect( getMinimap( page ) ).toBeHidden();
	} );
} );
