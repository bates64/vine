<script>
	import Renderer from './core/Renderer.svelte'
	import Debugger from './Debugger.svelte'

	let vine, debug
	let sourceCode = localStorage.sourceCode || `.loop
  mov r3, oo+oooooo ; red tile
  jal .get_mouse_tile_pos
  sto r3, r2, $TILEMAP
  jmp .loop

.get_mouse_tile_pos ; returns (r0 = x, r1 = y, r2 = index)
  ; x (r0)
  lda r0, $MOUSE_X
  add r0, 121      ; adjust so origin is 0,0 rather than centre
  div r0, 9        ; to grid
  ; y (r1)
  lda r1, $MOUSE_Y
  add r1, 121      ; adjust origin
  div r1, 9        ; to grid
  ; index (r2)
  mov r2, r1
  mul r2, 27       ; row size
  add r2, r0
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
			vine.clear()
			vine.start()
			vine.vm.postMessage({ method: 'start' })
		} catch (err) {
			error = err
		}
	}

	function sourceCodeChange() {
		sourceCode = textarea.value
		localStorage.sourceCode = sourceCode
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

			<textarea value={sourceCode} autocapitalize='off' autocomplete='off' spellcheck='false' bind:this={textarea} on:change={sourceCodeChange}></textarea>
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
