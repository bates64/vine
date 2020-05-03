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

	async function run() {
		debug = await vine.load({
			name: 'Default Cart',
			sourceCode: sourceCode,
			tileset: 'splash-tileset.png',
		})
		vine.vm.postMessage({ method: 'start' })
		vine.start()
	}
</script>

<div class='app'>
	<Renderer bind:vine={vine} bind:debug={debug} size={243 * 3} />

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
			</div>

			<textarea bind:value={sourceCode} autocapitalize='off' autocomplete='off' spellcheck='false'></textarea>
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
</style>
