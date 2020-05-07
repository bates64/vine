<script>
	import Renderer from './core/Renderer.svelte'
	import Debugger from './Debugger.svelte'
	import { examples } from './core/Cartridge'

	let vine, debug
	let cartridge
	let exampleIndex = 0

	$: if (exampleIndex > -1) {
		cartridge = examples[exampleIndex]
	}

	if (localStorage.cartridge) {
		try {
			exampleIndex = -1
			cartridge = JSON.parse(localStorage.cartridge)
		} catch {
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
	}

	window.onbeforeunload = () => {
		localStorage.cartridge = JSON.stringify(cartridge)
	}
</script>

<div class='app'>
	<Renderer bind:vine={vine} size={243 * 3} />

	<aside>
		{#if debug}
			<Debugger vine={vine} debug={debug} />
			<br>
			<button on:click={() => {
				vine.vm.postMessage({ method: 'stepAndRequestState' })
				vine.stop()
				debug = null
			}}>Stop</button>
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
					<span class='error'>{error}</span>
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

		font: 1rem monospace;
		color: white;
		background: black;

		border: 0;
		padding: 8px;
	}

	textarea:focus {
		outline: 0;
	}

	.error {
		color: #ff6e6e;
	}
</style>
