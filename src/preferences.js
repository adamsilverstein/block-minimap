/**
 * User preferences, saved through the preferences store the way the editor
 * saves its own.
 */

const { select, dispatch } = wp.data;

const PREFERENCE_SCOPE = 'block-minimap';

/**
 * The preferences store. It arrived in WordPress 6.0, so older installs have
 * nothing to save to and fall back to the defaults every time.
 *
 * @return {?Object} The store, or null where it is missing.
 */
const preferencesStore = () =>
	( wp.preferences && wp.preferences.store ) || null;

/**
 * Whether there is a store to read preferences from and save them to.
 *
 * @return {boolean} True where preferences can be saved.
 */
export const canSavePreferences = () => !! preferencesStore();

/**
 * Reads a saved preference.
 *
 * @param {string} name Preference name.
 * @return {*} The saved value, or undefined if there is none.
 */
export function getPreference( name ) {
	const store = preferencesStore();

	return store
		? select( store ).get( PREFERENCE_SCOPE, name )
		: undefined;
}

/**
 * Saves a preference for next time, where there is a store to save it to.
 *
 * @param {string} name  Preference name.
 * @param {*}      value Value to save.
 */
export function savePreference( name, value ) {
	const store = preferencesStore();

	if ( store ) {
		dispatch( store ).set( PREFERENCE_SCOPE, name, value );
	}
}
