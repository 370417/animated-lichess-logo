// State management for vanilla js.
// Inspired by jotai and react recoil.

// This takes a bottom-up approach to state management.
// Instead of creating one big state object and breaking it
// into smaller pieces, you create the small pieces first which
// can then be composed into larger objects.

/**
 * A handle is an object that can be used to interact with a state store.
 * Handles do not contain state. They only identify it.
 * Handles are compared by referential equality.
 */
export type Handle<T> = AtomHandle<T> | DerivedHandle<T>;

/**
 * Handle that can be used to set, get, or subscribe to mutable state.
 *
 * Handles do not contain state. They only identify it.
 * Handles are compared by referential equality.
 */
export type AtomHandle<T> = {
    type: 'atom';
    /**
     * Exists to make typescript enforce covariance.
     * Will always be undefined.
     */
    phantomData?: T;
};

/**
 * Handle that can be used to get or subscribe to immutable state.
 * Cannot be used to set state.
 *
 * Handles do not contain state. They only identify it.
 * Handles are compared by referential equality.
 */
export type DerivedHandle<T> = {
    type: 'derived';
    /**
     * Exists to make typescript enforce covariance.
     * Will always be undefined.
     */
    phantomData?: T;
};

type Handl<T = unknown> = Handle<T>;
type Derived<T = unknown> = DerivedHandle<T>;

/** Turns Handle<T> into T */
export type UnwrapHandle<H> = H extends Handle<infer T> ? T : never;

export class Store {
    #state = new WeakMap<Handl, () => any>();
    #memoizedState = new WeakMap<Derived, any>();
    #callbacks = new WeakMap<Handl, (() => void)[]>();
    /** Adjacency list representation of a directed acyclic graph of handles */
    #children = new WeakMap<Handl, Derived[]>();

    /** Add a mutable value to the state store. */
    atom<T>(initialValue: T): AtomHandle<T> {
        const handle = Object.freeze({ type: 'atom' });
        this.#state.set(handle, () => initialValue);
        this.#callbacks.set(handle, []);
        this.#children.set(handle, []);
        return handle;
    }

    /**
     * Add a value to the state store that is derived from other values in the store.
     *
     * This value cannot be set directly.
     * The derive function will only be called when:
     * - calling store.get with the
     * - calling store.get on a handle derived from that one
     * -
     */
    derived<T, H extends readonly Handle<unknown>[]>(
        handles: H,
        derive: (...args: { [K in keyof H]: UnwrapHandle<H[K]> }) => T,
    ): DerivedHandle<T> {
        const handle = Object.freeze({ type: 'derived' });
        this.#callbacks.set(handle, []);
        this.#children.set(handle, []);

        const closure = () => derive(...(handles.map(this.get, this) as any));
        this.#state.set(handle, this.#memoize(handle, closure));

        for (const parent of handles) {
            this.#children.get(parent)?.push(handle);
        }
        return handle;
    }

    get<T>(handle: Handle<T>): T | undefined {
        return this.#state.get(handle)?.();
    }

    set<T>(handle: AtomHandle<T>, value: T): void {
        if (handle.type !== 'atom') return;
        this.#state.set(handle, () => value);
        // Invalidate all memoized values first before triggering any callbacks.
        // If we were to interleave invalidation and triggering callbacks
        // within one graph traversal, we run the risk of calling a callback
        // before invalidating a handle that it depends on.
        this.#invalidateMemoization(handle);
        this.#propagateState(handle);
    }

    subscribe<T>(handle: Handle<T>, callback: (newValue: T) => void): void {
        this.#callbacks.get(handle)?.push(() => callback(this.get(handle)!));
    }

    #memoize<T>(handle: Derived, f: () => T): () => T {
        return () => {
            if (this.#memoizedState.has(handle)) {
                return this.#memoizedState.get(handle);
            } else {
                const output = f();
                this.#memoizedState.set(handle, output);
                return output;
            }
        };
    }

    #invalidateMemoization(handle: Handl) {
        this.#children.get(handle)?.forEach((child) => {
            // Potential addition: make invalidation conditional
            // something like:
            // store.memo(handle, (oldValue) => boolean)
            this.#memoizedState.delete(child);
            this.#invalidateMemoization(child);
        });
    }

    #propagateState(handle: Handl) {
        // Keep track of visited handles to avoid calling callbacks multiple times.
        // We can't use this.#memoizedState for this because callbacks could
        // call this.#get and create a memoized value before we have visited it.
        const visited = new WeakSet<Derived>();
        const propagateState = (handle: Handl) => {
            this.#callbacks.get(handle)?.forEach((callback) => callback());
            this.#children.get(handle)?.forEach((child) => {
                if (!visited.has(child)) {
                    visited.add(child);
                    propagateState(child);
                }
            });
        };
        propagateState(handle);
    }
}
