import { companionSpace } from './companion-space';

describe('Rigby shared roaming space', () => {
  let blocker: HTMLButtonElement;
  beforeEach(() => {
    blocker = document.createElement('button');
    document.body.append(blocker);
    blocker.checkVisibility = () => true;
  });
  afterEach(() => {
    blocker.remove();
    vi.restoreAllMocks();
  });
  it('never chooses a resting spot over content in a filled viewport', () => {
    vi.spyOn(blocker, 'getBoundingClientRect').mockReturnValue(
      new DOMRect(0, 0, innerWidth, innerHeight),
    );
    expect(companionSpace(document, { x: 100, y: 100 })).toBeNull();
  });
  it('can choose whitespace on either side instead of remaining in a right-hand lane', () => {
    vi.spyOn(blocker, 'getBoundingClientRect').mockReturnValue(new DOMRect(0, 0, 0, 0));
    const left = companionSpace(document, { x: 80, y: 200 });
    const right = companionSpace(document, { x: innerWidth - 80, y: 200 });
    expect(left).not.toBeNull();
    expect(right).not.toBeNull();
    expect(left!.x).toBeLessThan(innerWidth / 2);
    expect(right!.x).toBeGreaterThan(innerWidth / 2);
  });
  it('rejects a narrow gap that fits the small sprite but not the desktop or dance footprint', () => {
    vi.spyOn(blocker, 'getBoundingClientRect').mockReturnValue(new DOMRect(0, 0, innerWidth - 84, innerHeight));
    expect(companionSpace(document, undefined, 64)).not.toBeNull();
    expect(companionSpace(document, undefined, 96)).toBeNull();
    expect(companionSpace(document, undefined, 128)).toBeNull();
  });
});
