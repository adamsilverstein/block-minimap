import Minimap from './minimap.js';

const { __ } = wp.i18n;
const { Fragment } = wp.element;
const { registerPlugin } = wp.plugins;
/*
 * The sidebar components moved from wp.editPost to wp.editor in WordPress 6.6,
 * and calling them on the old namespace logs a deprecation notice. Prefer
 * wp.editor where it offers them, and fall back for older installs.
 */
const sidebarComponents = wp.editor && wp.editor.PluginSidebar
	? wp.editor
	: wp.editPost;
const { PluginSidebar, PluginSidebarMoreMenuItem } = sidebarComponents;
const { PanelBody, PanelRow } = wp.components;

const BlockMinimapSidebar = ( p ) => {

	return (
		<Fragment>
			<PluginSidebarMoreMenuItem
				target="block-minimap"
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

