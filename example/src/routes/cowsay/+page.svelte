<script>
    export let data;
</script>

<pre>{#each data.lines as line}{line}<br>{/each}</pre>

<style>
    pre {
        /* font-family: 'Courier New', Courier, monospace; */
        background: transparent;
        margin: 4rem auto 0;
    }
</style>