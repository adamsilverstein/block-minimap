const { Component } = wp.element;
const { subscribe } = wp.data;
const { debounce, map } = lodash;
import './block-minimap.css';

export default class Minimap extends Component {
	constructor( props ) {
		super( props );
		console.log( 'construct' );
		this.state = {
			blocks: wp.data.select( 'core/block-editor' ).getBlocks(),
		}
		this.checkForUpdates = this.checkForUpdates.bind( this );
	}

	componentDidMount() {
		this.unsubscribe = subscribe( this.checkForUpdates );
	}

	componentWillUnmount() {
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
		console.log( 'render', blocks);
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
												<ul
													dangerouslySetInnerHTML={ {
														__html: block.attributes.values
													} }
												/>
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
							console.log( block );
						} )
				}
			</div>
		);
	}
};