/**
 * Mutable input bag shared between the DOM stage (pointer handlers) and the
 * Tres scene (render loop). Deliberately a plain object: it is written on
 * pointer events and read every frame, so it must never trigger Vue updates.
 */
export interface SlashInput {
    /** pointer position in normalised device coords, -1..1 */
    px: number;
    py: number;
    inside: boolean;
    /** set true to request a raycast on the next frame */
    pick: boolean;
    /** the pending pick came from a click/tap (not a hover) */
    tap: boolean;
    dragging: boolean;
    dragYaw: number;
    dragPitch: number;
    velocity: number;
    split: boolean;
    /** slash locked by tap/keyboard (-1 = none) */
    selected: number;
    /** coarse pointer: enables idle sway */
    touch: boolean;
    distance: number;
}

export function createSlashInput(distance = 9): SlashInput {
    return {
        px: 0,
        py: 0,
        inside: false,
        pick: false,
        tap: false,
        dragging: false,
        dragYaw: 0,
        dragPitch: 0,
        velocity: 0,
        split: false,
        selected: -1,
        touch: false,
        distance,
    };
}
