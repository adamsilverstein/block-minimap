const { Component } = wp.element;
const { subscribe, select } = wp.data;
const { debounce, map } = lodash;
import './block-minimap.css';
import { resolveRenderer } from './renderers';

/**
 * One block's minimap entry.
 *
 * @param {Object} props       Component props.
 * @param {Object} props.block The block to represent.
 * @param {number} props.depth How many containers sit above the block.
 * @return {WPElement} The entry.
 */
function MinimapBlock( { block, depth } ) {
	const renderer = resolveRenderer( block );

	return renderer( block, { depth, renderBlocks } );
}

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

export default class Minimap extends Component {
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
