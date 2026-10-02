/**
 * Captures the WordPress.org screenshots from a running WordPress with the
 * plugin active, by filling a new post with varied, nested blocks and
 * scrolling the canvas so the minimap follows along.
 *
 * Usage: BASE=http://127.0.0.1:9411 OUT=.wordpress-org node .github/org-assets/capture-screenshots.js
 *
 * BASE must already be logged in as an admin (Playground with --login works).
 * Photos come from picsum.photos, so the capture needs network access.
 */

const { chromium } = require( '@playwright/test' );

const BASE = process.env.BASE || 'http://127.0.0.1:9411';
const OUT = process.env.OUT || '.wordpress-org';
const img = ( id, w = 1200, h = 800 ) => `https://picsum.photos/id/${ id }/${ w }/${ h }`;

const p = ( t ) => `<!-- wp:paragraph -->\n<p>${ t }</p>\n<!-- /wp:paragraph -->`;
const h = ( t, l = 2 ) =>
	`<!-- wp:heading${ l !== 2 ? ` {"level":${ l }}` : '' } -->\n<h${ l } class="wp-block-heading">${ t }</h${ l }>\n<!-- /wp:heading -->`;
const image = ( id ) =>
	`<!-- wp:image {"sizeSlug":"large"} -->\n<figure class="wp-block-image size-large"><img src="${ img( id ) }" alt=""/></figure>\n<!-- /wp:image -->`;
const list = ( items ) =>
	`<!-- wp:list -->\n<ul class="wp-block-list">${ items.map( ( i ) => `<!-- wp:list-item -->\n<li>${ i }</li>\n<!-- /wp:list-item -->` ).join( '' ) }</ul>\n<!-- /wp:list -->`;
const quote = ( t, c ) =>
	`<!-- wp:quote -->\n<blockquote class="wp-block-quote">${ p( t ) }<cite>${ c }</cite></blockquote>\n<!-- /wp:quote -->`;
const code = ( t ) =>
	`<!-- wp:code -->\n<pre class="wp-block-code"><code>${ t }</code></pre>\n<!-- /wp:code -->`;
const table = ( rows ) =>
	`<!-- wp:table -->\n<figure class="wp-block-table"><table><thead><tr>${ rows[ 0 ].map( ( c ) => `<th>${ c }</th>` ).join( '' ) }</tr></thead><tbody>${ rows
		.slice( 1 )
		.map( ( r ) => `<tr>${ r.map( ( c ) => `<td>${ c }</td>` ).join( '' ) }</tr>` )
		.join( '' ) }</tbody></table></figure>\n<!-- /wp:table -->`;
const gallery = ( ids ) =>
	`<!-- wp:gallery {"linkTo":"none"} -->\n<figure class="wp-block-gallery has-nested-images columns-default is-cropped">${ ids
		.map( ( id ) => `<!-- wp:image {"sizeSlug":"large"} -->\n<figure class="wp-block-image size-large"><img src="${ img( id, 800, 600 ) }" alt=""/></figure>\n<!-- /wp:image -->` )
		.join( '' ) }</figure>\n<!-- /wp:gallery -->`;
const column = ( inner ) => `<!-- wp:column -->\n<div class="wp-block-column">${ inner }</div>\n<!-- /wp:column -->`;
const columns = ( cols ) => `<!-- wp:columns -->\n<div class="wp-block-columns">${ cols.map( column ).join( '' ) }</div>\n<!-- /wp:columns -->`;
const group = ( inner ) =>
	`<!-- wp:group {"style":{"spacing":{"padding":{"top":"24px","bottom":"24px","left":"24px","right":"24px"}}},"backgroundColor":"base-2","layout":{"type":"constrained"}} -->\n<div class="wp-block-group has-base-2-background-color has-background" style="padding-top:24px;padding-right:24px;padding-bottom:24px;padding-left:24px">${ inner }</div>\n<!-- /wp:group -->`;
const sep = '<!-- wp:separator -->\n<hr class="wp-block-separator has-alpha-channel-opacity"/>\n<!-- /wp:separator -->';

const lorem = [
	'A long trail rewards a little planning. Before the first switchback it helps to know where the water is, where the ridge opens up, and where the path drops into the trees for the last few miles.',
	'We started early, while the valley was still blue with shade. The first hour climbed steadily through pine and granite, with the creek always somewhere off to the left.',
	'By midmorning the trees thinned out and the views started. Every few hundred feet the whole route behind us came back into sight, small and quiet and much farther away than it felt.',
	'The descent is where most people lose time. Loose rock and tired legs are a bad mix, so we slowed down, took the long way around the steepest pitch, and stopped for lunch by the lake.',
];

const content = [
	p( lorem[ 0 ] ),
	p( lorem[ 1 ] ),
	image( 1018 ),
	h( 'Planning the route' ),
	p( lorem[ 2 ] ),
	list( [ 'Two liters of water per person', 'A paper map and a charged phone', 'Layers for the summit wind', 'Snacks that survive a squashed pack' ] ),
	h( 'Three ways up' ),
	columns( [
		image( 1036 ) + h( 'North ridge', 3 ) + p( 'Steep and exposed, with the best views on the whole mountain.' ),
		image( 1043 ) + h( 'Lake trail', 3 ) + p( 'Longer and gentler, with water the whole way.' ),
		image( 1039 ) + h( 'Old road', 3 ) + p( 'Wide, shady and easy to follow in bad weather.' ),
	] ),
	group( h( 'Before you go', 3 ) + columns( [ p( lorem[ 3 ] ), list( [ 'Check the forecast', 'Tell someone your plan', 'Start before 8am' ] ) ] ) ),
	p( lorem[ 1 ] ),
	quote( 'The mountains are calling and I must go.', 'John Muir' ),
	p( lorem[ 2 ] ),
	h( 'Trail times' ),
	table( [
		[ 'Route', 'Distance', 'Climb', 'Time' ],
		[ 'North ridge', '6.2 mi', '3,100 ft', '5 h' ],
		[ 'Lake trail', '9.4 mi', '2,600 ft', '6 h' ],
		[ 'Old road', '8.0 mi', '2,400 ft', '5.5 h' ],
	] ),
	p( lorem[ 0 ] ),
	h( 'Tracking the hike' ),
	code( 'const pace = distance / hours;\nconsole.log( `Average: ${ pace.toFixed( 1 ) } mi/h` );' ),
	p( lorem[ 3 ] ),
	gallery( [ 1015, 1016, 1019, 1022, 1025, 1044 ] ),
	sep,
	h( 'What we would do differently' ),
	p( lorem[ 1 ] ),
	p( lorem[ 2 ] ),
	image( 1050 ),
	p( lorem[ 0 ] ),
	p( lorem[ 3 ] ),
].join( '\n\n' );

async function scrollCanvasTo( page, selectorText ) {
	const frame = page.frameLocator( 'iframe[name="editor-canvas"]' );
	await frame.locator( selectorText ).first().evaluate( ( el ) => el.scrollIntoView( { block: 'start' } ) );
	await page.waitForTimeout( 1200 );
}

( async () => {
	const browser = await chromium.launch();
	const context = await browser.newContext( { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 } );
	context.setDefaultTimeout( 180000 );
	context.setDefaultNavigationTimeout( 180000 );
	const page = await context.newPage();

	await page.goto( `${ BASE }/wp-admin/` );
	await page.goto( `${ BASE }/wp-admin/post-new.php` );
	await page.waitForFunction( () => window.wp?.data?.select( 'core/editor' )?.getCurrentPostId(), null, { timeout: 120000 } );

	await page.evaluate( () => {
		const prefs = window.wp.data.dispatch( 'core/preferences' );
		prefs.set( 'core/edit-post', 'fullscreenMode', true );
		prefs.set( 'core/edit-post', 'welcomeGuide', false );
	} );
	await page.waitForTimeout( 1500 );
	await page.reload();
	await page.waitForFunction( () => window.wp?.data?.select( 'core/editor' )?.getCurrentPostId(), null, { timeout: 120000 } );

	await page.evaluate( ( html ) => {
		const { dispatch } = window.wp.data;
		dispatch( 'core/preferences' ).set( 'core/edit-post', 'welcomeGuide', false );
		dispatch( 'core/preferences' ).set( 'core', 'fixedToolbar', false );
		dispatch( 'core/preferences' ).set( 'core/edit-post', 'fullscreenMode', true );
		dispatch( 'core/editor' ).editPost( { title: 'Three ways up the mountain' } );
		dispatch( 'core/block-editor' ).resetBlocks( window.wp.blocks.parse( html ) );
	}, content );

	await page.addStyleTag( { content: '#wpadminbar{display:none!important}html.wp-toolbar{padding-top:0!important}.interface-interface-skeleton{top:0!important}' } );

	// Let images and fonts load in the canvas.
	await page.waitForTimeout( 8000 );

	await page.getByRole( 'region', { name: 'Editor top bar' } ).getByRole( 'button', { name: 'Options' } ).click();
	await page.getByRole( 'menuitemcheckbox', { name: 'Block Minimap' } ).click();
	await page.keyboard.press( 'Escape' );
	await page.locator( '#minimap-container' ).waitFor();
	await page.waitForTimeout( 3000 );

	// Deselect so no block toolbar floats over the canvas.
	await page.evaluate( () => window.wp.data.dispatch( 'core/block-editor' ).clearSelectedBlock() );
	await page.evaluate( () => document.activeElement?.blur() );
	await page.mouse.move( 700, 890 );
	await page.waitForTimeout( 500 );

	const shots = ( process.env.SHOTS || '1,2,3' ).split( ',' );

	if ( shots.includes( '1' ) ) {
		await scrollCanvasTo( page, 'h2:has-text("Planning the route")' );
		await page.screenshot( { path: `${ OUT }/screenshot-1.png` } );
	}

	if ( shots.includes( '2' ) ) {
		await scrollCanvasTo( page, 'h2:has-text("Three ways up")' );
		await page.screenshot( { path: `${ OUT }/screenshot-2.png` } );
	}

	if ( shots.includes( '3' ) ) {
		await scrollCanvasTo( page, 'blockquote' );
		await page.screenshot( { path: `${ OUT }/screenshot-3.png` } );
	}

	await browser.close();
} )();
