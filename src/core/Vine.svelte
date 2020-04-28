<script>
	import { onMount, onDestroy } from 'svelte'
	import * as comlink from 'comlink'

	import VineCanvas from './vine.ts'
	import VirtualMachineWorker from 'web-worker:./vm/VirtualMachine.ts'

	const VirtualMachine = comlink.wrap(new VirtualMachineWorker())

	export let vm = null

	let parentEl, vine

	onMount(async () => {
		vm = await new VirtualMachine()
		vine = new VineCanvas(parentEl, vm)
	})

	onDestroy(() => {
		if (vm) vm.terminate()
	})
</script>

<div bind:this={parentEl}></div>

<style>
	div {
		background: #000;
	}
</style>
