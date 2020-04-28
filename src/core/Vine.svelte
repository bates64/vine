<script>
	import { onMount } from 'svelte'
	import VineCanvas from './vine.ts'

	export let vm

	let parentEl, vine

	onMount(() => {
		vine = new VineCanvas(parentEl, vm)
		vine.start()
	})
</script>

<div bind:this={parentEl}></div>

<style>
	div {
		background: #000;
	}
</style>
