<script>
	import { onMount } from 'svelte'

	import VineCanvas from './vine.ts'
	import VirtualMachine from './vm/VirtualMachine.js'

	export let vm = new VirtualMachine() // TODO: assemble a 'No Cart Loaded' screen

	let parentEl, vine

	onMount(() => {
		vine = new VineCanvas(parentEl, vm)
	})
</script>

<div bind:this={parentEl}></div>

<style>
	div {
		background: #000;
	}
</style>
