<script>
  import languages from './languages.js';

  let user = {
    isConnected: false,
    language: null,
    ws: null,
  };
  let transcribed = [];

  const handleConnect = () => {
    const ws = new WebSocket("ws://localhost:8000")
    user.ws = ws;

    ws.onopen = () => {
      user.isConnected = true;
    }

    ws.onclose = () => {
      user.isConnected = false;
      alert('you were disconnected');
    }

    ws.onmessage = (event) => {
      let message;
      try {
        message = JSON.parse(event.data);
      } catch (e) {
        console.error('Parsing error');
      }
      if (message.event === 'text') {
        transcribed = [
          ...transcribed,
          message,
        ];
      }
    }
  }

  const handleLanguageChange = () => {
    if (user.ws) {
      user.ws.send(
        JSON.stringify({ event: 'change-language', value: user.language }),
        'utf-8'
      );
    }
  }
</script>

<main>
	<h1>Amazon Transcribe/Translate Demo</h1>

  {#if !user.isConnected}
    <button on:click={handleConnect}>
      Connect!
    </button>
  {:else}
    <select bind:value={user.language} on:change={handleLanguageChange}>
    	{#each languages as {code, name} }
        <option value={code}>{name}</option>
      {/each}
    </select>

    <h3>Transcription</h3>
    <div id="transcriptionBox">
      <ul>
        {#each transcribed as {languageCode, value, latency} }
          <li>
            <b>{languageCode}</b>{#if latency }({latency}ms){/if} > {value}
          </li>
        {/each}
      </ul>
    </div>
  {/if}
</main>

<style>
	main {
		text-align: center;
		padding: 1em;
		max-width: 240px;
		margin: 0 auto;
	}

	h1 {
		color: #ff3e00;
		text-transform: uppercase;
		font-size: 2em;
		font-weight: 100;
	}

  #transcriptionBox {
    border: 1px solid #ccc;
    border-radius: 16px;

    /* center this div */
    margin: auto;
    width: 75%;
    padding: 10px;

    text-align: left;

    /* scrollbars */
    max-height: 70vh;
    overflow-y: auto;

    /* autoscroll */
    display: flex;
    flex-direction: column-reverse;
  }

  #transcriptionBox > ul {
    list-style: none;
  }

	@media (min-width: 640px) {
		main {
			max-width: none;
		}
	}
</style>
