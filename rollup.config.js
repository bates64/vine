import svelte from 'rollup-plugin-svelte';
import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import livereload from 'rollup-plugin-livereload';
import { terser } from 'rollup-plugin-terser';
import typescript from '@rollup/plugin-typescript';
import workerLoader from 'rollup-plugin-web-worker-loader'
import strip from '@rollup/plugin-strip'
import { dependencies } from './package.json'

const production = !process.env.ROLLUP_WATCH;

export default {
	input: 'src/main.js',
	output: {
		sourcemap: true,
		format: 'esm',
		file: 'public/build/bundle.js'
	},
	plugins: [
		workerLoader(),

		typescript({ noEmitOnError: true }),

		svelte({
			// enable run-time checks when not in production
			dev: !production,
			// we'll extract any component CSS out into
			// a separate file - better for performance
			css: css => {
				css.write('public/build/bundle.css');
			}
		}),

		cdn(new Set(['pixi.js', 'three'])),
		resolve({
			browser: true,
			jsnext: true,
			dedupe: ['svelte'],
		}),
		commonjs({
			exclude: 'node_modules/@pixi/**/*.*',
		}),

		production && strip({
			functions: ['console.debug'],
		}),

		!production && serve(),
		!production && livereload('public'),

		production && terser()
	],
	watch: {
		clearScreen: false
	}
};

function serve() {
	let started = false;

	return {
		writeBundle() {
			if (!started) {
				started = true;

				require('child_process').spawn('npm', ['run', 'start', '--', '--dev'], {
					stdio: ['ignore', 'inherit', 'inherit'],
					shell: true
				});
			}
		}
	};
}

function cdn(whitelist) {
	return {
		resolveId(id, _importer) {
			if (!whitelist.has(id)) {
				return
			}

			let [packageName, ...components] = id.split('/')

			if (packageName.startsWith('@')) {
				packageName += `/${components.shift()}`
			}

			const version = dependencies[packageName]
			if (version) {
				return {
					id: components.length === 0 ?
						`https://cdn.pika.dev/${packageName}@${version}` :
						`https://cdn.pika.dev/${packageName}@${version}/${components.join('/')}`,
					external: true,
				}
			}
		},
	}
}
