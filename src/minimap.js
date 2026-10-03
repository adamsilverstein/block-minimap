const { PureComponent, cloneElement, createRef, memo } = wp.element;
const { subscribe, select } = wp.data;
const { SelectControl } = wp.components;
const { __ } = wp.i18n;
const { debounce, map } = lodash;
import './block-minimap.css';
import { resolveRenderer } from './renderers';
import ScrollSync, { ENTRY_ATTRIBUTE } from './scroll-sync';
import { SIZES, SIZE_OPTIONS, autoSize, getSavedSize, saveSize } from './size';

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
 * its own state — the block tree, the post title and the size — redraws it.
 */
export default class Minimap extends PureComponent {
	constructor( props ) {
		super( props );

		this.state = {
			blocks: select( 'core/block-editor' ).getBlocks(),
			title: select( 'core/editor' ).getEditedPostAttribute( 'title' ),
			size: getSavedSize(),
			autoSize: autoSize( countBlocks() ),
		};
		this.containerRef = createRef();
		this.setSize = this.setSize.bind( this );
		this.checkForUpdates = debounce(
			this.checkForUpdates.bind( this ),
			250
		);
	}

	componentDidMount() {
		this.unsubscribe = subscribe( this.checkForUpdates );
		this.scrollSync = new ScrollSync( this.containerRef.current );
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

		/*
		 * The subscription fires on every store change — selection moves,
		 * UI toggles — but the store keeps getBlocks() referentially stable
		 * until the tree actually changes, so an unchanged reference and
		 * title mean there is nothing to redraw.
		 */
		if (
			blocks === this.state.blocks &&
			title === this.state.title &&
			size === this.state.size
		) {
			return;
		}

		this.setState( {
			blocks,
			title,
			size,
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

	render() {
		const { blocks, title, size } = this.state;
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
			</div>
		);
	}
}
