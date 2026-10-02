/**
 * Renders the WordPress.org icon and banner PNGs from their SVG sources.
 *
 * Usage: node .github/org-assets/render.js
 *
 * Headless Chromium does the rasterizing so the output matches what a browser
 * draws, including the banner's blur filter and system font text.
 */

/**
 * External dependencies
 */
const fs = require( 'fs' );
const path = require( 'path' );
const { chromium } = require( '@playwright/test' );

const root = path.resolve( __dirname, '../..' );
const out = path.join( root, '.wordpress-org' );

const jobs = [
	{ src: '.wordpress-org/icon.svg', file: 'icon-128x128.png', size: [ 256, 256 ], scale: 0.5 },
	{ src: '.wordpress-org/icon.svg', file: 'icon-256x256.png', size: [ 256, 256 ], scale: 1 },
	{ src: '.github/org-assets/banner.svg', file: 'banner-772x250.png', size: [ 1544, 500 ], scale: 0.5 },
	{ src: '.github/org-assets/banner.svg', file: 'banner-1544x500.png', size: [ 1544, 500 ], scale: 1 },
];

( async () => {
	const browser = await chromium.launch();

	for ( const { src, file, size, scale } of jobs ) {
		const svg = fs.readFileSync( path.join( root, src ), 'utf8' );
		const [ width, height ] = size;
		const page = await browser.newPage( {
			viewport: { width: width * scale, height: height * scale },
		} );
		await page.setContent(
			`<style>html,body{margin:0}svg{display:block;width:${ width * scale }px;height:${ height * scale }px}</style>${ svg }`
		);
		await page.screenshot( { path: path.join( out, file ) } );
		await page.close();
		process.stdout.write( `${ file }\n` );
	}

	await browser.close();
} )();
