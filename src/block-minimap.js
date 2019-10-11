import Minimap from './minimap.js';

const { __ } = wp.i18n;
const { Fragment } = wp.element;
const { registerPlugin } = wp.plugins;
const { PluginSidebar, PluginSidebarMoreMenuItem } = wp.editPost;
const { PanelBody, PanelRow } = wp.components;

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

