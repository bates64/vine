<script>
	import Vine from './core/Vine.svelte'
	import VirtualMachine from './core/vm/VirtualMachine.ts'
	import assemble from './core/asm/assemble.ts'

	let vm = new VirtualMachine(assemble(`
		; TODO: 'no cart loaded'

		; This example program implements a simple 'paint' program based
		; on the current mouse position.

		MOV r0, oooo+oooo ; red
		NOP
		NOP
		.loop
		; x pos
		LDA r1, --------- ; mouse x
		ADD r1, 121
		DIV r1, 9

		; y pos
		LDA r2, --------o ; mouse x
		ADD r2, 121
		DIV r2, 9

		; set cell
		MUL r2, 54
		ADD r1, r2
		ADD r1, o---+---- ; start of tilemap
		STA r0, r1

		JMP -------oo ; .loop
	`))
</script>

<Vine vm={vm} />
