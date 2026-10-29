import { Algorithm } from './contract';
import { vortex } from './algorithms/vortex';
import { curl } from './algorithms/curl';
import { physarum } from './algorithms/physarum';
// Three fixed layers from the owner's approved seed-712 v1 preview.
export const pool: readonly Algorithm[] = [vortex, curl, physarum];
