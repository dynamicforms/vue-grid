import { enableAutoUnmount } from '@vue/test-utils';
import { afterEach } from 'vitest';

// a component left mounted keeps its timers, which then run after the test environment is torn down
enableAutoUnmount(afterEach);
