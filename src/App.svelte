<script>
	import Renderer from './core/Renderer.svelte'
	import Debugger from './Debugger.svelte'
	import { examples } from './core/Cartridge'

	let vine, debug
	let cartridge
	let exampleIndex = 0

	$: if (exampleIndex > -1) {
		if (window.location.hash) {
			if (confirm('Your edits are unsaved! Are you sure you want to load a new cartridge?')) {
				cartridge = examples[exampleIndex]
				window.location.hash = ''
			} else {
				exampleIndex = -1
			}
		} else {
			cartridge = examples[exampleIndex]
		}
	}

	if (window.location.hash) {
		try {
			exampleIndex = -1
			cartridge = JSON.parse(LZUTF8.decompress(
				window.location.hash.substr(1),
				{ inputEncoding: 'Base64' },
			))
		} catch (err) {
			console.error(err)
			exampleIndex = 0
		}
	}

	let textarea, error = null

	async function run() {
		error = null

		try {
			debug = await vine.load(cartridge)
			vine.clear()
			vine.start()
			vine.vm.postMessage({ method: 'start' })
		} catch (err) {
			error = err
		}
	}

	function sourceCodeChange() {
		cartridge = { ...cartridge, sourceCode: textarea.value }
		exampleIndex = -1

		const dataFat = JSON.stringify(cartridge)
		LZUTF8.compressAsync(dataFat, { outputEncoding: 'Base64' }, (data, err) => {
			if (err) throw err
			window.location.hash = data
			console.log(`Compression: ${data.length / dataFat.length * 100}%`)
		})
	}
</script>

<div class='app'>
	<Renderer bind:vine={vine} size={243 * 3} />

	<aside>
		{#if debug}
			<Debugger vine={vine} debug={debug}>
				<button on:click={() => {
					vine.vm.postMessage({ method: 'stepAndRequestState' })
					vine.stop()
					debug = null
				}}>
					Stop
				</button>
			</Debugger>
		{:else}
			<div>
				<button on:click={run}>Assemble and run</button>

				<select bind:value={exampleIndex}>
					{#if exampleIndex === -1}
						<option value={-1}>Custom</option>
					{/if}
					{#each examples as example, i}
						<option value={i}>Example: {example.name}</option>
					{/each}
				</select>

				{#if error}
					<div class='error'>{error}</div>
				{/if}
			</div>

			<textarea
				bind:this={textarea}

				value={cartridge.sourceCode}
				on:change={sourceCodeChange}

				autocapitalize='off'
				autocomplete='off'
				spellcheck='false'
			></textarea>
		{/if}
	</aside>
</div>

<style>
	.app {
		display: flex;
		flex-direction: row;
		padding: 2rem;

		min-height: 100%;

		user-select: none;
	}

	aside {
		flex: 1;
		margin-left: 2em;

		display: flex;
		flex-direction: column;
	}

	textarea {
		flex: 1;
		resize: none;

		font: inherit;
		color: #b2bcc2;
		background: transparent;

		border: 0;
		padding: 0;
		margin: 0;
		margin-top: .5em;

		user-select: all;
	}

	textarea:focus {
		outline: 0;
	}

	::selection {
		background: #b2bcc2;
		color: #fff;
	}

	.error {
		color: #e14141;
		margin-top: .5em;
	}
</style>
