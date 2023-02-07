import type Project from '../models/Project';
import type LanguageCode from '../translation/LanguageCode';
import type TypeOutput from './TypeOutput';
import type Place from './Place';
import { createPlace } from './Place';
import RenderContext from './RenderContext';
import type Verse from './Verse';
import OutputAnimation from './OutputAnimation';
import type Transition from './Transition';
import type Node from '@nodes/Node';
import { DefaultFont, DefaultSize } from './Verse';

export type OutputName = string;

export type OutputInfo = {
    output: TypeOutput;
    global: Place;
    local: Place;
    parents: TypeOutput[];
    context: RenderContext;
};

export type OutputInfoSet = Map<OutputName, OutputInfo>;

/**
 * Derived state of the previous and current Verses.
 * It's responsible for determining what is visible, triggering layout,
 * preparing groups for rendering, and triggering transitions and animations
 * when things enter, move, and exit. It is not itself responsible for animating;
 * that is the job of the Animator. It relies on the project to be updated
 * any time the project reevaluates.
 * */
export default class Stage {
    readonly project: Project;

    /** The current verse being displayed */
    verse: Verse | undefined = undefined;

    /** True if the stage is animated and interactive */
    live: boolean = true;

    /** The current languages being displayed */
    languages: LanguageCode[] = [];

    /** The current fonts that are loaded */
    fontsLoaded: Set<string> = new Set();

    /** The current viewport size from the verse */
    viewportWidth: number = 0;
    viewportHeight: number = 0;

    /** The current focus from the verse. */
    focus: Place;

    /** The previous and current places where groups are at */
    scene: OutputInfoSet = new Map<OutputName, OutputInfo>();
    priorScene: OutputInfoSet = new Map<OutputName, OutputInfo>();

    /** The active animations, responsible for tracking transitions and animations on named output. */
    readonly animations = new Map<OutputName, OutputAnimation>();

    /** The current sequence being animated */
    animatingNodes = new Set<Node>();

    /**
     * A callback provided by the instantiator to call when the stage is in need of an update
     * because an animation finished. Currently this is mostly necessary for exiting phrases.
     **/
    readonly exit: (name: OutputName) => void;

    /** A callback for when the animating nodes change, so other parts of the UI can highlight them. */
    readonly tick: (nodes: Set<Node>) => void;

    constructor(
        project: Project,
        exit: (name: OutputName) => void,
        tick: (nodes: Set<Node>) => void
    ) {
        this.project = project;
        this.exit = exit;
        this.tick = tick;

        // Initialize unintialized defaults.
        this.focus = createPlace(this.project.evaluator, 0, 0, -12);
    }

    /**
     * When any of the following inputs change, update the stage accordingly so that the
     * rendered screen reflects it.
     */
    update(
        verse: Verse,
        live: boolean,
        languages: LanguageCode[],
        fonts: Set<string>,
        focus: Place,
        width: number,
        height: number
    ) {
        this.verse = verse;
        this.live = live;
        this.languages = languages;
        this.fontsLoaded = fonts;
        this.focus = focus;
        this.viewportWidth = width;
        this.viewportHeight = height;

        // Create sets of who entered, exited, and present output by their name.
        const entered = new Map<OutputName, TypeOutput>();
        const moved = new Map<
            OutputName,
            { output: TypeOutput; prior: Place; present: Place }
        >();
        const exited = new Map<OutputName, TypeOutput>();
        const present = new Map<OutputName, TypeOutput>();

        // Compute places, parents, contexts, etc. for all the output in the verse.
        const newScene = this.layout(
            this.verse,
            [],
            new Map<OutputName, OutputInfo>(),
            this.getRenderContext()
        );

        // Based on the places, figure out which output is present and visible.
        for (const [name, info] of newScene) {
            const output = info.output;

            // Add this name and phrase to the present sets.
            present.set(name, output);

            // Was this phrase not previously present? Add to the entered set.
            if (!this.priorScene.has(name)) entered.set(name, output);

            // Did the place change? Note the move.
            const priorLocal = this.scene.get(name)?.local;
            if (
                priorLocal &&
                (!priorLocal.x.equals(info.local.x) ||
                    !priorLocal.y.equals(info.local.y) ||
                    !priorLocal.z.equals(info.local.z) ||
                    !priorLocal.rotation.equals(info.local.rotation))
            ) {
                moved.set(name, {
                    output: output,
                    prior: priorLocal,
                    present: info.local,
                });
            }
        }

        // A mapping from exiting groups to where they previously were.
        const exiting = new Map<OutputName, OutputInfo>();

        // Now that we have a list of everyone present, remove everyone that was present in the prior scene that is no longer, and note that they exited.
        for (const [name, info] of this.priorScene) {
            const output = info.output;
            if (!newScene.has(name)) {
                // If the phrase has an exit squence, then add it to the phrases to keep rendering
                // and remember it's current global place, so we can render it there.
                if (output.exit) {
                    exited.set(name, output);
                    const place = info.global;
                    // Is this in view?
                    if (place.z.sub(this.focus.z).greaterThan(0)) {
                        // Use the global place since it's now parent-less.
                        const newInfo = {
                            output,
                            global: place,
                            local: place,
                            context: info.context,
                            parents: [this.verse],
                        };
                        // Add to the exiting list for the verse to render.
                        exiting.set(name, newInfo);
                        // Re-add to the scene so that animations can get info.
                        newScene.set(name, newInfo);
                    }
                }
            }
        }

        // Remember the places, so that exiting phrases after the next change have them above.
        this.priorScene = this.scene;
        this.scene = newScene;

        // Return the layout for rendering.
        return {
            exiting,
            // We pass back an animation function so that the view can start animating once it's refreshed
            // DOM elements. This way the animation handlers can assume DOM elements are ready for animation.
            animate: () => {
                if (this.live) this.animate(present, entered, moved, exited);
            },
        };
    }

    /**
     * Given a list of entered, moved, and exited named output,
     * update the active animations. Returns the set of immediate exits for
     * deletion.
     */
    animate(
        present: Map<OutputName, TypeOutput>,
        entered: Map<OutputName, TypeOutput>,
        moved: Map<
            OutputName,
            { output: TypeOutput; prior: Place; present: Place }
        >,
        exited: Map<OutputName, TypeOutput>
    ): Set<OutputName> {
        // Update the phrase of all present and exited animations, potentially
        // ending and starting animations.
        for (const [name, output] of present) {
            const animation = this.animations.get(name);
            const info = this.scene.get(name);
            if (info) {
                if (animation) {
                    animation.update(output, info?.context, entered.has(name));
                } else if (output.isAnimated()) {
                    const animation = new OutputAnimation(
                        this,
                        output,
                        info.context,
                        entered.has(name)
                    );
                    this.animations.set(name, animation);
                }
            }
            // Otherwise, there must not be any animation on this name,
            // because otherwise we would have created an animation.
        }

        // Trigger moves.
        for (const [name, change] of moved) {
            const animation = this.animations.get(name);
            if (animation) animation.move(change.prior, change.present);
        }

        // Trigger exits for animated output, keeping track of immediate exits.
        const done = new Set<OutputName>();
        for (const [name] of exited) {
            const animation = this.animations.get(name);
            // If we have an animation record, trigger exit
            if (animation) {
                animation.exit();
                // If it's already done (for a variety of reasons), end it.
                if (animation.done()) this.ended(animation);
            }
        }
        return done;
    }

    stop() {
        this.animations.forEach((animation) => animation.end());
    }

    ended(animation: OutputAnimation) {
        const name = animation.output.getName();
        this.animations.delete(name);
        this.exit(name);
    }

    startingSequence(transitions: Transition[]) {
        for (const transition of transitions) {
            this.animatingNodes.add(transition.pose.value.creator);
        }
        this.tick(this.animatingNodes);
    }

    endingSequence(transitions: Transition[]) {
        for (const transition of transitions) {
            this.animatingNodes.delete(transition.pose.value.creator);
        }
        this.tick(this.animatingNodes);
    }

    getRenderContext(): RenderContext {
        return new RenderContext(
            this.verse?.font ?? DefaultFont,
            this.verse?.size ?? DefaultSize,
            this.languages,
            this.fontsLoaded
        );
    }

    // A top down layout algorithm that places groups first, then their subgroups, and uses the
    // ancestor list to compute global places for each group.
    layout(
        output: TypeOutput,
        parents: TypeOutput[],
        outputInfo: Map<OutputName, OutputInfo>,
        context: RenderContext
    ) {
        // Get the name of the output
        const name = output.getName();
        // Add this output to the parent stack.
        parents.unshift(output);
        // Update the context passed to children.
        context = output.getRenderContext(context);
        // Get this output's place, so we can offset its subgroups.
        const parentPlace = outputInfo.get(name)?.global;
        // Get the places of each of this group's subgroups.
        for (const [subgroup, place] of output.getPlaces(context)) {
            // Set the place of this subgroup, offseting it by the parent's position to keep it in global coordinates.
            outputInfo.set(subgroup.getName(), {
                output: subgroup,
                local: place,
                global: parentPlace ? place.offset(parentPlace) : place,
                context,
                parents: parents.slice(),
            });
            // Now that this subgroup's position is set, layout the subgroup's subgroups.
            this.layout(subgroup, parents, outputInfo, context);
        }
        // Remove this group from the top of the parent stack.
        parents.shift();

        return outputInfo;
    }
}
