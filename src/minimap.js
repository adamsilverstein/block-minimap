const { Component } = wp.element;
const { subscribe } = wp.data;
const { debounce, map } = lodash;
import './block-minimap.css';

/*
 * Rich text attributes arrive as RichTextData objects rather than strings, and
 * dangerouslySetInnerHTML needs a string.
 */
const toHtml = ( value ) => ( value ? String( value ) : '' );

/**
 * Renders a list block as a list.
 *
 * WordPress 6.1 moved list items out of the block's `values` attribute and into
 * inner `core/list-item` blocks, so read those first and keep `values` as a
 * fallback for content saved before the change. A list item can itself hold a
 * nested list, hence the recursion.
 *
 * @param {Object} block A `core/list` block.
 * @param {?number} key  React key, when rendered as one of several siblings.
 * @return {WPElement} The rendered list.
 */
const renderList = ( block, key ) => {
	const ListTag = block.attributes.ordered ? 'ol' : 'ul';
	const items = block.innerBlocks || [];

	if ( ! items.length ) {
		return (
			<ListTag
				key={ key }
				dangerouslySetInnerHTML={ {
					__html: toHtml( block.attributes.values ),
				} }
			/>
		);
	}

	return (
		<ListTag key={ key }>
			{ map( items, ( item, i ) => (
				<li key={ i }>
					<span
						dangerouslySetInnerHTML={ {
							__html: toHtml( item.attributes.content ),
						} }
					/>
					{ map(
						( item.innerBlocks || [] ).filter(
							( inner ) => inner.name === 'core/list'
						),
						( nested, n ) => renderList( nested, n )
					) }
				</li>
			) ) }
		</ListTag>
	);
};

export default class Minimap extends Component {
	constructor( props ) {
		super( props );

		this.state = {
			blocks: wp.data.select( 'core/block-editor' ).getBlocks(),
		}
		this.checkForUpdates = this.checkForUpdates.bind( this );
		this.checkForUpdates = debounce( this.checkForUpdates, 250 );
	}

	componentDidMount() {
		this.unsubscribe = subscribe( this.checkForUpdates );
	}

	componentWillUnmount() {
		this.unsubscribe();
	}

	checkForUpdates() {
			const blocks =  wp.data.select( 'core/block-editor' ).getBlocks();
			this.setState(
				{
					blocks
				}
			);
	}

	render() {
		const { blocks } = this.state;
		const title  = wp.data.select( 'core/editor' ).getEditedPostAttribute( 'title' );

		return (
			<div
				id="minimap-container"
				style={ { height: '100%' } }
			>
				<div className="minimap-block title">
					{ title }
				</div>

				{
					blocks &&
						map( blocks, ( block, i ) => {
							switch ( block.name ) {
								case 'core/cover':
								case 'core/image':
									return (
										<img
											key={ i }
											src={ block.attributes.url }
											className={ `minimap-block ${ block.name.replace( '/', '-' ) }` }
										/>
									);
									break;

								case 'core/separator':
									return (
										<hr
											key={ i }
										/>
									);
									break;


								case 'core/list':
										return (
											<div
												key={ i }
												className={ `minimap-block ${ block.name.replace( '/', '-' ) }` }
											>
												{ renderList( block ) }
											</div>
										);
										break;

								case 'core/paragraph':
									return (
										<div
											key={ i }
											className={ `minimap-block ${ block.name.replace( '/', '-' ) }` }dangerouslySetInnerHTML={ {
												__html: block.attributes.content
											} }
										/>
									);
									break;

								case 'core/heading':
										const CustomTag = `h${ block.attributes.level }`;

										return (
											<CustomTag
												key={ i }
												className={ `minimap-block ${ block.name.replace( '/', '-' ) }` }
												dangerouslySetInnerHTML={ {
													__html: block.attributes.content
												} }
											/>

										);
										break;

								default:
									return (
										<div
											key={ i }
											className={ `minimap-block ${ block.name.replace( '/', '-' ) }` }
										/>
									);
							}
						} )
				}
			</div>
		);
	}
};