import { Gridicon } from '@automattic/components';
import { PartialDomainData } from '@automattic/data-stores';
import { useLocale } from '@automattic/i18n-utils';
import { sprintf } from '@wordpress/i18n';
import { useI18n } from '@wordpress/react-i18n';
import moment from 'moment';

interface DomainsTableExpiresRewnewsOnCellProps {
	domain: PartialDomainData;
}

export const DomainsTableExpiresRewnewsOnCell = ( {
	domain,
}: DomainsTableExpiresRewnewsOnCellProps ) => {
	const localeSlug = useLocale();
	const isExpired = domain.expiry && moment( domain.expiry ).utc().isBefore( moment().utc() );
	const { __ } = useI18n();

	const expiryDate = domain.has_registration
		? new Intl.DateTimeFormat( localeSlug, { dateStyle: 'medium' } ).format(
				new Date( domain.expiry )
		  )
		: null;

	const notice = isExpired
		? sprintf(
				/* translators: %s - The date on which the domain was expired */
				__( 'Expired %s' ),
				expiryDate
		  )
		: sprintf(
				/* translators: %s - The future date on which domain renews */
				__( 'Renews %s' ),
				expiryDate
		  );

	return (
		<div className="domains-table-row__renews-on-cell">
			{ expiryDate ? (
				<>
					<Gridicon icon={ isExpired ? 'notice-outline' : 'reblog' } size={ 18 } />
					{ notice }
				</>
			) : (
				'-'
			) }
		</div>
	);
};
