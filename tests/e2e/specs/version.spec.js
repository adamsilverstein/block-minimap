/**
 * External dependencies
 */
const fs = require( 'fs' );
const path = require( 'path' );
const { test, expect } = require( '@wordpress/e2e-test-utils-playwright' );

const pluginRoot = path.join( __dirname, '..', '..', '..' );

/**
 * Reads one value out of a file.
 *
 * @param {string} file    File name, relative to the plugin root.
 * @param {RegExp} pattern Pattern whose first group is the value.
 * @return {string} The matched value.
 */
function readValue( file, pattern ) {
	const match = fs
		.readFileSync( path.join( pluginRoot, file ), 'utf8' )
		.match( pattern );

	expect( match ).not.toBeNull();

	return match[ 1 ];
}

/**
 * The plugin's version is the cache key for the editor bundle, so a release
 * that ships a rebuilt bundle under a version a browser already holds serves
 * the old code until someone hard refreshes.
 */
test.describe( 'Version', () => {
	test( 'the editor is served the bundle at the plugin version', async ( {
		admin,
		page,
	} ) => {
		const version = readValue(
			'block-minimap.php',
			/^\s*\*\s*Version:\s*(\S+)\s*$/m
		);

		await admin.createNewPost( { title: 'Version' } );

		const served = await page.evaluate( () => {
			const script = document.querySelector(
				'script[src*="block-minimap/dist/minimap.js"]'
			);

			return script && new URL( script.src ).searchParams.get( 'ver' );
		} );

		expect( served ).toBe( version );
	} );

	test( 'the version the plugin ships under is declared once', () => {
		const version = readValue(
			'block-minimap.php',
			/^\s*\*\s*Version:\s*(\S+)\s*$/m
		);

		expect(
			readValue( 'readme.txt', /^Stable tag:\s*(\S+)\s*$/m )
		).toBe( version );
		expect(
			readValue( 'package.json', /"version":\s*"([^"]+)"/ )
		).toBe( version );
	} );
} );
