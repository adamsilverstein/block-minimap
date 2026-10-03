const { PureComponent, cloneElement, createRef, memo } = wp.element;
const { subscribe, select } = wp.data;
const { SelectControl, ToggleControl } = wp.components;
const { __ } = wp.i18n;
const { debounce, map } = lodash;
import './block-minimap.css';
import { resolveRenderer } from './renderers';
import ScrollSync, { ENTRY_ATTRIBUTE } from './scroll-sync';
import { SIZES, SIZE_OPTIONS, autoSize, getSavedSize, saveSize } from './size';
import { getSavedSpotlight, saveSpotlight } from './spotlight';

/**
 * How many blocks the post holds, including nested ones.
 *
 * @return {number} The block count.
 */
const countBlocks = () =>
	select( 'core/block-editor' ).getClientIdsWithDescendants().length;

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
 * its own state - the block tree, the post title, the size and the
 * spotlight setting - redraws it.
 */
export default class Minimap extends PureComponent {
	constructor( props ) {
		super( props );

		this.state = {
			blocks: select( 'core/block-editor' ).getBlocks(),
			title: select( 'core/editor' ).getEditedPostAttribute( 'title' ),
			size: getSavedSize(),
			autoSize: autoSize( countBlocks() ),
			spotlight: getSavedSpotlight(),
		};
		this.containerRef = createRef();
		this.spotlightRef = createRef();
		this.setSize = this.setSize.bind( this );
		this.setSpotlight = this.setSpotlight.bind( this );
		// The scroll sync only exists once mounted, so look it up per event.
		this.dragHandlers = {
			onPointerDown: ( event ) => this.scrollSync.startDrag( event ),
			onPointerMove: ( event ) => this.scrollSync.moveDrag( event ),
			onPointerUp: ( event ) => this.scrollSync.endDrag( event ),
			onPointerCancel: ( event ) => this.scrollSync.endDrag( event ),
			onLostPointerCapture: ( event ) =>
				this.scrollSync.endDrag( event ),
		};
		this.checkForUpdates = debounce(
			this.checkForUpdates.bind( this ),
			250
		);
	}

	componentDidMount() {
		this.unsubscribe = subscribe( this.checkForUpdates );
		this.scrollSync = new ScrollSync(
			this.containerRef.current,
			this.spotlightRef
		);
		this.scrollSync.start();
		this.countRender();
	}

	componentDidUpdate() {
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
	}

	checkForUpdates() {
		const blocks = select( 'core/block-editor' ).getBlocks();
		const title = select( 'core/editor' ).getEditedPostAttribute(
			'title'
		);
		/*
		 * The saved size can change from outside, such as another tab.
		 * Without a preferences store there is nothing saved, so keep the
		 * size chosen this session.
		 */
		const size = getSavedSize( this.state.size );
		const spotlight = getSavedSpotlight( this.state.spotlight );

		/*
		 * The subscription fires on every store change — selection moves,
		 * UI toggles — but the store keeps getBlocks() referentially stable
		 * until the tree actually changes, so an unchanged reference and
		 * title mean there is nothing to redraw.
		 */
		if (
			blocks === this.state.blocks &&
			title === this.state.title &&
			size === this.state.size &&
			spotlight === this.state.spotlight
		) {
			return;
		}

		this.setState( {
			blocks,
			title,
			size,
			spotlight,
			autoSize:
				blocks === this.state.blocks
					? this.state.autoSize
					: autoSize( countBlocks(), this.state.autoSize ),
		} );
	}

	setSize( size ) {
		this.setState( { size } );
		saveSize( size );
	}

	setSpotlight( spotlight ) {
		this.setState( { spotlight } );
		saveSpotlight( spotlight );
	}

	render() {
		const { blocks, title, size, spotlight } = this.state;
		const resolved = size === 'auto' ? this.state.autoSize : size;
		const scale = SIZES[ resolved ];

		return (
			<div className="minimap-root">
				<SelectControl
					label={ __( 'Minimap size', 'block-minimap' ) }
					value={ size }
					options={ SIZE_OPTIONS }
					onChange={ this.setSize }
					__next40pxDefaultSize
					__nextHasNoMarginBottom
				/>
				<ToggleControl
					label={ __( 'Highlight visible area', 'block-minimap' ) }
					checked={ spotlight }
					onChange={ this.setSpotlight }
					__nextHasNoMarginBottom
				/>
				<div
					className={ `minimap-stage${
						spotlight ? ' has-spotlight' : ''
					}` }
				>
					<div
						id="minimap-container"
						className={ `is-size-${ resolved }${
							scale < 1 ? ' is-compact' : ''
						}` }
						ref={ this.containerRef }
						style={ { height: '100%', '--minimap-scale': scale } }
					>
						<div
							className="minimap-block title"
							{ ...{ [ ENTRY_ATTRIBUTE ]: 'title' } }
						>
							{ title }
						</div>

						{ blocks && renderBlocks( blocks, 0 ) }
					</div>
					{ spotlight && (
						/*
						 * Only pointer users get the drag handle: keyboard
						 * and screen reader users scroll the canvas itself.
						 */
						<div
							className="minimap-spotlight"
							ref={ this.spotlightRef }
							aria-hidden="true"
							hidden
							{ ...this.dragHandlers }
						/>
					) }
				</div>
			</div>
		);
	}
}
