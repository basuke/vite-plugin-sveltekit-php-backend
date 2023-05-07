import { sveltekit } from '@sveltejs/kit/vite';
import phpBackend from '../src';
import { defineConfig } from 'vite';

export default defineConfig({
    plugins: [sveltekit(), phpBackend({ address: 'localhost:9000' })],
});
