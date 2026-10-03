/**
 * Internal dependencies
 */
const { getMinimap } = require( './minimap' );

/*
 * Long enough to wrap over several lines in the canvas, so the canvas and
 * the minimap are very different heights and a percentage sync would drift.
 */
const paragraphText = ( index ) =>
	`Paragraph ${ index }. ` +
	'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. '.repeat(
		4
	);

/**
 * Runs a function against the sidebar element that scrolls the minimap.
 *
 * @param {import('@playwright/test').Page} page Playwright page.
 * @param {Function} callback Receives the scroller, the minimap container and `arg`.
 * @param {*}        arg      Argument passed through to the callback.
 * @return {Promise<*>} Whatever the callback returns.
 */
async function inMinimapScroller( page, callback, arg ) {
	const scroller = await getMinimap( page ).evaluateHandle( ( container ) => {
		let node = container.parentElement;

		while (
			node &&
			! /^(auto|scroll|overlay)$/.test( getComputedStyle( node ).overflowY )
		) {
			node = node.parentElement;
		}

		return node;
	} );
	const container = await getMinimap( page ).elementHandle();

	return scroller.evaluate( callback, { container, arg } );
}

const getScrollTop = ( scroller ) => scroller.scrollTop;

/**
 * Which paragraph sits under a view's reference line, and how far through it.
 *
 * The sync lines the views up on a reference line that slides from the top
 * of the viewport to the bottom as the view scrolls from top to bottom, so
 * the same content sits under it in both views. Evaluated in the canvas
 * frame for 'canvas' and in the page for 'minimap'.
 *
 * @param {string} view 'canvas' or 'minimap'.
 * @return {number} Paragraph index plus the fraction through it.
 */
function paragraphUnderReference( view ) {
	let scroller;
	let viewportTop = 0;
	let entries;

	if ( view === 'canvas' ) {
		scroller = document.scrollingElement;
		entries = document.querySelectorAll(
			'.is-root-container > [data-block]'
		);
	} else {
		const container = document.getElementById( 'minimap-container' );

		scroller = container.parentElement;
		while (
			! /^(auto|scroll|overlay)$/.test(
				getComputedStyle( scroller ).overflowY
			)
		) {
			scroller = scroller.parentElement;
		}
		viewportTop = scroller.getBoundingClientRect().top;
		entries = container.querySelectorAll( ':scope > .core-paragraph' );
	}

	const max = scroller.scrollHeight - scroller.clientHeight;
	const line =
		viewportTop + ( scroller.clientHeight * scroller.scrollTop ) / max;

	for ( let index = 0; index < entries.length; index++ ) {
		const top = entries[ index ].getBoundingClientRect().top;
		const next = entries[ index + 1 ]
			? entries[ index + 1 ].getBoundingClientRect().top
			: entries[ index ].getBoundingClientRect().bottom;

		if ( line < next ) {
			return index + Math.max( 0, line - top ) / ( next - top );
		}
	}

	return entries.length;
}

const canvasParagraph = ( page ) =>
	page
		.frame( { name: 'editor-canvas' } )
		.evaluate( paragraphUnderReference, 'canvas' );

const minimapParagraph = ( page ) =>
	page.evaluate( paragraphUnderReference, 'minimap' );


/**
 * Replaces the post content with long paragraphs.
 *
 * @param {import('@playwright/test').Page} page  Playwright page.
 * @param {number}                          count How many paragraphs.
 */
async function fillWithParagraphs( page, count ) {
	await page.evaluate(
		( blocks ) => {
			window.wp.data
				.dispatch( 'core/block-editor' )
				.resetBlocks(
					blocks.map( ( content ) =>
						window.wp.blocks.createBlock( 'core/paragraph', {
							content,
						} )
					)
				);
		},
		Array.from( { length: count }, ( _, index ) =>
			paragraphText( index )
		)
	);
}

module.exports = {
	paragraphText,
	fillWithParagraphs,
	inMinimapScroller,
	getScrollTop,
	paragraphUnderReference,
	canvasParagraph,
	minimapParagraph,
};
