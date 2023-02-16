import { get, Handle, ProducerHandle, set, subscribe } from '../state';

export function hydrateRange(id: string, handle: ProducerHandle<number>): void {
    const range = document.getElementById(id) as HTMLInputElement | undefined;
    if (!range || range.tagName !== 'INPUT') return;
    range.value = `${get(handle)}`;
    range.addEventListener('input', () => {
        set(handle, range.valueAsNumber);
    });
    subscribe(handle, (val) => {
        range.value = `${val}`;
    });
}

export function hydrateRanges(handles: {
    [Id in string]: ProducerHandle<number>;
}): void {
    for (const [id, handle] of Object.entries(handles)) {
        hydrateRange(id, handle);
    }
}

export function hydrateCheckbox(
    id: string,
    handle: ProducerHandle<boolean>,
): void {
    const checkbox = document.getElementById(id) as
        | HTMLInputElement
        | undefined;
    if (!checkbox || checkbox.tagName !== 'INPUT') return;
    checkbox.checked = !!get(handle);
    checkbox.addEventListener('change', () => {
        set(handle, checkbox.checked);
    });
    subscribe(handle, (val) => {
        checkbox.checked = val;
    });
}

export function hydrateCheckboxes(handles: {
    [Id in string]: ProducerHandle<boolean>;
}): void {
    for (const [id, handle] of Object.entries(handles)) {
        hydrateCheckbox(id, handle);
    }
}

export function hydrateStateDisplay(
    stateProvider: string,
    handle: Handle<number | string>,
): void {
    const selector = `.state-display[data-state-provider="${stateProvider}"]`;
    const stateDisplay = document.querySelector(selector) as
        | HTMLElement
        | undefined;
    if (!stateDisplay) return;
    stateDisplay.innerText = `${get(handle)}`;
    subscribe(handle, (val) => {
        stateDisplay.innerText = `${val}`;
    });
}

export function hydrateStateDisplays(handles: {
    [StateProvider in string]: Handle<number | string>;
}): void {
    for (const [id, handle] of Object.entries(handles)) {
        hydrateStateDisplay(id, handle);
    }
}
