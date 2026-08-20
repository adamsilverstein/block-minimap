/**
 * External dependencies
 */
const { test, expect } = require( '@wordpress/e2e-test-utils-playwright' );

/**
 * Internal dependencies
 */
const { openMinimap, getMinimap } = require( '../utils/minimap' );

/**
 * Raw markup blocks hold arbitrary author supplied markup, so the minimap
 * must show them as escaped source rather than parse them: nothing in the
 * minimap may execute script or fire a network request the canvas didn't
 * already fire.
 */
test.describe( 'Raw markup safety', () => {
	test.beforeEach( async ( { admin } ) => {
		await admin.createNewPost( { title: 'Hostile markup' } );
	} );

	test( 'shows a custom HTML block as escaped source', async ( {
		page,
		editor,
	} ) => {
		const sentinel = '/sentinel-should-never-load.png';
		const sentinelRequests = [];
		/*
		 * The canvas previews the HTML block in a sandboxed iframe, which
		 * fetches the image itself — that request is the canvas's business.
		 * The minimap lives in the top frame, so any top frame request for
		 * the sentinel could only come from it.
		 */
		page.on( 'request', ( request ) => {
			if (
				request.url().includes( sentinel ) &&
				request.frame() === page.mainFrame()
			) {
				sentinelRequests.push( request.url() );
			}
		} );

		await editor.insertBlock( {
			name: 'core/html',
			attributes: {
				content: `<script>window.__minimapExecuted = true;</script><img src="${ sentinel }" onerror="window.__minimapOnError = true;">`,
			},
		} );

		await openMinimap( page );

		// The source reads as text, script tag included.
		const entry = getMinimap( page ).locator( '.core-html' );
		await expect( entry ).toContainText( '<script>' );
		await expect( entry ).toContainText( 'onerror' );

		// Nothing was parsed into a live element.
		await expect( entry.locator( 'img' ) ).toHaveCount( 0 );
		await expect( entry.locator( 'script' ) ).toHaveCount( 0 );

		// Nothing executed and nothing was requested.
		await expect
			.poll( () =>
				page.evaluate( () => ( {
					executed: window.__minimapExecuted,
					onError: window.__minimapOnError,
				} ) )
			)
			.toEqual( { executed: undefined, onError: undefined } );
		expect( sentinelRequests ).toEqual( [] );
	} );

	test( 'shows a shortcode block as escaped source', async ( {
		page,
		editor,
	} ) => {
		await editor.insertBlock( {
			name: 'core/shortcode',
			attributes: { text: '[gallery ids="1,2,3"]<em>not markup</em>' },
		} );

		await openMinimap( page );

		const entry = getMinimap( page ).locator( '.core-shortcode' );
		await expect( entry ).toContainText( '[gallery ids="1,2,3"]' );
		// The tag is text, not an element.
		await expect( entry ).toContainText( '<em>' );
		await expect( entry.locator( 'em' ) ).toHaveCount( 0 );
	} );

	test( 'shows a classic block as escaped source', async ( {
		page,
		editor,
	} ) => {
		const sentinel = '/freeform-sentinel-should-never-load.png';
		const sentinelRequests = [];
		page.on( 'request', ( request ) => {
			if (
				request.url().includes( sentinel ) &&
				request.frame() === page.mainFrame()
			) {
				sentinelRequests.push( request.url() );
			}
		} );

		await editor.insertBlock( {
			name: 'core/freeform',
			attributes: {
				content: `<script>window.__minimapFreeformExecuted = true;</script><img src="${ sentinel }" onerror="window.__minimapFreeformOnError = true;">`,
			},
		} );

		await openMinimap( page );

		// The source reads as text, script tag included.
		const entry = getMinimap( page ).locator( '.core-freeform' );
		await expect( entry ).toContainText( '<script>' );
		await expect( entry ).toContainText( 'onerror' );

		// Nothing was parsed into a live element.
		await expect( entry.locator( 'img' ) ).toHaveCount( 0 );
		await expect( entry.locator( 'script' ) ).toHaveCount( 0 );

		// Nothing executed and nothing was requested from the top frame.
		await expect
			.poll( () =>
				page.evaluate( () => ( {
					executed: window.__minimapFreeformExecuted,
					onError: window.__minimapFreeformOnError,
				} ) )
			)
			.toEqual( { executed: undefined, onError: undefined } );
		expect( sentinelRequests ).toEqual( [] );
	} );
} );
