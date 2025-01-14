import { loadScript } from '@automattic/load-script';
import debugFactory from 'debug';

const debug = debugFactory( 'calypso:analytics:recaptcha' );

const GOOGLE_RECAPTCHA_SCRIPT_URL = 'https://www.google.com/recaptcha/api.js?render=explicit';

type GrecaptchaRenderParams = {
	sitekey: string;
	size?: string;
};

type GrecaptchaAction = {
	action: string;
};

// Properties added to the `window` object by https://www.google.com/recaptcha/api.js:
declare global {
	interface Window {
		grecaptcha?: {
			execute: ( clientId: number, action: GrecaptchaAction ) => void;
			ready: ( callback: () => void ) => void;
			render: ( elementId: string, params: GrecaptchaRenderParams ) => void;
		};
	}
}

/**
 * Loads Google reCAPTCHA
 *
 * @returns {boolean} false if the script failed to load
 */
async function loadGoogleRecaptchaScript() {
	if ( window.grecaptcha ) {
		// reCAPTCHA already loaded
		return true;
	}

	try {
		const src = GOOGLE_RECAPTCHA_SCRIPT_URL;
		await loadScript( src );
		debug( 'loadGoogleRecaptchaScript: [Loaded]', src );
		return true;
	} catch ( error ) {
		debug( 'loadGoogleRecaptchaScript: [Load Error] the script failed to load: ', error );
		return false;
	}
}

/**
 * Renders reCAPTCHA badge to an explicit DOM id that should already be on the page
 *
 * @param {string} elementId - render client to this existing DOM node
 * @param {string} siteKey - reCAPTCHA site key
 * @returns {number} reCAPTCHA clientId
 */
async function renderRecaptchaClient( elementId: string, siteKey: string ) {
	try {
		const clientId = await window.grecaptcha?.render( elementId, {
			sitekey: siteKey,
			size: 'invisible',
		} );
		debug( 'renderRecaptchaClient: [Success]', elementId );
		return clientId;
	} catch ( error ) {
		debug( 'renderRecaptchaClient: [Error]', error );
		return null;
	}
}

/**
 * Records an arbitrary action to Google reCAPTCHA
 *
 * @param {number} clientId - a clientId of the reCAPTCHA instance
 * @param {string} action  - name of action to record in reCAPTCHA
 */
export async function recordGoogleRecaptchaAction( clientId: number, action: string ) {
	if ( ! window.grecaptcha ) {
		debug(
			'recordGoogleRecaptchaAction: [Error] window.grecaptcha not defined. Did you forget to init?'
		);
		return null;
	}

	try {
		const token = await window.grecaptcha?.execute( clientId, { action } );
		debug( 'recordGoogleRecaptchaAction: [Success]', action, token, clientId );
		return token;
	} catch ( error ) {
		debug( 'recordGoogleRecaptchaAction: [Error]', action, error );
		return null;
	}
}

/**
 * Records reCAPTCHA action, loading Google script if necessary.
 *
 * @param elementId - a DOM id in which to render the reCAPTCHA client
 * @param siteKey - reCAPTCHA site key
 * @returns either the reCAPTCHA token and clientId, or null if the function fails
 */
export async function initGoogleRecaptcha(
	elementId: string,
	siteKey: string
): Promise< number | null > {
	if ( ! siteKey ) {
		return null;
	}

	if ( ! ( await loadGoogleRecaptchaScript() ) ) {
		return null;
	}

	await new Promise< void >( ( resolve ) => window.grecaptcha?.ready( resolve as () => void ) );

	try {
		const clientId = await renderRecaptchaClient( elementId, siteKey );
		if ( clientId == null ) {
			return null;
		}

		debug( 'initGoogleRecaptcha: [Success]', clientId );
		return clientId;
	} catch ( error ) {
		// We don't want errors interrupting our flow, so convert any exceptions
		// into return values.
		debug( 'initGoogleRecaptcha: [Error]', error );
		return null;
	}
}
