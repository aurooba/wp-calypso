import React from 'react';

export function withScrollTopOnClick<
	T,
	P extends { href?: string; onClick?: React.MouseEventHandler< T > }
>( WrappedComponent: React.ComponentType< P > ) {
	return function WithScrollTopOnClick( props: P ) {
		function handleClick( event: React.MouseEvent< T > ) {
			const { onClick, href } = props;
			if ( href ) {
				window.scrollTo( 0, 0 );
			}
			if ( typeof onClick === 'function' ) {
				onClick( event );
			}
		}

		return <WrappedComponent { ...props } onClick={ handleClick } />;
	};
}
