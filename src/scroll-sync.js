const { select } = wp.data;

/**
 * The attribute every minimap entry carries with its block's client ID, so
 * the sync can pair an entry with the block it stands for.
 */
export const ENTRY_ATTRIBUTE = 'data-minimap-block';

/**
 * Marks the minimap entries whose blocks are visible in the canvas, so the
 * compact sizes can draw them at full size inside the spotlight.
 */
export const IN_VIEW_ATTRIBUTE = 'data-minimap-in-view';

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
 * Where the post's content ends in the canvas: the bottom of its last top
 * level block, short of the padding the editor leaves below it.
 *
 * @param {Object} canvas The canvas view.
 * @return {number} Offset from the top of the scrolled content.
 */
function getCanvasContentEnd( canvas ) {
	const order = select( 'core/block-editor' ).getBlockOrder();
	const last =
		order.length &&
		canvas.root.querySelector(
			`[data-block="${ order[ order.length - 1 ] }"]`
		);

	return last
		? contentOffset( last, canvas.scroller ) +
				last.getBoundingClientRect().height
		: canvas.scroller.scrollHeight;
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
 * Pairs up the anchors two views share, as breakpoints for mapping an offset
 * in one view's content to the matching offset in the other's.
 *
 * Anchors that would step backward in either view are skipped, so the
 * breakpoints always run forward in both and the mapping never folds back.
 *
 * @param {Map<string, number>} sourceAnchors Anchor offsets in the source.
 * @param {Map<string, number>} targetAnchors Anchor offsets in the target.
 * @param {number[]}            start         The [ source, target ] offsets
 *                                            the content starts at.
 * @param {number[]}            end           The [ source, target ] offsets
 *                                            the content ends at.
 * @return {number[][]} [ source, target ] breakpoints in document order.
 */
function getBreakpoints( sourceAnchors, targetAnchors, start, end ) {
	const points = [ start ];

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

	const [ lastSource, lastTarget ] = points[ points.length - 1 ];

	points.push( [
		Math.max( end[ 0 ], lastSource + 1 ),
		Math.max( end[ 1 ], lastTarget ),
	] );

	return points;
}

/**
 * Maps an offset through a set of breakpoints, interpolating between the
 * two around it.
 *
 * @param {number[][]} points  Breakpoints from getBreakpoints().
 * @param {number}     offset Offset in the source view.
 * @param {boolean}    reverse Map from the target view to the source view
 *                             instead.
 * @return {number} The matching offset in the other view.
 */
function mapOffset( points, offset, reverse = false ) {
	const from = reverse ? 1 : 0;
	const to = reverse ? 0 : 1;
	let index = 1;

	while ( index < points.length - 1 && points[ index ][ from ] <= offset ) {
		index++;
	}

	const before = points[ index - 1 ];
	const after = points[ index ];
	const span = after[ from ] - before[ from ];
	const fraction =
		span > 0
			? Math.min( 1, Math.max( 0, ( offset - before[ from ] ) / span ) )
			: 0;

	return before[ to ] + fraction * ( after[ to ] - before[ to ] );
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
	const targetReference = mapOffset(
		getBreakpoints( sourceAnchors, targetAnchors, [ 0, 0 ], [
			source.scrollHeight,
			target.scrollHeight,
		] ),
		reference
	);

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
 * both directions, and moves the spotlight over the part of the minimap
 * that is visible in the canvas.
 */
export default class ScrollSync {
	/**
	 * @param {Element} container    The minimap container.
	 * @param {Object}  spotlightRef Ref to the spotlight element, which is
	 *                               only rendered while the spotlight is on.
	 */
	constructor( container, spotlightRef ) {
		this.container = container;
		this.spotlightRef = spotlightRef;
		this.canvas = null;
		this.minimapScroller = null;
		this.frame = null;
		this.pendingSource = null;
		this.drag = null;
		this.dragFrame = null;
		// The scroll position each side was last moved to by the sync itself.
		this.expected = new Map();

		this.onCanvasScroll = () => this.schedule( 'canvas' );
		this.onMinimapScroll = () => this.schedule( 'minimap' );
		this.attach = this.attach.bind( this );
		this.syncFromCanvas = this.syncFromCanvas.bind( this );
		this.startDrag = this.startDrag.bind( this );
		this.moveDrag = this.moveDrag.bind( this );
		this.endDrag = this.endDrag.bind( this );
	}

	start() {
		this.attach();
		this.interval = window.setInterval( this.attach, REATTACH_INTERVAL );
		// A resize changes how much of the canvas is visible.
		window.addEventListener( 'resize', this.syncFromCanvas );
		this.syncFromCanvas();
	}

	stop() {
		window.clearInterval( this.interval );
		window.removeEventListener( 'resize', this.syncFromCanvas );
		window.cancelAnimationFrame( this.frame );
		window.cancelAnimationFrame( this.dragFrame );
		this.drag = null;
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
		// While the spotlight is dragged, the drag moves the canvas itself.
		if ( this.drag && source === 'canvas' ) {
			return;
		}

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
			this.hideSpotlight();
			return;
		}

		const canvasAnchors = getCanvasAnchors( this.canvas );

		// Magnifying entries changes the minimap's layout, so it goes first.
		this.markInView( canvasAnchors );

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
			position !== null &&
			Math.abs( targetScroller.scrollTop - position ) >= 1
		) {
			targetScroller.scrollTo( { top: position, behavior: 'instant' } );
			// Read back what the browser settled on, which may be rounded.
			this.expected.set( target, targetScroller.scrollTop );
		}

		this.updateSpotlight( canvasAnchors, minimapAnchors );
	}

	/**
	 * Marks the entries whose blocks show in the canvas viewport, or clears
	 * the marks while the spotlight is off or has nothing to single out.
	 *
	 * Which blocks are in view depends only on the canvas, so magnifying
	 * them never feeds back into which ones are magnified.
	 *
	 * @param {Map<string, number>} canvasAnchors Canvas anchor offsets.
	 */
	markInView( canvasAnchors ) {
		const enabled = !! this.spotlightRef.current && ! this.canvasShowsAll();
		const { scrollTop, clientHeight } = this.canvas.scroller;
		const viewBottom = scrollTop + clientHeight;
		const tops = Array.from( canvasAnchors.values() );
		const inView = new Set();

		Array.from( canvasAnchors.keys() ).forEach( ( id, index ) => {
			const top = tops[ index ];
			const bottom =
				index + 1 < tops.length
					? tops[ index + 1 ]
					: getCanvasContentEnd( this.canvas );

			if ( top < viewBottom && bottom > scrollTop ) {
				inView.add( id );
			}
		} );

		Array.from( this.container.children ).forEach( ( entry ) => {
			const show =
				enabled && inView.has( entry.getAttribute( ENTRY_ATTRIBUTE ) );

			if ( show !== entry.hasAttribute( IN_VIEW_ATTRIBUTE ) ) {
				entry.toggleAttribute( IN_VIEW_ATTRIBUTE, show );
			}
		} );
	}

	/**
	 * Whether the canvas shows the whole post at once, leaving the
	 * spotlight nothing to single out.
	 *
	 * @return {boolean} True when all of the content is in view.
	 */
	canvasShowsAll() {
		const { scrollTop, clientHeight } = this.canvas.scroller;

		return (
			scrollTop < 1 &&
			scrollTop + clientHeight >= getCanvasContentEnd( this.canvas ) - 1
		);
	}

	/**
	 * Breakpoints from canvas content offsets to offsets within the minimap
	 * container, for placing the spotlight.
	 *
	 * The canvas content starts and ends where the minimap container does,
	 * and the shared anchors line them up in between.
	 *
	 * @param {Map<string, number>} canvasAnchors  Canvas anchor offsets.
	 * @param {Map<string, number>} minimapAnchors Minimap anchor offsets.
	 * @return {number[][]} [ canvas, container ] breakpoints.
	 */
	getSpotlightBreakpoints( canvasAnchors, minimapAnchors ) {
		const containerTop = contentOffset(
			this.container,
			this.minimapScroller
		);
		const inContainer = new Map();

		minimapAnchors.forEach( ( offset, id ) =>
			inContainer.set( id, offset - containerTop )
		);

		return getBreakpoints( canvasAnchors, inContainer, [ 0, 0 ], [
			getCanvasContentEnd( this.canvas ),
			this.container.offsetHeight,
		] );
	}

	/**
	 * Frames the part of the minimap that matches what the canvas shows.
	 *
	 * The canvas viewport's top and bottom edges map into the minimap
	 * separately, so the frame grows over dense text and shrinks over tall
	 * media rather than assuming the two are in proportion.
	 *
	 * @param {Map<string, number>} canvasAnchors  Canvas anchor offsets.
	 * @param {Map<string, number>} minimapAnchors Minimap anchor offsets.
	 */
	updateSpotlight( canvasAnchors, minimapAnchors ) {
		const spotlight = this.spotlightRef.current;

		if ( ! spotlight ) {
			return;
		}

		// With the whole post in view there is nothing to single out.
		if ( this.canvasShowsAll() ) {
			this.hideSpotlight();
			return;
		}

		const { scrollTop, clientHeight } = this.canvas.scroller;
		const points = this.getSpotlightBreakpoints(
			canvasAnchors,
			minimapAnchors
		);
		const top = mapOffset( points, scrollTop );
		const bottom = mapOffset( points, scrollTop + clientHeight );

		spotlight.hidden = false;
		spotlight.style.transform = `translateY(${ top }px)`;
		spotlight.style.height = `${ bottom - top }px`;
	}

	hideSpotlight() {
		const spotlight = this.spotlightRef.current;

		if ( spotlight ) {
			spotlight.hidden = true;
		}
	}

	/**
	 * Starts dragging the spotlight, which scrolls the canvas.
	 *
	 * @param {PointerEvent} event The pointerdown event on the spotlight.
	 */
	startDrag( event ) {
		const spotlight = event.currentTarget;

		if (
			event.button !== 0 ||
			! this.canvas ||
			! this.minimapScroller
		) {
			return;
		}

		event.preventDefault();
		// Keeps the drag tracking once the pointer leaves the sidebar.
		spotlight.setPointerCapture( event.pointerId );

		this.drag = {
			pointerId: event.pointerId,
			// Where on the frame it was grabbed, so it stays under the pointer.
			grab: event.clientY - spotlight.getBoundingClientRect().top,
			clientY: event.clientY,
		};
		spotlight.classList.add( 'is-dragging' );
	}

	/**
	 * Follows the pointer, at most once a frame.
	 *
	 * @param {PointerEvent} event The pointermove event.
	 */
	moveDrag( event ) {
		if ( ! this.drag || event.pointerId !== this.drag.pointerId ) {
			return;
		}

		this.drag.clientY = event.clientY;

		if ( this.dragFrame === null ) {
			this.dragFrame = window.requestAnimationFrame( () => {
				this.dragFrame = null;
				this.dragTo();
			} );
		}
	}

	/**
	 * Scrolls the canvas so the spotlight's top edge lands where the pointer
	 * put it, mapping back from the minimap to the canvas through the same
	 * breakpoints the spotlight is placed with. The minimap is measured
	 * afresh each step, as the entries magnified inside the spotlight change
	 * along the way.
	 */
	dragTo() {
		if ( ! this.drag || ! this.canvas ) {
			return;
		}

		const { clientY, grab } = this.drag;
		const scroller = this.canvas.scroller;
		const canvasAnchors = getCanvasAnchors( this.canvas );
		const top =
			clientY - grab - this.container.getBoundingClientRect().top;
		const points = this.getSpotlightBreakpoints(
			canvasAnchors,
			getMinimapAnchors( this.container, this.minimapScroller )
		);

		scroller.scrollTo( {
			top: mapOffset( points, top, true ),
			behavior: 'instant',
		} );
		this.markInView( canvasAnchors );
		this.updateSpotlight(
			canvasAnchors,
			getMinimapAnchors( this.container, this.minimapScroller )
		);
	}

	/**
	 * Ends a drag and brings the minimap back in line with the canvas.
	 *
	 * @param {PointerEvent} event The pointerup, pointercancel or
	 *                             lostpointercapture event.
	 */
	endDrag( event ) {
		if ( ! this.drag || event.pointerId !== this.drag.pointerId ) {
			return;
		}

		window.cancelAnimationFrame( this.dragFrame );
		this.dragFrame = null;
		this.dragTo();
		this.drag = null;
		event.currentTarget.classList.remove( 'is-dragging' );
		this.syncFromCanvas();
	}
}
