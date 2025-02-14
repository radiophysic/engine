import { AnimCache } from './anim-cache.js';

/**
 * AnimSnapshot stores the state of an animation track at a particular time.
 *
 * @private
 */
class AnimSnapshot {
    /**
     * Create a new animation snapshot.
     *
     * @param {AnimTrack} animTrack - The source track.
     * @private
     */
    constructor(animTrack) {
        this._name = animTrack.name + 'Snapshot';
        this._time = -1;

        // per-curve input cache
        this._cache = [];

        // per-curve evaluation results
        this._results = [];

        // pre-allocate input caches
        for (let i = 0; i < animTrack._inputs.length; ++i) {
            this._cache[i] = new AnimCache();
        }

        // pre-allocate storage for evaluation results
        const curves = animTrack._curves;
        const outputs = animTrack._outputs;
        for (let i = 0; i < curves.length; ++i) {
            const curve = curves[i];
            const output = outputs[curve._output];
            const storage = [];
            for (let j = 0; j < output._components; ++j) {
                storage[j] = 0;
            }
            this._results[i] = storage;
        }
    }
}

export { AnimSnapshot };
