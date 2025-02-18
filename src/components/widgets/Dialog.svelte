<script lang="ts">
    import { onMount, tick } from 'svelte';
    import { locales } from '../../db/Database';
    import Button from './Button.svelte';
    import type { DialogText } from '../../locale/UITexts';
    import Header from '../app/Header.svelte';
    import MarkupHtmlView from '../concepts/MarkupHTMLView.svelte';

    export let show = false;
    export let description: DialogText;
    export let width: string | undefined = undefined;
    export let closeable = true;
    export let button: { tip: string; label: string } | undefined = undefined;

    let view: HTMLDialogElement | undefined = undefined;

    $: {
        if (view) {
            if (show) {
                view.showModal();
                tick().then(() => view?.focus());
            } else {
                view.close();
            }
        }
    }

    function outclick(event: PointerEvent) {
        if (view && event.target === view) show = false;
    }

    onMount(() => {
        if (closeable) {
            document.addEventListener('pointerdown', outclick);
            return () => document.removeEventListener('pointerdown', outclick);
        }
    });
</script>

{#if button}
    <Button tip={button.tip} action={() => (show = true)}>{button.label}</Button
    >
{/if}
<!-- svelte-ignore a11y-no-noninteractive-element-interactions -->
<dialog
    bind:this={view}
    style:width
    tabindex="-1"
    on:keydown={closeable
        ? (event) => (event.key === 'Escape' ? (show = false) : undefined)
        : undefined}
>
    <div class="content">
        <Header>{description.header}</Header>
        <MarkupHtmlView markup={description.explanation} />
        <slot />
        {#if closeable}
            <div class="close">
                <Button
                    tip={$locales.get((l) => l.ui.widget.dialog.close)}
                    action={() => (show = false)}>❌</Button
                >
            </div>
        {/if}
    </div>
</dialog>

<style>
    dialog {
        position: relative;
        border-radius: var(--wordplay-border-radius);
        padding: 2em;
        width: 80vw;
        height: max-content;
        background-color: var(--wordplay-background);
        color: var(--wordplay-foreground);
        border: var(--wordplay-border-width) solid var(--wordplay-border-color);
    }

    dialog::backdrop {
        transition: backdrop-filter;
        backdrop-filter: blur(10px);
    }

    .close {
        position: absolute;
        top: calc(2 * var(--wordplay-spacing));
        right: calc(2 * var(--wordplay-spacing));
    }

    .content {
        min-height: 100%;
    }
</style>
