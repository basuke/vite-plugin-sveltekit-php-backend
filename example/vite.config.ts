import { sveltekit } from '@sveltejs/kit/vite';
import phpBackend from 'vite-plugin-sveltekit-php-backend';
import { defineConfig } from 'vite';

export default defineConfig({
    plugins: [sveltekit(), phpBackend({ address: 'localhost:9000' })],
});
