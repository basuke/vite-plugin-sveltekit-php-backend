import { sveltekit } from '@sveltejs/kit/vite';
import phpBackend from '..';
import { defineConfig } from 'vite';

export default defineConfig({
    plugins: [sveltekit(), phpBackend({ address: 'localhost:9000' })],
});
