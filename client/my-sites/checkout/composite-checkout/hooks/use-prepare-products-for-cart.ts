import { getPlanByPathSlug } from '@automattic/calypso-products';
import { createRequestCartProduct } from '@automattic/shopping-cart';
import { decodeProductFromUrl, isValueTruthy } from '@automattic/wpcom-checkout';
import debugFactory from 'debug';
import { useTranslate } from 'i18n-calypso';
import { useEffect, useMemo, useReducer } from 'react';
import getCartFromLocalStorage from '../lib/get-cart-from-local-storage';
import useFetchProductsIfNotLoaded from './use-fetch-products-if-not-loaded';
import useStripProductsFromUrl from './use-strip-products-from-url';
import type { RequestCartProduct, RequestCartProductExtra } from '@automattic/shopping-cart';
import type { SitelessCheckoutType } from '@automattic/wpcom-checkout';

const debug = debugFactory( 'calypso:composite-checkout:use-prepare-products-for-cart' );

interface PreparedProductsForCart {
	productsForCart: RequestCartProduct[];
	isLoading: boolean;
	error: string | null;
}

const initialPreparedProductsState = {
	isLoading: true,
	productsForCart: [],
	error: null,
};

/**
 * Hook to collect requested products from places like the URL or localStorage
 * and turn them into `RequestCartProduct` objects.
 *
 * Objects created by this hook will then be added to the cart by
 * `useAddProductsFromUrl()`.
 *
 * Because this process may be async, the return value of this hook includes an
 * `isLoading` property which should be true before using the `productsForCart`
 * it produces.
 */
export default function usePrepareProductsForCart( {
	productAliasFromUrl,
	purchaseId: originalPurchaseId,
	isInModal,
	usesJetpackProducts,
	isPrivate,
	siteSlug,
	sitelessCheckoutType,
	isLoggedOutCart,
	isNoSiteCart,
	jetpackSiteSlug,
	jetpackPurchaseToken,
	source,
	isGiftPurchase,
}: {
	productAliasFromUrl: string | null | undefined;
	purchaseId: string | number | null | undefined;
	isInModal?: boolean;
	usesJetpackProducts: boolean;
	isPrivate: boolean;
	siteSlug: string | undefined;
	sitelessCheckoutType: SitelessCheckoutType;
	isLoggedOutCart?: boolean;
	isNoSiteCart?: boolean;
	jetpackSiteSlug?: string;
	jetpackPurchaseToken?: string;
	source?: string;
	isGiftPurchase?: boolean;
} ): PreparedProductsForCart {
	const [ state, dispatch ] = useReducer( preparedProductsReducer, initialPreparedProductsState );

	debug(
		'preparing products for cart from url string',
		productAliasFromUrl,
		'and purchase id',
		originalPurchaseId,
		'and isLoggedOutCart',
		isLoggedOutCart,
		'and isAkismetSitelessCheckout',
		sitelessCheckoutType === 'akismet',
		'and isNoSiteCart',
		isNoSiteCart,
		'and isJetpackCheckout',
		sitelessCheckoutType === 'jetpack',
		'and jetpackSiteSlug',
		jetpackSiteSlug,
		'and jetpackPurchaseToken',
		jetpackPurchaseToken
	);

	useFetchProductsIfNotLoaded();

	const addHandler = chooseAddHandler( {
		isLoading: state.isLoading,
		originalPurchaseId,
		productAliasFromUrl,
		sitelessCheckoutType,
		isLoggedOutCart,
		isNoSiteCart,
		isGiftPurchase,
	} );
	debug( 'isLoading', state.isLoading );
	debug( 'handler is', addHandler );

	// Only one of these should ever operate. The others should bail if they
	// think another hook will handle the data.
	useAddProductsFromLocalStorage( {
		dispatch,
		addHandler,
	} );
	useAddProductFromSlug( {
		productAliasFromUrl,
		dispatch,
		usesJetpackProducts,
		isPrivate,
		addHandler,
		sitelessCheckoutType,
		jetpackSiteSlug,
		jetpackPurchaseToken,
		source,
	} );
	useAddRenewalItems( {
		originalPurchaseId,
		sitelessCheckoutType, // Akismet products can renew independently of a site
		productAlias: productAliasFromUrl,
		dispatch,
		addHandler,
		isGiftPurchase,
	} );
	useNothingToAdd( { addHandler, dispatch } );

	// Do not strip products from url until the URL has been parsed
	const areProductsRetrievedFromUrl = ! state.isLoading && ! isInModal;
	const doNotStripProducts = Boolean(
		! areProductsRetrievedFromUrl ||
			sitelessCheckoutType === 'jetpack' ||
			sitelessCheckoutType === 'akismet' ||
			isGiftPurchase
	);
	useStripProductsFromUrl( siteSlug, doNotStripProducts );

	return state;
}

type PreparedProductsAction =
	| { type: 'PRODUCTS_ADD'; products: RequestCartProduct[] }
	| { type: 'RENEWALS_ADD'; products: RequestCartProduct[] }
	| { type: 'PRODUCTS_ADD_ERROR'; message: string };

function preparedProductsReducer(
	state: PreparedProductsForCart,
	action: PreparedProductsAction
): PreparedProductsForCart {
	switch ( action.type ) {
		case 'RENEWALS_ADD':
		// fall through
		case 'PRODUCTS_ADD':
			if ( ! state.isLoading ) {
				return state;
			}
			return { ...state, productsForCart: action.products, isLoading: false };
		case 'PRODUCTS_ADD_ERROR':
			if ( ! state.isLoading ) {
				return state;
			}
			return { ...state, isLoading: false, error: action.message };
		default:
			return state;
	}
}

type AddHandler = 'addProductFromSlug' | 'addRenewalItems' | 'doNotAdd' | 'addFromLocalStorage';

function chooseAddHandler( {
	isLoading,
	originalPurchaseId,
	productAliasFromUrl,
	sitelessCheckoutType,
	isLoggedOutCart,
	isNoSiteCart,
	isGiftPurchase,
}: {
	isLoading: boolean;
	originalPurchaseId: string | number | null | undefined;
	productAliasFromUrl: string | null | undefined;
	sitelessCheckoutType: SitelessCheckoutType;
	isLoggedOutCart?: boolean;
	isNoSiteCart?: boolean;
	isGiftPurchase?: boolean;
} ): AddHandler {
	// Akismet products can be renewed in a "siteless" context
	if ( sitelessCheckoutType === 'akismet' && originalPurchaseId ) {
		return 'addRenewalItems';
	}

	if ( sitelessCheckoutType === 'jetpack' || sitelessCheckoutType === 'akismet' ) {
		return 'addProductFromSlug';
	}

	if ( ! isLoading ) {
		return 'doNotAdd';
	}

	/*
	 * As Gifting purchases are actually renewals and validate the subscriptionID + product
	 * with the server, we have to avoid using localStorage.
	 */
	if ( ( ! isGiftPurchase && isLoggedOutCart ) || isNoSiteCart ) {
		return 'addFromLocalStorage';
	}

	if ( originalPurchaseId ) {
		return 'addRenewalItems';
	}

	if ( ! originalPurchaseId && productAliasFromUrl ) {
		return 'addProductFromSlug';
	}

	return 'doNotAdd';
}

function useNothingToAdd( {
	dispatch,
	addHandler,
}: {
	dispatch: ( action: PreparedProductsAction ) => void;
	addHandler: AddHandler;
} ) {
	useEffect( () => {
		if ( addHandler !== 'doNotAdd' ) {
			return;
		}

		debug( 'nothing to add' );
		dispatch( { type: 'PRODUCTS_ADD', products: [] } );
	}, [ addHandler, dispatch ] );
}

function useAddProductsFromLocalStorage( {
	dispatch,
	addHandler,
}: {
	dispatch: ( action: PreparedProductsAction ) => void;
	addHandler: AddHandler;
} ) {
	const translate = useTranslate();

	useEffect( () => {
		if ( addHandler !== 'addFromLocalStorage' ) {
			return;
		}

		const productsForCart: RequestCartProduct[] = getCartFromLocalStorage().map( ( product ) =>
			createRequestCartProduct( product )
		);

		if ( productsForCart.length < 1 ) {
			debug( 'creating products from localStorage failed' );
			dispatch( {
				type: 'PRODUCTS_ADD_ERROR',
				message: String( translate( 'I tried and failed to create products from signup' ) ),
			} );
			return;
		}

		debug( 'preparing products requested in localStorage', productsForCart );
		dispatch( { type: 'PRODUCTS_ADD', products: productsForCart } );
	}, [ addHandler, dispatch, translate ] );
}

function useAddRenewalItems( {
	originalPurchaseId,
	sitelessCheckoutType,
	productAlias,
	dispatch,
	addHandler,
	isGiftPurchase,
}: {
	originalPurchaseId: string | number | null | undefined;
	sitelessCheckoutType: SitelessCheckoutType;
	productAlias: string | null | undefined;
	dispatch: ( action: PreparedProductsAction ) => void;
	addHandler: AddHandler;
	isGiftPurchase?: boolean;
} ) {
	const translate = useTranslate();

	useEffect( () => {
		if ( addHandler !== 'addRenewalItems' ) {
			return;
		}
		const productSlugs = productAlias?.split( ',' ) ?? [];
		const purchaseIds = originalPurchaseId ? String( originalPurchaseId ).split( ',' ) : [];

		const productsForCart = purchaseIds
			.map( ( subscriptionId, currentIndex ) => {
				const productSlug = productSlugs[ currentIndex ];
				if ( ! productSlug ) {
					return null;
				}
				return createRenewalItemToAddToCart( {
					sitelessCheckoutType,
					productAlias: productSlug,
					purchaseId: subscriptionId,
					isGiftPurchase,
				} );
			} )
			.filter( isValueTruthy );

		if ( productsForCart.length < 1 ) {
			debug( 'creating renewal products failed', productAlias );
			dispatch( {
				type: 'PRODUCTS_ADD_ERROR',
				message: String(
					translate(
						"I tried and failed to create products matching the identifier '%(productAlias)s'",
						{
							args: { productAlias },
						}
					)
				),
			} );
			return;
		}
		debug( 'preparing renewals requested in url', productsForCart );
		dispatch( { type: 'RENEWALS_ADD', products: productsForCart } );
	}, [ addHandler, translate, originalPurchaseId, productAlias, dispatch, isGiftPurchase ] );
}

function useAddProductFromSlug( {
	productAliasFromUrl,
	dispatch,
	usesJetpackProducts,
	isPrivate,
	addHandler,
	sitelessCheckoutType,
	jetpackSiteSlug,
	jetpackPurchaseToken,
	source,
}: {
	productAliasFromUrl: string | undefined | null;
	dispatch: ( action: PreparedProductsAction ) => void;
	usesJetpackProducts: boolean;
	isPrivate: boolean;
	addHandler: AddHandler;
	sitelessCheckoutType: SitelessCheckoutType;
	jetpackSiteSlug?: string;
	jetpackPurchaseToken?: string;
	source?: string;
} ) {
	const translate = useTranslate();

	// If `productAliasFromUrl` has a comma ',' in it, we will assume it's because it's
	// referencing more than one product. Because of this, the rest of this function will
	// work with an array of products even if `productAliasFromUrl` includes only one.
	const validProducts = useMemo(
		() =>
			productAliasFromUrl
				?.split( ',' )
				// Get the product information if it exists, and keep a reference to
				// its product alias which we may need to get additional information like
				// the domain name or theme (eg: 'theme:ovation').
				.map( ( productAlias ) => {
					const productSlug = getProductSlugFromAlias( productAlias );
					return { productSlug, productAlias };
				} ) ?? [],
		[ productAliasFromUrl ]
	);

	useEffect( () => {
		if ( addHandler !== 'addProductFromSlug' ) {
			return;
		}

		const cartProducts = validProducts.map( ( product ) =>
			// Transform the product data into a RequestCartProduct
			createItemToAddToCart( {
				productSlug: product.productSlug,
				productAlias: product.productAlias,
				sitelessCheckoutType,
				jetpackSiteSlug,
				jetpackPurchaseToken,
				source,
			} )
		);

		if ( cartProducts.length < 1 ) {
			debug(
				'there is a request to add a one or more products but creating them failed',
				productAliasFromUrl
			);
			dispatch( {
				type: 'PRODUCTS_ADD_ERROR',
				message: String(
					translate(
						"I tried and failed to create products matching the identifier '%(productAlias)s'",
						{
							args: { productAlias: productAliasFromUrl },
						}
					)
				),
			} );
			return;
		}
		debug(
			'preparing products that were requested in url',
			{ productAliasFromUrl, usesJetpackProducts },
			cartProducts
		);
		dispatch( { type: 'PRODUCTS_ADD', products: cartProducts } );
	}, [
		addHandler,
		translate,
		isPrivate,
		usesJetpackProducts,
		productAliasFromUrl,
		validProducts,
		sitelessCheckoutType,
		dispatch,
		jetpackSiteSlug,
		jetpackPurchaseToken,
		source,
	] );
}

/**
 * Split up a product alias (typically used in a URL string) into its parts.
 *
 * An alias like `personal` refers to a simple Personal plan.
 *
 * An alias like `domain_map:example.com` refers to a domain mapping product
 * for the domain `example.com`.
 *
 * An alias like `theme:ovation` refers to a Premium theme with the theme slug
 * `ovation`.
 *
 * An alias like `wp_google_workspace_business_starter_yearly:example.com:-q-12`
 * refers to a Google Workspace subscription with a quantity of 12.
 *
 * To add support for additional metadata in the future, follow the pattern
 * implemented by quantity: use a string code surrounded by hyphens
 * (`-label-DATA`). Since domain names cannot start with a hyphen we will know
 * that the label refers to something else.
 */
function getProductPartsFromAlias( productAlias: string ): {
	slug: string;
	meta: null | string;
	quantity: null | number;
} {
	const [ slug, ...productParts ] = productAlias.split( ':' );

	let meta: string | null = null;
	let quantity: number | null = null;

	productParts.forEach( ( part ) => {
		if ( /^-q-\d+$/.test( part ) ) {
			quantity = parseInt( part.replace( /^-q-/, '' ), 10 );
			return;
		}
		meta = part;
	} );

	return {
		slug,
		meta,
		quantity,
	};
}

// Transform a fake slug like 'theme:ovation' into a real slug like 'premium_theme'
function getProductSlugFromAlias( productAlias: string ): string {
	const { slug: encodedAlias } = getProductPartsFromAlias( productAlias );
	// Some product slugs contain slashes, so we decode them
	const decodedAlias = decodeProductFromUrl( encodedAlias );
	if ( decodedAlias === 'domain-mapping' ) {
		return 'domain_map';
	}
	if ( decodedAlias === 'no-ads' ) {
		return 'no-adverts/no-adverts.php';
	}
	if ( decodedAlias === 'theme' ) {
		return 'premium_theme';
	}
	const plan = getPlanByPathSlug( decodedAlias );
	const planSlug = plan?.getStoreSlug();
	if ( planSlug ) {
		return planSlug;
	}
	return decodedAlias;
}

function createRenewalItemToAddToCart( {
	productAlias,
	purchaseId,
	sitelessCheckoutType,
	isGiftPurchase,
}: {
	productAlias: string;
	purchaseId: string | number | undefined | null;
	sitelessCheckoutType: SitelessCheckoutType;
	isGiftPurchase?: boolean;
} ): RequestCartProduct | null {
	const { slug, meta, quantity } = getProductPartsFromAlias( productAlias );

	// Some product slugs contain slashes, so we decode them
	const productSlug = decodeProductFromUrl( slug );

	if ( ! purchaseId ) {
		return null;
	}

	const renewalItemExtra: RequestCartProductExtra = {
		purchaseId: String( purchaseId ),
		isAkismetSitelessCheckout: sitelessCheckoutType === 'akismet',
		purchaseType: 'renewal',
		isGiftPurchase,
	};

	return {
		// Some meta values include slashes, so we decode them
		meta: meta ? decodeProductFromUrl( meta ) : '',
		quantity,
		volume: 1,
		product_slug: productSlug,
		extra: renewalItemExtra,
	};
}

function createItemToAddToCart( {
	productSlug,
	productAlias,
	sitelessCheckoutType,
	jetpackSiteSlug,
	jetpackPurchaseToken,
	source,
}: {
	productSlug: string;
	productAlias: string;
	sitelessCheckoutType: SitelessCheckoutType;
	jetpackSiteSlug?: string;
	jetpackPurchaseToken?: string;
	source?: string;
} ): RequestCartProduct {
	// Allow setting meta (theme name or domain name) from products in the URL by
	// using a colon between the product slug and the meta.
	const { meta, quantity } = getProductPartsFromAlias( productAlias );

	// Some meta values contain slashes, so we decode them
	const cartMeta = meta ? decodeProductFromUrl( meta ) : '';

	debug(
		'creating product with',
		productSlug,
		'from alias',
		productAlias,
		'with meta',
		cartMeta,
		'and quantity',
		quantity
	);

	return createRequestCartProduct( {
		product_slug: productSlug,
		quantity,
		extra: {
			isAkismetSitelessCheckout: sitelessCheckoutType === 'akismet',
			isJetpackCheckout: sitelessCheckoutType === 'jetpack',
			jetpackSiteSlug,
			jetpackPurchaseToken,
			context: 'calypstore',
			source: source ?? undefined,
		},
		...( cartMeta ? { meta: cartMeta } : {} ),
	} );
}
