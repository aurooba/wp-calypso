import { useLocale } from '@automattic/i18n-utils';
import SearchInput from '@automattic/search';
import { useI18n } from '@wordpress/react-i18n/';
import { useTranslate } from 'i18n-calypso';
import { useMemo } from 'react';
import SelectDropdown from 'calypso/components/select-dropdown';
import { SearchIcon } from 'calypso/landing/subscriptions/components/icons';
import { Option, SortControls } from 'calypso/landing/subscriptions/components/sort-controls';
import { getOptionLabel } from 'calypso/landing/subscriptions/helpers';
import { useSubscribersFilterOptions } from 'calypso/landing/subscriptions/hooks';
import { useSubscribersPage } from 'calypso/my-sites/subscribers/components/subscribers-page/subscribers-page-context';
import { SubscribersFilterBy, SubscribersSortBy } from '../../constants';
import './style.scss';
import { useRecordSort } from '../../tracks';

const getSortOptions = ( translate: ReturnType< typeof useTranslate > ) => [
	{ value: SubscribersSortBy.Name, label: translate( 'Name' ) },
	{ value: SubscribersSortBy.DateSubscribed, label: translate( 'Recently subscribed' ) },
];

const ListActionsBar = () => {
	const translate = useTranslate();
	const {
		handleSearch,
		searchTerm,
		pageChangeCallback,
		sortTerm,
		setSortTerm,
		filterOption,
		setFilterOption,
	} = useSubscribersPage();
	const locale = useLocale();
	const { hasTranslation } = useI18n();
	const newDropdownOptionsReady =
		locale.startsWith( 'en' ) ||
		( hasTranslation( 'Subscribers: %s' ) &&
			hasTranslation( 'Via Email' ) &&
			hasTranslation( 'Via WordPress.com' ) );
	const sortOptions = useMemo( () => getSortOptions( translate ), [ translate ] );
	const recordSort = useRecordSort();
	const filterOptions = useSubscribersFilterOptions( newDropdownOptionsReady );
	const selectedText = newDropdownOptionsReady
		? translate( 'Subscribers: %s', {
				args: getOptionLabel( filterOptions, filterOption ) || '',
		  } )
		: translate( 'Subscriber type: %s', {
				args: getOptionLabel( filterOptions, filterOption ) || '',
		  } );

	return (
		<div className="list-actions-bar">
			<SearchInput
				placeholder={ translate( 'Search by name, username or email…' ) }
				searchIcon={ <SearchIcon size={ 18 } /> }
				onSearch={ handleSearch }
				onSearchClose={ () => handleSearch( '' ) }
				defaultValue={ searchTerm }
			/>

			<SelectDropdown
				className="subscribers__filter-control"
				options={ filterOptions }
				onSelect={ ( selectedOption: Option< SubscribersFilterBy > ) => {
					setFilterOption( selectedOption.value );
					pageChangeCallback( 1 );
				} }
				selectedText={ selectedText }
				initialSelected={ filterOption }
			/>

			<SortControls
				options={ sortOptions }
				value={ sortTerm }
				onChange={ ( term ) => {
					setSortTerm( term );
					recordSort( { sort_field: term } );
				} }
			/>
		</div>
	);
};

export default ListActionsBar;
