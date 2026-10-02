/**
 * Records the compact minimap exploration (#60): one long post with text,
 * images and columns, scrolled through at each size and method, cut into a
 * clip per approach. Also measures how tall the minimap is at each setting.
 *
 * Usage: BASE=http://127.0.0.1:9471 OUT=/tmp/clips node .github/explorations/record-compact.js
 */

const { chromium } = require( '@playwright/test' );
const fs = require( 'fs' );

const BASE = process.env.BASE || 'http://127.0.0.1:9471';
const OUT = process.env.OUT || 'clips';

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
];


const chapters = [ 'Day one', 'Day two', 'Day three' ]
	.map( ( name ) => [ h( name ), ...content ] )
	.flat()
	.join( '\n\n' );

const SCENES = [
	{ name: '1-baseline-full', size: 'full', method: 'lines' },
	{ name: '2-transform-half', size: 'half', method: 'transform' },
	{ name: '3-zoom-half', size: 'half', method: 'zoom' },
	{ name: '4-vars-half', size: 'half', method: 'vars' },
	{ name: '5-lines-two-thirds', size: 'two-thirds', method: 'lines' },
	{ name: '6-lines-half', size: 'half', method: 'lines' },
	{ name: '7-auto-lines', size: 'auto', method: 'lines' },
];

/**
 * Scrolls the canvas to a spread of positions and checks that the block
 * under the canvas reference line is the one whose entry sits under the
 * minimap's reference line, or a neighbor of it.
 *
 * @param {import('@playwright/test').Page} page Playwright page.
 * @return {Promise<string>} Exact matches, neighbor matches and misses.
 */
async function checkSync( page ) {
	let exact = 0;
	let near = 0;
	const misses = [];

	for ( const at of [ 0.05, 0.15, 0.25, 0.35, 0.45, 0.55, 0.65, 0.75, 0.85, 0.95 ] ) {
		await page.evaluate( ( fraction ) => {
			const doc = document.querySelector( 'iframe[name="editor-canvas"]' ).contentDocument;
			const s = doc.scrollingElement;
			s.scrollTop = ( s.scrollHeight - s.clientHeight ) * fraction;
		}, at );
		await page.waitForTimeout( 350 );

		const r = await page.evaluate( () => {
			const order = window.wp.data.select( 'core/block-editor' ).getBlockOrder();
			const doc = document.querySelector( 'iframe[name="editor-canvas"]' ).contentDocument;
			const cs = doc.scrollingElement;
			const cRef = cs.clientHeight * ( cs.scrollTop / ( cs.scrollHeight - cs.clientHeight ) );
			const underCanvas = order.findIndex( ( id ) => {
				const el = doc.querySelector( `[data-block="${ id }"]` );
				const b = el && el.getBoundingClientRect();
				return b && b.top <= cRef && b.bottom >= cRef;
			} );
			const container = document.getElementById( 'minimap-container' );
			let ms = container.parentElement;
			while ( ! /^(auto|scroll|overlay)$/.test( getComputedStyle( ms ).overflowY ) ) {
				ms = ms.parentElement;
			}
			const box = ms.getBoundingClientRect();
			const mRef = box.top + ms.clientHeight * ( ms.scrollTop / ( ms.scrollHeight - ms.clientHeight ) );
			let underMinimap = -1;
			let best = Infinity;
			Array.from( container.children ).forEach( ( entry ) => {
				const i = order.indexOf( entry.getAttribute( 'data-minimap-block' ) );
				const b = entry.getBoundingClientRect();
				const d = b.top <= mRef && b.bottom >= mRef ? 0 : Math.min( Math.abs( b.top - mRef ), Math.abs( b.bottom - mRef ) );
				if ( i >= 0 && d < best ) {
					best = d;
					underMinimap = i;
				}
			} );
			return { underCanvas, underMinimap };
		} );

		if ( r.underCanvas === r.underMinimap ) {
			exact++;
		} else if ( Math.abs( r.underCanvas - r.underMinimap ) <= 1 ) {
			near++;
		} else {
			misses.push( `${ at }: canvas #${ r.underCanvas } vs minimap #${ r.underMinimap }` );
		}
	}

	return { exact, near, misses };
}

( async () => {
	fs.mkdirSync( OUT, { recursive: true } );
	const browser = await chromium.launch();
	const context = await browser.newContext( {
		viewport: { width: 1440, height: 900 },
		recordVideo: { dir: OUT, size: { width: 1440, height: 900 } },
	} );
	context.setDefaultTimeout( 180000 );
	const page = await context.newPage();
	const t0 = Date.now();
	const marks = [];

	await page.goto( `${ BASE }/wp-login.php` );
	await page.waitForTimeout( 1500 );
	await page.fill( '#user_login', 'admin' );
	await page.fill( '#user_pass', 'password' );
	await Promise.all( [ page.waitForNavigation(), page.click( '#wp-submit' ) ] );
	await page.goto( `${ BASE }/wp-admin/post-new.php` );
	await page.waitForFunction( () => window.wp?.data?.select( 'core/editor' )?.getCurrentPostId(), null, { timeout: 120000 } );
	await page.evaluate( ( html ) => {
		const { dispatch } = window.wp.data;
		dispatch( 'core/preferences' ).set( 'core/edit-post', 'welcomeGuide', false );
		dispatch( 'core/preferences' ).set( 'core/edit-post', 'fullscreenMode', true );
		dispatch( 'core/editor' ).editPost( { title: 'Three days on the mountain' } );
		dispatch( 'core/block-editor' ).resetBlocks( window.wp.blocks.parse( html ) );
	}, chapters );
	await page.addStyleTag( { content: '#wpadminbar{display:none!important}html.wp-toolbar{padding-top:0!important}.interface-interface-skeleton{top:0!important}' } );
	await page.waitForTimeout( 10000 );

	await page.getByRole( 'region', { name: 'Editor top bar' } ).getByRole( 'button', { name: 'Options' } ).click();
	await page.getByRole( 'menuitemcheckbox', { name: 'Block Minimap' } ).click();
	await page.keyboard.press( 'Escape' );
	await page.locator( '#minimap-container' ).waitFor();
	await page.evaluate( () => window.wp.data.dispatch( 'core/block-editor' ).clearSelectedBlock() );
	await page.evaluate( () => document.activeElement?.blur() );
	await page.waitForTimeout( 3000 );

	const blockCount = await page.evaluate( () => window.wp.data.select( 'core/block-editor' ).getClientIdsWithDescendants().length );
	const canvas = page.locator( 'iframe[name="editor-canvas"]' );
	const canvasBox = await canvas.boundingBox();
	const minimap = page.locator( '#minimap-container' );
	const results = [];

	const scrollCanvasTop = () => page.frameLocator( 'iframe[name="editor-canvas"]' ).locator( 'html' ).evaluate( ( el ) => el.ownerDocument.scrollingElement.scrollTo( 0, 0 ) );

	for ( const scene of SCENES ) {
		await scrollCanvasTop();
		await page.waitForTimeout( 400 );
		const start = ( Date.now() - t0 ) / 1000;

		await page.getByLabel( 'Method (exploration)' ).selectOption( scene.method );
		await page.waitForTimeout( 300 );
		await page.getByLabel( 'Size', { exact: true } ).selectOption( scene.size );
		await page.mouse.move( 700, 600 );
		await page.waitForTimeout( 1500 );

		// Measure: how many sidebar screens the minimap takes up.
		const m = await minimap.evaluate( ( container ) => {
			let s = container.parentElement;
			while ( s && ! /^(auto|scroll|overlay)$/.test( getComputedStyle( s ).overflowY ) ) {
				s = s.parentElement;
			}
			const text = container.querySelector( '.minimap-text' );
			const textRect = text && text.getBoundingClientRect();
			return {
				scrollHeight: s.scrollHeight,
				clientHeight: s.clientHeight,
				containerHeight: Math.round( container.getBoundingClientRect().height ),
				textPx: text ? parseFloat( getComputedStyle( text ).fontSize ) * ( parseFloat( getComputedStyle( container ).zoom ) || 1 ) : null,
				classes: container.className,
			};
		} );
		const sync = await checkSync( page );
		results.push( { ...scene, ...m, screens: +( m.scrollHeight / m.clientHeight ).toFixed( 2 ), sync } );
		await scrollCanvasTop();
		await page.waitForTimeout( 400 );

		// Scroll the canvas from top to bottom with the wheel.
		await page.mouse.move( canvasBox.x + canvasBox.width / 2, canvasBox.y + 400 );
		for ( let i = 0; i < 70; i++ ) {
			await page.mouse.wheel( 0, 180 );
			await page.waitForTimeout( 60 );
		}
		await page.waitForTimeout( 600 );

		// Then drive it from the minimap side, back up.
		const mmBox = await page.locator( '.minimap-frame' ).boundingBox();
		await page.mouse.move( 1440 - 140, 600 );
		for ( let i = 0; i < 25; i++ ) {
			await page.mouse.wheel( 0, -120 );
			await page.waitForTimeout( 70 );
		}
		await page.waitForTimeout( 800 );
		marks.push( { name: scene.name, start, end: ( Date.now() - t0 ) / 1000 } );
	}

	const video = page.video();
	await context.close();
	await browser.close();
	const videoPath = await video.path();
	fs.writeFileSync( `${ OUT }/marks.json`, JSON.stringify( { videoPath, blockCount, marks, results }, null, 2 ) );
	console.log( JSON.stringify( { blockCount, results }, null, 2 ) );
} )();
