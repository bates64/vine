<script>
	import { t2s, t2n } from './core/vm/ALU'

	export let vine
	export let debug

	let state = null
	let awaitingResponse = false

	vine.vm.addEventListener('message', e => {
		const { method, ...args } = e.data

		if (method === 'respondState') {
			awaitingResponse = false
			state = args
		}
	})

	function step() {
		if (!awaitingResponse) {
			awaitingResponse = true
			vine.vm.postMessage({ method: 'stepAndRequestState' })
		}
	}

	function play() {
		vine.vm.postMessage({ method: 'start' })
		state = null
	}
</script>

{#if state}
	{#if awaitingResponse}
		<button>....</button>
	{:else}
		<button on:click={step}>Step</button>
	{/if}
	<button on:click={play}>Play and stop debugging</button>
	<br> <br>

	Next instruction address: {t2s(state.nextInstruction)}<br> <br>

	r0 = {t2s(state.registers[0])} = {t2n(state.registers[0])}<br>
	r1 = {t2s(state.registers[1])} = {t2n(state.registers[1])}<br>
	r2 = {t2s(state.registers[2])} = {t2n(state.registers[2])}<br>
	r3 = {t2s(state.registers[3])} = {t2n(state.registers[3])}<br>
	r4 = {t2s(state.registers[4])} = {t2n(state.registers[4])}<br>
	r5 = {t2s(state.registers[5])} = {t2n(state.registers[5])}<br>
	r6 = {t2s(state.registers[6])} = {t2n(state.registers[6])}<br>
	ra = {t2s(state.registers[7])} = {t2n(state.registers[7])}<br>
	sp = {t2s(state.registers[8])} = {t2n(state.registers[8])}<br>
{:else}
	<button on:click={step}>Pause and debug</button>
{/if}

<style>
	button {
		font: inherit;
	}
</style>
