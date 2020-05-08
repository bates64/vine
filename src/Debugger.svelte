<script>
	import { t2s, t2n, n2t } from './core/vm/ALU'

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

	function getLinesAroundAddress(centreAddress, radius) {
		if (!debug) return []
		if (!debug.instructions.has(centreAddress)) return []

		const lines = []

		// Lines before
		let addr = centreAddress, triesLeft = radius * 2
		while (lines.length < radius) {
			addr--

			if (debug.instructions.has(addr)) {
				const { line, address } = debug.instructions.get(addr)
				lines.unshift({ line, address: t2s(n2t(addr)), isNext: false })
			}

			// Failsafe, e.g. we go past memory bounds
			if (triesLeft-- <= 0) {
				break
			}
		}

		// The given line
		lines.push({
			line: debug.instructions.get(centreAddress).line,
			address: t2s(n2t(centreAddress)),
			isNext: true,
		})

		// Lines after
		addr = centreAddress, triesLeft = radius * 2
		while (lines.length < radius * 2 + 1) {
			addr++

			if (debug.instructions.has(addr)) {
				const { line, address } = debug.instructions.get(addr)
				lines.push({ line, address: t2s(address), isNext: false })
			}

			// Failsafe, e.g. we go past memory bounds
			if (triesLeft-- <= 0) {
				break
			}
		}

		return lines
	}

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
	<div>
		{#if awaitingResponse}
			<button>....</button>
		{:else}
			<button on:click={step}>Step</button>
		{/if}
		<button on:click={play}>Play</button>
		<slot/>
	</div>

	<p>
		{#each getLinesAroundAddress(t2n(state.nextInstruction), 5) as { line, address, isNext }}
			<span class='dim'>{address}</span>
			{#if isNext}
				{line}
			{:else}
				<span class='dim'>{line}</span>
			{/if}
			<br>
		{/each}
	</p>

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
	<div>
		<button on:click={step}>Pause and debug</button>
		<slot/>
	</div>
{/if}

<style>
	button {
		font: inherit;
	}

	.dim {
		color: #888;
	}
</style>
