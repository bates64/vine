<script>
	import Vine from './core/Vine.svelte'
	import Debugger from './Debugger.svelte'

	let sourceCode = `
.loop
ADD r0, +
JMP .loop
`

	let vine, setup = false
	$: if (vine && !setup) {
		setup = true
		vine.load({
			name: 'Default Cart',
			sourceCode,
			tileset: 'splash-tileset.png',
		})
	}
</script>

<div>
	<Vine bind:vine={vine} size={243 * 3} />

	{#if vine}
		<Debugger vine={vine} />
	{/if}
</div>

<textarea bind:value={sourceCode}></textarea>

<style>
	div {
		display: flex;
		flex-direction: row;
		padding: 2rem;
	}
</style>
