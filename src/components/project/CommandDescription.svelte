<script lang="ts">
    import { locales } from '@db/Database';
    import { toShortcut, type Command } from '../editor/util/Commands';

    export let command: Command;
</script>

<tr class="command">
    <td class="symbol">{command.symbol}</td>
    <td class="shortcut"><em>{toShortcut(command)}</em></td>
    <td class="description">{$locales.get(command.description)}</td>
</tr>

<style>
    td {
        padding: var(--wordplay-spacing);

        vertical-align: top;
    }

    tr:nth-child(odd) {
        background: var(--wordplay-alternating-color);
    }
</style>
