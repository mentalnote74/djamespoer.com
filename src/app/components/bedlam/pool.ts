import { Algorithm } from './contract';
import { cyclic } from './algorithms/cyclic';
import { curl } from './algorithms/curl';
import { grayScott } from './algorithms/gray-scott';
import { physarum } from './algorithms/physarum';
import { vortex } from './algorithms/vortex';
export const pool: readonly Algorithm[] = [physarum, cyclic, vortex, grayScott, curl];
