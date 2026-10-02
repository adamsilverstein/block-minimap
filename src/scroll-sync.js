const { select } = wp.data;

/**
 * The attribute every minimap entry carries with its block's client ID, so
 * the sync can pair an entry with the block it stands for.
 */
export const ENTRY_ATTRIBUTE = 'data-minimap-block';

/** Pairs the post title in the canvas with the title entry in the minimap. */
const TITLE_ID = 'title';

/*
 * How often to look for a canvas or sidebar scroller that came or went. The
 * canvas iframe reloads on device preview switches, and the sidebar remounts
 * its scroller, neither of which tells anyone.
 */
const REATTACH_INTERVAL = 500;

/**
 * Finds the nearest ancestor that scrolls vertically.
 *
 * Reads the overflow style rather than comparing heights, so a scroller
 * whose content is still too short to scroll is found all the same.
 *
 * @param {Element} node Where to start looking.
 * @return {?Element} The scroller, if any.
 */
function findScrollParent( node ) {
	for ( let el = node && node.parentElement; el; el = el.parentElement ) {
		const { overflowY } = el.ownerDocument.defaultView.getComputedStyle(
			el
		);

		if ( /^(auto|scroll|overlay)$/.test( overflowY ) ) {
			return el;
		}
	}

	return null;
}

/**
 * The editor canvas: the root its blocks render under, the element that
 * scrolls it, and what to listen to for its scroll events.
 *
 * Current editors render the canvas in an iframe whose document scrolls;
 * editors without the iframe scroll an ancestor in the main document.
 *
 * @return {?Object} The canvas view, or null before the canvas exists.
 */
function getCanvasView() {
	const iframe = document.querySelector( 'iframe[name="editor-canvas"]' );

	if ( iframe ) {
		const doc = iframe.contentDocument;

		if ( ! doc || ! doc.body || ! doc.scrollingElement ) {
			return null;
		}

		return {
			root: doc.body,
			scroller: doc.scrollingElement,
			eventTarget: iframe.contentWindow,
		};
	}

	const root = document.querySelector( '.editor-styles-wrapper' );
	const scroller = findScrollParent( root );

	return scroller ? { root, scroller, eventTarget: scroller } : null;
}

/**
 * Where an element sits within its scroller's content, in pixels from the
 * top of that content.
 *
 * @param {Element} el       The element.
 * @param {Element} scroller The scroller it sits in.
 * @return {number} Offset from the top of the scrolled content.
 */
function contentOffset( el, scroller ) {
	// A document scroller's viewport starts at the top of its window.
	const viewportTop =
		scroller === scroller.ownerDocument.scrollingElement
			? 0
			: scroller.getBoundingClientRect().top + scroller.clientTop;

	return el.getBoundingClientRect().top - viewportTop + scroller.scrollTop;
}

/**
 * The content offsets of the post title and each top level block in the
 * canvas, keyed by client ID.
 *
 * @param {Object} canvas The canvas view.
 * @return {Map<string, number>} Offsets by ID.
 */
function getCanvasAnchors( canvas ) {
	const anchors = new Map();
	const title = canvas.root.querySelector( '.editor-post-title' );

	if ( title ) {
		anchors.set( TITLE_ID, contentOffset( title, canvas.scroller ) );
	}

	select( 'core/block-editor' )
		.getBlockOrder()
		.forEach( ( clientId ) => {
			const block = canvas.root.querySelector(
				`[data-block="${ clientId }"]`
			);

			if ( block ) {
				anchors.set( clientId, contentOffset( block, canvas.scroller ) );
			}
		} );

	return anchors;
}

/**
 * The content offsets of the minimap's title and top level entries, keyed
 * by the ID of what they stand for.
 *
 * @param {Element} container The minimap container.
 * @param {Element} scroller  The sidebar scroller holding it.
 * @return {Map<string, number>} Offsets by ID.
 */
function getMinimapAnchors( container, scroller ) {
	const anchors = new Map();

	Array.from( container.children ).forEach( ( entry ) => {
		const id = entry.getAttribute( ENTRY_ATTRIBUTE );

		if ( id ) {
			anchors.set( id, contentOffset( entry, scroller ) );
		}
	} );

	return anchors;
}

/**
 * Maps a scroll position in one view to the matching position in another.
 *
 * Minimap entries are far shorter than the blocks they stand for, and not in
 * proportion, so a percentage of the scroll height drifts. Instead each view
 * has a reference line that slides from its viewport's top edge to its
 * bottom edge as it scrolls from top to bottom; the content under the source
 * reference line is found between the two anchors around it, and the target
 * scrolls the same content under its own reference line. Both views reach
 * their top together and their bottom together, and line up block by block
 * in between.
 *
 * @param {Element}             source        Scroller that moved.
 * @param {Map<string, number>} sourceAnchors Its anchor offsets.
 * @param {Element}             target        Scroller to follow it.
 * @param {Map<string, number>} targetAnchors Its anchor offsets.
 * @return {?number} The target scroll position, or null if it cannot scroll.
 */
export function mapScrollPosition(
	source,
	sourceAnchors,
	target,
	targetAnchors
) {
	const sourceMax = source.scrollHeight - source.clientHeight;
	const targetMax = target.scrollHeight - target.clientHeight;

	if ( targetMax <= 0 ) {
		return null;
	}

	const progress =
		sourceMax > 0 ? Math.min( 1, source.scrollTop / sourceMax ) : 0;
	const reference = source.scrollTop + source.clientHeight * progress;

	// Breakpoints in document order, each step forward in both views.
	const points = [ [ 0, 0 ] ];

	sourceAnchors.forEach( ( sourceOffset, id ) => {
		const targetOffset = targetAnchors.get( id );
		const [ lastSource, lastTarget ] = points[ points.length - 1 ];

		if (
			targetOffset !== undefined &&
			sourceOffset > lastSource &&
			targetOffset >= lastTarget
		) {
			points.push( [ sourceOffset, targetOffset ] );
		}
	} );

	points.push( [
		Math.max( source.scrollHeight, points[ points.length - 1 ][ 0 ] + 1 ),
		Math.max( target.scrollHeight, points[ points.length - 1 ][ 1 ] ),
	] );

	let index = 1;

	while ( index < points.length - 1 && points[ index ][ 0 ] <= reference ) {
		index++;
	}

	const [ fromSource, fromTarget ] = points[ index - 1 ];
	const [ toSource, toTarget ] = points[ index ];
	const fraction = Math.min(
		1,
		Math.max( 0, ( reference - fromSource ) / ( toSource - fromSource ) )
	);
	const targetReference = fromTarget + fraction * ( toTarget - fromTarget );

	/*
	 * Solve for the scroll position that puts targetReference under the
	 * target's own sliding reference line:
	 * t + clientHeight * ( t / targetMax ) = targetReference.
	 */
	return Math.min(
		targetMax,
		Math.max( 0, ( targetReference * targetMax ) / target.scrollHeight )
	);
}

/**
 * Keeps the minimap and the editor canvas scrolled to the same content, in
 * both directions.
 */
export default class ScrollSync {
	/**
	 * @param {Element} container The minimap container.
	 */
	constructor( container ) {
		this.container = container;
		this.canvas = null;
		this.minimapScroller = null;
		this.frame = null;
		this.pendingSource = null;
		// The scroll position each side was last moved to by the sync itself.
		this.expected = new Map();

		this.onCanvasScroll = () => this.schedule( 'canvas' );
		this.onMinimapScroll = () => this.schedule( 'minimap' );
		this.attach = this.attach.bind( this );
	}

	start() {
		this.attach();
		this.interval = window.setInterval( this.attach, REATTACH_INTERVAL );
		this.syncFromCanvas();
	}

	stop() {
		window.clearInterval( this.interval );
		window.cancelAnimationFrame( this.frame );
		this.detachCanvas();
		this.detachMinimap();
	}

	/**
	 * Picks up the current canvas and sidebar scrollers, moving the
	 * listeners over when either was replaced.
	 */
	attach() {
		const canvas = getCanvasView();

		if (
			! canvas ||
			! this.canvas ||
			canvas.eventTarget !== this.canvas.eventTarget ||
			canvas.root !== this.canvas.root
		) {
			this.detachCanvas();

			if ( canvas ) {
				this.canvas = canvas;
				canvas.eventTarget.addEventListener(
					'scroll',
					this.onCanvasScroll,
					{ passive: true }
				);
				this.syncFromCanvas();
			}
		}

		const minimapScroller = findScrollParent( this.container );

		if ( minimapScroller !== this.minimapScroller ) {
			this.detachMinimap();

			if ( minimapScroller ) {
				this.minimapScroller = minimapScroller;
				minimapScroller.addEventListener(
					'scroll',
					this.onMinimapScroll,
					{ passive: true }
				);
				this.syncFromCanvas();
			}
		}
	}

	detachCanvas() {
		if ( this.canvas ) {
			this.canvas.eventTarget.removeEventListener(
				'scroll',
				this.onCanvasScroll
			);
			this.canvas = null;
		}
	}

	detachMinimap() {
		if ( this.minimapScroller ) {
			this.minimapScroller.removeEventListener(
				'scroll',
				this.onMinimapScroll
			);
			this.minimapScroller = null;
		}
	}

	/**
	 * Brings the minimap in line with the canvas, for when the minimap
	 * opens or its content changes underneath it.
	 */
	syncFromCanvas() {
		this.schedule( 'canvas', true );
	}

	/**
	 * Queues a sync from one side to the other for the next frame, so a
	 * burst of scroll events lays the page out once per frame.
	 *
	 * @param {string}  source 'canvas' or 'minimap'.
	 * @param {boolean} force  Sync even if the scroll was the sync's own.
	 */
	schedule( source, force = false ) {
		if ( ! force && this.isEcho( source ) ) {
			return;
		}

		this.pendingSource = source;

		if ( this.frame === null ) {
			this.frame = window.requestAnimationFrame( () => {
				this.frame = null;
				this.sync( this.pendingSource );
			} );
		}
	}

	/**
	 * Whether a scroll event on one side is the sync's own doing, rather
	 * than the user's. Answering it consumes the expectation, so the next
	 * scroll there counts as the user's again.
	 *
	 * @param {string} side 'canvas' or 'minimap'.
	 * @return {boolean} True when the event should be ignored.
	 */
	isEcho( side ) {
		const scroller = this.getScroller( side );
		const expected = this.expected.get( side );

		this.expected.delete( side );

		return (
			!! scroller &&
			expected !== undefined &&
			Math.abs( scroller.scrollTop - expected ) < 1
		);
	}

	getScroller( side ) {
		if ( side === 'canvas' ) {
			return this.canvas && this.canvas.scroller;
		}

		return this.minimapScroller;
	}

	sync( source ) {
		if ( ! this.canvas || ! this.minimapScroller ) {
			return;
		}

		const canvasAnchors = getCanvasAnchors( this.canvas );
		const minimapAnchors = getMinimapAnchors(
			this.container,
			this.minimapScroller
		);
		const fromCanvas = source === 'canvas';
		const target = fromCanvas ? 'minimap' : 'canvas';
		const targetScroller = this.getScroller( target );
		const position = fromCanvas
			? mapScrollPosition(
					this.canvas.scroller,
					canvasAnchors,
					targetScroller,
					minimapAnchors
			  )
			: mapScrollPosition(
					this.minimapScroller,
					minimapAnchors,
					targetScroller,
					canvasAnchors
			  );

		if (
			position === null ||
			Math.abs( targetScroller.scrollTop - position ) < 1
		) {
			return;
		}

		targetScroller.scrollTo( { top: position, behavior: 'instant' } );
		// Read back what the browser settled on, which may be rounded.
		this.expected.set( target, targetScroller.scrollTop );
	}
}
