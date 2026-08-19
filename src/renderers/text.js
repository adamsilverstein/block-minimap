/**
 * Internal dependencies
 */
import { blockClasses, toHtml } from './utils';
import { renderChip } from './generic';

const { map } = lodash;

/*
 * Text renderers pass rich text attributes to dangerouslySetInnerHTML. That is
 * defensible because the editor already sanitizes rich text; blocks holding
 * arbitrary author supplied markup go through renderRaw instead.
 */

/**
 * Renders a text block's `content` attribute as tiny text.
 *
 * Doubles as the default for any block in the `text` category without a
 * bespoke renderer. An empty block falls back to the title chip so nothing
 * renders as an anonymous empty box.
 *
 * @param {Object} block Block being rendered.
 * @return {WPElement} The text band or a chip.
 */
export const renderText = ( block ) => {
	const content = toHtml( block.attributes.content );

	if ( ! content ) {
		return renderChip( block );
	}

	return (
		<div
			className={ blockClasses( block, 'minimap-text' ) }
			dangerouslySetInnerHTML={ { __html: content } }
		/>
	);
};

/**
 * Renders a heading at its own heading level.
 *
 * @param {Object} block A `core/heading` block.
 * @return {WPElement} The heading or a chip when empty.
 */
export const renderHeading = ( block ) => {
	const content = toHtml( block.attributes.content );

	if ( ! content ) {
		return renderChip( block );
	}

	const HeadingTag = `h${ block.attributes.level || 2 }`;

	return (
		<HeadingTag
			className={ blockClasses( block ) }
			dangerouslySetInnerHTML={ { __html: content } }
		/>
	);
};

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
const renderListItems = ( block, key ) => {
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
				<li key={ item.clientId || i }>
					<span
						dangerouslySetInnerHTML={ {
							__html: toHtml( item.attributes.content ),
						} }
					/>
					{ map(
						( item.innerBlocks || [] ).filter(
							( inner ) => inner.name === 'core/list'
						),
						( nested, n ) => renderListItems( nested, n )
					) }
				</li>
			) ) }
		</ListTag>
	);
};

/**
 * Renders a list block, or the title chip when it has no items yet.
 *
 * @param {Object} block A `core/list` block.
 * @return {WPElement} The rendered list.
 */
export const renderList = ( block ) => {
	const hasItems =
		( block.innerBlocks || [] ).length > 0 ||
		!! toHtml( block.attributes.values );

	if ( ! hasItems ) {
		return renderChip( block );
	}

	return (
		<div className={ blockClasses( block ) }>{ renderListItems( block ) }</div>
	);
};
