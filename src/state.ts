// Tools for handling shared state and subscribing to state changes.

const subscribers: WeakMap<Handle, Handle[]> = new WeakMap();
const callbacks: WeakMap<Handle, ((whatChanged: Handle) => unknown)[]> = new WeakMap();
const getters: WeakMap<Handle, () => any> = new WeakMap();
const states: WeakMap<Handle, unknown> = new WeakMap();
const writable: WeakSet<Handle> = new WeakSet();

/**
 * Returns a producer handle that can be used for read and write operations:
 * - set state (unless immutable is set to true)
 * - get state
 * - subscribe to changes in state
 * 
 * Optionally can set an initial state.
 */
export function producer<T>(initialValue?: T, immutable: boolean = false): Handle<T> {
    const handle = Object.freeze({});
    if (!immutable) writable.add(handle);
    if (initialValue !== undefined) states.set(handle, initialValue);
    getters.set(handle, () => states.get(handle));
    subscribers.set(handle, []);
    callbacks.set(handle, []);
    return handle;
}

/**
 * Returns a transformer handle that can be used for read-only operations:
 * - get state
 * - subscribe to changes in state
 * 
 * The state of a transformer is derived from other producers or transformers
 * rather than ever being set directly.
 * 
 * Set state events will propagate down from producers to this transformer.
 */
export function transformer<T>(producers: Handle[], getState: () => T): Handle<T> {
    const handle = Object.freeze({});
    getters.set(handle, getState);
    subscribers.set(handle, []);
    callbacks.set(handle, []);
    for (const producer of producers) {
        subscribers.get(producer)?.push(handle);
    }
    return handle;
}

/** Get the state associated with a handle. */
export function get<T>(handle: Handle<T>): T | undefined {
    return getters.get(handle)?.()
}

/**
 * Set the state associated with a handle.
 * 
 * Does nothing if the handle doesn't exist or is a transformer handle.
 */
export function set<T>(handle: Handle<T>, value: T): void {
    if (writable.has(handle)) {
        states.set(handle, value);
        triggerCallbacks(handle);
    }
}

function triggerCallbacks(handle: Handle) {
    callbacks.get(handle)?.forEach(callback => {
        callback(handle);
    });
    subscribers.get(handle)?.forEach(triggerCallbacks);
}

/**
 * Subscribe to one or many handles.
 * 
 * The callback will be called whenever set is called for one of the producers
 * (or its parents in the case of transformers).
 */
export function subscribe(producers: Handle[], callback: (whatChanged: Handle) => unknown): void {
    for (const producer of producers) {
        callbacks.get(producer)?.push(callback);
    }
}

/**
 * A handle that identifies a piece of state.
 * 
 * The generic type is the type of the corresponding state.
 * Objects of type Handle do not contain state themselves.
 * In fact, Handle objects returned by the producer and transformer
 * functions are always frozen.
 */
export type Handle<_T = unknown> = {}
