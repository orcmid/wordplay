<script lang="ts">
    import type OutputPropertyValues from '@edit/OutputPropertyValueSet';
    import TextLiteral from '@nodes/TextLiteral';
    import TextField from '../widgets/TextField.svelte';
    import type OutputProperty from '@edit/OutputProperty';
    import { getProject } from '../project/Contexts';
    import { locales, Projects } from '@db/Database';
    import { tick } from 'svelte';
    import Language from '@nodes/Language';
    import { FORMATTED_SYMBOL } from '@parser/Symbols';
    import { parseFormattedLiteral } from '@parser/parseExpression';
    import { toTokens } from '@parser/toTokens';

    export let property: OutputProperty;
    export let values: OutputPropertyValues;
    export let validator: (text: string) => boolean;
    export let editable: boolean;

    let project = getProject();
    let view: HTMLInputElement | undefined = undefined;

    // Whenever the text changes, update in the project.
    async function handleChange(newValue: string) {
        if ($project === undefined) return;
        Projects.revise(
            $project,
            $project.getBindReplacements(
                values.getExpressions(),
                property.getName(),
                newValue.startsWith(FORMATTED_SYMBOL)
                    ? parseFormattedLiteral(toTokens(newValue))
                    : TextLiteral.make(
                          newValue,
                          Language.make($locales.getLanguages()[0])
                      )
            )
        );

        await tick();
        view?.focus();
    }
</script>

<TextField
    text={values.getText()}
    description={$locales.get((l) => l.ui.palette.field.text)}
    placeholder={values.isEmpty()
        ? ''
        : $locales.getName(values.values[0].bind.names)}
    {validator}
    changed={handleChange}
    bind:view
    {editable}
/>
