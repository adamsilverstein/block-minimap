import minimap from 'dom-minimap';

const { __ } = wp.i18n;
const { Fragment, Component } = wp.element;
const { registerPlugin } = wp.plugins;
const { PluginSidebar, PluginSidebarMoreMenuItem } = wp.editPost;
const { PanelBody, PanelRow } = wp.components;

class Minimap extends Component {

  componentDidMount() {
	  const doc = document.getElementById( 'wpwrap' );
	const map = minimap({ content: 'wpwrap' });

    // mount the element when the ract dom has rendered
    document.getElementById('minimap-container').appendChild(map());
  }

  componentWillUnmount() {
    // clean up work here.
  }

  shouldComponentUpdate() {
    // update your internal component state on every run
    map();
    // the react component will not rerender
    return false
  }

  render() {
	  console.log( 'render' );
    return React.createElement('div', { id: 'minimap-container', style: {height: '100%'}})
  }
};

const BlockMinimapSidebar = ( p ) => {

	return (
		<Fragment>
			<PluginSidebarMoreMenuItem
				target="block-minimap"
				onClick={ ( e ) => {
					console.log( e );
				} }
			>
				{__("Block Minimap", "block-minimap")}
			</PluginSidebarMoreMenuItem>
			<PluginSidebar
				name="block-minimap"
				title={__("Block Minimap", "block-minimap")}
			>
			<PanelBody>
				<PanelRow>
					<Minimap />
				</PanelRow>
			</PanelBody>
			</PluginSidebar>
		</Fragment>
	);
};

registerPlugin( "block-minimap", {
  icon: "schedule",
  render: BlockMinimapSidebar
});

