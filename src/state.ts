// Functions for shared state
// Inspired by jotai and react recoil

const producerState: WeakMap<ProducerHandle, any> = new WeakMap();
const transformerFunctions: WeakMap<TransformerHandle, () => any> =
    new WeakMap();
const memoizedState: WeakMap<TransformerHandle, any> = new WeakMap();
const callbacks: WeakMap<Handle, (() => void)[]> = new WeakMap();

/**
 * Represents a directed graph of handles.
 * Does not have to be a tree;
 * a transformer can depend on multiple upsteram handles.
 * Used for propagating set state events.
 */
const downstreamHandles: WeakMap<Handle, TransformerHandle[]> = new WeakMap();

/**
 * Returns an immutable producer handle representing
 * a reference to a piece of mutable state.
 *
 * This handle can be used to set state, get state,
 * or subscribe to set state events.
 *
 * Must be set to an initialValue. The caller always has the option
 * of making the generic type include undefined if they can't come
 * up with an initial value when creating the handle.
 */
export function producer<T>(initialValue: T): ProducerHandle<T> {
    const handle = Object.freeze({ type: 'producer' });
    producerState.set(handle, initialValue);
    callbacks.set(handle, []);
    downstreamHandles.set(handle, []);
    return handle;
}

export type UnwrapHandle<H> = H extends Handle<infer X> ? X : never;

/**
 * Returns an immutable transformer handle representing
 * a reference to a piece of derived, immutable state.
 *
 * This handle can be used to get state or subscribe to
 * set state events.
 *
 * The upstream argument determines which handles will propagate
 * set state events down to this handle.
 *
 * The state represented by this handle is never set directly.
 * Instead, it is calculated by the getValue argument.
 * getValue should use the get function to actually read values
 * from upstream.
 *
 * This function memoizes getValue and invalidates the memoized
 * value whenever an upstream handle has its state set.
 */
export function transformer<T, H extends readonly Handle[]>(
    handles: H,
    transform: (...args: { [K in keyof H]: UnwrapHandle<H[K]> }) => T,
): TransformerHandle<T> {
    const handle = Object.freeze({ type: 'transformer' });

    const closure = () => transform(...(handles.map(get) as any));
    transformerFunctions.set(handle, memoize(handle, closure));

    callbacks.set(handle, []);
    downstreamHandles.set(handle, []);

    for (const upstream of Object.values(handles)) {
        downstreamHandles.get(upstream)?.push(handle);
    }
    return handle;
}

/** Get the state associated with a handle. */
export function get<T>(handle: Handle<T>): T | undefined {
    if (handle.type === 'producer') return producerState.get(handle);
    else return transformerFunctions.get(handle)?.();
}

// Potential addition: setMultiple, a function that sets
// the state of multiple producers and shares the visited set
// between them.
// This would be helpful to avoid callbacks getting called multiple
// times when set is called multiple times in a row.

/** Set the state associated with a producer handle. */
export function set<T>(handle: ProducerHandle<T>, value: T): void {
    producerState.set(handle, value);

    function invalidateMemoization(handle: Handle) {
        downstreamHandles.get(handle)!.forEach((downstream) => {
            memoizedState.delete(downstream);
            invalidateMemoization(downstream);
        });
    }

    const visited: WeakSet<TransformerHandle> = new WeakSet();
    function propagateState(handle: Handle) {
        callbacks.get(handle)!.forEach((callback) => {
            callback();
        });
        downstreamHandles.get(handle)!.forEach((downstream) => {
            if (!visited.has(downstream)) {
                propagateState(downstream);
            }
            visited.add(downstream);
        });
    }

    // Invalidate all memoized values first before triggering any callbacks.
    // If we were to interleave invalidation and triggering callbacks
    // within one graph traversal, we run the risk of calling a callback
    // before invalidating a transformer that it depends on.
    invalidateMemoization(handle);
    propagateState(handle);
}

/**
 * Subscribe to set state events (any call to set(handle, ...)).
 *
 * It's intentional that you can't subscribe to multiple handles with a single
 * call to subscribe. Either combine them into a TransformerHandle or just
 * call subscribe multiple times.
 *
 * Caution: calling subscribe on multiple handles that share a common
 * producer will lead to the callback being called multiple times for
 * a set state event. Combining the handles into a TransformerHandle
 * prevents this problem.
 */
export function subscribe<T>(
    handle: Handle<T>,
    callback: (newValue: T) => void,
): void {
    callbacks.get(handle)?.push(() => callback(get(handle)!));
}

function memoize<T>(handle: TransformerHandle, f: () => T): () => T {
    return () => {
        if (memoizedState.has(handle)) {
            return memoizedState.get(handle);
        } else {
            const output = f();
            memoizedState.set(handle, output);
            return output;
        }
    };
}

export type Handle<T = unknown> = ProducerHandle<T> | TransformerHandle<T>;

export type ProducerHandle<T = unknown> = VarianceHint<T> & {
    type: 'producer';
};

export type TransformerHandle<T = unknown> = VarianceHint<T> & {
    type: 'transformer';
};

type VarianceHint<T> = {
    // Will always be undefined. This field exists to prevent typescript
    // from silently converting VarianceHint<A> into VarianceHint<B>.
    // Without this field, there would be no fields that use the generic
    // type T, so it would have no effect on the structural type.
    phantomData?: T;
};
