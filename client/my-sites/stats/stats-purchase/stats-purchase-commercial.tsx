import { Button as CalypsoButton } from '@automattic/components';
import { Button } from '@wordpress/components';
import classNames from 'classnames';
import { useTranslate } from 'i18n-calypso';
import { useSelector } from 'calypso/state';
import getIsSiteWPCOM from 'calypso/state/selectors/is-site-wpcom';
import gotoCheckoutPage from './stats-purchase-checkout-redirect';
import { StatsCommercialPriceDisplay } from './stats-purchase-shared';
import { COMPONENT_CLASS_NAME } from './stats-purchase-wizard';

interface CommercialPurchaseProps {
	planValue: number;
	currencyCode: string;
	siteId: number | null;
	siteSlug: string;
	adminUrl: string;
	redirectUri: string;
	from: string;
}

const CommercialPurchase = ( {
	planValue,
	currencyCode,
	siteId,
	siteSlug,
	adminUrl,
	redirectUri,
	from,
}: CommercialPurchaseProps ) => {
	const translate = useTranslate();

	const isWPCOMSite = useSelector( ( state ) => siteId && getIsSiteWPCOM( state, siteId ) );
	// The button of @automattic/components has built-in color scheme support for Calypso.
	const ButtonComponent = isWPCOMSite ? CalypsoButton : Button;

	return (
		<div>
			<div
				className={ classNames(
					`${ COMPONENT_CLASS_NAME }__notice`,
					`${ COMPONENT_CLASS_NAME }__notice--green`
				) }
			>
				{ translate(
					'Upgrade now to take advantage of the introductory flat rate. Starting in 2024, we will introduce metered billing. '
				) }
				<Button
					variant="link"
					href="https://jetpack.com/redirect/?source=jetpack-stats-learn-more-about-site-types"
					target="_blank"
					rel="noopener noreferrer"
				>
					{ translate( 'Learn more' ) }
				</Button>
			</div>

			<StatsCommercialPriceDisplay planValue={ planValue } currencyCode={ currencyCode } />

			<div className={ `${ COMPONENT_CLASS_NAME }__benefits` }>
				<ul className={ `${ COMPONENT_CLASS_NAME }__benefits--included` }>
					<li>{ translate( 'Instant access to upcoming features' ) }</li>
					<li>{ translate( 'Priority support' ) }</li>
				</ul>
			</div>

			<ButtonComponent
				variant="primary"
				primary={ isWPCOMSite ? true : undefined }
				onClick={ () =>
					gotoCheckoutPage( { from, type: 'commercial', siteSlug, adminUrl, redirectUri } )
				}
			>
				{ translate( 'Get Jetpack Stats' ) }
			</ButtonComponent>
		</div>
	);
};

export default CommercialPurchase;
