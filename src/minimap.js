const { PureComponent, memo } = wp.element;
const { subscribe, select } = wp.data;
const { debounce, map } = lodash;
import './block-minimap.css';
import { resolveRenderer } from './renderers';

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

	return renderer( block, { depth, renderBlocks } );
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
		};
		this.checkForUpdates = debounce(
			this.checkForUpdates.bind( this ),
			250
		);
	}

	componentDidMount() {
		this.unsubscribe = subscribe( this.checkForUpdates );
		this.countRender();
	}

	componentDidUpdate() {
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
		const { blocks, title } = this.state;

		return (
			<div id="minimap-container" style={ { height: '100%' } }>
				<div className="minimap-block title">{ title }</div>

				{ blocks && renderBlocks( blocks, 0 ) }
			</div>
		);
	}
}
