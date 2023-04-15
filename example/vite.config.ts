import { sveltekit } from "@sveltejs/kit/vite";
import { plugin } from "../src";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [sveltekit(), plugin()],
});
