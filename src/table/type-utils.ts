import type { ComputedRef, Ref } from 'vue';

/**
 * MaybeRef<T> represents a value that can be either a raw value, a Ref, or a ComputedRef.
 * Use with unref() to extract the actual value.
 */
export type MaybeRef<T> = T | Ref<T> | ComputedRef<T>;
