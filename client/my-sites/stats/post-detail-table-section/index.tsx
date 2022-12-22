import { Card } from '@automattic/components';
import { translate } from 'i18n-calypso';
import { useState } from 'react';
import SimplifiedSegmentedControl from 'calypso/components/segmented-control/simplified';
import PostMonths from '../stats-detail-months';
import PostWeeks from '../stats-detail-weeks';

import './style.scss';

type TableOption = {
	value: string;
	label: string;
};

// Meant to replace tables of stats-post-detail
export default function PostDetailTableSection( {
	siteId,
	postId,
}: {
	siteId: number;
	postId: number;
} ) {
	const [ tableKey, setTableKey ] = useState( 'years' );

	const tableOptions = [
		{ value: 'years', label: translate( 'Months and years' ) },
		{ value: 'averages', label: translate( 'Average per day' ) },
		{ value: 'weeks', label: translate( 'Recent weeks' ) },
	];

	const toggleTable = ( option?: TableOption ) => {
		setTableKey( option?.value || 'years' );
	};

	return (
		<div className="stats__post-detail-table-section stats__modernized-stats-table">
			<div className="highlight-cards">
				<h1 className="highlight-cards-heading">{ translate( 'All-time Insights' ) }</h1>

				<div className="highlight-cards-list">
					<Card className="highlight-card">
						<div className="highlight-card-heading">
							<span>{ translate( 'Total views' ) }</span>
							<SimplifiedSegmentedControl options={ tableOptions } onSelect={ toggleTable } />
						</div>

						<div className="stats__table-wrapper">
							{ [ 'years', 'averages' ].includes( tableKey ) ? (
								<PostMonths
									dataKey={ tableKey }
									title={ tableOptions.find( ( o ) => o.value === tableKey )?.label || 'Title' }
									total={ tableKey === 'years' ? translate( 'Total' ) : translate( 'Overall' ) }
									siteId={ siteId }
									postId={ postId }
								/>
							) : (
								<PostWeeks siteId={ siteId } postId={ postId } />
							) }
						</div>

						<div className="stats-views__key-container">
							<span className="stats-views__key-label">
								{ translate( 'Fewer Views', {
									context: 'Legend label in stats all-time views table',
								} ) }
							</span>
							<ul className="stats-views__key">
								<li className="stats-views__key-item level-1" />
								<li className="stats-views__key-item level-2" />
							</ul>
							<span className="stats-views__key-label">
								{ translate( 'More Views', {
									context: 'Legend label in stats all-time views table',
								} ) }
							</span>
						</div>
					</Card>
				</div>
			</div>
		</div>
	);
}
