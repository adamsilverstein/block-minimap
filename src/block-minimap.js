/**
 * WordPress dependencies
 */
import { IconButton, Panel, PinnedPlugins, Sidebar, SidebarHeader } from '@wordpress/components';
import { withDispatch, withSelect } from '@wordpress/data';
import { __ } from '@wordpress/i18n';
import { withPluginContext } from '@wordpress/plugins';
import { compose } from '@wordpress/compose';


function PluginSidebar( props ) {
	const {
		children,
		className,
		icon,
		isActive,
		isPinnable = true,
		isPinned,
		sidebarName,
		title,
		togglePin,
		toggleSidebar,
	} = props;

	return (
		<>
			{ isPinnable && (
				<PinnedPlugins>
					{ isPinned && <IconButton
						icon={ icon }
						label={ title }
						onClick={ toggleSidebar }
						isToggled={ isActive }
						aria-expanded={ isActive }
					/> }
				</PinnedPlugins>
			) }
			<Sidebar
				name={ sidebarName }
				label={ __( 'Editor plugins' ) }
			>
				<SidebarHeader
					closeLabel={ __( 'Close plugin' ) }
				>
					<strong>{ title }</strong>
					{ isPinnable && (
						<IconButton
							icon={ isPinned ? 'star-filled' : 'star-empty' }
							label={ isPinned ? __( 'Unpin from toolbar' ) : __( 'Pin to toolbar' ) }
							onClick={ togglePin }
							isToggled={ isPinned }
							aria-expanded={ isPinned }
						/>
					) }
				</SidebarHeader>
				<Panel className={ className }>
					{ children }
				</Panel>
			</Sidebar>
		</>
	);
}

export default compose(
	withPluginContext( ( context, ownProps ) => {
		return {
			icon: ownProps.icon || context.icon,
			sidebarName: `${ context.name }/${ ownProps.name }`,
		};
	} ),
	withSelect( ( select, { sidebarName } ) => {
		const {
			getActiveGeneralSidebarName,
			isPluginItemPinned,
		} = select( 'core/edit-post' );

		return {
			isActive: getActiveGeneralSidebarName() === sidebarName,
			isPinned: isPluginItemPinned( sidebarName ),
		};
	} ),
	withDispatch( ( dispatch, { isActive, sidebarName } ) => {
		const {
			closeGeneralSidebar,
			openGeneralSidebar,
			togglePinnedPluginItem,
		} = dispatch( 'core/edit-post' );

		return {
			togglePin() {
				togglePinnedPluginItem( sidebarName );
			},
			toggleSidebar() {
				if ( isActive ) {
					closeGeneralSidebar();
				} else {
					openGeneralSidebar( sidebarName );
				}
			},
		};
	} ),
)( PluginSidebar );