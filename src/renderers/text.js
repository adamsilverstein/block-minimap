/**
 * Internal dependencies
 */
import { blockClasses, toHtml } from './utils';
import { renderChip } from './generic';
import { renderInner } from './containers';

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
	/*
	 * The editor keeps a fresh list populated with one empty list item, so
	 * presence of items is not enough: without any item content the list
	 * would render as an anonymous empty box.
	 */
	const hasContent =
		( block.innerBlocks || [] ).some( ( item ) =>
			toHtml( item.attributes && item.attributes.content )
		) || !! toHtml( block.attributes.values );

	if ( ! hasContent ) {
		return renderChip( block );
	}

	return (
		<div className={ blockClasses( block ) }>{ renderListItems( block ) }</div>
	);
};

/**
 * Renders a quote as its inner blocks with the citation below.
 *
 * Modern quotes hold their paragraphs as inner blocks; `value` covers
 * content saved before that change.
 *
 * @param {Object} block A `core/quote` block.
 * @param {Object} ctx   Renderer context.
 * @return {WPElement} The quote or a chip when empty.
 */
export const renderQuote = ( block, ctx ) => {
	const hasChildren = ( block.innerBlocks || [] ).length > 0;
	const value = toHtml( block.attributes.value );
	const citation = toHtml( block.attributes.citation );

	if ( ! hasChildren && ! value && ! citation ) {
		return renderChip( block );
	}

	return (
		<blockquote className={ blockClasses( block ) }>
			{ hasChildren ? (
				renderInner( block, ctx )
			) : (
				<div
					className="minimap-text"
					dangerouslySetInnerHTML={ { __html: value } }
				/>
			) }
			{ citation && (
				<cite dangerouslySetInnerHTML={ { __html: citation } } />
			) }
		</blockquote>
	);
};

/**
 * Renders a pullquote as its text with the citation below.
 *
 * @param {Object} block A `core/pullquote` block.
 * @return {WPElement} The pullquote or a chip when empty.
 */
export const renderPullquote = ( block ) => {
	const value = toHtml( block.attributes.value );
	const citation = toHtml( block.attributes.citation );

	if ( ! value && ! citation ) {
		return renderChip( block );
	}

	return (
		<blockquote className={ blockClasses( block ) }>
			<div
				className="minimap-text"
				dangerouslySetInnerHTML={ { __html: value } }
			/>
			{ citation && (
				<cite dangerouslySetInnerHTML={ { __html: citation } } />
			) }
		</blockquote>
	);
};

/**
 * Renders verse and preformatted blocks with their line breaks intact.
 *
 * @param {Object} block Block being rendered.
 * @return {WPElement} The preformatted text or a chip when empty.
 */
export const renderPreformatted = ( block ) => {
	const content = toHtml( block.attributes.content );

	if ( ! content ) {
		return renderChip( block );
	}

	return (
		<pre
			className={ blockClasses( block, 'minimap-pre' ) }
			dangerouslySetInnerHTML={ { __html: content } }
		/>
	);
};

/**
 * Renders a code block as code.
 *
 * The editor escapes the code content on the way into the attribute, which
 * is what keeps this safe to render as markup.
 *
 * @param {Object} block A `core/code` block.
 * @return {WPElement} The code or a chip when empty.
 */
export const renderCode = ( block ) => {
	const content = toHtml( block.attributes.content );

	if ( ! content ) {
		return renderChip( block );
	}

	return (
		<pre className={ blockClasses( block, 'minimap-pre' ) }>
			<code dangerouslySetInnerHTML={ { __html: content } } />
		</pre>
	);
};

/**
 * Renders a table block as a tiny real table.
 *
 * @param {Object} block A `core/table` block.
 * @return {WPElement} The table or a chip when empty.
 */
export const renderTable = ( block ) => {
	const { head, body, foot } = block.attributes;
	const sections = [
		[ 'thead', head ],
		[ 'tbody', body ],
		[ 'tfoot', foot ],
	].filter( ( [ , rows ] ) => rows && rows.length );

	if ( ! sections.length ) {
		return renderChip( block );
	}

	return (
		<div className={ blockClasses( block ) }>
			<table>
				{ sections.map( ( [ SectionTag, rows ] ) => (
					<SectionTag key={ SectionTag }>
						{ rows.map( ( row, rowIndex ) => (
							<tr key={ rowIndex }>
								{ map( row.cells, ( cell, cellIndex ) => {
									const CellTag =
										cell.tag === 'th' ? 'th' : 'td';

									return (
										<CellTag
											key={ cellIndex }
											dangerouslySetInnerHTML={ {
												__html: toHtml( cell.content ),
											} }
										/>
									);
								} ) }
							</tr>
						) ) }
					</SectionTag>
				) ) }
			</table>
		</div>
	);
};

/**
 * Renders a details block as its summary line with the children below,
 * always expanded — the minimap is an overview, not a control.
 *
 * @param {Object} block A `core/details` block.
 * @param {Object} ctx   Renderer context.
 * @return {WPElement} The details or a chip when empty.
 */
export const renderDetails = ( block, ctx ) => {
	const summary = toHtml( block.attributes.summary );
	const hasChildren = ( block.innerBlocks || [] ).length > 0;

	if ( ! summary && ! hasChildren ) {
		return renderChip( block );
	}

	return (
		<div className={ blockClasses( block ) }>
			{ summary && (
				<div
					className="minimap-details-summary"
					dangerouslySetInnerHTML={ { __html: summary } }
				/>
			) }
			{ hasChildren && renderInner( block, ctx ) }
		</div>
	);
};
