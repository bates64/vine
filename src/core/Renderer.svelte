<script>
	import { onMount, onDestroy } from 'svelte'

	import VineCanvas from './vine.ts'
	import VmWorker from 'web-worker:./vm/worker.js'

	export let size = 243
	export let vine = null

	let vm, canvas2d, canvas3d

	onMount(async () => {
		vm = VmWorker()
		vine = new VineCanvas(vm, canvas2d, canvas3d)
	})

	onDestroy(() => {
		if (vine) vine.terminate()
		if (vm) vm.terminate()
	})
</script>

<div
	style='--size: {size}px'
	on:mousemove={evt => {
		const ndc = {
			// (0, 0) is middle of canvas and (1, 1) is bottom right.
			x: (evt.offsetX / size) * 2 - 1,
			y: (evt.offsetY / size) * 2 - 1,
		}

		if (vm) vm.postMessage({
			method: 'setMousePos',
			x: Math.round(ndc.x * 121.5),
			y: Math.round(ndc.y * 121.5),
		})
	}}
	on:mousedown={evt => vm && vm.postMessage({
		method: 'setMouseButton',
		button: evt.button,
		down: true,
	})}
	on:mouseup={evt => vm && vm.postMessage({
		method: 'setMouseButton',
		button: evt.button,
		down: false,
	})}
	on:contextmenu|preventDefault
>
	<canvas class='3d' bind:this={canvas3d}></canvas>
	<canvas class='2d' bind:this={canvas2d}></canvas>
</div>

<style>
	div {
		margin: 0 auto;

		border: 1px dotted;

		position: relative;
		width: var(--size);
		height: var(--size);
	}

	canvas {
		position: absolute;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;

		image-rendering: crisp-edges;
		image-rendering: optimisespeed;
		image-rendering: pixelated;
	}
</style>
