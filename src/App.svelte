<script>
	import Renderer from './core/Renderer.svelte'
	import Debugger from './Debugger.svelte'

	let vine, debug
	let sourceCode = `mov r0, 1

.loop
    jal .inc_r0
    jmp .loop

.inc_r0
    add r0, 1
    jmp ra
`

	let textarea, error = null

	async function run() {
		sourceCode = textarea.value
		error = null

		try {
			debug = await vine.load({
				name: 'Default Cart',
				sourceCode,
				tileset: 'splash-tileset.png',
			})
			vine.vm.postMessage({ method: 'start' })
			vine.start()
		} catch (err) {
			error = err
		}
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

				{#if error}
					<span class='error'>{error}</span>
				{/if}
			</div>

			<textarea value={sourceCode} autocapitalize='off' autocomplete='off' spellcheck='false' bind:this={textarea}></textarea>
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
