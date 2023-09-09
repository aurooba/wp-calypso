import { exec as _exec } from 'node:child_process';
import { createWriteStream } from 'node:fs';
import path from 'node:path';
import { Readable } from 'node:stream';
import { finished } from 'node:stream/promises';
import util from 'node:util';
const promiseExec = util.promisify( _exec );

const exec = async ( cmd, opts ) => {
	return promiseExec( cmd, {
		encoding: 'UTF-8',
		stdio: 'inherit',
		...opts,
	} );
};

export default async function didCalypsoAppChange( { slug, dir, newReleaseDir, normalizeFiles } ) {
	await downloadPrevBuild( slug, dir );

	if ( normalizeFiles ) {
		await exec( normalizeFiles, { cwd: path.join( dir, 'prev-release' ) } );
	}

	try {
		await exec(
			`diff -rq --exclude="*.js.map" --exclude="*.asset.php" --exclude="build_meta.json" --exclude="README.md" ${ newReleaseDir } ${ dir }/prev-release/`,
			{ cwd: dir }
		);
		return false;
	} catch ( { code, stdout, stderr } ) {
		if ( code === 1 ) {
			console.info( `The build for ${ slug } changed. Cause:` );
			console.info( stdout );
			return true;
		}
		throw new Error( `Unexpected error code ${ code } while diffing ${ slug } build: ${ stderr }` );
	}
}

async function downloadPrevBuild( appSlug, dir ) {
	const prevBuildZip = `${ dir }/prev-archive-download.zip`;
	const stream = createWriteStream( prevBuildZip );

	const prevBuildUrl = `${ process.env.tc_sever_url }/repository/download/calypso_calypso_WPComPlugins_Build_Plugins/${ appSlug }-release-build.tcbuildtag/${ appSlug }.zip?guest=1&branch=try-parallel-app-processing`;
	console.info( `Fetching previous release build for ${ appSlug } from ${ prevBuildUrl }` );

	const { body, status } = await fetch( prevBuildUrl );
	if ( status !== 200 ) {
		throw new Error( `Could not fetch previous build! Response code ${ status }.` );
	}

	console.info( `Extracting downloaded archive for ${ appSlug }...` );
	await finished( Readable.fromWeb( body ).pipe( stream ) );
	await exec( `unzip -q ${ prevBuildZip } -d ${ dir }/prev-release` );
}
