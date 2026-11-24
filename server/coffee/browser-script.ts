// [Larry] SCRUM-215: serialize the pinned runtime without bundler-injected helper references.
import lighthouse from './vendor/lighthouse-13.6.0.txt';
import thirdParty from './vendor/third-party-web-0.30.0.txt';
import comparison from './comparison.js.txt';
import type { CoffeeStrategy } from '../../src/app/features/coffee/coffee-contract';
interface Input {
  url: string | null;
  test: CoffeeStrategy;
  internal: boolean;
}
export function browserScript(input: Input): string {
  return (
    'async (tools)=>{const self=undefined;' +
    lighthouse +
    '\n' +
    thirdParty +
    '\nglobalThis.thirdPartyWeb.provideThirdPartyWeb(globalThis.__coffeeThirdPartyWeb);return (' +
    comparison +
    ')(tools,' +
    JSON.stringify(input) +
    ');}'
  );
}
