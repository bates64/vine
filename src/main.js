import App from './App.svelte';
import * as core from './core/vine.ts';

const app = new App({
	target: document.body,
	props: {
		name: 'world'
	}
});

export default app;
