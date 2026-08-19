/**
 * External dependencies
 */
const fs = require( 'fs' );
const path = require( 'path' );
const { test, expect } = require( '@wordpress/e2e-test-utils-playwright' );

const pluginRoot = path.join( __dirname, '..', '..', '..' );

/**
 * The text domain the plugin header declares. Everything else has to agree
 * with it: a string translated against any other domain can never be
 * translated, however the translation files are built.
 *
 * @return {string} The declared domain.
 */
function declaredTextDomain() {
	const header = fs.readFileSync(
		path.join( pluginRoot, 'block-minimap.php' ),
		'utf8'
	);
	const match = header.match( /^\s*\*\s*Text Domain:\s*(\S+)\s*$/m );

	expect( match ).not.toBeNull();

	return match[ 1 ];
}

/**
 * Translations only reach the editor when the domain the strings are
 * translated against, the domain the plugin declares, and the domain the
 * script's translations are registered under are all the same one.
 */
test.describe( 'Translations', () => {
	test( 'every translated string uses the declared text domain', () => {
		const domain = declaredTextDomain();
		const sourceDir = path.join( pluginRoot, 'src' );
		const files = [];

		( function collect( dir ) {
			for ( const entry of fs.readdirSync( dir, {
				withFileTypes: true,
			} ) ) {
				const entryPath = path.join( dir, entry.name );

				if ( entry.isDirectory() ) {
					collect( entryPath );
				} else if ( entry.name.endsWith( '.js' ) ) {
					files.push( entryPath );
				}
			}
		} )( sourceDir );

		const wrongDomains = [];
		for ( const file of files ) {
			const source = fs.readFileSync( file, 'utf8' );
			// The domain is the last argument of __(), _x(), _n() and friends.
			const calls = source.matchAll(
				/\b_[_enx]{1,3}\(\s*[^)]*?['"]([^'"]+)['"]\s*\)/g
			);

			for ( const call of calls ) {
				if ( call[ 1 ] !== domain ) {
					wrongDomains.push(
						`${ path.relative( pluginRoot, file ) }: ${ call[ 1 ] }`
					);
				}
			}
		}

		expect( wrongDomains ).toEqual( [] );
	} );

	test( 'the editor script registers translations for that domain', () => {
		const domain = declaredTextDomain();
		const plugin = fs.readFileSync(
			path.join( pluginRoot, 'block-minimap.php' ),
			'utf8'
		);

		const enqueued = plugin.match(
			/wp_enqueue_script\(\s*'([^']+)'/
		);
		expect( enqueued ).not.toBeNull();

		/*
		 * Without this call the strings stay untranslatable however the
		 * translation files are built, because nothing tells WordPress which
		 * domain the script's strings belong to.
		 */
		const registered = plugin.match(
			/wp_set_script_translations\(\s*'([^']+)',\s*'([^']+)'/
		);
		expect( registered ).not.toBeNull();
		expect( registered[ 1 ] ).toBe( enqueued[ 1 ] );
		expect( registered[ 2 ] ).toBe( domain );
	} );
} );
