const { PureComponent, cloneElement, createRef, memo } = wp.element;
const { subscribe, select } = wp.data;
const { SelectControl } = wp.components;
const { __ } = wp.i18n;
const { debounce, map } = lodash;
import './block-minimap.css';
import { resolveRenderer } from './renderers';
import ScrollSync, { ENTRY_ATTRIBUTE } from './scroll-sync';
import {
	METHOD_OPTIONS,
	SIZES,
	SIZE_OPTIONS,
	loadCompact,
	resolveSize,
	saveCompact,
} from './compact';

/**
 * One block's minimap entry.
 *
 * Memoized: the store keeps block objects referentially stable until they
 * change, so an edit re-renders only the entries on the path to the edited
 * block, not the whole tree.
 *
 * @param {Object} props       Component props.
 * @param {Object} props.block The block to represent.
 * @param {number} props.depth How many containers sit above the block.
 * @return {WPElement} The entry.
 */
const MinimapBlock = memo( function MinimapBlock( { block, depth } ) {
	const renderer = resolveRenderer( block );

	// Tags the entry with its block, so scrolling can pair the two up.
	return cloneElement( renderer( block, { depth, renderBlocks } ), {
		[ ENTRY_ATTRIBUTE ]: block.clientId,
	} );
} );

/**
 * Renders a list of blocks as minimap entries.
 *
 * Container renderers receive this through their context argument, so the
 * renderer modules never need to import the component that calls them.
 *
 * @param {Array}  blocks Blocks to render.
 * @param {number} depth  Nesting depth of these blocks.
 * @return {WPElement[]} One entry per block.
 */
function renderBlocks( blocks, depth ) {
	return map( blocks, ( block ) => (
		<MinimapBlock key={ block.clientId } block={ block } depth={ depth } />
	) );
}

/*
 * A PureComponent with no props: re-renders of the surrounding sidebar
 * chrome (selection changes, panel toggles) pass the minimap by, and only
 * its own state — the block tree and the post title — redraws it.
 */
export default class Minimap extends PureComponent {
	constructor( props ) {
		super( props );

		this.state = {
			blocks: select( 'core/block-editor' ).getBlocks(),
			title: select( 'core/editor' ).getEditedPostAttribute( 'title' ),
			...loadCompact(),
			frameHeight: null,
		};
		this.containerRef = createRef();
		this.setCompact = this.setCompact.bind( this );
		this.measureFrame = this.measureFrame.bind( this );
		this.checkForUpdates = debounce(
			this.checkForUpdates.bind( this ),
			250
		);
	}

	componentDidMount() {
		this.unsubscribe = subscribe( this.checkForUpdates );
		this.scrollSync = new ScrollSync( this.containerRef.current );
		this.scrollSync.start();
		/*
		 * A transform leaves the layout height alone, so the frame around
		 * the container is sized to the scaled height by hand.
		 */
		this.resizeObserver = new window.ResizeObserver( this.measureFrame );
		this.resizeObserver.observe( this.containerRef.current );
		this.countRender();
	}

	measureFrame() {
		const container = this.containerRef.current;
		const frameHeight =
			this.state.method === 'transform'
				? Math.ceil(
						container.offsetHeight *
							SIZES[ resolveSize( this.state.size ) ]
				  )
				: null;

		if ( frameHeight !== this.state.frameHeight ) {
			this.setState( { frameHeight } );
		}
	}

	setCompact( change ) {
		this.setState( change, () => {
			saveCompact( {
				size: this.state.size,
				method: this.state.method,
			} );
			this.measureFrame();
		} );
	}

	componentDidUpdate( prevProps, prevState ) {
		if (
			prevState.size !== this.state.size ||
			prevState.method !== this.state.method
		) {
			this.measureFrame();
		}

		// Entries changed height, so line the minimap back up with the canvas.
		this.scrollSync.syncFromCanvas();
		this.countRender();
	}

	/*
	 * Test hook: lets the end-to-end suite assert how often the minimap
	 * actually redraws.
	 */
	countRender() {
		window.__blockMinimapRenders =
			( window.__blockMinimapRenders || 0 ) + 1;
	}

	componentWillUnmount() {
		// A pending debounced call would otherwise set state after unmount.
		this.checkForUpdates.cancel();
		this.unsubscribe();
		this.scrollSync.stop();
		this.resizeObserver.disconnect();
	}

	checkForUpdates() {
		const blocks = select( 'core/block-editor' ).getBlocks();
		const title = select( 'core/editor' ).getEditedPostAttribute(
			'title'
		);

		/*
		 * The subscription fires on every store change — selection moves,
		 * UI toggles — but the store keeps getBlocks() referentially stable
		 * until the tree actually changes, so an unchanged reference and
		 * title mean there is nothing to redraw.
		 */
		if (
			blocks === this.state.blocks &&
			title === this.state.title
		) {
			return;
		}

		this.setState( { blocks, title } );
	}

	render() {
		const { blocks, title, size, method, frameHeight } = this.state;
		const resolved = resolveSize( size );
		const scale = SIZES[ resolved ];
		const classes = [
			`is-size-${ resolved }`,
			`is-method-${ method }`,
			method === 'lines' && scale < 1 && 'is-text-lines',
		]
			.filter( Boolean )
			.join( ' ' );

		return (
			<div className="minimap-root">
				<div className="minimap-controls">
					<SelectControl
						label={ __( 'Size', 'block-minimap' ) }
						value={ size }
						options={ SIZE_OPTIONS }
						onChange={ ( value ) =>
							this.setCompact( { size: value } )
						}
						__nextHasNoMarginBottom
					/>
					<SelectControl
						label={ __( 'Method (exploration)', 'block-minimap' ) }
						value={ method }
						options={ METHOD_OPTIONS }
						onChange={ ( value ) =>
							this.setCompact( { method: value } )
						}
						__nextHasNoMarginBottom
					/>
				</div>
				<div
					className="minimap-frame"
					style={ frameHeight ? { height: frameHeight } : undefined }
				>
					<div
						id="minimap-container"
						className={ classes }
						ref={ this.containerRef }
						style={ { '--minimap-scale': scale } }
					>
						<div
							className="minimap-block title"
							{ ...{ [ ENTRY_ATTRIBUTE ]: 'title' } }
						>
							{ title }
						</div>

						{ blocks && renderBlocks( blocks, 0 ) }
					</div>
				</div>
			</div>
		);
	}
}
