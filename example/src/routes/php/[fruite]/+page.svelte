<script>

export let data;

</script>

<h1>Hello {data.name} {data.emoji}</h1>

<a class=back href=".">Go back</a>

<p class=info>Check the content of <code>`routes/php/[fruite]/+page.server.php`</code>.</p>

<hr>

<h3>Cookie support</h3>
{#if data.previous}
<p class=info>Last choise was {#if data.previous == data.name}also {/if}{data.previous}</p>
{/if}

<hr>

<h3>PHP seriarized name is </h3>
<p class=info>Result of <code>`serialize($fruite . $emoji)`</code>.</p>
<pre>{data.encoded}</pre>

<hr>

<h3>$_SERVER</h3>
<p class=info>These values are returned from PHP's $_SERVER.</p>
<pre>
{#each Object.keys(data.server) as key}
    <b>{key}</b> = {data.server[key]}<br>
{/each}
</pre>

<style>
    h3 {
        margin-bottom: 0;
    }
    p.info {
        margin-bottom: 0;
        opacity: 70%;
    }
    pre {
        box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
    }
    a.back {
        text-align: right;
    }
    hr {
        height: 1px;
        width: 100%;
        background-color: darksalmon;
    }
</style>
