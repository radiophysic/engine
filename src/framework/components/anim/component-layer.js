import { Debug } from '../../../core/debug.js';
import { AnimTrack } from '../../../anim/evaluator/anim-track.js';
import { AnimTransition } from '../../../anim/controller/anim-transition.js';
import { ANIM_LAYER_OVERWRITE } from '../../../anim/controller/constants.js';

/** @typedef {import('./component.js').AnimComponent} AnimComponent */

/**
 * The Anim Component Layer allows managers a single layer of the animation state graph.
 */
class AnimComponentLayer {
    /**
     * Create a new AnimComponentLayer instance.
     *
     * @param {string} name - The name of the layer.
     * @param {object} controller - The controller to manage this layers animations.
     * @param {AnimComponent} component - The component that this layer is a member of.
     * @param {number} [weight] - The weight of this layer. Defaults to 1.
     * @param {string} [blendType] - The blend type of this layer. Defaults to {@link ANIM_LAYER_OVERWRITE}.
     */
    constructor(name, controller, component, weight = 1, blendType = ANIM_LAYER_OVERWRITE) {
        this._name = name;
        this._controller = controller;
        this._component = component;
        this._weight = weight;
        this._blendType = blendType;
        this._mask = null;
    }

    /**
     * Returns the name of the layer.
     *
     * @type {string}
     */
    get name() {
        return this._name;
    }

    /**
     * Whether this layer is currently playing.
     *
     * @type {string}
     */
    set playing(value) {
        this._controller.playing = value;
    }

    get playing() {
        return this._controller.playing;
    }

    /**
     * Returns true if a state graph has been loaded and all states in the graph have been assigned
     * animation tracks.
     *
     * @type {string}
     */
    get playable() {
        return this._controller.playable;
    }

    /**
     * Returns the currently active state name.
     *
     * @type {string}
     */
    get activeState() {
        return this._controller.activeStateName;
    }

    /**
     * Returns the previously active state name.
     *
     * @type {string}
     */
    get previousState() {
        return this._controller.previousStateName;
    }

    /**
     * Returns the currently active states progress as a value normalized by the states animation
     * duration. Looped animations will return values greater than 1.
     *
     * @type {number}
     */
    get activeStateProgress() {
        return this._controller.activeStateProgress;
    }

    /**
     * Returns the currently active states duration.
     *
     * @type {number}
     */
    get activeStateDuration() {
        return this._controller.activeStateDuration;
    }

    /**
     * The active states time in seconds.
     *
     * @type {number}
     */
    set activeStateCurrentTime(time) {
        this._controller.activeStateCurrentTime = time;
    }

    get activeStateCurrentTime() {
        return this._controller.activeStateCurrentTime;
    }

    /**
     * Returns whether the anim component layer is currently transitioning between states.
     *
     * @type {boolean}
     */
    get transitioning() {
        return this._controller.transitioning;
    }

    /**
     * If the anim component layer is currently transitioning between states, returns the progress.
     * Otherwise returns null.
     *
     * @type {number}
     */
    get transitionProgress() {
        if (this.transitioning) {
            return this._controller.transitionProgress;
        }
        return null;
    }

    /**
     * Lists all available states in this layers state graph.
     *
     * @type {string[]}
     */
    get states() {
        return this._controller.states;
    }

    /**
     * The blending weight of this layer. Used when calculating the value of properties that are
     * animated by more than one layer.
     *
     * @type {number}
     */
    set weight(value) {
        this._weight = value;
        this._component.dirtifyTargets();
    }

    get weight() {
        return this._weight;
    }

    set blendType(value) {
        if (value !== this._blendType) {
            this._blendType = value;
            this._component.rebind();
        }
    }

    get blendType() {
        return this._blendType;
    }

    get mask() {
        return this._mask;
    }

    /**
     * Start playing the animation in the current state.
     *
     * @param {string} [name] - If provided, will begin playing from the start of the state with
     * this name.
     */
    play(name) {
        this._controller.play(name);
    }

    /**
     * Pause the animation in the current state.
     */
    pause() {
        this._controller.pause();
    }

    /**
     * Reset the animation component to its initial state, including all parameters. The system
     * will be paused.
     */
    reset() {
        this._controller.reset();
    }

    /**
     * Rebind any animations in the layer to the currently present components and model of the anim
     * components entity.
     */
    rebind() {
        this._controller.rebind();
    }

    update(dt) {
        this._controller.update(dt);
    }

    /**
     * Add a mask to this layer.
     *
     * @param {object} [mask] - The mask to assign to the layer. If not provided the current mask
     * in the layer will be removed.
     * @example
     * entity.anim.baseLayer.assignMask({
     *     // include the spine of the current model and all of its children
     *     "path/to/spine": {
     *         children: true
     *     },
     *     // include the hip of the current model but not all of its children
     *     "path/to/hip": true
     * });
     */
    assignMask(mask) {
        if (this._controller.assignMask(mask)) {
            this._component.rebind();
        }
        this._mask = mask;
    }

    /**
     * Assigns an animation track to a state or blend tree node in the current graph. If a state
     * for the given nodePath doesn't exist, it will be created. If all states nodes are linked and
     * the {@link AnimComponent#activate} value was set to true then the component will begin
     * playing.
     *
     * @param {string} nodePath - Either the state name or the path to a blend tree node that this
     * animation should be associated with. Each section of a blend tree path is split using a
     * period (`.`) therefore state names should not include this character (e.g "MyStateName" or
     * "MyStateName.BlendTreeNode").
     * @param {object} animTrack - The animation track that will be assigned to this state and
     * played whenever this state is active.
     * @param {number} [speed] - Update the speed of the state you are assigning an animation to.
     * Defaults to 1.
     * @param {boolean} [loop] - Update the loop property of the state you are assigning an
     * animation to. Defaults to true.
     */
    assignAnimation(nodePath, animTrack, speed, loop) {
        if (animTrack.constructor !== AnimTrack) {
            Debug.error('assignAnimation: animTrack supplied to function was not of type AnimTrack');
            return;
        }
        this._controller.assignAnimation(nodePath, animTrack, speed, loop);
        if (this._controller._transitions.length === 0) {
            this._controller._transitions.push(new AnimTransition({
                from: 'START',
                to: nodePath
            }));
        }
        if (this._component.activate && this._component.playable) {
            this._component.playing = true;
        }
    }

    /**
     * Removes animations from a node in the loaded state graph.
     *
     * @param {string} nodeName - The name of the node that should have its animation tracks removed.
     */
    removeNodeAnimations(nodeName) {
        if (this._controller.removeNodeAnimations(nodeName)) {
            this._component.playing = false;
        }
    }

    /**
     * Transition to any state in the current layers graph. Transitions can be instant or take an
     * optional blend time.
     *
     * @param {string} to - The state that this transition will transition to.
     * @param {number} [time] - The duration of the transition in seconds. Defaults to 0.
     * @param {number} [transitionOffset] - If provided, the destination state will begin playing
     * its animation at this time. Given in normalized time, based on the states duration & must be
     * between 0 and 1. Defaults to null.
     */
    transition(to, time = 0, transitionOffset = null) {
        this._controller.updateStateFromTransition(new AnimTransition({
            from: this._controller.activeStateName,
            to,
            time,
            transitionOffset
        }));
    }
}

export { AnimComponentLayer };
